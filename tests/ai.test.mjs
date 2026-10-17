import test from "node:test";
import assert from "node:assert/strict";
import { createAI, detect, modelById, modelIdFor, parseMeaning, parseIdea, parseExample, meaningPrompt, MODELS } from "../js/ai.js";

/** A stand-in for the WebLLM engine: replies with whatever `reply(request)` returns. */
function fakeEngine(reply, log = []) {
  return {
    interrupted: 0,
    unloaded: 0,
    chat: {
      completions: {
        async create(request) {
          log.push(request);
          const content = await reply(request);
          return { choices: [{ message: { content } }] };
        }
      }
    },
    interruptGenerate() { this.interrupted += 1; },
    async unload() { this.unloaded += 1; }
  };
}

function aiWith(engine, extra = {}) {
  return createAI({ model: "qwen3-0.6b", f16: true, createEngine: async () => engine, ...extra });
}

test("parsers accept good JSON and reject everything else", () => {
  assert.deepEqual(parseMeaning('{"meaning_here":"颗粒","ok":true,"reason":""}'), { ok: true, reasonZh: "" });
  assert.deepEqual(parseMeaning('{"meaning_here":"做","ok":false,"reason":"particulate 是形容词，不能当动词用。"}'),
    { ok: false, reasonZh: "particulate 是形容词，不能当动词用。" });
  assert.equal(parseMeaning('{"ok":false,"reason":"wrong"}'), null, "a wrong verdict needs a Chinese reason");
  assert.equal(parseMeaning("not json"), null);
  assert.deepEqual(parseMeaning('<think>\n\n</think>\n\n{\n  "meaning_here": "骚动",\n  "ok": true,\n  "reason": ""\n}'),
    { ok: true, reasonZh: "" }, "Qwen3's empty think block is skipped");
  assert.equal(parseIdea('```json\n{"idea":"树在风中摇摆。"}\n```'), "树在风中摇摆。", "code fences are skipped");
  assert.equal(parseMeaning('{"ok":"yes"}'), null);
  assert.equal(parseIdea('{"idea":"城市的空气里有很多颗粒物。"}'), "城市的空气里有很多颗粒物。");
  assert.equal(parseIdea('{"idea":"The air is dirty."}'), null);
  assert.equal(parseIdea('{"idea":"垃圾"}'), null, "a bare word is not an idea");
  assert.deepEqual(parseExample('{"sentence":"The air in the city was full of particulate matter.","translation":"城市的空气里满是颗粒物。"}'),
    { text: "The air in the city was full of particulate matter.", tr: "城市的空气里满是颗粒物。" });
  assert.equal(parseExample('{"en":"Particulate.","zh":"颗粒"}'), null);
});

test("the prompt carries the word, the meaning and the sentence", () => {
  const text = meaningPrompt("particulate", "微粒的", "I particulate my homework.").map(m => m.content).join("\n");
  assert.match(text, /"particulate"/);
  assert.match(text, /微粒的/);
  assert.match(text, /I particulate my homework\./);
});

test("judgeMeaning asks for schema JSON and returns the verdict", async () => {
  const log = [];
  const ai = aiWith(fakeEngine(() => '{"meaning_here":"做","ok":false,"reason":"这里把形容词当成了动词。"}', log));
  assert.equal(ai.ready, false);
  assert.equal(await ai.judgeMeaning("particulate", "微粒的", "I particulate my homework."), null, "nothing before load");
  await ai.load();
  assert.equal(ai.ready, true);
  const verdict = await ai.judgeMeaning("particulate", "微粒的", "I particulate my homework.");
  assert.deepEqual(verdict, { ok: false, reasonZh: "这里把形容词当成了动词。" });
  assert.equal(log[0].response_format.type, "json_object");
  assert.equal(JSON.parse(log[0].response_format.schema).required.includes("ok"), true);
  assert.deepEqual(log[0].extra_body, { enable_thinking: false }, "Qwen3 answers without thinking");
});

test("a slow model times out to null and is interrupted", async () => {
  const engine = fakeEngine(() => new Promise(() => {}));
  const ai = aiWith(engine, { timeoutMs: 30 });
  await ai.load();
  assert.equal(await ai.idea("sway", "摇摆"), null);
  assert.equal(engine.interrupted, 1);
});

test("a broken engine or bad output falls back to null", async () => {
  const ai = aiWith(fakeEngine(() => { throw new Error("device lost"); }));
  await ai.load();
  assert.equal(await ai.example("sway", "摇摆"), null);
  const chatty = aiWith(fakeEngine(() => "Sure! Here is an example: ..."));
  await chatty.load();
  assert.equal(await chatty.example("sway", "摇摆"), null);
});

test("requests run one at a time", async () => {
  let running = 0, most = 0;
  const ai = aiWith(fakeEngine(async () => {
    running += 1; most = Math.max(most, running);
    await new Promise(resolve => setTimeout(resolve, 5));
    running -= 1;
    return '{"idea":"风中的树在摇摆。"}';
  }));
  await ai.load();
  const ideas = await Promise.all([ai.idea("sway", "摇摆"), ai.idea("sway", "摇摆"), ai.idea("sway", "摇摆")]);
  assert.deepEqual(ideas, ["风中的树在摇摆。", "风中的树在摇摆。", "风中的树在摇摆。"]);
  assert.equal(most, 1);
});

test("an interrupted download can be retried", async () => {
  let attempts = 0;
  const ai = createAI({
    model: "qwen3-0.6b",
    createEngine: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("network");
      return fakeEngine(() => '{"idea":"树在风中摇摆。"}');
    }
  });
  await assert.rejects(ai.load(), /network/);
  assert.equal(ai.ready, false);
  await ai.load();
  assert.equal(ai.ready, true);
});

test("remove unloads the engine and deletes the cached weights", async () => {
  const engine = fakeEngine(() => "{}");
  const deleted = [];
  const ai = aiWith(engine, { lib: { hasModelInCache: async () => true, deleteModelAllInfoInCache: async id => deleted.push(id) } });
  await ai.load();
  assert.equal(await ai.isCached(), true);
  await ai.remove();
  assert.equal(ai.ready, false);
  assert.equal(engine.unloaded, 1);
  assert.deepEqual(deleted, ["Qwen3-0.6B-q4f16_1-MLC"]);
});

test("WebGPU detection and model ids", async () => {
  assert.deepEqual(await detect(undefined), { webgpu: false, f16: false });
  assert.deepEqual(await detect({ requestAdapter: async () => null }), { webgpu: false, f16: false });
  assert.deepEqual(await detect({ requestAdapter: async () => ({ features: new Set(["shader-f16"]) }) }), { webgpu: true, f16: true });
  assert.deepEqual(await detect({ requestAdapter: async () => ({ features: new Set() }) }), { webgpu: true, f16: false });
  assert.equal(modelIdFor(modelById("qwen3-0.6b"), false), "Qwen3-0.6B-q4f32_1-MLC");
  assert.ok(MODELS.every(m => m.f16.endsWith("-MLC") && m.f32.endsWith("-MLC")));
});
