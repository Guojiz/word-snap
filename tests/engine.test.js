"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/engine.js");

const { AGAIN, HARD, GOOD, EASY } = E.GRADES;
const DAY = E.DAY_MS;
const T0 = new Date(2026, 9, 1, 12, 0, 0).getTime();

function words(n, prefix = "w") {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, en: `${prefix}word${i}`, zh: `词${i}`, seen: 0, mistakes: 0 }));
}

test("first Good on a new word matches the FSRS-6 initial stability", () => {
  const eng = E.create(null, { rng: E.makeRng(1) });
  const [w] = words(1);
  eng.recordAnswer(w, GOOD, T0);
  assert.ok(Math.abs(w.srs.S - 2.3065) < 1e-9);
  assert.equal(eng.stageOf(w, T0), "learning"); // still in a learning step
});

test("retrievability is 0.9 after one stability interval and decays over time", () => {
  const w = E.DEFAULT_W;
  assert.ok(Math.abs(E.retrievabilityAt(w, 5, 5) - 0.9) < 1e-9);
  assert.ok(E.retrievabilityAt(w, 10, 5) < 0.9);
  assert.ok(E.retrievabilityAt(w, 1, 5) > 0.9);
});

test("a later successful review grows stability, a lapse shrinks it", () => {
  const w = E.DEFAULT_W;
  const card = { S: 3, D: 5 };
  const ok = E.step(w, card, 4, GOOD);
  const miss = E.step(w, card, 4, AGAIN);
  assert.ok(ok.S > card.S);
  assert.ok(miss.S < card.S);
  assert.ok(miss.D > card.D);
  assert.ok(E.step(w, card, 4, EASY).S > ok.S);
  assert.ok(E.step(w, card, 4, HARD).S < ok.S);
});

test("automatic grades follow the learner's own reaction times", () => {
  const eng = E.create(null);
  assert.equal(eng.grade(false, 500), AGAIN);
  assert.equal(eng.grade(true, 500), GOOD); // not enough samples yet
  eng.state.rt = Array.from({ length: 40 }, (_, i) => 1000 + i * 100); // 1.0s … 4.9s
  assert.equal(eng.grade(true, 900), EASY);
  assert.equal(eng.grade(true, 2500), GOOD);
  assert.equal(eng.grade(true, 6000), HARD);
});

test("old box saves migrate to a stability with a similar due date", () => {
  const now = T0;
  const w = { id: "a", en: "apple", zh: "苹果", seen: 6, mistakes: 1, box: 4, dueAt: now + 2 * DAY };
  E.ensureWord(w, now);
  assert.equal(w.srs.S, 5);
  assert.equal(w.srs.step, 0);
  const eng = E.create(null);
  const due = eng.dueAt(w, now);
  assert.ok(Math.abs(due - (now + 2 * DAY)) < 0.2 * DAY, `due ${(due - now) / DAY} days`);

  const learning = { id: "b", en: "bee", zh: "蜜蜂", seen: 1, mistakes: 1, box: 0, dueAt: now + 30 * 60000 };
  E.ensureWord(learning, now);
  assert.equal(learning.srs.step, 1);

  const fresh = { id: "c", en: "cat", zh: "猫", seen: 0, mistakes: 0, box: 0 };
  E.ensureWord(fresh, now);
  assert.equal(fresh.srs, null);
});

test("a missed word comes back within a few pairs in the endless stream", () => {
  const eng = E.create(null, { rng: E.makeRng(2) });
  const lib = words(30);
  const missed = lib[0];
  eng.recordAnswer(missed, GOOD, T0);
  eng.recordAnswer(missed, AGAIN, T0 + 1000);
  let now = T0 + 2000;
  let cameBackAt = null;
  for (let i = 0; i < 10; i++) {
    const next = eng.nextWord(lib, { now, newOrder: lib.filter(w => !w.srs) });
    if (next === missed) { cameBackAt = i; break; }
    eng.recordAnswer(next, GOOD, now, { ms: 2000 });
    now += 3000;
  }
  assert.ok(cameBackAt !== null && cameBackAt >= 2 && cameBackAt <= 6, `came back after ${cameBackAt}`);
});

test("words already on the board are never picked", () => {
  const eng = E.create(null, { rng: E.makeRng(3) });
  const lib = words(6);
  const exclude = new Set(lib.slice(0, 5).map(w => w.id));
  for (let i = 0; i < 20; i++) {
    const next = eng.nextWord(lib, { now: T0, exclude });
    assert.equal(next.id, "w5");
  }
});

test("new words stop coming in when the learning load reaches capacity", () => {
  const eng = E.create(null, { rng: E.makeRng(4) });
  const lib = words(40);
  const cap = eng.currentArm().k;
  let now = T0;
  for (let i = 0; i < 200; i++) {
    const next = eng.nextWord(lib, { now, newOrder: lib.filter(w => !w.srs) });
    eng.recordAnswer(next, AGAIN, now); // never learns anything
    now += 2000;
    assert.ok(eng.learningLoad(lib) <= cap);
  }
});

test("look-alike spellings score higher than unrelated ones", () => {
  assert.ok(E.similarity("furor", "floor") > E.similarity("furor", "tuber"));
  assert.ok(E.similarity("tuber", "rubber") > E.similarity("tuber", "notorious"));
  assert.equal(E.similarity("same", "same"), 0);
});

test("confused partners are put on the board together", () => {
  const eng = E.create(null, { rng: E.makeRng(5) });
  const lib = words(20);
  let now = T0;
  for (const w of lib) { eng.recordAnswer(w, GOOD, now); now += 1000; }
  for (const w of lib) { w.srs.step = 0; w.srs.lastPair = -100; }
  eng.recordConfusion(lib[3], lib[11]);
  let hits = 0;
  for (let i = 0; i < 200; i++) {
    const next = eng.nextWord(lib, { now: now + 3 * DAY, onBoard: [lib[3]], exclude: new Set([lib[3].id]) });
    if (next === lib[11]) hits++;
  }
  assert.ok(hits > 30, `partner picked ${hits}/200`);
});

test("the personal fit lowers growth for a fast forgetter and raises it for a slow one", () => {
  function simulate(trueScale, seed) {
    const rng = E.makeRng(seed);
    const trueW = E.personalWeights([Math.log(trueScale), Math.log(trueScale), 0]);
    const log = [];
    for (let i = 0; i < 300; i++) {
      let t = T0 + i * 1000, card = null;
      for (let r = 0; r < 6; r++) {
        const gap = card ? E.intervalFor(E.DEFAULT_W, card.S, 0.9) * (0.5 + rng()) : 0;
        t += Math.max(1, gap) * DAY;
        const R = card ? E.retrievabilityAt(trueW, (t - log[log.length - 1].t) / DAY, card.S) : 1;
        const g = !card ? GOOD : rng() < R ? GOOD : AGAIN;
        log.push({ i: `w${i}`, t, g });
        const next = E.step(trueW, card, card ? (t - log[log.length - 2].t) / DAY : 0, g);
        card = { S: next.S, D: next.D };
      }
    }
    return E.fitTheta(log, [0, 0, 0], { iterations: 40 });
  }
  const fast = simulate(0.35, 11);
  const slow = simulate(2.5, 12);
  assert.ok(fast.fitted && slow.fitted);
  assert.ok(fast.theta[0] + fast.theta[1] < 0, `fast theta ${fast.theta}`);
  assert.ok(slow.theta[0] + slow.theta[1] > 0, `slow theta ${slow.theta}`);
});

test("forecast counts reviews per learner day", () => {
  const eng = E.create(null);
  const lib = words(3);
  for (const w of lib) { eng.recordAnswer(w, GOOD, T0); w.srs.step = 0; }
  const counts = eng.forecast(lib, 7, T0);
  assert.equal(counts.length, 7);
  assert.equal(counts.reduce((a, b) => a + b, 0), 3);
});

test("blocks reward the bandit and pick a next arm", () => {
  const eng = E.create(null, { rng: E.makeRng(6), blockSize: 5 });
  const lib = words(10);
  let now = T0;
  for (let b = 0; b < 4; b++) {
    for (let i = 0; i < 6; i++) {
      const next = eng.nextWord(lib, { now, newOrder: lib.filter(w => !w.srs) });
      eng.recordAnswer(next, GOOD, now, { ms: 1500 });
      now += 4000;
    }
    assert.ok(eng.blockDue());
    const summary = eng.endBlock(now);
    assert.ok(Number.isFinite(summary.reward));
  }
  assert.equal(eng.state.bandit.all.n, 4);
});

test("state survives serialize → create", () => {
  const eng = E.create(null);
  const lib = words(2);
  eng.recordAnswer(lib[0], GOOD, T0, { ms: 1200 });
  const copy = E.create(JSON.parse(JSON.stringify(eng.serialize())));
  assert.equal(copy.state.log.length, 1);
  assert.equal(copy.state.pairs, 1);
  assert.deepEqual(copy.state.rt, [1200]);
});
