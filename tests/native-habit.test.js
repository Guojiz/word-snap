const test = require("node:test");
const assert = require("node:assert/strict");
const H = require("../js/habit.js");
const N = require("../js/native-habit.js");

const base = new Date(2026, 9, 5, 12).getTime(); // Monday 5 Oct 2026, noon
const at = (dayOffset, hour = 12) => base + dayOffset * H.DAY_MS + (hour - 12) * 3600 * 1000;

function finishDay(h, now) {
  H.recordAnswer(h, { wasNew: true, ms: 4000, now });
  return H.today(h, { due: 0, newAvailable: 0, goalNew: 1, now });
}

test("no words yet: an inactive snapshot that still carries the language and settings", () => {
  const s = N.snapshot({ Habit: H, habit: H.normalize(null), status: null, lang: "en", nudges: { streak: true }, now: at(0) });
  assert.equal(s.active, false);
  assert.equal(s.lang, "en");
  assert.deepEqual(s.nudges, { streak: true, due: false });
});

test("idle forecast: today done keeps the streak tomorrow, the weekly freeze bridges one missed day", () => {
  const h = H.normalize(null);
  for (let d = 0; d < 3; d++) { H.settle(h, at(d)); finishDay(h, at(d)); }
  const status = H.today(h, { due: 0, newAvailable: 0, goalNew: 1, now: at(2) });
  const s = N.snapshot({ Habit: H, habit: h, status, now: at(2) });
  assert.equal(s.active, true);
  assert.equal(s.day, H.dayKey(at(2)));
  assert.equal(s.done, true);
  // today 3; tomorrow still 3 (not yet missed); the day after, tomorrow was frozen: still 3;
  // then the freeze is used up and the streak breaks.
  assert.deepEqual(s.idle.slice(0, 4), [3, 3, 3, 0]);
  assert.equal(s.idle.length, N.FORECAST_DAYS);
  assert.equal(H.streak(h, at(2)), 3, "the real habit state is left alone");
  assert.equal(Object.keys(h.freezes).length, 0);
});

test("new words for a coming day: the daily goal while the library has them", () => {
  const h = H.normalize(null);
  H.recordAnswer(h, { wasNew: true, now: at(0) });
  const status = H.today(h, { due: 2, newAvailable: 14, goalNew: 10, now: at(0) });
  assert.equal(status.newLeft, 9);
  assert.equal(N.snapshot({ Habit: H, habit: h, status, newAvailable: 14, dailyNew: 10, now: at(0) }).newPerDay, 5);
  assert.equal(N.snapshot({ Habit: H, habit: h, status, newAvailable: 40, dailyNew: 10, now: at(0) }).newPerDay, 10);
});

test("due times: introduced words only, sorted, inside the week; words learned today wait until tomorrow", () => {
  const words = [
    { id: "a", isNew: true, at: at(0) },
    { id: "b", at: at(3) },
    { id: "c", at: at(0, 9) },
    { id: "d", at: at(0, 13), today: true },
    { id: "e", at: at(30) }
  ];
  const due = N.dueTimes(words, {
    isNew: w => Boolean(w.isNew),
    dueAt: w => w.at,
    learnedToday: w => Boolean(w.today),
    now: at(0)
  });
  assert.deepEqual(due, [at(0, 9), N.nextDayStart(at(0)), at(3)]);
  assert.equal(N.nextDayStart(at(0)), at(1, 4));
  assert.equal(N.nextDayStart(at(1, 3)), at(1, 4), "before 4 am the day still ends this morning");
});
