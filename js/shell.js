/*
 * Word Snap app shell: which screen is showing, how you got there, and how you go back.
 *
 * Screens: "home", "practice", "onboard". Overlays (library, settings, the how-to sheet)
 * sit on top of a screen. Every step forward is one browser history entry, so the
 * browser back button, the Android back gesture (MainActivity asks `wordSnapBack()`)
 * and the in-app back controls all walk the same stack.
 *
 *   const nav = WordSnapShell.createNav({ initial: "home", render(entry, from, dir) {} });
 *   nav.go("practice");            // push a screen
 *   nav.overlay("library");        // push an overlay on the current screen (switching replaces)
 *   nav.closeOverlay();            // pop it
 *   nav.back();                    // pop anything; false at the root (the app may exit)
 *   nav.reset("home");             // new root, e.g. when onboarding ends
 *
 * `render` gets the entry ({ screen, overlay, depth }), the previous entry and the
 * direction ("forward" / "back" / "replace"); it must not call the nav itself.
 *
 * No app state here. Works as a classic browser script (window.WordSnapShell) and as a
 * CommonJS module for Node tests (pass `history` and `win` in).
 */
(function (root, factory) {
  const api = factory(typeof window !== "undefined" ? window : null);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WordSnapShell = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (defaultWin) {
  "use strict";

  function createNav({ initial = "home", render = () => {}, win = defaultWin, history = win && win.history } = {}) {
    let current = { screen: initial, overlay: null, depth: 0 };
    if (history) history.replaceState({ ws: current }, "");

    function commit(next, dir) {
      const from = current;
      current = next;
      render(next, from, dir);
    }

    function write(next, replace) {
      if (history) history[replace ? "replaceState" : "pushState"]({ ws: next }, "");
    }

    /** Push a screen (closing any overlay). Same screen without an overlay: nothing happens. */
    function go(screen, { replace = false } = {}) {
      if (screen === current.screen && !current.overlay) return false;
      const next = { screen, overlay: null, depth: replace ? current.depth : current.depth + 1 };
      write(next, replace);
      commit(next, replace ? "replace" : "forward");
      return true;
    }

    /** Open an overlay on the current screen; moving from one overlay to another replaces it. */
    function overlay(name, { replace } = {}) {
      if (current.overlay === name) return false;
      const swap = replace === undefined ? Boolean(current.overlay) : replace;
      const next = { screen: current.screen, overlay: name, depth: swap ? current.depth : current.depth + 1 };
      write(next, swap);
      commit(next, swap ? "replace" : "forward");
      return true;
    }

    /** Close the overlay: a history step back when it was pushed, else in place. */
    function closeOverlay() {
      if (!current.overlay) return false;
      if (current.depth > 0 && history) {
        history.back();
        return true;
      }
      const next = { screen: current.screen, overlay: null, depth: current.depth };
      write(next, true);
      commit(next, "back");
      return true;
    }

    /** One step back. False at the root: the caller decides (the Android app goes to the background). */
    function back() {
      if (current.depth <= 0) return false;
      if (history) history.back();
      return true;
    }

    /** Make `screen` the new root (no way back to what came before, e.g. onboarding). */
    function reset(screen) {
      const next = { screen, overlay: null, depth: 0 };
      write(next, true);
      commit(next, "replace");
    }

    /** The history moved (back / forward / gesture): follow it. */
    function onPop(state) {
      const entry = state && state.ws;
      if (!entry || typeof entry.screen !== "string") return false;
      const dir = entry.depth < current.depth ? "back" : "forward";
      commit({ screen: entry.screen, overlay: entry.overlay || null, depth: entry.depth | 0 }, dir);
      return true;
    }

    if (win && win.addEventListener) win.addEventListener("popstate", event => onPop(event.state));

    return { go, overlay, closeOverlay, back, reset, onPop, current: () => current };
  }

  function reducedMotion(win = defaultWin) {
    return !!(win && win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /**
   * Run a DOM update as an animated screen change. With the View Transitions API the
   * old and new screens are snapshotted and animated by CSS (`html[data-nav-dir]`
   * picks the direction); without it, or with reduced motion, the update just happens
   * and the entering screen plays its own CSS entrance.
   */
  function transition(update, dir = "forward", win = defaultWin) {
    const doc = win && win.document;
    if (!doc || typeof doc.startViewTransition !== "function" || reducedMotion(win) || dir === "none") {
      update();
      return Promise.resolve();
    }
    const html = doc.documentElement;
    html.dataset.navDir = dir;
    let vt;
    try {
      vt = doc.startViewTransition(update);
    } catch (error) {
      delete html.dataset.navDir;
      update();
      return Promise.resolve();
    }
    const done = vt.finished.catch(() => {}).then(() => { delete html.dataset.navDir; });
    return done;
  }

  /**
   * A tapped colour block opens what it stands for: its colour floods the screen from
   * where it sits, `act()` runs underneath (navigate, open a page), then the colour fades
   * away. Resolves when the colour has gone. Reduced motion: `act()` runs at once.
   */
  function flood(from, act, { win = defaultWin } = {}) {
    const doc = win && win.document;
    if (!from || !doc || reducedMotion(win) || typeof from.animate !== "function") {
      act();
      return Promise.resolve();
    }
    const r = from.getBoundingClientRect();
    const w = win.innerWidth;
    const h = win.innerHeight;
    const fx = r.left + r.width / 2;
    const fy = r.top + r.height / 2;
    const reach = Math.hypot(Math.max(fx, w - fx), Math.max(fy, h - fy));
    const start = Math.min(r.width, r.height) / 2;
    const layer = doc.createElement("div");
    layer.className = "flood";
    layer.style.background = win.getComputedStyle(from).backgroundColor;
    layer.style.clipPath = `circle(${start}px at ${fx}px ${fy}px)`;
    doc.body.appendChild(layer);
    const done = () => layer.remove();
    return layer.animate([
      { clipPath: `circle(${start}px at ${fx}px ${fy}px)` },
      { clipPath: `circle(${reach}px at ${fx}px ${fy}px)` }
    ], { duration: 420, easing: "cubic-bezier(.65, 0, .35, 1)", fill: "both" }).finished
      .then(() => { act(); })
      .then(() => layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360, easing: "ease-out", fill: "forwards" }).finished)
      .then(done, error => { done(); throw error; });
  }

  return { createNav, transition, flood, reducedMotion };
});
