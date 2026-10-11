/*
 * Word Snap on the Android home screen: the snapshot the native side reads.
 *
 * The app sends this after each answer (Capacitor plugin "NativeHabit",
 * android/app/src/main/java/io/github/guojiz/wordsnap/habit/). The home-screen
 * widget and the evening / review notifications are drawn from it while the
 * app is closed, so it also carries what tomorrow and the next week look like
 * if nothing more is practised:
 *
 *   idle[d]  the day streak d days from now (frozen days bridge it, as js/habit.js does)
 *   due      when each introduced word falls due, sorted, for the next week;
 *            the native side counts how many are due at any moment
 *
 * No DOM access. Works as a classic browser script (window.WordSnapNativeHabit)
 * and as a CommonJS module for Node tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WordSnapNativeHabit = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DAY_MS = 24 * 60 * 60 * 1000;
  const FORECAST_DAYS = 8;
  const MAX_DUE = 3000;

  /** Start of the next habit day (4 am local) after `now`. */
  function nextDayStart(now) {
    const d = new Date(now);
    if (d.getHours() >= 4) d.setDate(d.getDate() + 1);
    d.setHours(4, 0, 0, 0);
    return d.getTime();
  }

  /**
   * Due times of introduced words within the forecast window, sorted.
   * Words first learned today count from tomorrow: their quick re-checks are
   * part of learning them, not review work (as in the app's today bar).
   */
  function dueTimes(words, { isNew, dueAt, learnedToday, now = Date.now() }) {
    const until = now + FORECAST_DAYS * DAY_MS;
    const tomorrow = nextDayStart(now);
    const out = [];
    for (const word of words) {
      if (isNew(word)) continue;
      let at = dueAt(word, now);
      if (!Number.isFinite(at)) continue;
      if (learnedToday(word) && at < tomorrow) at = tomorrow;
      if (at <= until) out.push(Math.round(at));
    }
    out.sort((a, b) => a - b);
    return out.length > MAX_DUE ? out.slice(0, MAX_DUE) : out;
  }

  /**
   * The snapshot. status: WordSnapHabit.today(...) for now, or null when there is
   * nothing to practise yet (trial or empty library). Habit: the WordSnapHabit module.
   */
  function snapshot({ Habit, habit, status, due = [], newAvailable = 0, dailyNew = 10, lang = "zh",
    nudges = {}, reminder = "", now = Date.now() }) {
    const base = { v: 1, at: now, lang: lang === "en" ? "en" : "zh", reminder: reminder || "",
      nudges: { streak: nudges.streak === true, due: nudges.due === true } };
    if (!status) return { ...base, active: false };
    // The streak each coming day if nothing more is practised, settled on a copy.
    const copy = Habit.normalize(JSON.parse(JSON.stringify(habit)));
    const idle = [];
    for (let d = 0; d < FORECAST_DAYS; d++) {
      const ts = now + d * DAY_MS;
      Habit.settle(copy, ts);
      idle.push(Habit.streak(copy, ts));
    }
    return {
      ...base,
      active: true,
      day: Habit.dayKey(now),
      done: Boolean(status.done),
      streak: status.streak,
      best: status.best,
      dueLeft: status.dueLeft,
      newLeft: status.newLeft,
      minutes: status.minutes,
      pairMs: Math.round(habit.pairMs),
      // New words a coming day asks for: the daily goal, while the library has them.
      newPerDay: Math.max(0, Math.min(dailyNew, newAvailable - status.newLeft)),
      idle,
      due
    };
  }

  return { snapshot, dueTimes, nextDayStart, FORECAST_DAYS };
});
