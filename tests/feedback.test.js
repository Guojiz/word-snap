const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Feedback = require("../js/feedback.js");

const PIXEL = "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A.240205.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36";
const REDUCED = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

test("device: Android version and model, nothing else", () => {
  assert.deepEqual(Feedback.device(PIXEL), { os: "Android 14", model: "Pixel 7" });
  assert.deepEqual(Feedback.device(REDUCED), { os: "Android", model: "" }); // "Android 10; K" is a fixed fake
  assert.deepEqual(Feedback.device("Mozilla/5.0 (Linux; U; Android 12; zh-cn; 2201123C Build/SKQ1.211006.001) AppleWebKit/537.36 Mobile Safari/537.36 XiaoMi/MiuiBrowser/17.4"), { os: "Android 12", model: "2201123C" });
  assert.deepEqual(Feedback.device("Mozilla/5.0 (Linux; Android 12; HarmonyOS; NOH-AN00; HMSCore 6.11) AppleWebKit/537.36 Mobile Safari/537.36"), { os: "Android 12", model: "NOH-AN00" });
  assert.deepEqual(Feedback.device("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)"), { os: "iOS 17.4", model: "iPhone" });
  assert.deepEqual(Feedback.device(""), { os: "", model: "" });
});

test("issueUrl: the new-issue form with version, OS and model in the body", () => {
  const url = new URL(Feedback.issueUrl({ version: "1.1.0", userAgent: PIXEL, native: true }));
  assert.equal(url.origin + url.pathname, "https://github.com/Guojiz/word-snap/issues/new");
  const body = url.searchParams.get("body");
  assert.match(body, /Word Snap 1\.1\.0 \(Android app\) · Android 14 · Pixel 7$/);
  assert.doesNotMatch(body, /Chrome|Build|wv|AppleWebKit/);
  assert.deepEqual([...url.searchParams.keys()].sort(), ["body", "title"]);
});

test("the page's APP_VERSION matches package.json", () => {
  const root = path.join(__dirname, "..");
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const html = fs.readFileSync(path.join(root, "vocabulary-match.html"), "utf8");
  assert.equal(html.match(/const APP_VERSION = "([^"]+)"/)[1], pkg.version);
});

test("issueUrl: a stamped build is named, the source tree's \"dev\" is not", () => {
  const body = b => new URL(Feedback.issueUrl({ version: "1.1.0", build: b, userAgent: PIXEL, native: true })).searchParams.get("body");
  assert.match(body("abc1234"), /Word Snap 1\.1\.0 build abc1234 \(Android app\)/);
  assert.match(body("dev"), /Word Snap 1\.1\.0 \(Android app\)/);
});

function fakeWin() {
  const handlers = {};
  const on = (t, f) => { (handlers[t] ||= new Set()).add(f); };
  const off = (t, f) => handlers[t]?.delete(f);
  const timers = [];
  const win = {
    hrefs: [],
    document: { visibilityState: "visible", addEventListener: on, removeEventListener: off },
    addEventListener: on, removeEventListener: off,
    location: { set href(v) { win.hrefs.push(v); } },
    setTimeout: f => timers.push(f),
    fire: t => [...(handlers[t] || [])].forEach(f => f({ type: t })),
    runTimers: () => timers.splice(0).forEach(f => f()),
    listeners: () => Object.values(handlers).reduce((n, s) => n + s.size, 0)
  };
  return win;
}

test("openBilibili: the app when it opens, the web page when nothing does, once per tap", () => {
  let w = fakeWin();
  assert.equal(Feedback.openBilibili(w, { native: true }), false);
  w.runTimers();
  assert.deepEqual(w.hrefs, ["bilibili://space/3493114115263006", Feedback.BILIBILI_WEB]);
  assert.equal(w.listeners(), 0);

  w = fakeWin(); // the app opened: the WebView lost focus before it turned hidden
  Feedback.openBilibili(w, { native: true });
  w.fire("blur");
  w.runTimers();
  assert.deepEqual(w.hrefs, ["bilibili://space/3493114115263006"]);

  w = fakeWin(); // a visibilitychange that is still "visible" does not count as leaving
  Feedback.openBilibili(w, { native: true });
  w.fire("visibilitychange");
  Feedback.openBilibili(w, { native: true }); // double tap while deciding: ignored
  w.runTimers();
  assert.deepEqual(w.hrefs, ["bilibili://space/3493114115263006", Feedback.BILIBILI_WEB]);
});
