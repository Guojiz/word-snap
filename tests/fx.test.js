const test = require("node:test");
const assert = require("node:assert/strict");
const Fx = require("../js/fx.js");

test("streak tiers change at 5, 10 and 20; milestones at 5 / 10 / 20 / 50 / 100 and every 50 after", () => {
  assert.deepEqual([3, 5, 12, 20, 80].map(n => Fx.tierFor(n).name), ["base", "warm", "fire", "blaze", "blaze"]);
  assert.deepEqual([4, 5, 10, 11, 20, 50, 150, 151].map(Fx.isMilestone), [false, true, true, false, true, true, true, false]);
});

test("clock formats a duration", () => {
  assert.equal(Fx.clock(0), "0:00");
  assert.equal(Fx.clock(65400), "1:05");
  assert.equal(Fx.clock(600000), "10:00");
});

test("no DOM, no effects (and no crash)", () => {
  assert.equal(Fx.enabled(), false);
  Fx.ripple([{}]);
  Fx.burst(null);
  Fx.confetti();
  Fx.haptic();
  const el = { textContent: "" };
  Fx.countUp(el, 42);
  assert.equal(el.textContent, "42");
});

test("judgement names follow the engine grade", () => {
  assert.deepEqual([4, 3, 2, 1].map(Fx.judgementFor), ["perfect", "great", "good", "miss"]);
  Fx.judge([{}], "perfect", 900); // no DOM: nothing happens
  const el = { textContent: "", dataset: {} };
  Fx.roll(el, "12");
  assert.equal(el.textContent, "12");
});
