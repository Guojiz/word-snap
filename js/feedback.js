/*
 * Word Snap feedback links (Settings → 反馈与交流).
 *
 *   issueUrl({ version, userAgent, native })  the GitHub "new issue" link, its form filled in
 *                                             with the app version, Android version and phone
 *                                             model — nothing else (pure, tested)
 *   device(userAgent)                         { os, model } read from the user agent (pure)
 *   openBilibili(win)                         the Bilibili app when it is installed, else the
 *                                             web page
 *
 * Classic script: window.WordSnapFeedback in the page; module.exports for Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WordSnapFeedback = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const REPO_ISSUE = "https://github.com/Guojiz/word-snap/issues/new";
  const BILIBILI_UID = "3493114115263006";
  const BILIBILI_WEB = `https://space.bilibili.com/${BILIBILI_UID}`;
  const BILIBILI_APP = `bilibili://space/${BILIBILI_UID}`;

  /** { os: "Android 14" | "iOS 17.4" | …, model: "Pixel 7" | "" } from a user agent string. */
  function device(userAgent = "") {
    const ua = String(userAgent);
    const android = ua.match(/Android\s+([\d.]+)((?:;[^;)]*)*)/);
    if (android) {
      // The segments after "Android x": skip the ones that are not a model — a language tag
      // (MIUI/UC put "zh-cn" first), "U", "wv", "HarmonyOS" — and take the next one.
      const parts = android[2].split(";").map(p => p.replace(/\s*Build\/.*$/, "").trim()).filter(Boolean);
      const model = parts.find(p => !/^([a-z]{2}([-_][a-z]{2,4})?|U|wv|HarmonyOS|Linux)$/i.test(p)) || "";
      // Chrome's reduced user agent always says "Android 10; K": neither the version nor the model is real.
      if (model === "K") return { os: "Android", model: "" };
      return { os: `Android ${android[1]}`, model };
    }
    const ios = ua.match(/(iPhone|iPad)[^)]*OS ([\d_]+)/);
    if (ios) return { os: `iOS ${ios[2].replace(/_/g, ".")}`, model: ios[1] };
    if (/Windows/.test(ua)) return { os: "Windows", model: "" };
    if (/Mac OS X/.test(ua)) return { os: "macOS", model: "" };
    if (/Linux/.test(ua)) return { os: "Linux", model: "" };
    return { os: "", model: "" };
  }

  function issueUrl({ version = "", build = "", userAgent = "", native = false } = {}) {
    const { os, model } = device(userAgent);
    const where = native ? "Android app" : "web";
    const ver = (version || "?") + (build && build !== "dev" ? ` build ${build}` : "");
    const facts = [`Word Snap ${ver} (${where})`, os, model].filter(Boolean).join(" · ");
    const body = [
      "**What happened / 发生了什么**",
      "",
      "",
      "**What you expected / 本来应该怎样**",
      "",
      "",
      "---",
      facts
    ].join("\n");
    const params = new URLSearchParams({ title: "", body });
    return `${REPO_ISSUE}?${params.toString()}`;
  }

  /**
   * Tries the Bilibili app first; when nothing takes the link (the page is still in front a
   * moment later), opens the web page instead. Returns false so a link's default is skipped.
   * Leaving is seen by blur/pagehide as well as visibilitychange: a WebView only turns hidden
   * once the other app has drawn, which a slow cold start (splash ads) can push past the timer.
   * The fallback relies on Capacitor handing any non-app URL to the system (no allowNavigation).
   */
  let opening = false;
  function openBilibili(win, { native = false, waitMs = 2000 } = {}) {
    if (!win) return true;
    if (!native) { win.open(BILIBILI_WEB, "_blank", "noopener"); return false; }
    if (opening) return false; // a second tap while the first is still deciding
    opening = true;
    let left = false;
    const away = event => { if (event.type !== "visibilitychange" || win.document.visibilityState === "hidden") left = true; };
    win.document.addEventListener("visibilitychange", away);
    win.addEventListener("blur", away);
    win.addEventListener("pagehide", away);
    win.location.href = BILIBILI_APP;
    win.setTimeout(() => {
      win.document.removeEventListener("visibilitychange", away);
      win.removeEventListener("blur", away);
      win.removeEventListener("pagehide", away);
      opening = false;
      if (!left) win.location.href = BILIBILI_WEB;
    }, waitMs);
    return false;
  }

  return { device, issueUrl, openBilibili, BILIBILI_WEB, REPO_ISSUE };
});
