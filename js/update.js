/*
 * Word Snap update check (Android app only; the web app updates through its service worker).
 *
 *   check({ current, fetch, store, now })  → Promise<{ version, notes, apk } | null>
 *     At most once a day (store remembers when), after Home has rendered, never during a set:
 *     the caller decides when. Asks GitHub's latest release first, then version.json on
 *     jsDelivr (GitHub can be slow or blocked in mainland China). Each request gives up after
 *     5 s; any failure is silent (null), and the last answer is kept for the rest of the day.
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
  const TIMEOUT_MS = 5000;

  function parts(v) {
    return String(v || "").replace(/^v/i, "").split(/[.+-]/).slice(0, 3).map(n => parseInt(n, 10) || 0);
  }

  function newer(a, b) {
    const x = parts(a), y = parts(b);
    for (let i = 0; i < 3; i++) {
      if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
    }
    return false;
  }

  function fromRelease(json) {
    if (!json || typeof json.tag_name !== "string") return null;
    const asset = (json.assets || []).find(a => /\.apk$/i.test(a.name || "") && !/debug/i.test(a.name || ""));
    return {
      version: json.tag_name.replace(/^v/i, ""),
      notes: json.html_url || "",
      apk: asset ? asset.browser_download_url : json.html_url || ""
    };
  }

  function fromVersionJson(json) {
    if (!json || typeof json.version !== "string") return null;
    return { version: json.version, notes: json.notes || "", apk: json.apk || json.notes || "" };
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
    if (!(saved.checkedAt && now - saved.checkedAt < DAY_MS && now >= saved.checkedAt)) {
      const found = fromRelease(await getJson(fetchFn, RELEASE_API)) || fromVersionJson(await getJson(fetchFn, VERSION_JSON));
      latest = found || latest; // a failed check keeps yesterday's answer and waits a day
      write(store, { checkedAt: now, latest });
    }
    return latest && newer(latest.version, current) ? latest : null;
  }

  return { check, newer, fromRelease, fromVersionJson, STORE_KEY };
});
