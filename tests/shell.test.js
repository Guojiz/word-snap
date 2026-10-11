const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../js/shell.js");

/** A browser-like history: a stack of states, back() fires popstate like the real one. */
function fakeHistory() {
  const listeners = [];
  const entries = [null];
  let index = 0;
  const history = {
    replaceState(state) { entries[index] = state; },
    pushState(state) { entries.splice(index + 1); entries.push(state); index += 1; },
    back() { if (index > 0) { index -= 1; listeners.forEach(fn => fn({ state: entries[index] })); } },
    forward() { if (index < entries.length - 1) { index += 1; listeners.forEach(fn => fn({ state: entries[index] })); } },
    get length() { return entries.length; }
  };
  const win = { addEventListener(type, fn) { if (type === "popstate") listeners.push(fn); } };
  return { history, win };
}

function setup(initial = "home") {
  const { history, win } = fakeHistory();
  const seen = [];
  const nav = S.createNav({ initial, history, win, render: (entry, from, dir) => seen.push([entry.screen, entry.overlay, dir]) });
  return { nav, history, seen };
}

test("screens push and back walks them in order", () => {
  const { nav, seen } = setup();
  nav.go("practice");
  assert.deepEqual(nav.current(), { screen: "practice", overlay: null, depth: 1 });
  assert.equal(nav.back(), true);
  assert.deepEqual(nav.current(), { screen: "home", overlay: null, depth: 0 });
  assert.deepEqual(seen, [["practice", null, "forward"], ["home", null, "back"]]);
  assert.equal(nav.back(), false, "the root has nothing to go back to");
});

test("going to the screen you are on does nothing", () => {
  const { nav, seen } = setup();
  assert.equal(nav.go("home"), false);
  assert.equal(seen.length, 0);
});

test("switching overlays replaces, so one back closes them", () => {
  const { nav } = setup();
  nav.overlay("library");
  nav.overlay("settings");
  assert.deepEqual(nav.current(), { screen: "home", overlay: "settings", depth: 1 });
  nav.closeOverlay();
  assert.deepEqual(nav.current(), { screen: "home", overlay: null, depth: 0 });
});

test("an overlay over practice goes back to practice, then home", () => {
  const { nav } = setup();
  nav.go("practice");
  nav.overlay("library");
  nav.back();
  assert.deepEqual(nav.current(), { screen: "practice", overlay: null, depth: 1 });
  nav.back();
  assert.equal(nav.current().screen, "home");
});

test("reset makes a new root (onboarding cannot be gone back to)", () => {
  const { nav } = setup("onboard");
  nav.reset("home");
  nav.go("practice");
  nav.back();
  assert.deepEqual(nav.current(), { screen: "home", overlay: null, depth: 0 });
  assert.equal(nav.back(), false);
});

test("browser forward re-enters the screen", () => {
  const { nav, history, seen } = setup();
  nav.go("practice");
  history.back();
  history.forward();
  assert.equal(nav.current().screen, "practice");
  assert.equal(seen.at(-1)[2], "forward");
});

test("transition runs the update directly without the View Transitions API", async () => {
  let ran = false;
  await S.transition(() => { ran = true; }, "forward", { document: {}, matchMedia: () => ({ matches: false }) });
  assert.equal(ran, true);
});

test("flood just runs the action without animation support or under reduced motion", async () => {
  let ran = 0;
  await S.flood({}, () => { ran += 1; }, { win: { document: {}, matchMedia: () => ({ matches: false }) } });
  await S.flood({ animate() {} }, () => { ran += 1; }, { win: { document: {}, matchMedia: () => ({ matches: true }) } });
  assert.equal(ran, 2);
});
