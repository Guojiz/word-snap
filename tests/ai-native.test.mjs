import test from "node:test";
import assert from "node:assert/strict";
import { nativePlugin, nativeAI, NATIVE_MODEL } from "../js/ai-native.js";

function fakePlugin({ downloaded = false, reply = "{}", slow = false } = {}) {
  const calls = [];
  let listener = null;
  const plugin = {
    calls,
    async status() { calls.push("status"); return { downloaded }; },
    async addListener(name, fn) { listener = fn; return { remove() { listener = null; } }; },
    async download() {
      calls.push("download");
      listener && listener({ progress: 0.5 });
      listener && listener({ progress: 1 });
      downloaded = true;
    },
    async load() { calls.push("load"); },
    async generate(args) {
      calls.push(["generate", args]);
      if (slow) return new Promise(() => {});
      return { text: reply };
    },
    async interrupt() { calls.push("interrupt"); },
    async unload() { calls.push("unload"); },
    async remove() { calls.push("remove"); downloaded = false; }
  };
  return plugin;
}

test("only inside the native app", () => {
  assert.equal(nativePlugin(undefined), null);
  assert.equal(nativePlugin({ isNativePlatform: () => false }), null);
  const proxy = {};
  assert.equal(nativePlugin({ isNativePlatform: () => true, Plugins: { WordSnapLlm: proxy } }), proxy);
});

test("load downloads once with progress, then starts the engine", async () => {
  const plugin = fakePlugin();
  const ai = nativeAI(plugin);
  assert.equal(ai.strong, true);
  assert.equal(ai.model.downloadMB, NATIVE_MODEL.downloadMB);
  assert.equal(await ai.isCached(), false);
  const seen = [];
  await ai.load(report => seen.push(report.progress));
  assert.deepEqual(seen, [0.5, 1]);
  assert.ok(plugin.calls.includes("download"));
  assert.ok(plugin.calls.includes("load"));
  assert.equal(await ai.isCached(), true);
});

test("requests go through the plugin and parse like any engine", async () => {
  const plugin = fakePlugin({
    downloaded: true,
    reply: '<think>\n</think>\n{"ok":false,"where":"water","why":"这里应该是空气，不是水。","fix":"The air is full of particulate matter.","better":""}'
  });
  const ai = nativeAI(plugin);
  await ai.load();
  assert.ok(!plugin.calls.includes("download"));
  const fb = await ai.feedback("particulate", "颗粒物（空气中）", "The water is full of particulate matter.");
  assert.equal(fb.ok, false);
  assert.equal(fb.fix, "The air is full of particulate matter.");
  const [, args] = plugin.calls.find(c => Array.isArray(c) && c[0] === "generate");
  assert.equal(args.maxTokens, 400);
  assert.equal(args.messages[0].role, "system");
});

test("a slow answer times out and interrupts the native model", async () => {
  const plugin = fakePlugin({ downloaded: true, slow: true });
  const ai = nativeAI(plugin, { timeoutMs: 30 });
  await ai.load();
  assert.equal(await ai.example("sway", "摇摆"), null);
  assert.ok(plugin.calls.includes("interrupt"));
  await ai.remove();
  assert.ok(plugin.calls.includes("remove"));
});
