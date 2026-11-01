const test = require("node:test");
const assert = require("node:assert/strict");
const Sfx = require("../js/sfx.js");

test("every moment has a sound, and the streak has its own", () => {
  for (const name of ["tap", "select", "match", "wrong", "combo", "claim", "setComplete", "goalDone", "ignite", "commit", "levelUp", "swipe"]) {
    assert.ok(Sfx.names.includes(name), name);
  }
});

test("streak notes stay inside the window, gains sum to 1, loudest near the middle", () => {
  for (let n = 1; n <= 200; n++) {
    const notes = Sfx.matchNotes(n);
    assert.ok(notes.length >= 2 && notes.length <= 4, `n=${n}: ${notes.length} notes`);
    const sum = notes.reduce((s, x) => s + x.gain, 0);
    assert.ok(Math.abs(sum - 1) < 0.002, `n=${n}: sum ${sum}`);
    for (const x of notes) assert.ok(x.midi >= 58 && x.midi <= 96, `n=${n}: midi ${x.midi}`);
    const loudest = notes.reduce((a, b) => (b.gain > a.gain ? b : a));
    assert.ok(loudest.midi >= 64 && loudest.midi <= 76, `n=${n}: loudest ${loudest.midi} outside E4..E5`);
    assert.ok(notes.every(x => x.midi <= 90), `n=${n}: above F#6`);
  }
});

test("the streak keeps rising: every step moves the pitch class up the pentatonic, forever", () => {
  const pc = n => ((Sfx.matchNotes(n)[0].midi - 64) % 12 + 12) % 12;
  const order = [0, 2, 4, 7, 9];
  for (let n = 1; n < 300; n++) {
    const a = order.indexOf(pc(n)), b = order.indexOf(pc(n + 1));
    assert.equal(b, (a + 1) % 5, `step ${n} → ${n + 1} does not go one degree up`);
  }
  // The same step one cycle later sounds the same (no drift up or down out of the window).
  assert.deepEqual(Sfx.matchNotes(3), Sfx.matchNotes(53));
});

test("highShare: a low sine is dark, a high one is bright", () => {
  const rate = 44100;
  const sine = f => Float32Array.from({ length: rate / 2 }, (_, i) => Math.sin(2 * Math.PI * f * i / rate));
  assert.ok(Sfx.highShare(sine(300), rate) < 0.05);
  assert.ok(Sfx.highShare(sine(6000), rate) > 0.9);
  assert.equal(Sfx.highShare(new Float32Array(10), rate), 0);
});

test("no audio in Node: play is silent, render rejects", async () => {
  Sfx.play("match", 12);
  Sfx.setEnabled(false);
  assert.equal(Sfx.enabled(), false);
  Sfx.setEnabled(true);
  await assert.rejects(Sfx.render("tap"));
});
