import test from "node:test";
import assert from "node:assert/strict";
import {
  PROVIDERS, normalizeConfig, resolveConfig, buildRequest, replyText, createApiEngine, testConnection, ApiError
} from "../js/ai-api.js";
import { createAI, API_MODEL, parseFeedback, parseContrast, feedbackPrompt } from "../js/ai.js";

function reply(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/** fetch that answers from a list of replies (or a function) and records each call. */
function fakeFetch(replies, log = []) {
  let i = 0;
  return async (url, init) => {
    log.push({ url, init, body: JSON.parse(init.body) });
    const next = typeof replies === "function" ? replies(url, init) : replies[Math.min(i++, replies.length - 1)];
    if (next instanceof Error) throw next;
    return next;
  };
}

const openaiReply = content => reply(200, { choices: [{ message: { content } }] });
const deepseek = { provider: "deepseek", key: "sk-test" };

test("config: provider defaults fill in, bad input is cleaned, no key means not usable", () => {
  assert.equal(PROVIDERS.every(p => p.id && p.format), true);
  const config = resolveConfig(deepseek);
  assert.equal(config.baseURL, "https://api.deepseek.com");
  assert.equal(config.model, "deepseek-chat");
  assert.equal(resolveConfig({ provider: "deepseek" }), null);
  assert.equal(resolveConfig({ provider: "custom", key: "k" }), null);
  assert.equal(normalizeConfig({ provider: "nope", baseURL: "https://x.test/v1/ ", on: "yes" }).provider, "deepseek");
  assert.equal(normalizeConfig({ baseURL: "https://x.test/v1//" }).baseURL, "https://x.test/v1");
  assert.equal(normalizeConfig({ on: "yes" }).on, false);
  assert.equal(resolveConfig({ provider: "custom", key: "k", baseURL: "http://localhost:11434/v1", model: "qwen3:4b" }).model, "qwen3:4b");
});

test("openai format: bearer key, JSON mode, no WebLLM-only fields", () => {
  const { url, headers, body } = buildRequest(resolveConfig(deepseek), {
    messages: [{ role: "system", content: "S" }, { role: "user", content: "U" }],
    max_tokens: 50,
    temperature: 0,
    response_format: { type: "json_object", schema: "{}" },
    extra_body: { enable_thinking: false }
  });
  assert.equal(url, "https://api.deepseek.com/chat/completions");
  assert.equal(headers.authorization, "Bearer sk-test");
  assert.deepEqual(body.response_format, { type: "json_object" });
  assert.equal(body.extra_body, undefined);
  assert.equal(body.max_tokens, 50);
  assert.equal(body.messages.length, 2);
});

test("anthropic format: system apart, x-api-key, browser header", () => {
  const { url, headers, body } = buildRequest(resolveConfig({ provider: "anthropic", key: "sk-ant" }), {
    messages: [{ role: "system", content: "S" }, { role: "user", content: "U" }],
    response_format: { type: "json_object" }
  });
  assert.equal(url, "https://api.anthropic.com/v1/messages");
  assert.equal(headers["x-api-key"], "sk-ant");
  assert.equal(headers["anthropic-dangerous-direct-browser-access"], "true");
  assert.equal(body.system, "S");
  assert.deepEqual(body.messages, [{ role: "user", content: "U" }]);
  assert.equal(body.response_format, undefined);
  assert.equal(replyText("anthropic", { content: [{ type: "text", text: "{\"a\":1}" }] }), "{\"a\":1}");
  assert.equal(replyText("openai", { choices: [] }), null);
});

test("engine: errors are sorted into auth, quota, network", async () => {
  const kinds = [];
  for (const answer of [reply(401, { error: { message: "bad key" } }), reply(429, {}), new TypeError("Failed to fetch")]) {
    const engine = createApiEngine(deepseek, { fetch: fakeFetch([answer]) });
    try {
      await engine.chat.completions.create({ messages: [] });
    } catch (error) {
      assert.ok(error instanceof ApiError);
      kinds.push(error.kind);
    }
  }
  assert.deepEqual(kinds, ["auth", "quota", "network"]);
  assert.deepEqual(await testConnection(deepseek, { fetch: fakeFetch([reply(401, { error: { message: "bad key" } })]) }),
    { ok: false, kind: "auth", message: "bad key" });
  assert.deepEqual(await testConnection(deepseek, { fetch: fakeFetch([openaiReply("{\"ok\":true}")]) }), { ok: true });
});

test("engine: a 400 for JSON mode is retried once without it", async () => {
  const log = [];
  const engine = createApiEngine(deepseek, { fetch: fakeFetch([reply(400, { error: "response_format" }), openaiReply("{}")], log) });
  const out = await engine.chat.completions.create({ messages: [], response_format: { type: "json_object" } });
  assert.equal(out.choices[0].message.content, "{}");
  assert.equal(log.length, 2);
  assert.ok(log[0].body.response_format);
  assert.equal(log[1].body.response_format, undefined);
});

test("createAI with an API engine: strong, feedback in three parts, contrast", async () => {
  const log = [];
  const answers = [
    openaiReply(JSON.stringify({
      ok: false,
      where: "water",
      why: "题目要求表达「空气中的颗粒物」，这里写成了水。",
      fix: "The air is full of particulate matter.",
      better: ""
    })),
    openaiReply(JSON.stringify({ diff: "furor 是群情激愤的骚动；floor 是地板，只是拼写像。", a_example: "The news caused a furor.", b_example: "The floor is wet." }))
  ];
  const engine = createApiEngine(deepseek, { fetch: fakeFetch(answers, log) });
  const ai = createAI({ model: API_MODEL, createEngine: async () => engine, timeoutMs: 1000 });
  await ai.load();
  assert.equal(ai.strong, true);
  assert.equal(ai.modelId, "api");
  const fb = await ai.feedback("particulate", "颗粒物（空气中）", "The water is full of particulate matter.");
  assert.equal(fb.ok, false);
  assert.equal(fb.where, "water");
  assert.match(fb.why, /空气/);
  assert.equal(fb.fix, "The air is full of particulate matter.");
  assert.equal(log[0].body.max_tokens, 400);
  const c = await ai.contrast("furor", "骚动", "floor", "地板");
  assert.match(c.diff, /地板/);
  assert.equal(c.aEx, "The news caused a furor.");
});

test("parsers: feedback without a Chinese reason is not trusted; ok keeps the better version", () => {
  assert.equal(parseFeedback(JSON.stringify({ ok: false, where: "x", why: "wrong", fix: "", better: "" })), null);
  assert.deepEqual(parseFeedback(JSON.stringify({ ok: true, where: "", why: "", fix: "", better: "The lanterns swayed above the street." })),
    { ok: true, where: "", why: "", fix: "", better: "The lanterns swayed above the street." });
  assert.equal(parseFeedback(JSON.stringify({ ok: true, better: "很好" })).better, "");
  assert.equal(parseContrast(JSON.stringify({ diff: "不同" })), null);
  assert.match(feedbackPrompt("sway", "摇摆", "Trees sway.", "sways → sway")[1].content, /grammar checker reported: sways → sway/);
});
