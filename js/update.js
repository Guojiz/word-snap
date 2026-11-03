/*
 * Word Snap update check (Android app only; the web app updates through its service worker).
 *
 *   check({ current, fetch, store, now })  → Promise<{ version, notes, apk } | null>
 *     At most once a day (store remembers when), after Home has rendered, never during a set:
 *     the caller decides when. Asks GitHub's latest release first, then version.json on
 *     jsDelivr (GitHub can be slow or blocked in mainland China). Each request gives up after
 *     5 s; any failure is silent and retried after an hour, keeping the last answer meanwhile.
 *     Drafts, prereleases and non-https links are ignored.
 *   newer(a, b)        true when version a is above b ("1.10.0" > "1.9.2"), pure
 *   fromRelease(json)  { version, notes, apk } from a GitHub release, pure
 *
 * Classic script: window.WordSnapUpdate in the page; module.exports for Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WordSnapUpdate = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const RELEASE_API = "https://api.github.com/repos/Guojiz/word-snap/releases/latest";
  const VERSION_JSON = "https://cdn.jsdelivr.net/gh/Guojiz/word-snap@main/version.json";
  const STORE_KEY = "word_snap_update_v1";
  const DAY_MS = 24 * 60 * 60 * 1000;
  const RETRY_MS = 60 * 60 * 1000;
  const TIMEOUT_MS = 5000;

  function parts(v) {
    return String(v || "").replace(/^v/i, "").split(/[.+-]/).slice(0, 3).map(n => parseInt(n, 10) || 0);
  }

  function pre(v) {
    return /^v?\d+(\.\d+)*-/i.test(String(v || "").trim());
  }

  // A release outranks a prerelease of the same number ("1.2.0" > "1.2.0-beta.1").
  function newer(a, b) {
    const x = parts(a), y = parts(b);
    for (let i = 0; i < 3; i++) {
      if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
    }
    return pre(b) && !pre(a);
  }

  function https(url) {
    return /^https:\/\//i.test(String(url || "")) ? String(url) : "";
  }

  function fromRelease(json) {
    if (!json || typeof json.tag_name !== "string" || json.draft || json.prerelease) return null;
    const asset = (json.assets || []).find(a => /\.apk$/i.test(a.name || "") && !/debug/i.test(a.name || ""));
    const notes = https(json.html_url);
    return { version: json.tag_name.replace(/^v/i, ""), notes, apk: https(asset && asset.browser_download_url) || notes };
  }

  function fromVersionJson(json) {
    if (!json || typeof json.version !== "string" || pre(json.version)) return null;
    const notes = https(json.notes);
    return { version: json.version, notes, apk: https(json.apk) || notes };
  }

  async function getJson(fetchFn, url) {
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => { if (ctrl) ctrl.abort(); reject(new Error("timeout")); }, TIMEOUT_MS);
    });
    try {
      const res = await Promise.race([
        fetchFn(url, { signal: ctrl ? ctrl.signal : undefined, headers: { Accept: "application/json" }, cache: "no-store" }),
        timeout
      ]);
      if (!res || !res.ok) return null;
      return await Promise.race([res.json(), timeout]);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function read(store) {
    try { return JSON.parse(store.getItem(STORE_KEY) || "null") || {}; } catch { return {}; }
  }

  function write(store, value) {
    try { store.setItem(STORE_KEY, JSON.stringify(value)); } catch { /* storage full or blocked */ }
  }

  async function check({ current, fetch: fetchFn, store, now = Date.now() } = {}) {
    if (!current || !fetchFn || !store) return null;
    const saved = read(store);
    let latest = saved.latest || null;
    const fresh = (at, ms) => at && now >= at && now - at < ms;
    if (!fresh(saved.checkedAt, DAY_MS) && !fresh(saved.failedAt, RETRY_MS)) {
      const found = fromRelease(await getJson(fetchFn, RELEASE_API)) || fromVersionJson(await getJson(fetchFn, VERSION_JSON));
      // A failed check (offline at launch) keeps the last answer and tries again in an hour.
      if (found) write(store, { checkedAt: now, latest: (latest = found) });
      else write(store, { checkedAt: saved.checkedAt, failedAt: now, latest });
    }
    return latest && newer(latest.version, current) ? latest : null;
  }

  return { check, newer, fromRelease, fromVersionJson, STORE_KEY };
});
