/*
 * Word Snap sound effects: a guzheng (古筝), synthesised with Web Audio (no audio files:
 * nothing to license, nothing to download, a few KB).
 *   - Each note is a plucked string (Karplus–Strong: a burst of noise circulating through a
 *     delay line that loses a little each pass), with the left hand's vibrato (揉弦) and
 *     bends (滑音).
 *   - Notes come from the gong-mode pentatonic (宫商角徵羽, no semitones), so any two of them
 *     sound well together.
 *   - A sweep up the strings (刮奏) marks a finished set; a two-tone bronze bell (编钟) marks
 *     the big moments.
 * Each moment that has a haptic texture (js/fx.js) has a matching sound:
 *   tap         a soft, short high pluck (buttons)
 *   select      a lighter one (choosing a card)
 *   match       one note per correct pair; level = the streak (1, 2, 3 …), see matchNotes()
 *   wrong       断弦, a string snapping: a crack, the string whipping down an octave, a slap
 *   combo       a short 刮奏 (combo milestones)
 *   claim       a pluck and its octave (claiming the set's points)
 *   setComplete a 刮奏 into a held chord
 *   goalDone    a longer 刮奏, the chord and the bell (today's goal)
 *   ignite      the bell, then a long 刮奏 (lighting the day's streak)
 *   commit      a warm low chord with vibrato ("我坚持")
 *   levelUp     a full 刮奏 into a chord and the bell (a new card rank)
 *   swipe       a pluck that climbs while dragging the flame (level 0..1 = how far)
 *
 * The streak never stops rising: matchNotes(n) plays the n-th scale step in a few octaves at
 * once, loudest in the middle of a fixed window (a Shepard tone). Each match steps up, the
 * top octave fades out as a new bottom one fades in, so step 40 sounds as "higher" as step 4
 * while the loudest note always stays between E4 and E5 and nothing goes above F♯6.
 *
 * render(name) plays a sound into an OfflineAudioContext and measure(buffer) returns its
 * length, peak, loudness, tail and how much of its energy is above 2 kHz (brightness), so
 * sounds can be checked without listening.
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
  let bus = null;
  let room = null; // the live context's reverb { verb, wet }, until its impulse has been built

  const KEY = 64; // E4 is 宫
  const GONG = [0, 2, 4, 7, 9]; // 宫 商 角 徵 羽
  // The Shepard window for streak notes: loudest at center, fading out about an octave either side.
  // No hard bottom edge: a new low partial enters only once the bell curve lets it (≈7 %), so it
  // fades in instead of popping in, and the top one fades out the same way.
  const SHEPARD = { center: 70, sigma: 6, low: 48, high: 96, floor: 0.06 };

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); } // MIDI number → Hz
  function scaleNote(i) { return KEY + 12 * Math.floor(i / 5) + GONG[((i % 5) + 5) % 5]; }

  /**
   * The notes for the n-th correct match in a row (pure, tested): [{ midi, gain }], gains
   * summing to 1. Step n-1 of the pentatonic, in every octave inside the window, weighted by
   * a bell curve over pitch.
   */
  function matchNotes(n) {
    const step = Math.max(0, Math.floor(n) - 1);
    const pc = GONG[step % 5]; // pitch class above KEY; the octave comes from the window
    const notes = [];
    for (let m = KEY + pc - 24; m <= SHEPARD.high; m += 12) {
      if (m < SHEPARD.low) continue;
      const w = Math.exp(-0.5 * Math.pow((m - SHEPARD.center) / SHEPARD.sigma, 2));
      if (w >= SHEPARD.floor) notes.push({ midi: m, gain: w });
    }
    const sum = notes.reduce((s, x) => s + x.gain, 0) || 1;
    notes.forEach(x => { x.gain = +(x.gain / sum).toFixed(4); });
    return notes;
  }

  /** The loudest note of step n. */
  function loudest(n) { return matchNotes(n).reduce((a, b) => (b.gain > a.gain ? b : a)).midi; }

  /** The grace note after the n-th match: the next step's nearest note above the loudest one (pure, tested). */
  function graceNote(n) {
    const top = loudest(n);
    const above = matchNotes(n + 1).map(x => x.midi).filter(m => m > top);
    return above.length ? Math.min(...above) : top + 12;
  }

  function impulse(ac, sec, decay) {
    const n = Math.floor(ac.sampleRate * sec);
    const b = ac.createBuffer(2, n, ac.sampleRate);
    let seed = 11;
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) { seed = (seed * 16807) % 2147483647; d[i] = (seed / 1073741823.5 - 1) * Math.pow(1 - i / n, decay); }
    }
    return b;
  }

  /** The room: a soft low-pass, a little reverb and a gentle limiter so stacked notes never clip. */
  function chain(ac, lazy = false) {
    const input = ac.createGain();
    const soft = ac.createBiquadFilter();
    const verb = ac.createConvolver();
    const wet = ac.createGain();
    const comp = ac.createDynamicsCompressor();
    const master = ac.createGain();
    soft.type = "lowpass";
    soft.frequency.value = 3400;
    // Offline renders get the room at once; live play builds it when the page is idle (warm()).
    if (lazy) { room = { verb, wet }; wet.gain.value = 0; } else verb.buffer = impulse(ac, 2.2, 3);
    wet.gain.value = 0.24;
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    master.gain.value = 0.42;
    input.connect(soft);
    soft.connect(comp);
    soft.connect(verb).connect(wet).connect(comp);
    comp.connect(master).connect(ac.destination);
    return input;
  }

  const strings = new Map();
  /** One plucked string at f Hz (cached per sample rate and pitch). */
  function string(ac, f) {
    const sr = ac.sampleRate;
    const id = `${sr}:${Math.round(f * 10)}`;
    if (strings.has(id)) return strings.get(id);
    const N = Math.max(2, Math.round(sr / f));
    const len = Math.floor(sr * 2);
    const out = ac.createBuffer(1, len, sr);
    const d = out.getChannelData(0);
    const line = new Float32Array(N);
    let seed = 1234 + N;
    for (let i = 0; i < N; i++) { seed = (seed * 16807) % 2147483647; line[i] = seed / 1073741823.5 - 1; }
    // A soft pluck: the noise smoothed so the attack rings instead of scratching.
    for (let pass = 0; pass < 3; pass++) for (let i = 1; i < N; i++) line[i] = 0.5 * line[i] + 0.5 * line[i - 1];
    const loss = 0.9975 - 0.0018 * Math.min(1, f / 1500);
    for (let i = 0, p = 0; i < len; i++) {
      const q = (p + 1) % N;
      d[i] = line[p];
      line[p] = loss * 0.5 * (line[p] + line[q]);
      p = q;
    }
    const v = { buf: out, rate: f / (sr / (N + 0.5)) }; // the averaging adds half a sample of delay: tune it back
    strings.set(id, v);
    return v;
  }

  /** A guzheng note: the pluck, then vibrato (揉) or a bend (滑, in semitones) from the left hand. */
  function zheng(ac, out, f, t, { gain = 0.3, len = 1.2, vib = 0, bend = 0, bendAt = 0.06, bendLen = 0.22 } = {}) {
    const at = ac.currentTime + t;
    const { buf, rate } = string(ac, f);
    const src = ac.createBufferSource();
    const g = ac.createGain();
    const body = ac.createBiquadFilter();
    src.buffer = buf;
    src.playbackRate.setValueAtTime(rate, at);
    if (bend) {
      src.playbackRate.setValueAtTime(rate, at + bendAt);
      src.playbackRate.exponentialRampToValueAtTime(rate * Math.pow(2, bend / 12), at + bendAt + bendLen);
    }
    if (vib) {
      const lfo = ac.createOscillator();
      const depth = ac.createGain();
      lfo.frequency.value = 5.2;
      depth.gain.setValueAtTime(0, at);
      depth.gain.linearRampToValueAtTime(rate * vib, at + 0.35);
      lfo.connect(depth).connect(src.playbackRate);
      lfo.start(at);
      lfo.stop(at + len);
    }
    body.type = "peaking"; // the soundboard: a little warmth around 300 Hz
    body.frequency.value = 300;
    body.gain.value = 3;
    g.gain.setValueAtTime(gain, at);
    g.gain.setTargetAtTime(0.0001, at + len * 0.6, len * 0.18);
    src.connect(body).connect(g).connect(out);
    src.start(at);
    src.stop(at + len + 0.3);
  }

  /** A two-tone bronze bell (编钟): a hum, a strike tone and its minor-third partner, a shimmer that dies first. */
  function bianzhong(ac, out, f, t, gain = 0.12) {
    const at = ac.currentTime + t;
    [[0.5, 0.35, 3.2], [1, 1, 2.6], [1.19, 0.55, 2.2], [2.01, 0.3, 1.4], [2.76, 0.18, 0.8], [3.8, 0.08, 0.4]].forEach(([r, g, d]) => {
      const o = ac.createOscillator();
      const v = ac.createGain();
      o.frequency.value = f * r;
      v.gain.setValueAtTime(0, at);
      v.gain.linearRampToValueAtTime(gain * g, at + 0.006);
      v.gain.exponentialRampToValueAtTime(0.0001, at + d);
      o.connect(v).connect(out);
      o.start(at);
      o.stop(at + d + 0.05);
    });
  }

  const snaps = new Map();
  /** 断弦: the crack of a string giving way, a burst of noise that is gone in 40 ms (cached per sample rate). */
  function snap(ac, out, t, gain = 0.2) {
    const at = ac.currentTime + t;
    const sr = ac.sampleRate;
    if (!snaps.has(sr)) {
      const len = Math.floor(sr * 0.04);
      const b = ac.createBuffer(1, len, sr);
      const d = b.getChannelData(0);
      let seed = 4242;
      for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; d[i] = (seed / 1073741823.5 - 1) * Math.exp(-i / (sr * 0.008)); }
      snaps.set(sr, b);
    }
    const src = ac.createBufferSource();
    const band = ac.createBiquadFilter();
    const g = ac.createGain();
    src.buffer = snaps.get(sr);
    band.type = "bandpass";
    band.frequency.value = 2200;
    band.Q.value = 1.1;
    g.gain.value = gain;
    src.connect(band).connect(g).connect(out);
    src.start(at);
  }

  /** 刮奏: a sweep up the scale from step `from`, fast at first, the last note held. Returns when it ends. */
  function gliss(ac, out, from, count, t, step = 0.032, gain = 0.2) {
    for (let i = 0; i < count; i++) {
      const last = i === count - 1;
      zheng(ac, out, hz(scaleNote(from + i)), t + i * step * (1 + i * 0.02), { gain: gain * (0.55 + 0.45 * i / count), len: last ? 1.6 : 0.5, vib: last ? 0.006 : 0 });
    }
    return t + count * step * (1 + count * 0.02);
  }

  const SOUNDS = {
    tap(ac, o) { zheng(ac, o, hz(KEY + 31), 0, { gain: 0.07, len: 0.07 }); },
    select(ac, o) { zheng(ac, o, hz(KEY + 24), 0, { gain: 0.05, len: 0.08 }); },
    match(ac, o, n) {
      // Heard dozens of times a set: darker than the other sounds (no brighter than the old piano notes).
      const warm = ac.createBiquadFilter();
      warm.type = "lowpass";
      warm.frequency.value = 1200;
      warm.connect(o);
      o = warm;
      const vib = n >= 6 ? 0.005 : 0;
      matchNotes(n).forEach(x => zheng(ac, o, hz(x.midi), 0, { gain: 0.94 * x.gain, len: 0.9, vib }));
      // Every 5th in a row: a quick grace note one step above (a flourish, not yet a 刮奏).
      if (n % 5 === 0) zheng(ac, o, hz(graceNote(n)), 0.07, { gain: 0.1, len: 0.6 });
    },
    wrong(ac, o) {
      // 断弦: a crack, the freed string whipping down an octave, and a dull slap on the board.
      snap(ac, o, 0, 0.22);
      zheng(ac, o, hz(KEY + 2), 0.004, { gain: 0.24, len: 0.32, bend: -12, bendAt: 0.012, bendLen: 0.14 });
      zheng(ac, o, hz(KEY - 22), 0.03, { gain: 0.14, len: 0.22, bend: -3, bendAt: 0.02, bendLen: 0.1 });
    },
    combo(ac, o) { gliss(ac, o, 5, 5, 0.12, 0.04, 0.12); },
    claim(ac, o) {
      zheng(ac, o, hz(scaleNote(7)), 0, { gain: 0.2, len: 0.9 });
      zheng(ac, o, hz(scaleNote(12)), 0.06, { gain: 0.12, len: 1.1, vib: 0.004 });
    },
    setComplete(ac, o) {
      const end = gliss(ac, o, -5, 9, 0, 0.032, 0.22) + 0.05;
      [0, 3, 5].forEach(i => zheng(ac, o, hz(scaleNote(i)), end, { gain: 0.16, len: 1.8, vib: 0.005 }));
    },
    goalDone(ac, o) {
      const end = gliss(ac, o, -5, 13, 0, 0.032, 0.22) + 0.05;
      [0, 3, 5].forEach(i => zheng(ac, o, hz(scaleNote(i)), end, { gain: 0.16, len: 1.8, vib: 0.005 }));
      bianzhong(ac, o, hz(KEY - 12), end + 0.02, 0.1);
    },
    ignite(ac, o) {
      bianzhong(ac, o, hz(KEY - 12), 0, 0.14);
      gliss(ac, o, -5, 11, 0.5, 0.04, 0.2);
    },
    commit(ac, o) {
      [-5, -3, 0].forEach((i, k) => zheng(ac, o, hz(scaleNote(i)), k * 0.03, { gain: 0.15, len: 1.6, vib: 0.005 }));
    },
    levelUp(ac, o) {
      const end = gliss(ac, o, -5, 15, 0, 0.03, 0.2) + 0.05;
      [0, 2, 5].forEach(i => zheng(ac, o, hz(scaleNote(i)), end, { gain: 0.15, len: 1.8, vib: 0.005 }));
      bianzhong(ac, o, hz(KEY - 12), end + 0.02, 0.12);
    },
    swipe(ac, o, level) { zheng(ac, o, hz(scaleNote(Math.round(level * 7))), 0, { gain: 0.08, len: 0.2 }); }
  };

  /** level: 0..1 for swipe; the streak (1, 2, 3 …) for match; ignored otherwise. */
  function clampLevel(name, level) {
    const n = Number(level) || 0;
    return name === "match" ? Math.max(1, Math.floor(n)) : Math.max(0, Math.min(1, n));
  }

  /**
   * Plays a sound. options.ignoreSwitch: play even when sound effects are off (the streak
   * notes have their own setting).
   */
  function play(name, level = 0, options = {}) {
    if ((!on && !options.ignoreSwitch) || !SOUNDS[name]) return;
    const Ctx = win && (win.AudioContext || win.webkitAudioContext);
    if (!Ctx) return;
    try {
      if (!ctx) { ctx = new Ctx(); bus = chain(ctx, true); warm(); }
      if (ctx.state === "suspended") ctx.resume();
      SOUNDS[name](ctx, bus, clampLevel(name, level));
    } catch { /* audio unavailable */ }
  }

  /**
   * Board first: the reverb impulse and the plucked strings of the first streak notes take a few
   * ms each to synthesise (tens on a phone). Build them in idle slices right after the context
   * exists, so the first match never waits for them.
   */
  function warm() {
    const idle = win.requestIdleCallback ? cb => win.requestIdleCallback(cb, { timeout: 400 }) : cb => setTimeout(cb, 30);
    const jobs = [() => {
      if (!room) return;
      room.verb.buffer = impulse(ctx, 2.2, 3);
      room.wet.gain.setTargetAtTime(0.24, ctx.currentTime, 0.4); // the room fades in, never blooms mid-note
      room = null;
    }];
    for (let n = 1; n <= 10; n++) {
      jobs.push(() => {
        matchNotes(n).forEach(x => string(ctx, hz(x.midi)));
        if (n % 5 === 0) string(ctx, hz(graceNote(n)));
      });
    }
    const next = () => { const job = jobs.shift(); if (!job) return; try { job(); } catch { /* audio unavailable */ } idle(next); };
    idle(next);
  }

  /** Renders a sound offline (for checks): Promise<AudioBuffer>. */
  function render(name, level = 0, seconds = 2.5, rate = 44100) {
    const Off = win && (win.OfflineAudioContext || win.webkitOfflineAudioContext);
    if (!Off) return Promise.reject(new Error("no OfflineAudioContext"));
    const ac = new Off(1, Math.floor(seconds * rate), rate);
    const key = SOUNDS[name] ? name : "tap";
    SOUNDS[key](ac, chain(ac), clampLevel(key, level));
    return ac.startRendering();
  }

  /** Share of a signal's energy above `cutoff` Hz (an RBJ high-pass, Q 0.707): 0..1, pure. */
  function highShare(d, rate, cutoff = 2000) {
    const w = 2 * Math.PI * cutoff / rate;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * Math.SQRT1_2);
    const a0 = 1 + alpha;
    const b0 = (1 + cos) / 2 / a0, b1 = -(1 + cos) / a0, b2 = b0;
    const a1 = -2 * cos / a0, a2 = (1 - alpha) / a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0, hi = 0, all = 0;
    for (let i = 0; i < d.length; i++) {
      const x = d[i];
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      hi += y * y;
      all += x * x;
    }
    return all ? hi / all : 0;
  }

  /** { ms: audible length, peak, rms (of the audible part), crest: peak/rms, tailMs: last -40 dB point after the peak, high: energy share above 2 kHz }. */
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
      tailMs: last < 0 ? 0 : Math.round((last - peakAt) / rate * 1000),
      high: +highShare(d, rate).toFixed(4)
    };
  }

  return {
    play, render, measure, matchNotes, graceNote, highShare, names: Object.keys(SOUNDS),
    setEnabled(value) { on = value !== false; },
    enabled() { return on; }
  };
});
