/*
 * Word Snap sound effects, synthesised with Web Audio (no audio files: nothing to license,
 * nothing to download, a few KB). Each moment that has a haptic texture (js/fx.js) has a
 * matching sound:
 *   tap        a soft click (buttons)
 *   select     a light tick (choosing a card)
 *   wrong      two low, soft notes going down
 *   combo      a quick rising arpeggio (combo milestones)
 *   claim      a coin (claiming the set's points)
 *   setComplete a short fanfare
 *   goalDone   the fanfare with a shimmer (today's goal)
 *   ignite     a whoosh that catches into a flame, then a rising chime (lighting the day's streak)
 *   commit     a warm chord ("我坚持")
 *   levelUp    a run up the scale into a chord (a new card rank)
 *   swipe      a soft rising tick while dragging the flame (level 0..1 = how far)
 * The streak piano notes on correct matches stay in the page (Settings → streak tones).
 *
 * render(name) plays a sound into an OfflineAudioContext and measure(buffer) returns its
 * length, peak, loudness and tail, so sounds can be checked without listening.
 *
 * Classic script: window.WordSnapSfx in the page; module.exports for Node.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WordSnapSfx = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (win) {
  "use strict";

  let on = true;
  let ctx = null;
  const MASTER = 1;

  function live() {
    const Ctx = win && (win.AudioContext || win.webkitAudioContext);
    if (!Ctx) return null;
    if (!ctx) ctx = new Ctx();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function note(n) { return 440 * Math.pow(2, (n - 69) / 12); } // MIDI number → Hz

  /** One enveloped oscillator into `out`. */
  function tone(ac, out, { f, t = 0, dur = 0.2, type = "sine", gain = 0.3, attack = 0.005, glide = null }) {
    const at = ac.currentTime + t;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, at);
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(gain, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  /** Filtered noise; `sweep` moves the filter from f to sweep over dur. */
  function noise(ac, out, { t = 0, dur = 0.1, gain = 0.2, type = "bandpass", f = 2000, sweep = null, q = 1, attack = 0.003 }) {
    const at = ac.currentTime + t;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    let seed = 1;
    for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; data[i] = seed / 1073741823.5 - 1; } // deterministic
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(f, at);
    if (sweep) filter.frequency.exponentialRampToValueAtTime(sweep, at + dur);
    filter.Q.setValueAtTime(q, at);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(gain, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(g).connect(out);
    src.start(at);
    src.stop(at + dur + 0.02);
  }

  function sparkle(ac, out, t, count = 5, base = 96) {
    for (let i = 0; i < count; i++) tone(ac, out, { f: note(base + (i % 3) * 4 + (i > 2 ? 12 : 0)), t: t + i * 0.055, dur: 0.18, gain: 0.05 + 0.02 * (count - i) / count });
  }

  const SOUNDS = {
    tap(ac, o) {
      noise(ac, o, { dur: 0.012, gain: 0.3, type: "highpass", f: 3000 });
      tone(ac, o, { f: 1400, dur: 0.03, gain: 0.2 });
    },
    select(ac, o) { tone(ac, o, { f: 1760, dur: 0.045, gain: 0.18, type: "triangle" }); },
    wrong(ac, o) {
      tone(ac, o, { f: note(57), dur: 0.16, gain: 0.22, type: "triangle" });
      tone(ac, o, { f: note(52), t: 0.11, dur: 0.26, gain: 0.22, type: "triangle", glide: note(50) });
    },
    combo(ac, o) {
      [84, 88, 91, 96].forEach((n, i) => tone(ac, o, { f: note(n), t: i * 0.06, dur: 0.16 + i * 0.03, gain: 0.16, type: "triangle" }));
    },
    claim(ac, o) {
      tone(ac, o, { f: note(83), dur: 0.08, gain: 0.18, type: "square" });
      tone(ac, o, { f: note(88), t: 0.075, dur: 0.42, gain: 0.16, type: "square" });
      tone(ac, o, { f: note(100), t: 0.075, dur: 0.3, gain: 0.05 });
    },
    setComplete(ac, o) {
      [72, 76, 79].forEach((n, i) => tone(ac, o, { f: note(n), t: i * 0.09, dur: 0.14, gain: 0.18, type: "triangle" }));
      [72, 76, 79, 84].forEach(n => tone(ac, o, { f: note(n), t: 0.3, dur: 0.75, gain: 0.1, type: "triangle", attack: 0.01 }));
      sparkle(ac, o, 0.32, 4);
    },
    goalDone(ac, o) {
      SOUNDS.setComplete(ac, o);
      [84, 88, 91, 96].forEach((n, i) => tone(ac, o, { f: note(n), t: 0.62 + i * 0.07, dur: 0.5, gain: 0.07 }));
      sparkle(ac, o, 0.9, 6, 100);
    },
    ignite(ac, o) {
      // the match strikes and the flame catches …
      noise(ac, o, { dur: 0.7, gain: 0.16, type: "bandpass", f: 300, sweep: 3200, q: 0.8, attack: 0.4 });
      tone(ac, o, { f: 70, dur: 0.9, gain: 0.18, attack: 0.5, glide: 110 });
      noise(ac, o, { t: 0.62, dur: 0.35, gain: 0.3, type: "lowpass", f: 900, sweep: 200 }); // whoomph
      tone(ac, o, { f: 90, t: 0.62, dur: 0.4, gain: 0.25, glide: 55 });
      // … and rings out
      [79, 83, 86, 91].forEach((n, i) => tone(ac, o, { f: note(n), t: 0.72 + i * 0.08, dur: 0.9 - i * 0.1, gain: 0.14, type: "triangle" }));
      sparkle(ac, o, 1.05, 6, 98);
    },
    commit(ac, o) {
      [60, 64, 67, 72].forEach((n, i) => tone(ac, o, { f: note(n), t: i * 0.02, dur: 1.0, gain: 0.11, type: "triangle", attack: 0.03 }));
      tone(ac, o, { f: note(48), dur: 0.9, gain: 0.12, attack: 0.02 });
    },
    levelUp(ac, o) {
      [72, 74, 76, 77, 79, 81, 83, 84].forEach((n, i) => tone(ac, o, { f: note(n), t: i * 0.05, dur: 0.12, gain: 0.13, type: "triangle" }));
      [72, 76, 79, 84, 88].forEach(n => tone(ac, o, { f: note(n), t: 0.42, dur: 1.0, gain: 0.08, type: "triangle", attack: 0.01 }));
      sparkle(ac, o, 0.5, 8, 100);
    },
    swipe(ac, o, level) { tone(ac, o, { f: 500 + 900 * level, dur: 0.035, gain: 0.1 + 0.12 * level, type: "triangle" }); }
  };

  function build(ac, name, level) {
    const master = ac.createGain();
    master.gain.value = MASTER;
    // A gentle limiter so stacked notes never clip.
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 6;
    master.connect(comp).connect(ac.destination);
    (SOUNDS[name] || SOUNDS.tap)(ac, master, level);
  }

  function play(name, level = 0) {
    if (!on || !SOUNDS[name]) return;
    const ac = live();
    if (!ac) return;
    try { build(ac, name, Math.max(0, Math.min(1, level))); } catch { /* audio unavailable */ }
  }

  /** Renders a sound offline (for checks): Promise<AudioBuffer>. */
  function render(name, level = 0, seconds = 2.5, rate = 44100) {
    const Off = win && (win.OfflineAudioContext || win.webkitOfflineAudioContext);
    if (!Off) return Promise.reject(new Error("no OfflineAudioContext"));
    const ac = new Off(1, Math.floor(seconds * rate), rate);
    build(ac, name, level);
    return ac.startRendering();
  }

  /** { ms: audible length, peak, rms (of the audible part), crest: peak/rms, tailMs: last -40 dB point after the peak }. */
  function measure(buffer) {
    const d = buffer.getChannelData(0);
    const rate = buffer.sampleRate;
    let peak = 0, peakAt = 0;
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) { peak = a; peakAt = i; } }
    const floor = peak * 0.01; // -40 dB
    let first = -1, last = -1;
    for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > floor) { if (first < 0) first = i; last = i; }
    let sum = 0;
    for (let i = Math.max(0, first); i <= last; i++) sum += d[i] * d[i];
    const n = Math.max(1, last - first + 1);
    const rms = Math.sqrt(sum / n);
    return {
      ms: first < 0 ? 0 : Math.round((last - first) / rate * 1000),
      peak: +peak.toFixed(3),
      rms: +rms.toFixed(4),
      crest: rms ? +(peak / rms).toFixed(1) : 0,
      peakAtMs: Math.round(peakAt / rate * 1000),
      tailMs: last < 0 ? 0 : Math.round((last - peakAt) / rate * 1000)
    };
  }

  return {
    play, render, measure, names: Object.keys(SOUNDS),
    setEnabled(value) { on = value !== false; },
    enabled() { return on; }
  };
});
