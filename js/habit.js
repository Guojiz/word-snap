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
 * - Points: claimed at the end of each set (the set's correct pairs plus bonuses),
 *   kept per day for 60 days.
 * - Card rank (卡片段位), against yourself only: white, green, blue, violet, gold,
 *   rainbow. Each week's target is 10% above your own average of the last three
 *   weeks (at least 120). At the week's end: target met → up one rank; at least
 *   60% → stay; less → down one (never below white). No other learners involved.
 * - Weekly challenge: one of "goal done on 5 days", "30 new words", "3 full
 *   combos", rotating by week. Next stop: the next streak milestone.
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
  const LOG_DAYS = 60;
  const RANKS = 6; // white, green, blue, violet, gold, rainbow
  const MIN_TARGET = 120;
  const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
  const CHALLENGES = [{ kind: "days", goal: 5 }, { kind: "newWords", goal: 30 }, { kind: "fullCombos", goal: 3 }];

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
    const log = {};
    if (value.log && typeof value.log === "object") {
      for (const [k, v] of Object.entries(value.log)) {
        if (!/^\d+$/.test(k) || !v || typeof v !== "object") continue;
        log[k] = { p: isNum(v.p) ? Math.max(0, v.p) : 0, n: isNum(v.n) ? Math.max(0, v.n) : 0, fc: isNum(v.fc) ? Math.max(0, v.fc) : 0 };
      }
    }
    const r = value.rank && typeof value.rank === "object" ? value.rank : {};
    const last = r.last && typeof r.last === "object" && isNum(r.last.week) ? r.last : null;
    const rank = {
      tier: isNum(r.tier) ? Math.max(0, Math.min(RANKS - 1, Math.floor(r.tier))) : 0,
      week: isNum(r.week) ? r.week : null,
      target: isNum(r.target) && r.target > 0 ? r.target : MIN_TARGET,
      last: last ? { week: last.week, kind: String(last.kind), pts: Number(last.pts) || 0, target: Number(last.target) || 0, tier: Number(last.tier) || 0, seen: last.seen === true } : null
    };
    const t = value.today && typeof value.today === "object" ? value.today : {};
    const n = value.notice && typeof value.notice === "object" ? value.notice : null;
    return {
      days,
      freezes,
      log,
      rank,
      today: {
        day: isNum(t.day) ? t.day : null,
        newLearned: isNum(t.newLearned) ? Math.max(0, t.newLearned) : 0,
        answers: isNum(t.answers) ? Math.max(0, t.answers) : 0,
        // Words first learned today: their quick re-checks are part of learning them,
        // not extra "due" work, so the day's goal does not grow while you meet it.
        newIds: Array.isArray(t.newIds) ? t.newIds.filter(id => typeof id === "string").slice(-500) : []
      },
      pairMs: isNum(value.pairMs) && value.pairMs > 0 ? value.pairMs : DEFAULT_PAIR_MS,
      settled: isNum(value.settled) ? value.settled : null,
      best: isNum(value.best) ? Math.max(0, value.best) : 0,
      // What happened to the streak overnight, shown for that day: { day, kind: "frozen" | "broken", n }
      notice: n && isNum(n.day) && (n.kind === "frozen" || n.kind === "broken") && isNum(n.n) ? { day: n.day, kind: n.kind, n: n.n } : null
    };
  }

  function rollToday(h, day) {
    if (h.today.day !== day) h.today = { day, newLearned: 0, answers: 0, newIds: [] };
  }

  /** One answer (any card). wasNew: the word had never been answered. ms: time for a board pair. */
  function recordAnswer(h, { wasNew = false, ms = 0, now = Date.now(), id = null } = {}) {
    rollToday(h, dayKey(now));
    h.today.answers += 1;
    if (wasNew) {
      logDay(h, dayKey(now)).n += 1;
      h.today.newLearned += 1;
      if (id && !h.today.newIds.includes(id)) h.today.newIds.push(id);
    }
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
    if (last >= today - 1) return []; // nothing missed
    const before = streakFrom(h, last);
    h.best = Math.max(h.best || 0, before);
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
    if (!frozen.length || frozen[frozen.length - 1] !== today - 1) {
      for (const day of frozen) {
        delete h.days[day];
        delete h.freezes[weekKey(day)];
      }
      if (before >= 2) h.notice = { day: today, kind: "broken", n: before };
      return [];
    }
    h.notice = { day: today, kind: "frozen", n: before };
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
    return streakFrom(h, h.days[today] === "done" ? today : today - 1);
  }

  function streakFrom(h, day) {
    let count = 0;
    while (h.days[day]) {
      if (h.days[day] === "done") count += 1;
      day -= 1;
    }
    return count;
  }

  /** Today's streak notice ({ kind, n }) or null. */
  function noticeFor(h, now = Date.now()) {
    return h.notice && h.notice.day === dayKey(now) ? h.notice : null;
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
    const current = streak(h, now);
    h.best = Math.max(h.best || 0, current);
    return {
      done, justDone, dueLeft, newLeft,
      newLearned: h.today.newLearned, goalNew: newTarget,
      minutes, streak: current, best: h.best, freezeAvailable: freezeAvailable(h, now),
      notice: noticeFor(h, now)
    };
  }

  function logDay(h, day) {
    if (!h.log[day]) h.log[day] = { p: 0, n: 0, fc: 0 };
    for (const k of Object.keys(h.log)) if (Number(k) < day - LOG_DAYS) delete h.log[k];
    return h.log[day];
  }

  /** The end of a set: adds its points (and a full combo) to today. Returns today's points. */
  function claim(h, { points = 0, fullCombo = false, now = Date.now() } = {}) {
    const entry = logDay(h, dayKey(now));
    entry.p += Math.max(0, Math.round(points));
    if (fullCombo) entry.fc += 1;
    return entry.p;
  }

  /** The days (Monday first) of a week index. */
  function weekDays(week) {
    const monday = week * 7 - 3;
    return [0, 1, 2, 3, 4, 5, 6].map(i => monday + i);
  }

  function weekSum(h, week, field) {
    return weekDays(week).reduce((sum, day) => sum + (h.log[day] ? h.log[day][field] : 0), 0);
  }

  /** 10% above your own average of the three weeks before `week`, rounded to 10, at least MIN_TARGET. */
  function targetFor(h, week) {
    const avg = (weekSum(h, week - 1, "p") + weekSum(h, week - 2, "p") + weekSum(h, week - 3, "p")) / 3;
    return Math.max(MIN_TARGET, Math.round(avg * 1.1 / 10) * 10);
  }

  /**
   * This week's rank, settling the weeks that ended since the last call.
   * → { tier, ranks, pts, target, left, daysLeft, last }  (last: the result of
   * last week, until markRankSeen; kind "up" | "stay" | "down" | "top").
   */
  function rank(h, now = Date.now()) {
    const today = dayKey(now);
    const week = weekKey(today);
    const r = h.rank;
    if (r.week == null) {
      r.week = week;
      r.target = targetFor(h, week);
    }
    let guard = 0;
    while (r.week < week && guard++ < 60) {
      const pts = weekSum(h, r.week, "p");
      let kind = pts >= r.target ? "up" : pts >= r.target * 0.6 ? "stay" : "down";
      if (kind === "up") {
        if (r.tier < RANKS - 1) r.tier += 1;
        else kind = "top";
      } else if (kind === "down") {
        if (r.tier > 0) r.tier -= 1;
        else kind = "stay";
      }
      r.last = { week: r.week, kind, pts, target: r.target, tier: r.tier, seen: false };
      r.week += 1;
      r.target = targetFor(h, r.week);
    }
    const pts = weekSum(h, week, "p");
    const sunday = weekDays(week)[6];
    return {
      tier: r.tier, ranks: RANKS, pts, target: r.target, left: Math.max(0, r.target - pts),
      daysLeft: sunday - today + 1,
      last: r.last && r.last.week === week - 1 && !r.last.seen ? r.last : null
    };
  }

  function markRankSeen(h) {
    if (h.rank.last) h.rank.last.seen = true;
  }

  /** This week's challenge → { kind, goal, value, done }. */
  function challenge(h, now = Date.now()) {
    const today = dayKey(now);
    const week = weekKey(today);
    const { kind, goal } = CHALLENGES[((week % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length];
    const value = kind === "days"
      ? weekDays(week).filter(day => h.days[day] === "done").length
      : weekSum(h, week, kind === "newWords" ? "n" : "fc");
    return { kind, goal, value: Math.min(value, goal), done: value >= goal };
  }

  /** The next streak milestone → { at, left }, or null past the last one. */
  function nextStop(streakDays) {
    const at = MILESTONES.find(m => m > streakDays);
    return at ? { at, left: at - streakDays } : null;
  }

  /** This week, Monday first: [{ day, state: "done" | "frozen" | "today" | "missed" | "future" }]. */
  function weekStrip(h, now = Date.now()) {
    const today = dayKey(now);
    return weekDays(weekKey(today)).map(day => ({
      day,
      state: h.days[day] === "done" ? "done" : h.days[day] === "frozen" ? "frozen" : day === today ? "today" : day < today ? "missed" : "future"
    }));
  }

  /**
   * Daily reminders for the next `days` days at hour:minute (local time), as
   * [{ id, at }] with stable ids (base + day offset). Today's is left out when
   * the goal is already done or the time has passed.
   */
  function reminderPlan(h, { now = Date.now(), hour = 20, minute = 0, days = 7, base = 7100 } = {}) {
    const doneToday = h.days[dayKey(now)] === "done";
    const plan = [];
    for (let d = 0; d < days; d++) {
      const at = new Date(now);
      at.setDate(at.getDate() + d);
      at.setHours(hour, minute, 0, 0);
      const ts = at.getTime();
      if (ts <= now) continue;
      if (doneToday && dayKey(ts) === dayKey(now)) continue;
      plan.push({ id: base + d, at: ts });
    }
    return plan;
  }

  /** Whether the word was first learned today (its re-checks are not "due" work). */
  function learnedToday(h, id, now = Date.now()) {
    return h.today.day === dayKey(now) && h.today.newIds.includes(id);
  }

  return {
    normalize, recordAnswer, settle, streak, today, freezeAvailable, reminderPlan, learnedToday, noticeFor, dayKey, weekKey, DAY_MS,
    claim, rank, markRankSeen, challenge, nextStop, weekStrip, RANKS, MILESTONES
  };
});
