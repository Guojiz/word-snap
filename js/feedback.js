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
    const android = ua.match(/Android\s+([\d.]+)(?:;\s*([^;)]+))?/);
    if (android) {
      let model = (android[2] || "").replace(/\s*Build\/.*$/, "").trim();
      if (model === "K" || /^wv$/i.test(model)) model = ""; // reduced user agents hide the model
      return { os: `Android ${android[1]}`, model };
    }
    const ios = ua.match(/(iPhone|iPad)[^)]*OS ([\d_]+)/);
    if (ios) return { os: `iOS ${ios[2].replace(/_/g, ".")}`, model: ios[1] };
    if (/Windows/.test(ua)) return { os: "Windows", model: "" };
    if (/Mac OS X/.test(ua)) return { os: "macOS", model: "" };
    if (/Linux/.test(ua)) return { os: "Linux", model: "" };
    return { os: "", model: "" };
  }

  function issueUrl({ version = "", userAgent = "", native = false } = {}) {
    const { os, model } = device(userAgent);
    const where = native ? "Android app" : "web";
    const facts = [`Word Snap ${version || "?"} (${where})`, os, model].filter(Boolean).join(" · ");
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
   */
  function openBilibili(win, { native = false } = {}) {
    if (!win) return true;
    if (!native) { win.open(BILIBILI_WEB, "_blank", "noopener"); return false; }
    let left = false;
    const away = () => { if (win.document.visibilityState === "hidden") left = true; };
    win.document.addEventListener("visibilitychange", away);
    win.location.href = BILIBILI_APP;
    win.setTimeout(() => {
      win.document.removeEventListener("visibilitychange", away);
      if (!left) win.location.href = BILIBILI_WEB;
    }, 1200);
    return false;
  }

  return { device, issueUrl, openBilibili, BILIBILI_WEB, REPO_ISSUE };
});
