const test = require("node:test");
const assert = require("node:assert/strict");
const H = require("../js/habit.js");
const E = require("../js/engine.js");

// Noon on a few consecutive days (local time), so the 4 am cutoff never matters.
const base = new Date(2026, 9, 5, 12).getTime(); // Monday 5 Oct 2026
const at = (dayOffset, hour = 12) => base + dayOffset * H.DAY_MS + (hour - 12) * 3600 * 1000;

function finishDay(h, now) {
  H.recordAnswer(h, { wasNew: true, ms: 4000, now });
  return H.today(h, { due: 0, newAvailable: 0, goalNew: 1, now });
}

test("day key matches the engine's, with the 4 am cutoff", () => {
  for (const ts of [at(0), at(0, 3), at(0, 5), at(3, 23)]) assert.equal(H.dayKey(ts), E.dayKey(ts));
  assert.equal(H.dayKey(at(1, 3)), H.dayKey(at(0, 23)), "3 am still belongs to the day before");
});

test("today's goal: due words cleared and new words learned; nothing practiced is not done", () => {
  const h = H.normalize(null);
  let s = H.today(h, { due: 0, newAvailable: 0, goalNew: 10, now: at(0) });
  assert.equal(s.done, false, "an empty library does not complete a day");
  for (let i = 0; i < 3; i++) H.recordAnswer(h, { wasNew: true, ms: 5000, now: at(0) });
  s = H.today(h, { due: 4, newAvailable: 20, goalNew: 10, now: at(0) });
  assert.deepEqual([s.done, s.dueLeft, s.newLeft, s.newLearned], [false, 4, 7, 3]);
  assert.ok(s.minutes >= 1);
  // Only 2 new words left in the library: the goal shrinks to what is possible.
  s = H.today(h, { due: 0, newAvailable: 2, goalNew: 10, now: at(0) });
  assert.equal(s.newLeft, 2);
  H.recordAnswer(h, { wasNew: true, now: at(0) });
  H.recordAnswer(h, { wasNew: true, now: at(0) });
  s = H.today(h, { due: 0, newAvailable: 0, goalNew: 10, now: at(0) });
  assert.equal(s.done, true);
  assert.equal(s.justDone, true);
  assert.equal(H.today(h, { due: 5, now: at(0, 20) }).done, true, "a completed day stays completed");
  assert.equal(H.today(h, { due: 5, now: at(0, 20) }).justDone, false);
});

test("streak counts completed days ending today or yesterday", () => {
  const h = H.normalize(null);
  finishDay(h, at(0));
  finishDay(h, at(1));
  assert.equal(H.streak(h, at(1)), 2);
  assert.equal(H.streak(h, at(2)), 2, "today is still open");
  finishDay(h, at(2));
  assert.equal(H.streak(h, at(2)), 3);
});

test("one missed day is bridged by the weekly freeze, the second in the same week is not", () => {
  const h = H.normalize(null);
  finishDay(h, at(0)); // Mon
  finishDay(h, at(1)); // Tue
  // Wed missed.
  assert.deepEqual(H.settle(h, at(3)), [H.dayKey(at(2))]);
  assert.equal(H.streak(h, at(3)), 2, "frozen day keeps the streak, adds nothing");
  assert.equal(H.freezeAvailable(h, at(3)), false);
  finishDay(h, at(3)); // Thu
  assert.equal(H.streak(h, at(3)), 3);
  // Fri missed: this week's freeze is used.
  assert.deepEqual(H.settle(h, at(5)), []);
  assert.equal(H.streak(h, at(5)), 0);
  // Next week the freeze is back.
  assert.equal(H.freezeAvailable(h, at(7)), true);
});

test("a long gap breaks the streak and does not use the freeze", () => {
  const h = H.normalize(null);
  finishDay(h, at(0));
  assert.deepEqual(H.settle(h, at(4)), []);
  assert.equal(H.streak(h, at(4)), 0);
  assert.equal(H.freezeAvailable(h, at(4)), true);
});

test("normalize drops junk and keeps good state", () => {
  const h = H.normalize({ days: { 20000: "done", x: "done", 20001: "maybe" }, pairMs: -1, today: { day: 20000, newLearned: "3" } });
  assert.deepEqual(h.days, { 20000: "done" });
  assert.equal(h.pairMs, 5000);
  assert.equal(h.today.newLearned, 0);
  const round = H.normalize(JSON.parse(JSON.stringify(h)));
  assert.deepEqual(round, h);
});
