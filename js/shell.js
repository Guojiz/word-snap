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
   * The start screen: big colour blocks; tapping one starts the app. `pick(index)` gets the
   * tapped block's `data-theme` (Enter / Space and taps between blocks pass `fallback`)
   * and should make it the set colour. Then that block's colour floods the screen from
   * where it sits, the others fly off, the flood fades to show the first screen
   * underneath, and the element is removed. Resolves once the first screen is visible.
   */
  function start(el, { pick = () => {}, fallback = 0, win = defaultWin } = {}) {
    if (!el) return Promise.resolve();
    const doc = win.document;
    const quick = reducedMotion(win);
    el.classList.add("play");
    return new Promise(resolve => {
      const button = el.querySelector(".start-go") || el;
      const blocks = [...el.querySelectorAll(".blk")];
      let chosen = null;

      // The cluster leans towards the finger or pointer.
      const lean = event => {
        if (quick || chosen) return;
        const box = el.getBoundingClientRect();
        const cluster = el.querySelector(".blocks");
        if (!cluster || !box.width) return;
        cluster.style.setProperty("--px", (((event.clientX - box.left) / box.width) - 0.5).toFixed(3));
        cluster.style.setProperty("--py", (((event.clientY - box.top) / box.height) - 0.5).toFixed(3));
      };
      el.addEventListener("pointermove", lean);
      el.addEventListener("pointerdown", lean);

      const go = event => {
        if (chosen) return;
        const hit = event && event.target && event.target.closest ? event.target.closest(".blk") : null;
        chosen = hit || blocks.find(b => Number(b.dataset.theme) === fallback) || blocks[0];
        const index = chosen ? Number(chosen.dataset.theme) : fallback;
        pick(index);
        el.classList.add("leaving");
        const finish = () => {
          el.remove();
          resolve(index);
        };
        if (quick || !chosen || typeof chosen.animate !== "function") {
          el.animate ? el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }).finished.then(finish, finish) : finish();
          return;
        }
        // The others fly off, away from the middle.
        const mid = el.getBoundingClientRect();
        const cx = mid.left + mid.width / 2;
        const cy = mid.top + mid.height / 2;
        blocks.filter(b => b !== chosen).forEach(b => {
          const r = b.getBoundingClientRect();
          const dx = r.left + r.width / 2 - cx;
          const dy = r.top + r.height / 2 - cy;
          const len = Math.hypot(dx, dy) || 1;
          b.animate([
            { transform: "none", opacity: 1 },
            { transform: `translate(${(dx / len) * mid.width * 0.7}px, ${(dy / len) * mid.height * 0.6}px) scale(.6) rotate(${dx > 0 ? 25 : -25}deg)`, opacity: 0 }
          ], { duration: 520, easing: "cubic-bezier(.5, 0, .75, 0)", fill: "forwards" });
        });
        // The picked one: a squeeze, then its colour floods out from where it sits.
        const r = chosen.getBoundingClientRect();
        const fx = r.left + r.width / 2;
        const fy = r.top + r.height / 2;
        const reach = Math.hypot(Math.max(fx, mid.width - fx), Math.max(fy, mid.height - fy));
        const flood = doc.createElement("div");
        flood.className = "start-flood";
        flood.style.background = win.getComputedStyle(chosen).getPropertyValue("--c") || "#ffe27a";
        flood.style.clipPath = `circle(0px at ${fx}px ${fy}px)`;
        el.appendChild(flood);
        chosen.animate([{ scale: 1 }, { scale: 1.12 }, { scale: 0.9 }], { duration: 300, easing: "ease-out", fill: "forwards" });
        const grow = flood.animate([
          { clipPath: `circle(${Math.min(r.width, r.height) / 2}px at ${fx}px ${fy}px)` },
          { clipPath: `circle(${reach}px at ${fx}px ${fy}px)` }
        ], { duration: 560, delay: 140, easing: "cubic-bezier(.65, 0, .35, 1)", fill: "both" });
        grow.finished.then(() => {
          el.classList.add("revealing");
          blocks.forEach(b => { b.style.visibility = "hidden"; });
          return flood.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: "ease-out", fill: "forwards" }).finished;
        }).then(finish, finish);
      };
      button.addEventListener("click", go);
      // A tap anywhere on the screen counts too (between the blocks, on the wordmark).
      el.addEventListener("click", event => { if (!button.contains(event.target)) go(event); });
    });
  }

  return { createNav, transition, start, reducedMotion };
});
