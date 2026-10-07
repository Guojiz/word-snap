/*
 * Word Snap visual effects: sparks on a correct match, a combo badge for a
 * streak of correct matches (bigger at 5 / 10 / 20 / 50), a shockwave on the
 * milestones and confetti when today's goal is done.
 *
 * Everything is drawn in one fixed layer that ignores the pointer, animated with
 * the Web Animations API, and removed when done. Nothing runs when the system asks
 * for reduced motion or the learner turns effects off (enabled()).
 *
 * Classic script: window.WordSnapFx in the page; module.exports for Node tests.
 */
(function (root, factory) {
  const api = factory(typeof document !== "undefined" ? document : null, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WordSnapFx = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (doc, win) {
  "use strict";

  const TIERS = [
    { at: 50, name: "legend", colors: ["#ff4b4b", "#ffc800", "#58cc02", "#1cb0f6", "#ce82ff"] },
    { at: 20, name: "blaze", colors: ["#ce82ff", "#ff86d0", "#1cb0f6"] },
    { at: 10, name: "fire", colors: ["#ff9600", "#ffc800", "#ff4b4b"] },
    { at: 5, name: "warm", colors: ["#ffc800", "#58cc02"] },
    { at: 0, name: "base", colors: ["#58cc02", "#89e219"] }
  ];
  const MILESTONES = [5, 10, 20, 50, 100];

  /** Combo tier for a streak length (pure, tested). */
  function tierFor(streak) {
    return TIERS.find(tier => streak >= tier.at);
  }

  /** Whether this streak length gets a shockwave (pure, tested). */
  function isMilestone(streak) {
    return MILESTONES.includes(streak) || (streak > 100 && streak % 50 === 0);
  }

  let on = true;
  let layer = null;
  let badge = null;
  let badgeTimer = null;

  function enabled() {
    if (!on || !doc || !win) return false;
    try {
      return !(win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch {
      return true;
    }
  }

  function setEnabled(value) {
    on = value !== false;
    if (!on && layer) layer.textContent = "";
  }

  function getLayer() {
    if (!layer || !layer.isConnected) {
      layer = doc.createElement("div");
      layer.className = "fx-layer";
      layer.setAttribute("aria-hidden", "true");
      doc.body.appendChild(layer);
    }
    return layer;
  }

  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function piece(cls, x, y, color, size) {
    const el = doc.createElement("span");
    el.className = cls;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = el.style.height = `${size}px`;
    el.style.background = color;
    el.style.color = color; // the spark's glow
    getLayer().appendChild(el);
    return el;
  }

  function play(el, keyframes, options) {
    if (!el.animate) { el.remove(); return; }
    const animation = el.animate(keyframes, { fill: "forwards", ...options });
    animation.onfinish = () => el.remove();
    animation.oncancel = () => el.remove();
  }

  /** Sparks flying out of each matched card; more and more colourful with the streak. */
  function sparks(cards, streak = 1) {
    if (!enabled()) return;
    const tier = tierFor(streak);
    const count = Math.min(18, 8 + Math.floor(streak / 3));
    for (const card of cards) {
      if (!card || !card.getBoundingClientRect) continue;
      const { x, y } = centerOf(card);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const dist = 34 + Math.random() * (30 + Math.min(streak, 20) * 2);
        const size = 4 + Math.random() * 4;
        const el = piece("fx-spark", x, y, tier.colors[i % tier.colors.length], size);
        play(el, [
          { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0.2)`, opacity: 0 }
        ], { duration: 520 + Math.random() * 200, easing: "cubic-bezier(.2,.7,.3,1)" });
      }
    }
  }

  /** "×n" badge over the board for a streak of 3 or more; a shockwave on milestones. */
  function combo(streak, anchor, label) {
    if (!enabled() || streak < 3 || !anchor) return;
    const tier = tierFor(streak);
    // The badge lives next to the board (not in the fixed layer), so it moves with
    // it — e.g. while focus mode glides the board to the middle of the screen.
    const host = anchor.offsetParent || anchor.parentElement;
    if (!badge || badge.parentElement !== host) {
      if (badge) badge.remove();
      badge = doc.createElement("div");
      badge.className = "fx-combo";
      badge.setAttribute("aria-hidden", "true");
      host.appendChild(badge);
    }
    badge.style.left = `${anchor.offsetLeft + anchor.offsetWidth / 2}px`;
    badge.style.top = `${anchor.offsetTop - 6}px`;
    badge.dataset.tier = tier.name;
    badge.textContent = label || `×${streak}`;
    if (badge.animate) {
      badge.animate([
        { transform: "translate(-50%, -100%) scale(0.6)", opacity: 0 },
        { transform: "translate(-50%, -100%) scale(1.25)", opacity: 1, offset: 0.35 },
        { transform: "translate(-50%, -100%) scale(1)", opacity: 1 }
      ], { duration: 360, easing: "ease-out", fill: "forwards" });
    }
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => {
      if (badge && badge.animate) badge.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" });
    }, 1400);
    if (isMilestone(streak)) shockwave(anchor, tier);
  }

  function shockwave(anchor, tier) {
    const { x, y } = centerOf(anchor);
    const ring = piece("fx-ring", x, y, "transparent", 40);
    ring.style.borderColor = tier.colors[0];
    play(ring, [
      { transform: "translate(-50%, -50%) scale(0.4)", opacity: 0.9 },
      { transform: "translate(-50%, -50%) scale(14)", opacity: 0 }
    ], { duration: 800, easing: "cubic-bezier(.1,.6,.3,1)" });
  }

  /** Confetti from the top of the screen (today's goal done). */
  function confetti(amount = 70) {
    if (!enabled()) return;
    const width = win.innerWidth || 400;
    const height = win.innerHeight || 700;
    const colors = TIERS[0].colors;
    for (let i = 0; i < amount; i++) {
      const x = Math.random() * width;
      const el = piece("fx-confetti", x, -20, colors[i % colors.length], 8);
      el.style.height = `${5 + Math.random() * 8}px`;
      const drift = (Math.random() - 0.5) * 240;
      const spin = (Math.random() - 0.5) * 1080;
      play(el, [
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${drift}px, ${height + 40}px) rotate(${spin}deg)`, opacity: 0.9 }
      ], { duration: 1800 + Math.random() * 1400, delay: Math.random() * 400, easing: "cubic-bezier(.25,.6,.45,1)" });
    }
  }

  /** A soft glow around an element (e.g. the finished set's badge). */
  function glow(el, color = "#58cc02") {
    if (!enabled() || !el || !el.animate) return;
    el.animate([
      { boxShadow: `0 0 0 0 ${color}` },
      { boxShadow: `0 0 0 18px transparent` }
    ], { duration: 900, easing: "ease-out" });
  }

  return { sparks, combo, confetti, glow, setEnabled, enabled, tierFor, isMilestone };
});
