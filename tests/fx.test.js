const test = require("node:test");
const assert = require("node:assert/strict");
const Fx = require("../js/fx.js");

test("combo tiers grow with the streak; milestones get a shockwave", () => {
  assert.equal(Fx.tierFor(3).name, "base");
  assert.equal(Fx.tierFor(5).name, "warm");
  assert.equal(Fx.tierFor(12).name, "fire");
  assert.equal(Fx.tierFor(20).name, "blaze");
  assert.equal(Fx.tierFor(80).name, "legend");
  assert.deepEqual([4, 5, 10, 11, 20, 50, 150, 151].map(Fx.isMilestone), [false, true, true, false, true, true, true, false]);
});

test("no DOM, no effects (and no crash)", () => {
  assert.equal(Fx.enabled(), false);
  Fx.sparks([{}], 5);
  Fx.combo(10, null);
  Fx.confetti();
});
