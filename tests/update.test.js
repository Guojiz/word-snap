const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Update = require("../js/update.js");

function memoryStore() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}
const ok = json => Promise.resolve({ ok: true, json: () => Promise.resolve(json) });
const RELEASE = {
  tag_name: "v1.1.0",
  html_url: "https://github.com/Guojiz/word-snap/releases/tag/v1.1.0",
  assets: [{ name: "word-snap-1.1.0.apk", browser_download_url: "https://github.com/Guojiz/word-snap/releases/download/v1.1.0/word-snap-1.1.0.apk" }]
};

test("newer compares numerically, ignores a leading v", () => {
  assert.equal(Update.newer("1.10.0", "1.9.2"), true);
  assert.equal(Update.newer("v1.1.0", "1.1.0"), false);
  assert.equal(Update.newer("1.0.1", "1.0.0"), true);
  assert.equal(Update.newer("1.0.0", "1.1"), false);
});

test("a release outranks its own prerelease; prereleases and drafts are ignored", () => {
  assert.equal(Update.newer("1.2.0", "1.2.0-beta.1"), true);
  assert.equal(Update.newer("1.2.0-beta.1", "1.2.0"), false);
  assert.equal(Update.fromRelease({ ...RELEASE, prerelease: true }), null);
  assert.equal(Update.fromRelease({ ...RELEASE, draft: true }), null);
  assert.equal(Update.fromVersionJson({ version: "1.3.0-rc.1" }), null);
});

test("only https links are kept", () => {
  const r = Update.fromVersionJson({ version: "1.2.0", notes: "javascript:alert(1)", apk: "http://x/a.apk" });
  assert.deepEqual(r, { version: "1.2.0", notes: "", apk: "" });
});

test("fromRelease takes the tag and the release APK", () => {
  assert.deepEqual(Update.fromRelease(RELEASE), { version: "1.1.0", notes: RELEASE.html_url, apk: RELEASE.assets[0].browser_download_url });
  assert.equal(Update.fromRelease({}), null);
});

test("check: GitHub first, at most once a day, newer only", async () => {
  const store = memoryStore();
  const calls = [];
  const fetch = url => { calls.push(url); return ok(RELEASE); };
  const now = Date.UTC(2026, 10, 1, 12);
  assert.equal((await Update.check({ current: "1.0.0", fetch, store, now })).version, "1.1.0");
  assert.equal(calls.length, 1);
  assert.match(calls[0], /api\.github\.com/);
  // same day: no request, the saved answer
  assert.equal((await Update.check({ current: "1.0.0", fetch, store, now: now + 3600e3 })).version, "1.1.0");
  assert.equal(calls.length, 1);
  // already on it: nothing to show
  assert.equal(await Update.check({ current: "1.1.0", fetch, store, now: now + 3600e3 }), null);
});

test("check: falls back to version.json; a failure is silent and retried after an hour", async () => {
  const store = memoryStore();
  const calls = [];
  const fetch = url => { calls.push(url); return /github\.com/.test(url) ? Promise.reject(new Error("blocked")) : ok({ version: "1.2.0", notes: "https://n", apk: "https://a" }); };
  const now = Date.UTC(2026, 10, 1, 12);
  assert.deepEqual(await Update.check({ current: "1.0.0", fetch, store, now }), { version: "1.2.0", notes: "https://n", apk: "https://a" });
  assert.match(calls[1], /cdn\.jsdelivr\.net\/gh\/Guojiz\/word-snap@main\/version\.json/);
  const store2 = memoryStore();
  const dead = () => Promise.reject(new Error("offline"));
  assert.equal(await Update.check({ current: "1.0.0", fetch: dead, store: store2, now }), null);
  let n = 0;
  const counting = () => { n++; return dead(); };
  await Update.check({ current: "1.0.0", fetch: counting, store: store2, now: now + 60e3 });
  assert.equal(n, 0);
  // back online an hour later: it tries again instead of waiting a whole day
  const back = await Update.check({ current: "1.0.0", fetch: () => ok(RELEASE), store: store2, now: now + 3601e3 });
  assert.equal(back.version, "1.1.0");
});

test("version.json matches package.json", () => {
  const root = path.join(__dirname, "..");
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const v = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));
  assert.equal(v.version, pkg.version);
});
