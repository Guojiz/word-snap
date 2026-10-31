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
  assert.deepEqual(H.noticeFor(h, at(3)), { day: H.dayKey(at(3)), kind: "frozen", n: 2 });
  assert.equal(H.freezeAvailable(h, at(3)), false);
  finishDay(h, at(3)); // Thu
  assert.equal(H.streak(h, at(3)), 3);
  // Fri missed: this week's freeze is used.
  assert.deepEqual(H.settle(h, at(5)), []);
  assert.equal(H.streak(h, at(5)), 0);
  assert.equal(H.noticeFor(h, at(5)).kind, "broken");
  assert.equal(H.noticeFor(h, at(5)).n, 3, "the broken streak is named");
  assert.equal(H.today(h, { now: at(5) }).best, 3, "and counts as the best so far");
  assert.equal(H.noticeFor(h, at(6)), null, "the notice is for that day only");
  // The notice survives a reload.
  assert.equal(H.noticeFor(H.normalize(JSON.parse(JSON.stringify(h))), at(5)).kind, "broken");
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

test("reminders: the next days at the chosen time, not today once the goal is done", () => {
  const h = H.normalize(null);
  let plan = H.reminderPlan(h, { now: at(0, 12), hour: 20, minute: 30, days: 3 });
  assert.equal(plan.length, 3);
  assert.equal(new Date(plan[0].at).getHours(), 20);
  assert.equal(new Date(plan[0].at).getMinutes(), 30);
  assert.deepEqual(plan.map(p => p.id), [7100, 7101, 7102]);
  // Past today's time: starts tomorrow.
  plan = H.reminderPlan(h, { now: at(0, 21), hour: 20, minute: 0, days: 3 });
  assert.equal(plan.length, 2);
  assert.equal(plan[0].id, 7101);
  finishDay(h, at(0, 12));
  plan = H.reminderPlan(h, { now: at(0, 13), hour: 20, minute: 0, days: 3 });
  assert.equal(plan[0].id, 7101, "no reminder today after the goal is done");
});

test("words learned today are not extra due work; the best streak is kept", () => {
  const h = H.normalize(null);
  H.recordAnswer(h, { wasNew: true, id: "w1", now: at(0) });
  assert.equal(H.learnedToday(h, "w1", at(0)), true);
  assert.equal(H.learnedToday(h, "w2", at(0)), false);
  assert.equal(H.learnedToday(h, "w1", at(1)), false, "tomorrow it is a normal review");
  finishDay(h, at(0));
  finishDay(h, at(1));
  assert.equal(H.today(h, { now: at(1) }).best, 2);
  assert.equal(H.normalize(JSON.parse(JSON.stringify(h))).best, 2);
});

// ---- Points, card rank (against yourself), weekly challenge, next stop ----

test("the week strip starts on Monday and marks done, today and the rest", () => {
  const h = H.normalize(null);
  finishDay(h, at(0)); // Monday
  const strip = H.weekStrip(h, at(2)); // Wednesday
  assert.equal(strip.length, 7);
  assert.equal(strip[0].day, H.dayKey(at(0)), "Monday first");
  assert.deepEqual(strip.map(d => d.state), ["done", "missed", "today", "future", "future", "future", "future"]);
});

test("claimed points add up per week; the first week's target is the floor", () => {
  const h = H.normalize(null);
  H.claim(h, { points: 25, now: at(0) });
  H.claim(h, { points: 30, fullCombo: true, now: at(1) });
  const r = H.rank(h, at(1));
  assert.deepEqual([r.tier, r.pts, r.target, r.left], [0, 55, 120, 65]);
  assert.equal(r.daysLeft, 6, "Tuesday: Tuesday to Sunday left");
  assert.equal(r.last, null);
});

test("meeting the week's target moves up one rank; the next target follows your own average", () => {
  const h = H.normalize(null);
  H.rank(h, at(0));
  for (let d = 0; d < 6; d++) H.claim(h, { points: 30, now: at(d) }); // 180 ≥ 120
  const r = H.rank(h, at(7)); // next Monday
  assert.equal(r.tier, 1);
  assert.equal(r.last.kind, "up");
  assert.equal(r.last.pts, 180);
  // Average of the last three weeks: (180 + 0 + 0) / 3 = 60 → 66 → floor 120.
  assert.equal(r.target, 120);
  H.markRankSeen(h);
  assert.equal(H.rank(h, at(8)).last, null, "the result is shown once");
});

test("a steady learner's target grows 10% above their own level", () => {
  const h = H.normalize(null);
  H.rank(h, at(0));
  for (let w = 0; w < 3; w++) for (let d = 0; d < 7; d++) H.claim(h, { points: 50, now: at(w * 7 + d) }); // 350 a week
  const r = H.rank(h, at(21));
  assert.equal(r.target, 390, "350 × 1.1 = 385 → rounded to 390");
  assert.equal(r.tier, 3, "three weeks above target: white → green → blue → violet");
});

test("a week under 60% of the target drops one rank, never below white; 60% holds", () => {
  const h = H.normalize(null);
  h.rank.tier = 2;
  H.rank(h, at(0));
  H.claim(h, { points: 80, now: at(1) }); // 80 / 120 = 67%: stay
  let r = H.rank(h, at(7));
  assert.deepEqual([r.tier, r.last.kind], [2, "stay"]);
  H.claim(h, { points: 10, now: at(8) }); // 10 / 120: down
  r = H.rank(h, at(14));
  assert.deepEqual([r.tier, r.last.kind], [1, "down"]);
  // Weeks away: one rank per missed week, then white holds.
  r = H.rank(h, at(14 + 35));
  assert.equal(r.tier, 0);
  assert.equal(r.last.kind, "stay");
});

test("rainbow is the top: meeting the target there says so", () => {
  const h = H.normalize(null);
  h.rank.tier = H.RANKS - 1;
  H.rank(h, at(0));
  H.claim(h, { points: 500, now: at(0) });
  const r = H.rank(h, at(7));
  assert.deepEqual([r.tier, r.last.kind], [H.RANKS - 1, "top"]);
});

test("the weekly challenge rotates and counts this week only", () => {
  const h = H.normalize(null);
  const kinds = new Set([0, 7, 14].map(d => H.challenge(h, at(d)).kind));
  assert.deepEqual([...kinds].sort(), ["days", "fullCombos", "newWords"]);
  // Find the week whose challenge is full combos and count two.
  const d = [0, 7, 14].find(x => H.challenge(h, at(x)).kind === "fullCombos");
  H.claim(h, { points: 25, fullCombo: true, now: at(d) });
  H.claim(h, { points: 25, fullCombo: true, now: at(d + 1) });
  assert.deepEqual(H.challenge(h, at(d + 1)), { kind: "fullCombos", goal: 3, value: 2, done: false });
  // New words are logged from answers.
  const n = [0, 7, 14].find(x => H.challenge(h, at(x)).kind === "newWords");
  for (let i = 0; i < 31; i++) H.recordAnswer(h, { wasNew: true, now: at(n) });
  assert.equal(H.challenge(h, at(n)).done, true);
});

test("next stop: the next streak milestone", () => {
  assert.deepEqual(H.nextStop(0), { at: 3, left: 3 });
  assert.deepEqual(H.nextStop(3), { at: 7, left: 4 });
  assert.deepEqual(H.nextStop(29), { at: 30, left: 1 });
  assert.equal(H.nextStop(400), null);
});

test("points and rank survive a save and reload; bad stored values are cleaned", () => {
  const h = H.normalize(null);
  H.claim(h, { points: 40, fullCombo: true, now: at(0) });
  H.rank(h, at(0));
  const back = H.normalize(JSON.parse(JSON.stringify(h)));
  assert.equal(H.rank(back, at(0)).pts, 40);
  const bad = H.normalize({ log: { x: 1, 5: "no", 6: { p: -3, n: "a" } }, rank: { tier: 99, target: -1 } });
  assert.deepEqual(bad.log, { 6: { p: 0, n: 0, fc: 0 } });
  assert.equal(bad.rank.tier, H.RANKS - 1);
  assert.equal(bad.rank.target, 120);
});
