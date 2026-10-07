#!/usr/bin/env node
/*
 * Compare review policies on simulated learners.
 *
 *   node tools/simulate.js [days] [seed] [library size]
 *
 * Each learner has a "true" memory (FSRS-6 shape with personal multipliers the
 * policies never see) and plays a fixed number of matching pairs per day. The
 * matching board lets a learner guess by elimination, so a forgotten word is
 * still matched correctly some of the time.
 *
 * Policies:
 *   leitner   – the old Word Snap review boxes (levels of up to 20 words)
 *   fsrs      – this engine with fixed default weights, retention 0.9, capacity 14
 *   engine    – this engine with the personal fit and the bandit
 *
 * Reported per learner: words known a week after the last day (sum of true
 * recall probability over introduced words), and words with true recall ≥ 0.9
 * on the last day.
 */
"use strict";
const E = require("../js/engine.js");

const DAY = E.DAY_MS;
const DAYS = Number(process.argv[2]) || 30;
const SEED = Number(process.argv[3]) || 7;
const LIBRARY = Number(process.argv[4]) || 2000;
const PAIRS_PER_DAY = 150;
const GUESS = 0.25;

const LEARNERS = [
  { name: "fast forgetter", scale: 0.4 },
  { name: "average", scale: 1 },
  { name: "slow forgetter", scale: 2.5 }
];

function makeLibrary() {
  return Array.from({ length: LIBRARY }, (_, i) => ({ id: `w${i}`, en: `word${i}`, zh: `词${i}`, seen: 0, mistakes: 0 }));
}

/** The learner's real memory, hidden from the policies. */
function makeLearner(scale, rng) {
  const w = E.personalWeights([Math.log(scale), Math.log(scale) * 0.8, 0]);
  const mem = new Map();
  return {
    answer(id, now) {
      const m = mem.get(id);
      const R = m ? E.retrievabilityAt(w, (now - m.last) / DAY, m.S) : 0;
      const knows = rng() < R;
      const correct = knows || rng() < GUESS;
      const ms = knows ? 1200 + 2500 * (1 - R) * rng() + 400 * rng() : 3500 + 3000 * rng();
      const g = !knows ? E.GRADES.AGAIN : R > 0.95 ? E.GRADES.EASY : E.GRADES.GOOD;
      const next = E.step(w, m ? { S: m.S, D: m.D } : null, m ? (now - m.last) / DAY : 0, g);
      mem.set(id, { S: next.S, D: next.D, last: now });
      return { correct, ms };
    },
    recall(id, now) {
      const m = mem.get(id);
      return m ? E.retrievabilityAt(w, (now - m.last) / DAY, m.S) : 0;
    }
  };
}

function dayStart(d) { return new Date(2026, 0, 5 + d, 19, 0, 0).getTime(); }

function runEngine(learner, rng, { fixed }) {
  const lib = makeLibrary();
  const eng = E.create(null, { rng, fixedArm: fixed ? E.ARMS.findIndex(a => a.r === 0.9 && a.k === 14) : null });
  for (let d = 0; d < DAYS; d++) {
    let now = dayStart(d);
    const board = [];
    for (let p = 0; p < PAIRS_PER_DAY; p++) {
      const newOrder = lib.filter(w => !w.srs);
      const word = eng.nextWord(lib, { now, exclude: new Set(board.map(w => w.id)), onBoard: board, newOrder });
      if (!word) break;
      board.push(word);
      if (board.length > 4) board.shift();
      const res = learner.answer(word.id, now);
      const g = eng.grade(res.correct, res.ms);
      eng.recordAnswer(word, g, now, { ms: res.ms });
      now += res.ms + (res.correct ? 800 : 2500);
      if (eng.blockDue()) eng.endBlock(now);
      if (!fixed && p % 25 === 0) eng.maybeOptimize();
    }
  }
  return { lib, eng };
}

/** The old box scheduler, played as levels of up to 20 words. */
function runLeitner(learner) {
  const lib = makeLibrary().map(w => ({ ...w, box: 0, dueRound: 0, dueAt: 0, introduced: false }));
  const ROUND_GAPS = [1, 2, 4];
  const DAY_GAPS = [0, 0, 1, 1, 3, 14];
  const TIME_GAPS = [30 * 60000, 4 * 3600000];
  let round = 1;
  const dueAtFor = (box, now) => box < 2 ? now + TIME_GAPS[box] : new Date(new Date(now).setHours(4, 0, 0, 0) + DAY_GAPS[box] * DAY).getTime();
  const isDue = (w, now) => w.introduced && ((w.box < 3 && round >= w.dueRound) || (w.dueAt > 0 && now >= w.dueAt));
  for (let d = 0; d < DAYS; d++) {
    let now = dayStart(d);
    let pairs = 0;
    while (pairs < PAIRS_PER_DAY) {
      const introduced = lib.filter(w => w.introduced);
      const due = introduced.filter(w => isDue(w, now));
      const missed = due.filter(w => w.box === 0);
      const review = due.filter(w => w.box > 0).sort((a, b) => a.box - b.box);
      const limit = 20;
      const queue = [...missed, ...review].slice(0, limit);
      const learning = introduced.filter(w => w.box <= 1).length;
      const allowance = Math.min(7, Math.max(0, limit - learning), limit - queue.length);
      let chosen = [...queue, ...lib.filter(w => !w.introduced).slice(0, allowance)];
      if (chosen.length < 10) chosen = [...chosen, ...introduced.filter(w => !chosen.includes(w)).sort((a, b) => a.box - b.box).slice(0, 10 - chosen.length)];
      for (const w of chosen) {
        if (pairs >= PAIRS_PER_DAY) break;
        const res = learner.answer(w.id, now);
        w.introduced = true;
        const box = res.correct ? (isDue(w, now) || w.box === 0 ? w.box + 1 : w.box) : 0;
        w.box = Math.min(5, box);
        w.dueRound = w.box < 3 ? round + ROUND_GAPS[w.box] : 0;
        w.dueAt = dueAtFor(w.box, now);
        now += res.ms + (res.correct ? 800 : 2500);
        pairs++;
      }
      round++;
    }
  }
  return { lib: lib.map(w => (w.introduced ? { ...w, srs: {} } : w)) };
}

function score(learner, lib) {
  const end = dayStart(DAYS - 1) + 2 * 3600000;
  const later = end + 7 * DAY;
  let week = 0, strong = 0, introduced = 0;
  for (const w of lib) {
    if (!w.srs) continue;
    introduced++;
    week += learner.recall(w.id, later);
    if (learner.recall(w.id, end) >= 0.9) strong++;
  }
  return { introduced, week: Math.round(week), strong };
}

const rows = [];
for (const L of LEARNERS) {
  for (const policy of ["leitner", "fsrs", "engine"]) {
    const rng = E.makeRng(SEED * 31 + L.scale * 100);
    const learner = makeLearner(L.scale, E.makeRng(SEED * 97 + L.scale * 1000));
    const run = policy === "leitner" ? runLeitner(learner) : runEngine(learner, rng, { fixed: policy === "fsrs" });
    const s = score(learner, run.lib);
    const extra = run.eng ? ` theta=[${run.eng.state.theta.map(x => x.toFixed(2)).join(", ")}] arm=r${run.eng.currentArm().r}/k${run.eng.currentArm().k}` : "";
    rows.push({ learner: L.name, policy, ...s, extra });
  }
}

console.log(`${DAYS} days × ${PAIRS_PER_DAY} pairs/day, library ${LIBRARY}, seed ${SEED}\n`);
console.log("learner          policy    introduced  known after +7d  recall≥0.9 on last day");
for (const r of rows) {
  console.log(`${r.learner.padEnd(16)} ${r.policy.padEnd(9)} ${String(r.introduced).padStart(10)}  ${String(r.week).padStart(15)}  ${String(r.strong).padStart(22)}${r.extra}`);
}
