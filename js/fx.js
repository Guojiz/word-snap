/*
 * Word Snap motion, in the spirit of Duolingo's: quiet on every answer, bigger
 * only when it means something.
 *   judge      the rhythm-game judgement over a match: PERFECT / GREAT / GOOD / MISS,
 *              from the engine's own grade (reaction time against the learner's pace)
 *   roll       numbers that change roll digit by digit
 *   ripple     a soft ring around each matched card (every correct match)
 *   burst      a few stars out of an element (streak milestones 5 / 10 / 20 / 50)
 *   countUp    a number that counts up (set summary)
 *   confetti   today's goal done
 *   banner     a short message over the board (today's goal done, also in focus mode)
 *   haptic     a short vibration where the device has one
 * Everything is drawn in one fixed layer that ignores the pointer, animated with
 * the Web Animations API and removed when done. Nothing runs when the system asks
 * for reduced motion or the learner turns effects off.
 *
 * Classic script: window.WordSnapFx in the page; module.exports for Node tests.
 */
(function (root, factory) {
  const api = factory(typeof document !== "undefined" ? document : null, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WordSnapFx = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (doc, win) {
  "use strict";

  /** Streak tiers: the progress bar and its label change colour at these lengths. */
  const TIERS = [
    { at: 20, name: "blaze", colors: ["#18c6b5", "#ffc933", "#ff5c8a"] },
    { at: 10, name: "fire", colors: ["#ff9a3d", "#ff5c8a", "#ffc933"] },
    { at: 5, name: "gold", colors: ["#ffc933", "#ff9a3d"] },
    { at: 0, name: "base", colors: ["#18c6b5", "#5ef0e2"] }
  ];
  const MILESTONES = [5, 10, 20, 50, 100];
  const STAR_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 0l1.9 6.1L16 8l-6.1 1.9L8 16l-1.9-6.1L0 8l6.1-1.9z"/></svg>';
  const SPRING = "cubic-bezier(.34, 1.56, .64, 1)";

  function tierFor(streak) {
    return TIERS.find(tier => streak >= tier.at);
  }

  function isMilestone(streak) {
    return MILESTONES.includes(streak) || (streak > 100 && streak % 50 === 0);
  }

  /** "m:ss" for a duration in ms (pure, tested). */
  function clock(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }

  let on = true;
  let layer = null;

  function motionOk() {
    if (!doc || !win) return false;
    try {
      return !(win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch {
      return true;
    }
  }

  function enabled() {
    return on && motionOk();
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

  function play(el, keyframes, options) {
    if (!el.animate) { el.remove(); return; }
    const animation = el.animate(keyframes, { fill: "forwards", ...options });
    animation.onfinish = () => el.remove();
    animation.oncancel = () => el.remove();
  }

  /** A soft ring that grows out of each card's outline and fades. */
  function ripple(cards, color = "#18c6b5") {
    if (!enabled()) return;
    for (const card of cards) {
      if (!card || !card.getBoundingClientRect) continue;
      const r = card.getBoundingClientRect();
      const ring = doc.createElement("span");
      ring.className = "fx-ripple";
      Object.assign(ring.style, {
        left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
        borderColor: color, borderRadius: win.getComputedStyle(card).borderRadius
      });
      getLayer().appendChild(ring);
      play(ring, [
        { transform: "scale(1)", opacity: 0.55 },
        { transform: "scale(1.12, 1.35)", opacity: 0 }
      ], { duration: 480, easing: "cubic-bezier(.2,.7,.3,1)" });
    }
  }

  /** A few small stars out of an element (a streak milestone). */
  function burst(el, streak = 5) {
    if (!enabled() || !el || !el.getBoundingClientRect) return;
    const tier = tierFor(streak);
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const dist = 28 + Math.random() * 26;
      const star = doc.createElement("span");
      star.className = "fx-star";
      star.innerHTML = STAR_SVG;
      Object.assign(star.style, { left: `${x}px`, top: `${y}px`, color: tier.colors[i % tier.colors.length] });
      getLayer().appendChild(star);
      play(star, [
        { transform: "translate(-50%, -50%) scale(0.3) rotate(0deg)", opacity: 0 },
        { transform: `translate(calc(-50% + ${Math.cos(angle) * dist * 0.6}px), calc(-50% + ${Math.sin(angle) * dist * 0.6}px)) scale(1.1) rotate(60deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0.4) rotate(120deg)`, opacity: 0 }
      ], { duration: 700, easing: "ease-out" });
    }
  }

  /** Judgement name for an engine grade (1 Again … 4 Easy). Pure, tested. */
  function judgementFor(grade) {
    return grade >= 4 ? "perfect" : grade === 3 ? "great" : grade === 2 ? "good" : "miss";
  }

  const JUDGE_TEXT = { perfect: "PERFECT", great: "GREAT", good: "GOOD", miss: "MISS" };

  /**
   * The judgement word over a matched (or missed) pair, with the reaction time.
   * Shown even with effects off — it is information, not decoration; only the
   * motion is dropped then.
   */
  function judge(cards, kind, ms) {
    if (!doc) return;
    const boxes = cards.filter(c => c && c.getBoundingClientRect).map(c => c.getBoundingClientRect());
    if (!boxes.length) return;
    // Above the pair, centred between its two cards.
    const y = Math.min(...boxes.map(b => b.top)) - 6;
    const x = boxes.reduce((sum, b) => sum + b.left + b.width / 2, 0) / boxes.length;
    const el = doc.createElement("div");
    el.className = `fx-judge fx-judge-${kind}`;
    el.textContent = JUDGE_TEXT[kind] || "";
    if (ms > 0 && kind !== "miss") {
      const time = doc.createElement("small");
      time.textContent = `${(ms / 1000).toFixed(1)}s`;
      el.appendChild(time);
    }
    Object.assign(el.style, { left: `${x}px`, top: `${y}px` });
    getLayer().appendChild(el);
    if (!enabled() || !el.animate) {
      setTimeout(() => el.remove(), 700);
      return;
    }
    play(el, [
      { transform: "translate(-50%, -70%) scale(0.55) rotate(-4deg)", opacity: 0 },
      { transform: "translate(-50%, -100%) scale(1.12) rotate(-4deg)", opacity: 1, offset: 0.22 },
      { transform: "translate(-50%, -100%) scale(1) rotate(-4deg)", opacity: 1, offset: 0.7 },
      { transform: "translate(-50%, -130%) scale(0.96) rotate(-4deg)", opacity: 0 }
    ], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
  }

  /** Sets el's text; changed characters roll up into place (a scoreboard, not a jump). */
  function roll(el, text) {
    if (!el) return;
    text = String(text);
    const before = el.dataset.rollText;
    if (before === text) {
      if (el.textContent !== text) el.textContent = text; // re-rendered element, same number
      return;
    }
    el.dataset.rollText = text;
    if (!enabled() || before == null) { el.textContent = text; return; }
    el.textContent = "";
    [...text].forEach((ch, i) => {
      const span = doc.createElement("span");
      span.className = "fx-digit";
      span.textContent = ch;
      el.appendChild(span);
      if (before[i] !== ch && span.animate) {
        span.animate([
          { transform: "translateY(60%)", opacity: 0 },
          { transform: "translateY(0)", opacity: 1 }
        ], { duration: 260, delay: i * 35, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
      }
    });
  }

  /** A spring "pop" on an element (label, badge, tile). */
  function pop(el, scale = 1.18) {
    if (!enabled() || !el || !el.animate) return;
    el.animate([
      { transform: "scale(1)" },
      { transform: `scale(${scale})`, offset: 0.4 },
      { transform: "scale(1)" }
    ], { duration: 420, easing: SPRING });
  }

  /** Counts el's text up to `to` (formatted by fmt) over `ms`, after `delay`. */
  function countUp(el, to, fmt = String, { ms = 700, delay = 0 } = {}) {
    if (!el) return;
    if (!enabled() || !win.requestAnimationFrame) { el.textContent = fmt(to); return; }
    el.textContent = fmt(0);
    const start = performance.now() + delay;
    const step = now => {
      const t = Math.min(1, Math.max(0, (now - start) / ms));
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(Math.round(to * eased));
      if (t < 1) win.requestAnimationFrame(step);
    };
    win.requestAnimationFrame(step);
  }

  /** Confetti from the top of the screen (today's goal done). */
  function confetti(amount = 70) {
    if (!enabled()) return;
    const width = win.innerWidth || 400;
    const height = win.innerHeight || 700;
    const colors = ["#ff5c8a", "#ffc933", "#18c6b5", "#7c5cff", "#ff9a3d"];
    for (let i = 0; i < amount; i++) {
      const el = doc.createElement("span");
      el.className = "fx-confetti";
      Object.assign(el.style, {
        left: `${Math.random() * width}px`, top: "-20px", width: "8px",
        height: `${5 + Math.random() * 8}px`, background: colors[i % colors.length]
      });
      getLayer().appendChild(el);
      const drift = (Math.random() - 0.5) * 240;
      const spin = (Math.random() - 0.5) * 1080;
      play(el, [
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${drift}px, ${height + 40}px) rotate(${spin}deg)`, opacity: 0.9 }
      ], { duration: 1800 + Math.random() * 1400, delay: Math.random() * 400, easing: "cubic-bezier(.25,.6,.45,1)" });
    }
  }

  /** A pill over the board for a moment ("Today's goal done") — seen even in focus mode. */
  function banner(text) {
    if (!doc || !text) return;
    const el = doc.createElement("div");
    el.className = "fx-banner";
    el.setAttribute("role", "status");
    el.textContent = text;
    getLayer().appendChild(el);
    if (!enabled() || !el.animate) {
      setTimeout(() => el.remove(), 2600);
      return;
    }
    play(el, [
      { transform: "translate(-50%, -12px) scale(0.85)", opacity: 0 },
      { transform: "translate(-50%, 0) scale(1.06)", opacity: 1, offset: 0.12 },
      { transform: "translate(-50%, 0) scale(1)", opacity: 1, offset: 0.2 },
      { transform: "translate(-50%, 0) scale(1)", opacity: 1, offset: 0.85 },
      { transform: "translate(-50%, -8px) scale(0.98)", opacity: 0 }
    ], { duration: 2800, easing: "ease-out" });
  }

  /** A short vibration (correct: a tap; wrong: a double buzz). Off with effects. */
  function haptic(kind = "tap") {
    if (!on || !win || !win.navigator || typeof win.navigator.vibrate !== "function") return;
    try {
      win.navigator.vibrate(kind === "wrong" ? [18, 40, 18] : kind === "milestone" ? [12, 30, 12, 30, 24] : 8);
    } catch { /* not allowed here */ }
  }

  return { judge, judgementFor, roll, ripple, burst, pop, countUp, confetti, banner, haptic, setEnabled, enabled, tierFor, isMilestone, clock, SPRING };
});
