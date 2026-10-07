/*
 * Word Snap daily habit: today's goal, the day streak and the weekly streak freeze.
 *
 * - A day runs from 4 am to 4 am (local time), like the review engine.
 * - Today's goal: no words due right now, and `goalNew` new words learned
 *   (fewer if the library has fewer new words left). Answering at least once is
 *   required, so an empty library never "completes" a day.
 * - Streak: consecutive completed days, ending today or yesterday (today is
 *   still open). A missed day is bridged by the streak freeze, one per week
 *   (Monday to Sunday); a frozen day keeps the streak but does not add to it.
 *
 * No DOM access. Works as a classic browser script (window.WordSnapHabit) and
 * as a CommonJS module for Node tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WordSnapHabit = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DAY_MS = 24 * 60 * 60 * 1000;
  const DAY_CUTOFF_HOUR = 4;
  const KEEP_DAYS = 400;
  const DEFAULT_PAIR_MS = 5000;

  /** Calendar day index with a 4 am cutoff, in local time (same as WordSnapEngine.dayKey). */
  function dayKey(ts) {
    const d = new Date(ts - DAY_CUTOFF_HOUR * 60 * 60 * 1000);
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
  }

  /** Monday-based week index of a day index (day 0, 1970-01-01, was a Thursday). */
  function weekKey(day) {
    return Math.floor((day + 3) / 7);
  }

  function isNum(x) { return typeof x === "number" && Number.isFinite(x); }

  /** Clean stored state: { days: {day: "done"|"frozen"}, today, freezes: {week: day}, pairMs, settled }. */
  function normalize(raw) {
    const value = raw && typeof raw === "object" ? raw : {};
    const days = {};
    if (value.days && typeof value.days === "object") {
      for (const [k, v] of Object.entries(value.days)) {
        if (/^\d+$/.test(k) && (v === "done" || v === "frozen")) days[k] = v;
      }
    }
    const freezes = {};
    if (value.freezes && typeof value.freezes === "object") {
      for (const [k, v] of Object.entries(value.freezes)) if (/^\d+$/.test(k) && isNum(v)) freezes[k] = v;
    }
    const t = value.today && typeof value.today === "object" ? value.today : {};
    return {
      days,
      freezes,
      today: {
        day: isNum(t.day) ? t.day : null,
        newLearned: isNum(t.newLearned) ? Math.max(0, t.newLearned) : 0,
        answers: isNum(t.answers) ? Math.max(0, t.answers) : 0
      },
      pairMs: isNum(value.pairMs) && value.pairMs > 0 ? value.pairMs : DEFAULT_PAIR_MS,
      settled: isNum(value.settled) ? value.settled : null
    };
  }

  function rollToday(h, day) {
    if (h.today.day !== day) h.today = { day, newLearned: 0, answers: 0 };
  }

  /** One answer (any card). wasNew: the word had never been answered. ms: time for a board pair. */
  function recordAnswer(h, { wasNew = false, ms = 0, now = Date.now() } = {}) {
    rollToday(h, dayKey(now));
    h.today.answers += 1;
    if (wasNew) h.today.newLearned += 1;
    // Typical time per pair, for "about n minutes"; long pauses are not answers.
    if (ms > 300 && ms < 60000) h.pairMs = h.pairMs * 0.9 + ms * 0.1;
  }

  /**
   * Bridges missed days since the last completed day with this week's freeze.
   * Runs once per day; returns the days frozen just now (for a notice).
   */
  function settle(h, now = Date.now()) {
    const today = dayKey(now);
    if (h.settled === today) return [];
    h.settled = today;
    const done = Object.keys(h.days).filter(k => h.days[k] === "done").map(Number).filter(d => d < today);
    if (!done.length) return [];
    const last = Math.max(...Object.keys(h.days).map(Number).filter(d => d < today));
    const frozen = [];
    for (let day = last + 1; day < today; day++) {
      const week = weekKey(day);
      if (h.freezes[week] != null) break;
      h.freezes[week] = day;
      h.days[day] = "frozen";
      frozen.push(day);
    }
    // A gap longer than the freezes could cover leaves the streak broken; the
    // used freezes stay used (the bridge would not reach today anyway), so undo them.
    if (frozen.length && frozen[frozen.length - 1] !== today - 1) {
      for (const day of frozen) {
        delete h.days[day];
        delete h.freezes[weekKey(day)];
      }
      return [];
    }
    prune(h, today);
    return frozen;
  }

  function prune(h, today) {
    for (const k of Object.keys(h.days)) if (Number(k) < today - KEEP_DAYS) delete h.days[k];
    for (const k of Object.keys(h.freezes)) if (Number(k) < weekKey(today) - 60) delete h.freezes[k];
  }

  /** Completed days in a row (frozen days bridge but do not count), ending today or yesterday. */
  function streak(h, now = Date.now()) {
    const today = dayKey(now);
    let day = h.days[today] === "done" ? today : today - 1;
    let count = 0;
    while (h.days[day]) {
      if (h.days[day] === "done") count += 1;
      day -= 1;
    }
    return count;
  }

  /** Whether this week's freeze is still unused. */
  function freezeAvailable(h, now = Date.now()) {
    return h.freezes[weekKey(dayKey(now))] == null;
  }

  /**
   * Today's goal. ctx: { due, newAvailable, goalNew, now }.
   *   due           words due right now (already introduced)
   *   newAvailable  new words left in the library
   * → { done, justDone, dueLeft, newLeft, newLearned, goalNew, minutes, streak, freezeAvailable }
   * Marks the day done the first time the goal is met (justDone is then true).
   */
  function today(h, { due = 0, newAvailable = 0, goalNew = 10, now = Date.now() } = {}) {
    const day = dayKey(now);
    rollToday(h, day);
    const newTarget = Math.min(goalNew, h.today.newLearned + Math.max(0, newAvailable));
    const newLeft = Math.max(0, newTarget - h.today.newLearned);
    const dueLeft = Math.max(0, due);
    let justDone = false;
    if (h.days[day] !== "done" && h.today.answers > 0 && dueLeft === 0 && newLeft === 0) {
      h.days[day] = "done";
      justDone = true;
    }
    const done = h.days[day] === "done";
    // A review is about one pair; a new word takes about three (learning steps).
    const minutes = done ? 0 : Math.max(1, Math.round((dueLeft * 1.3 + newLeft * 3) * h.pairMs / 60000));
    return {
      done, justDone, dueLeft, newLeft,
      newLearned: h.today.newLearned, goalNew: newTarget,
      minutes, streak: streak(h, now), freezeAvailable: freezeAvailable(h, now)
    };
  }

  return { normalize, recordAnswer, settle, streak, today, freezeAvailable, dayKey, weekKey, DAY_MS };
});
