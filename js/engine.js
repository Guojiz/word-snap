/*
 * Word Snap review engine.
 *
 * - Memory model: difficulty / stability / retrievability, using the FSRS-6
 *   formulas and published default weights as the starting point.
 * - Personal fit: three log-scale multipliers on top of those weights are fitted
 *   to *this* learner's own review log (log-loss, L2 pull back to the defaults).
 * - Grades are automatic: right/wrong plus reaction time against the learner's
 *   own recent times. Nobody has to rate themselves.
 * - Short-term learning steps count matched pairs (with a time fallback), so a
 *   missed word comes back a few cards later in an endless stream.
 * - Push policy: a Thompson-sampling bandit picks the target retention and the
 *   new-word capacity per block, rewarded by memory gained per minute.
 *
 * No DOM access. Works as a classic browser script (window.WordSnapEngine) and
 * as a CommonJS module for Node tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WordSnapEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DAY_MS = 24 * 60 * 60 * 1000;
  const MIN_MS = 60 * 1000;
  const DAY_CUTOFF_HOUR = 4;

  // FSRS-6 default weights.
  const DEFAULT_W = Object.freeze([
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
    0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542
  ]);
  const S_MIN = 0.001;
  const S_MAX = 36500;

  const AGAIN = 1, HARD = 2, GOOD = 3, EASY = 4;

  // Learning steps: [pairs until due, minutes fallback].
  const STEP_GAPS = { 1: [4, 1], 2: [12, 10] };
  // Never show the same word again within this many pairs unless nothing else is left.
  const MIN_PAIR_GAP = 3;

  const ARMS = (() => {
    const arms = [];
    for (const r of [0.8, 0.85, 0.9]) for (const k of [8, 14, 24]) arms.push({ r, k });
    return arms;
  })();
  const DEFAULT_ARM = ARMS.findIndex(a => a.r === 0.9 && a.k === 14);

  const LOG_MAX = 3000;
  const OPTIMIZE_EVERY = 100;
  const VALUE_HORIZON_DAYS = 7;

  // ---------- small helpers ----------

  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  function isNum(x) { return typeof x === "number" && Number.isFinite(x); }

  /** Calendar day index with a 4 am cutoff, in local time. */
  function dayKey(ts) {
    const d = new Date(ts - DAY_CUTOFF_HOUR * 60 * 60 * 1000);
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
  }

  /** Start (ms) of the learner's day `offset` days after the day containing `ts`. */
  function dayStartMs(ts, offset = 0) {
    const d = new Date(ts - DAY_CUTOFF_HOUR * 60 * 60 * 1000);
    d.setHours(DAY_CUTOFF_HOUR, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d.getTime();
  }

  // Seeded RNG so tests and simulations are repeatable.
  function makeRng(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function gaussian(rng) {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ---------- memory model (FSRS-6 formulas) ----------

  /** Weights with the learner's personal multipliers applied. theta = [init, growth, lapse] in log space. */
  function personalWeights(theta) {
    const w = DEFAULT_W.slice();
    const [a, b, c] = theta || [0, 0, 0];
    for (let i = 0; i < 4; i++) w[i] = w[i] * Math.exp(a);
    w[8] = w[8] + b;
    w[11] = w[11] * Math.exp(c);
    return w;
  }

  function decayOf(w) { return -w[20]; }
  function factorOf(w) { const d = decayOf(w); return Math.pow(0.9, 1 / d) - 1; }

  function retrievabilityAt(w, elapsedDays, S) {
    if (!(S > 0)) return 0;
    return Math.pow(1 + factorOf(w) * Math.max(0, elapsedDays) / S, decayOf(w));
  }

  /** Days until retrievability falls to `r`. */
  function intervalFor(w, S, r) {
    return (S / factorOf(w)) * (Math.pow(r, 1 / decayOf(w)) - 1);
  }

  function initStability(w, g) { return clamp(w[g - 1], S_MIN, S_MAX); }
  function initDifficulty(w, g) { return clamp(w[4] - Math.exp(w[5] * (g - 1)) + 1, 1, 10); }

  function nextDifficulty(w, D, g) {
    const delta = -w[6] * (g - 3);
    const damped = D + delta * (10 - D) / 9;
    return clamp(w[7] * initDifficulty(w, EASY) + (1 - w[7]) * damped, 1, 10);
  }

  function shortTermStability(w, S, g) {
    let inc = Math.exp(w[17] * (g - 3 + w[18])) * Math.pow(S, -w[19]);
    if (g >= GOOD) inc = Math.max(inc, 1);
    return clamp(S * inc, S_MIN, S_MAX);
  }

  function recallStability(w, D, S, R, g) {
    const hard = g === HARD ? w[15] : 1;
    const easy = g === EASY ? w[16] : 1;
    const inc = Math.exp(w[8]) * (11 - D) * Math.pow(S, -w[9]) * (Math.exp((1 - R) * w[10]) - 1) * hard * easy;
    return clamp(S * (1 + inc), S_MIN, S_MAX);
  }

  function forgetStability(w, D, S, R) {
    const long = w[11] * Math.pow(D, -w[12]) * (Math.pow(S + 1, w[13]) - 1) * Math.exp((1 - R) * w[14]);
    const short = S / Math.exp(w[17] * w[18]);
    return clamp(Math.min(long, short), S_MIN, S_MAX);
  }

  /**
   * One review step. `card` is {S, D} or null for a first answer.
   * Returns the new {S, D, R} where R is what the model predicted before the answer.
   */
  function step(w, card, elapsedDays, g) {
    if (!card || !(card.S > 0)) {
      return { S: initStability(w, g), D: initDifficulty(w, g), R: null };
    }
    const R = retrievabilityAt(w, elapsedDays, card.S);
    let S;
    if (elapsedDays < 1) S = shortTermStability(w, card.S, g);
    else if (g === AGAIN) S = forgetStability(w, card.D, card.S, R);
    else S = recallStability(w, card.D, card.S, R, g);
    return { S, D: nextDifficulty(w, card.D, g), R };
  }

  // ---------- personal fit ----------

  /** Group the log by word, in time order. */
  function groupLog(log) {
    const byWord = new Map();
    for (const e of log) {
      if (!byWord.has(e.i)) byWord.set(e.i, []);
      byWord.get(e.i).push(e);
    }
    for (const list of byWord.values()) list.sort((a, b) => a.t - b.t);
    return byWord;
  }

  /** Mean log-loss of cross-day predictions when the log is replayed with these multipliers. */
  function replayLoss(groups, theta) {
    const w = personalWeights(theta);
    let loss = 0, n = 0;
    for (const list of groups.values()) {
      let card = null, last = 0;
      for (const e of list) {
        const elapsed = card ? (e.t - last) / DAY_MS : 0;
        const next = step(w, card, elapsed, e.g);
        if (card && elapsed >= 1) {
          const p = clamp(next.R, 1e-4, 1 - 1e-4);
          const y = e.g > AGAIN ? 1 : 0;
          loss -= y * Math.log(p) + (1 - y) * Math.log(1 - p);
          n += 1;
        }
        card = { S: next.S, D: next.D };
        last = e.t;
      }
    }
    return { loss: n ? loss / n : 0, n };
  }

  /**
   * Fit the three multipliers to a review log. Finite-difference gradient
   * descent with an L2 pull towards the published defaults (theta = 0), so a
   * short log barely moves anything.
   */
  function fitTheta(log, start, opts = {}) {
    const groups = groupLog(log);
    const base = replayLoss(groups, start || [0, 0, 0]);
    if (base.n < (opts.minSamples || 30)) return { theta: (start || [0, 0, 0]).slice(), loss: base.loss, n: base.n, fitted: false };
    const lambda = (opts.lambda != null ? opts.lambda : 2) / base.n;
    const objective = th => replayLoss(groups, th).loss + lambda * th.reduce((s, x) => s + x * x, 0);
    let theta = (start || [0, 0, 0]).slice();
    let lr = opts.lr || 0.5;
    let current = objective(theta);
    const h = 1e-3;
    for (let iter = 0; iter < (opts.iterations || 60); iter++) {
      const grad = theta.map((_, k) => {
        const up = theta.slice(); up[k] += h;
        const dn = theta.slice(); dn[k] -= h;
        return (objective(up) - objective(dn)) / (2 * h);
      });
      const candidate = theta.map((x, k) => clamp(x - lr * grad[k], -2.5, 2.5));
      const value = objective(candidate);
      if (value < current) {
        theta = candidate;
        current = value;
        lr *= 1.1;
      } else {
        lr *= 0.5;
        if (lr < 1e-4) break;
      }
    }
    return { theta, loss: replayLoss(groups, theta).loss, n: base.n, fitted: true };
  }

  // ---------- similarity (look-alike words) ----------

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  /** 0..1, how easily two spellings get mixed up. */
  function similarity(a, b) {
    a = String(a || "").toLowerCase().trim();
    b = String(b || "").toLowerCase().trim();
    if (!a || !b || a === b) return 0;
    const len = Math.max(a.length, b.length);
    let score = 1 - levenshtein(a, b) / len;
    let pre = 0;
    while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
    let suf = 0;
    while (suf < a.length && suf < b.length && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
    if (pre >= 3) score += 0.1;
    if (suf >= 3) score += 0.05;
    return clamp(score, 0, 1);
  }

  // ---------- engine ----------

  function blankState() {
    return {
      v: 1,
      theta: [0, 0, 0],
      log: [],
      sinceFit: 0,
      lastFitLoss: null,
      rt: [],
      pairs: 0,
      bandit: { arms: ARMS.map(() => ({ n: 0, sum: 0, sumSq: 0 })), cur: DEFAULT_ARM, all: { n: 0, sum: 0, sumSq: 0 } },
      block: null
    };
  }

  function normalizeState(raw) {
    const s = blankState();
    if (!raw || typeof raw !== "object") return s;
    if (Array.isArray(raw.theta) && raw.theta.length === 3 && raw.theta.every(isNum)) s.theta = raw.theta.slice();
    if (Array.isArray(raw.log)) s.log = raw.log.filter(e => e && e.i != null && isNum(e.t) && e.g >= 1 && e.g <= 4).slice(-LOG_MAX);
    if (isNum(raw.sinceFit)) s.sinceFit = raw.sinceFit;
    if (isNum(raw.lastFitLoss)) s.lastFitLoss = raw.lastFitLoss;
    if (Array.isArray(raw.rt)) s.rt = raw.rt.filter(x => isNum(x) && x > 0).slice(-80);
    if (isNum(raw.pairs)) s.pairs = raw.pairs;
    const b = raw.bandit;
    if (b && Array.isArray(b.arms) && b.arms.length === ARMS.length) {
      s.bandit.arms = b.arms.map(a => ({ n: +a.n || 0, sum: +a.sum || 0, sumSq: +a.sumSq || 0 }));
      if (isNum(b.cur) && b.cur >= 0 && b.cur < ARMS.length) s.bandit.cur = b.cur;
      if (b.all) s.bandit.all = { n: +b.all.n || 0, sum: +b.all.sum || 0, sumSq: +b.all.sumSq || 0 };
    }
    return s;
  }

  /**
   * Fill in / migrate per-word scheduling fields. Old saves used review boxes
   * 0–5; map them onto a stability that keeps roughly the same due date.
   */
  function ensureWord(word, now) {
    if (word.srs && isNum(word.srs.S)) return word;
    const answered = (word.seen || 0) + (word.mistakes || 0) > 0;
    if (!answered) {
      word.srs = null;
      return word;
    }
    const BOX_S = [0.02, 0.15, 1, 2, 5, 20];
    const box = clamp(Math.round(isNum(word.box) ? word.box : 0), 0, 5);
    const S = BOX_S[box];
    const total = (word.seen || 0) + (word.mistakes || 0);
    const missRate = total ? (word.mistakes || 0) / total : 0;
    const due = isNum(word.dueAt) && word.dueAt > 0 ? word.dueAt : now;
    word.srs = {
      S,
      D: clamp(3 + 6 * missRate, 1, 10),
      lastAt: Math.min(now, due - intervalFor(DEFAULT_W, S, 0.9) * DAY_MS),
      reps: total,
      lapses: word.mistakes || 0,
      step: box <= 1 ? 1 : 0,
      stepDuePair: 0,
      stepDueAt: box <= 1 ? due : 0,
      lastPair: -Infinity,
      days: box >= 5 ? 3 : box >= 3 ? 2 : 1,
      lastDay: dayKey(Math.min(now, due))
    };
    return word;
  }

  function create(raw, opts = {}) {
    const state = normalizeState(raw);
    const rng = opts.rng || Math.random;
    const blockSize = opts.blockSize || 25;
    const fixedArm = isNum(opts.fixedArm) ? opts.fixedArm : null;
    if (fixedArm !== null) state.bandit.cur = fixedArm;
    let w = personalWeights(state.theta);

    function arm() { return ARMS[state.bandit.cur] || ARMS[DEFAULT_ARM]; }

    function isNew(word) { return !word.srs; }

    function retrievability(word, now) {
      if (isNew(word)) return 0;
      return retrievabilityAt(w, (now - word.srs.lastAt) / DAY_MS, word.srs.S);
    }

    function inLearning(word) { return !isNew(word) && word.srs.step > 0; }

    function stepDue(word, now) {
      const s = word.srs;
      return s.step > 0 && (state.pairs >= s.stepDuePair || (s.stepDueAt > 0 && now >= s.stepDueAt));
    }

    function reviewDue(word, now, target) {
      return !isNew(word) && word.srs.step === 0 && retrievability(word, now) <= target;
    }

    /** Words being learned right now: introduced and still in a short-term learning step. */
    function learningLoad(words) {
      let n = 0;
      for (const word of words) if (inLearning(word)) n++;
      return n;
    }

    function stageOf(word, now = Date.now()) {
      if (isNew(word)) return "new";
      const s = word.srs;
      if (s.step > 0 || s.S < 1) return "learning";
      if (s.S >= 21 && s.days >= 3) return "mastered";
      return "review";
    }

    /** Next due time (ms) for display and the 7-day forecast. */
    function dueAt(word, now = Date.now()) {
      if (isNew(word)) return Infinity;
      const s = word.srs;
      if (s.step > 0) return s.stepDueAt || now;
      return s.lastAt + intervalFor(w, s.S, arm().r) * DAY_MS;
    }

    /**
     * Automatic grade from the board: wrong → Again; right → Hard / Good / Easy
     * by reaction time against this learner's own recent correct answers.
     */
    function grade(correct, ms) {
      if (!correct) return AGAIN;
      const times = state.rt.slice().sort((a, b) => a - b);
      if (times.length < 10 || !(ms > 0)) return GOOD;
      const q = p => times[Math.min(times.length - 1, Math.floor(p * times.length))];
      if (ms <= q(0.2)) return EASY;
      if (ms >= q(0.85)) return HARD;
      return GOOD;
    }

    function value(S) { return S > 0 ? retrievabilityAt(w, VALUE_HORIZON_DAYS, S) : 0; }

    function ensureBlock(now) {
      if (!state.block) {
        state.block = { startAt: now, pairs: 0, gain: 0, right: 0, wrong: 0, fresh: 0, missRun: 0, maxMissRun: 0, confusions: [] };
      }
      return state.block;
    }

    /**
     * Record one answer. `g` is 1–4 (use grade()). `ms` is the reaction time of
     * a correct match (used to adapt grading), `kind` is "match" | "spell" | "sentence".
     */
    function recordAnswer(word, g, now = Date.now(), info = {}) {
      g = clamp(Math.round(g), AGAIN, EASY);
      const fresh = isNew(word);
      const before = fresh ? 0 : value(word.srs.S);
      const prev = fresh ? null : word.srs;
      const elapsed = prev ? Math.max(0, (now - prev.lastAt) / DAY_MS) : 0;
      const next = step(w, prev ? { S: prev.S, D: prev.D } : null, elapsed, g);
      const today = dayKey(now);
      const s = prev || { reps: 0, lapses: 0, step: 0, days: 0, lastDay: null, lastPair: -Infinity };
      s.S = next.S;
      s.D = next.D;
      s.lastAt = now;
      s.reps = (s.reps || 0) + 1;
      if (g === AGAIN && prev) s.lapses = (s.lapses || 0) + 1;
      if (s.lastDay !== today) {
        s.days = (s.days || 0) + 1;
        s.lastDay = today;
      }

      // Learning steps (short-term, counted in pairs so an endless stream works).
      if (g === AGAIN) s.step = 1;
      else if (g === EASY) s.step = 0;
      else if (g === GOOD) s.step = s.step === 1 ? 2 : (fresh ? 2 : 0);
      else if (g === HARD) s.step = fresh ? 1 : s.step; // Hard keeps the current step
      if (s.step > 0) {
        const [pairs, minutes] = STEP_GAPS[s.step];
        s.stepDuePair = state.pairs + pairs;
        s.stepDueAt = now + minutes * MIN_MS;
      } else {
        s.stepDuePair = 0;
        s.stepDueAt = 0;
      }
      state.pairs += 1;
      s.lastPair = state.pairs;
      word.srs = s;

      state.log.push({ i: word.id, t: now, g });
      if (state.log.length > LOG_MAX) state.log.splice(0, state.log.length - LOG_MAX);
      state.sinceFit += 1;
      if (g > AGAIN && (info.kind || "match") === "match" && info.ms > 0) {
        state.rt.push(Math.round(info.ms));
        if (state.rt.length > 80) state.rt.shift();
      }

      const block = ensureBlock(now);
      block.pairs += 1;
      block.gain += value(s.S) - before;
      if (fresh) block.fresh += 1;
      if (g === AGAIN) {
        block.wrong += 1;
        block.missRun += 1;
        block.maxMissRun = Math.max(block.maxMissRun, block.missRun);
      } else {
        block.right += 1;
        block.missRun = 0;
      }
      return { grade: g, predicted: next.R, stage: stageOf(word, now) };
    }

    /** The card picked by mistake: it was mixed up, so it loses some stability, without a log entry. */
    function penalizeWrongPick(word, now = Date.now()) {
      if (isNew(word)) return;
      const s = word.srs;
      s.S = clamp(s.S * 0.6, S_MIN, S_MAX);
      s.D = clamp(s.D + 0.5, 1, 10);
      if (s.step === 0 && s.S < 1) {
        s.step = 1;
        s.stepDuePair = state.pairs + STEP_GAPS[1][0];
        s.stepDueAt = now + STEP_GAPS[1][1] * MIN_MS;
      }
    }

    function recordConfusion(a, b) {
      for (const [x, y] of [[a, b], [b, a]]) {
        if (!x.confusions || typeof x.confusions !== "object") x.confusions = {};
        x.confusions[y.id] = (x.confusions[y.id] || 0) + 1;
      }
      ensureBlock(Date.now()).confusions.push([a.id, b.id]);
    }

    /**
     * Rank everything that could go on the board next.
     * Returns buckets in priority order; each bucket is sorted.
     */
    function buckets(words, ctx) {
      const now = ctx.now || Date.now();
      const target = ctx.target || arm().r;
      const exclude = ctx.exclude || new Set();
      const mode = ctx.mode || "adaptive";
      const steps = [], due = [], fresh = [], waiting = [], rest = [];
      for (const word of words) {
        if (exclude.has(word.id)) continue;
        if (isNew(word)) { fresh.push(word); continue; }
        if (mode === "weak" && !(inLearning(word) || word.srs.lapses > 0 || retrievability(word, now) < 0.8)) continue;
        if (inLearning(word)) (stepDue(word, now) ? steps : waiting).push(word);
        else if (reviewDue(word, now, target)) due.push(word);
        else if (ctx.recycleMastered !== false || stageOf(word, now) !== "mastered") rest.push(word);
      }
      steps.sort((a, b) => a.srs.stepDuePair - b.srs.stepDuePair);
      waiting.sort((a, b) => a.srs.stepDuePair - b.srs.stepDuePair);
      due.sort((a, b) => retrievability(a, now) - retrievability(b, now));
      rest.sort((a, b) => retrievability(a, now) - retrievability(b, now));
      const order = ctx.newOrder;
      if (order && order.length) {
        const pos = new Map(order.map((wd, i) => [wd.id, i]));
        fresh.sort((a, b) => (pos.has(a.id) ? pos.get(a.id) : 1e9) - (pos.has(b.id) ? pos.get(b.id) : 1e9));
      }
      return { steps, due, fresh: mode === "weak" ? [] : fresh, waiting, rest, now };
    }

    function tooRecent(word) {
      return !isNew(word) && state.pairs - (word.srs.lastPair || -Infinity) < MIN_PAIR_GAP;
    }

    /**
     * Pick the next word for an endless board.
     * ctx: { now, exclude:Set(ids on board), onBoard:[words], newOrder:[words], mode, recycleMastered }
     */
    function nextWord(words, ctx = {}) {
      const b = buckets(words, ctx);
      const capacity = arm().k;
      const load = learningLoad(words);

      // Sometimes put a mixed-up or look-alike partner next to a word already on the board.
      if (ctx.onBoard && ctx.onBoard.length && rng() < (ctx.partnerChance != null ? ctx.partnerChance : 0.3)) {
        const pool = [...b.steps, ...b.due, ...b.waiting, ...b.rest].filter(wd => !tooRecent(wd));
        let best = null, bestScore = 0;
        for (const shown of ctx.onBoard) {
          const conf = shown.confusions || {};
          for (const cand of pool) {
            const score = (conf[cand.id] ? 0.6 + 0.1 * Math.min(4, conf[cand.id]) : 0) + similarity(shown.en, cand.en);
            if (score > bestScore) { bestScore = score; best = cand; }
          }
        }
        if (best && bestScore >= 0.55) return best;
      }

      for (const list of [b.steps, b.due]) {
        const pick = list.find(wd => !tooRecent(wd));
        if (pick) return pick;
      }
      // Nothing is due: learn something new while fewer than `capacity` words are in
      // learning steps — an endless stream should not stall on pre-reviews.
      if (b.fresh.length && load < capacity) return b.fresh[0];
      for (const list of [b.waiting, b.rest]) {
        const pick = list.find(wd => !tooRecent(wd));
        if (pick) return pick;
      }
      // Small library: allow a recent word rather than leave the board empty.
      return b.steps[0] || b.due[0] || b.waiting[0] || b.rest[0] || b.fresh[0] || null;
    }

    /** A fixed set of words for one timed level (the optional level mode). */
    function pickBatch(words, n, ctx = {}) {
      const b = buckets(words, ctx);
      const chosen = [...b.steps, ...b.due].slice(0, n);
      const capacity = arm().k;
      const allowance = Math.max(0, Math.min(n - chosen.length, capacity - learningLoad(words), Math.max(5, Math.round(n / 3))));
      chosen.push(...b.fresh.slice(0, allowance));
      const minRound = Math.min(n, ctx.minRound || 10);
      if (chosen.length < minRound) chosen.push(...b.rest.slice(0, minRound - chosen.length));
      if (chosen.length < minRound) chosen.push(...b.fresh.filter(wd => !chosen.includes(wd)).slice(0, minRound - chosen.length));
      return chosen;
    }

    /** Close the current block: reward the bandit arm used, pick the next arm. Returns the block summary. */
    function endBlock(now = Date.now()) {
      const block = state.block;
      state.block = null;
      if (!block || block.pairs < 5) return block;
      const minutes = Math.max(1, (now - block.startAt) / MIN_MS);
      const reward = block.gain / minutes - 0.05 * Math.max(0, block.maxMissRun - 2);
      const bandit = state.bandit;
      const a = bandit.arms[bandit.cur];
      a.n += 1; a.sum += reward; a.sumSq += reward * reward;
      bandit.all.n += 1; bandit.all.sum += reward; bandit.all.sumSq += reward * reward;
      bandit.cur = chooseArm();
      return { ...block, minutes, reward, arm: ARMS[bandit.cur] };
    }

    function chooseArm() {
      if (fixedArm !== null) return fixedArm;
      const { arms, all } = state.bandit;
      if (all.n < 2) return DEFAULT_ARM;
      const mean = all.sum / all.n;
      const sd = Math.sqrt(Math.max(1e-6, all.sumSq / all.n - mean * mean));
      let best = DEFAULT_ARM, bestDraw = -Infinity;
      arms.forEach((a, i) => {
        const m = a.n ? a.sum / a.n : mean;
        const spread = a.n ? sd / Math.sqrt(a.n) : sd * 1.5;
        const draw = m + spread * gaussian(rng);
        if (draw > bestDraw) { bestDraw = draw; best = i; }
      });
      return best;
    }

    function blockDue() { return !!state.block && state.block.pairs >= blockSize; }

    /** Re-fit the personal multipliers when enough new reviews have come in. */
    function maybeOptimize(force = false) {
      if (!force && state.sinceFit < OPTIMIZE_EVERY) return false;
      const result = fitTheta(state.log, state.theta);
      state.sinceFit = 0;
      if (!result.fitted) return false;
      state.theta = result.theta;
      state.lastFitLoss = result.loss;
      w = personalWeights(state.theta);
      return true;
    }

    /** How many reviews fall due on each of the next `days` learner-days (index 0 = today, incl. overdue). */
    function forecast(words, days = 7, now = Date.now()) {
      const counts = new Array(days).fill(0);
      const ends = [];
      for (let d = 0; d < days; d++) ends.push(dayStartMs(now, d + 1));
      for (const word of words) {
        if (isNew(word)) continue;
        const at = dueAt(word, now);
        for (let d = 0; d < days; d++) {
          if (at < ends[d]) { counts[d] += 1; break; }
        }
      }
      return counts;
    }

    function serialize() {
      return JSON.parse(JSON.stringify(state));
    }

    return {
      state,
      grade,
      recordAnswer,
      penalizeWrongPick,
      recordConfusion,
      nextWord,
      pickBatch,
      endBlock,
      blockDue,
      maybeOptimize,
      forecast,
      stageOf,
      dueAt,
      retrievability,
      isNew,
      inLearning,
      learningLoad,
      ensureWord: word => ensureWord(word, Date.now()),
      currentArm: arm,
      currentBlock: () => state.block,
      weights: () => w.slice(),
      serialize
    };
  }

  return {
    create,
    ensureWord,
    similarity,
    fitTheta,
    personalWeights,
    retrievabilityAt,
    intervalFor,
    step,
    dayKey,
    dayStartMs,
    makeRng,
    DEFAULT_W,
    ARMS,
    GRADES: { AGAIN, HARD, GOOD, EASY },
    DAY_MS
  };
});
