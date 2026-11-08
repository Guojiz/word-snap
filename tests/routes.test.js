const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../js/routes.js");

const lum = hex => {
  const [r, g, b] = [1, 3, 5].map(i => R.lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const seeded = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

test("a clean set keeps seven colours, each miss takes one, never below two", () => {
  assert.deepEqual([0, 1, 2, 5, 6, 9].map(R.available), [7, 6, 5, 2, 2, 2]);
});

test("colours arrive as the set goes on and never exceed what was earned", () => {
  assert.equal(R.shown(0, 25, 0), 1);
  assert.equal(R.shown(25, 25, 0), 7);
  assert.equal(R.shown(25, 25, 3), 4);
  for (let got = 0; got <= 25; got++) assert.ok(R.shown(got, 25, 2) <= 5);
  assert.equal(R.shown(3, 0, 0), 1);
});

test("every route has seven hues and the same route never comes twice in a row", () => {
  const rand = seeded(7);
  let last = "";
  for (let i = 0; i < 200; i++) {
    const r = R.pickRoute(rand, last);
    assert.equal(r.hues.length, 7);
    assert.ok(r.hues.every(h => h >= 0 && h < 360));
    assert.notEqual(r.id, last);
    last = r.id;
  }
});

test("ink stays readable on every matched-card colour, day and night", () => {
  for (let h = 0; h < 360; h += 5) {
    assert.ok(contrast(R.colourOf(h, "card"), "#35393b") >= 4.5, `day card at hue ${h}`);
    assert.ok(contrast(R.colourOf(h, "cardDark"), "#e2e2e3") >= 4.5, `night card at hue ${h}`);
  }
});

test("gradient stops run 0% to 100% and a single colour is a flat stop", () => {
  const s = R.stops([10, 80, 150], 3);
  assert.match(s, /^#[0-9a-f]{6} 0\.0%/);
  assert.match(s, /100%$/);
  assert.equal(R.stops([10], 1), `${R.colourOf(10)} 0%, ${R.colourOf(10)} 100%`);
  assert.ok(R.stops([10, 80], 2, "bar", true).split(",").length > R.stops([10, 80], 2).split(",").length);
});

test("today keeps only today's sets and how many colours each earned", () => {
  const route = { id: "dusk", hues: [1, 2, 3, 4, 5, 6, 7] };
  let t = R.addSet(null, "2026-11-08", route, 0);
  t = R.addSet(t, "2026-11-08", route, 2);
  assert.equal(t.sets.length, 2);
  assert.equal(R.todayHues(t).length, 7 + 5);
  assert.deepEqual(R.today(t, "2026-11-09").sets, []);
  assert.deepEqual(R.today({ day: "2026-11-08", sets: [{ hues: ["x"], k: 2 }] }, "2026-11-08").sets, []);
  for (let i = 0; i < 20; i++) t = R.addSet(t, "2026-11-08", route, 0);
  assert.equal(t.sets.length, 8);
});

test("the mesh is empty without colours and grows with the day's progress", () => {
  assert.equal(R.mesh([], 0.5), "none");
  const small = R.mesh([10, 20], 0), big = R.mesh([10, 20], 1);
  assert.match(small, /circle 70px/);
  assert.match(big, /circle 130px/);
});
