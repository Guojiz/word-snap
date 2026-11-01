const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Feedback = require("../js/feedback.js");

const PIXEL = "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A.240205.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36";
const REDUCED = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

test("device: Android version and model, nothing else", () => {
  assert.deepEqual(Feedback.device(PIXEL), { os: "Android 14", model: "Pixel 7" });
  assert.deepEqual(Feedback.device(REDUCED), { os: "Android 10", model: "" });
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
