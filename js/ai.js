/*
 * Optional on-device AI for the sentence cards. Free, no server, off by default.
 *
 * Layers (the app always has layer 0; this file is layer 1):
 *   0. Rules        js/sentence.js — grammar, spelling, target word, structure.
 *   1. Small model  WebLLM on WebGPU, weights downloaded once from Hugging Face.
 *   2. System model (later, in the packaged app) — same interface as createAI().
 *
 * The model only does narrow jobs with JSON-schema output, never free grading:
 *   judgeMeaning  is the word used with this meaning, in a way that makes sense?
 *                 (kept for tools/ai-eval.html; the app does not use it until a
 *                 small model reaches 85% on tests/fixtures/meaning-judgments.json)
 *   ideaZh        a Chinese situation to write about ("I have no idea")
 *   example       an example sentence + translation (the app checks it with Harper)
 * Every call resolves to null on any failure or after a timeout, so callers fall
 * back to the rules layer without showing an error.
 */

/** Candidates, smallest download first. downloadMB is the q4 weight size, rounded. */
export const MODELS = [
  { id: "qwen2.5-0.5b", name: "Qwen2.5 0.5B", f16: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", f32: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC", downloadMB: 280 },
  { id: "qwen3-0.6b", name: "Qwen3 0.6B", f16: "Qwen3-0.6B-q4f16_1-MLC", f32: "Qwen3-0.6B-q4f32_1-MLC", downloadMB: 340, thinking: true },
  { id: "llama3.2-1b", name: "Llama 3.2 1B", f16: "Llama-3.2-1B-Instruct-q4f16_1-MLC", f32: "Llama-3.2-1B-Instruct-q4f32_1-MLC", downloadMB: 700 },
  { id: "qwen2.5-1.5b", name: "Qwen2.5 1.5B", f16: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", f32: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC", downloadMB: 870 },
  { id: "qwen3-1.7b", name: "Qwen3 1.7B", f16: "Qwen3-1.7B-q4f16_1-MLC", f32: "Qwen3-1.7B-q4f32_1-MLC", downloadMB: 980, thinking: true }
];

// Picked with tools/ai-eval.html: no model up to 1.7B judged meaning reliably (all near
// 50%, each stuck on "ok" or "wrong"), so the app ships ideaZh and example only, and
// Qwen2.5 1.5B wrote the most natural ideas and examples of the candidates.
export const DEFAULT_MODEL = "qwen2.5-1.5b";

export function modelById(id) {
  return MODELS.find(model => model.id === id) || MODELS.find(model => model.id === DEFAULT_MODEL);
}

/** WebGPU support, and whether 16-bit shaders work (smaller, faster weights). */
export async function detect(gpu = globalThis.navigator && globalThis.navigator.gpu) {
  if (!gpu) return { webgpu: false, f16: false };
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return { webgpu: false, f16: false };
    return { webgpu: true, f16: adapter.features.has("shader-f16") };
  } catch {
    return { webgpu: false, f16: false };
  }
}

export function modelIdFor(model, f16) {
  return f16 ? model.f16 : model.f32;
}

// ---- prompts and parsers (pure, tested in Node) ----

const SYSTEM = "You help Chinese students learning English. Reply with JSON only.";

export const MEANING_SCHEMA = {
  type: "object",
  properties: {
    meaning_here: { type: "string" },
    ok: { type: "boolean" },
    reason: { type: "string" }
  },
  required: ["meaning_here", "ok", "reason"]
};

export function meaningPrompt(word, meaningZh, sentence) {
  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content:
        `A student was asked to write an English sentence using the word "${word}" (meaning: ${meaningZh}).\n` +
        `Student's sentence: "${sentence}"\n\n` +
        "Ignore small grammar and spelling mistakes; another tool checks those.\n" +
        `1. meaning_here: what "${word}" means in this sentence, in Chinese.\n` +
        `2. ok: true if "${word}" is used with the meaning above and the sentence makes sense; ` +
        "false if it is used with a wrong meaning, as the wrong part of speech, or the sentence is nonsense.\n" +
        "3. reason: if ok is false, one short sentence in Chinese saying what is wrong; otherwise an empty string."
    }
  ];
}

export const IDEA_SCHEMA = {
  type: "object",
  properties: { idea: { type: "string" } },
  required: ["idea"]
};

export function ideaPrompt(word, meaningZh) {
  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content:
        `The student must write an English sentence with "${word}" (meaning: ${meaningZh}) but has no idea what to write.\n` +
        "idea: one short, everyday Chinese sentence (under 30 characters) that the student can translate into English " +
        `using "${word}". Write only Chinese; do not include any English.`
    }
  ];
}

export const EXAMPLE_SCHEMA = {
  type: "object",
  properties: { en: { type: "string" }, zh: { type: "string" } },
  required: ["en", "zh"]
};

export function examplePrompt(word, meaningZh) {
  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content:
        `Write one simple, natural English example sentence (8 to 16 words) using "${word}" with the meaning: ${meaningZh}.\n` +
        "en: the sentence. zh: its Chinese translation."
    }
  ];
}

const HAN = /\p{Script=Han}/u;

/** Qwen3 still emits an empty <think></think> with thinking off; some models wrap JSON in fences. */
function parseJSON(text) {
  if (typeof text !== "string") return null;
  const body = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    const value = JSON.parse(body.slice(start, end + 1));
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function clip(text, max) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** → { ok, reasonZh } or null. A "wrong" verdict without a Chinese reason is not trusted. */
export function parseMeaning(text) {
  const value = parseJSON(text);
  if (!value || typeof value.ok !== "boolean") return null;
  if (value.ok) return { ok: true, reasonZh: "" };
  const reasonZh = clip(value.reason, 80);
  if (!HAN.test(reasonZh)) return null;
  return { ok: false, reasonZh };
}

/** → Chinese idea string or null. */
export function parseIdea(text) {
  const value = parseJSON(text);
  if (!value) return null;
  const idea = clip(value.idea, 60);
  // A bare word ("垃圾") is no idea; ask for at least a short clause.
  if ((idea.match(/\p{Script=Han}/gu) || []).length < 5 || /[A-Za-z]{3,}/.test(idea)) return null;
  return idea;
}

/** → { en, zh } or null. The app still checks `en` with Harper and for the target word. */
export function parseExample(text) {
  const value = parseJSON(text);
  if (!value) return null;
  const en = clip(value.en, 200);
  const zh = clip(value.zh, 120);
  const words = en.split(/\s+/).filter(Boolean).length;
  if (words < 4 || words > 30 || HAN.test(en) || !HAN.test(zh)) return null;
  return { en, zh };
}

// ---- engine ----

async function webllm() {
  return import(new URL("../vendor/webllm/index.js", import.meta.url).href);
}

/** The real engine: WebLLM in a module worker. */
async function createWebEngine(modelId, onProgress) {
  const lib = await webllm();
  const worker = new Worker(new URL("./ai-worker.js", import.meta.url), { type: "module" });
  try {
    const engine = await lib.CreateWebWorkerMLCEngine(worker, modelId, {
      initProgressCallback: report => onProgress && onProgress({ progress: report.progress, text: report.text })
    });
    engine.terminate = () => worker.terminate();
    return engine;
  } catch (error) {
    worker.terminate();
    throw error;
  }
}

/**
 * createAI({ model, f16, createEngine?, timeoutMs?, lib? })
 *   model        an entry of MODELS (or its id)
 *   f16          from detect()
 *   createEngine (modelId, onProgress) → engine with chat.completions.create / interruptGenerate / unload
 *   lib          { hasModelInCache, deleteModelAllInfoInCache } (defaults to WebLLM)
 */
export function createAI(options = {}) {
  const model = typeof options.model === "string" ? modelById(options.model) : options.model || modelById(DEFAULT_MODEL);
  const modelId = modelIdFor(model, options.f16);
  const createEngine = options.createEngine || createWebEngine;
  const timeoutMs = options.timeoutMs ?? 8000;
  const lib = options.lib ? async () => options.lib : webllm;
  let engine = null;
  let loading = null;
  let queue = Promise.resolve();

  function load(onProgress) {
    if (engine) return Promise.resolve();
    if (!loading) {
      loading = createEngine(modelId, onProgress)
        .then(created => { engine = created; })
        .finally(() => { loading = null; });
    }
    return loading;
  }

  /** One request at a time; each gets its own timeout once it starts. */
  function ask(messages, schema, parse) {
    const run = async () => {
      if (!engine) return null;
      let timer;
      const timeout = new Promise(resolve => {
        timer = setTimeout(() => {
          try { engine.interruptGenerate(); } catch { /* engine gone */ }
          resolve(null);
        }, timeoutMs);
      });
      const request = (async () => {
        const reply = await engine.chat.completions.create({
          messages,
          temperature: 0,
          max_tokens: 200,
          response_format: { type: "json_object", schema: JSON.stringify(schema) },
          ...(model.thinking ? { extra_body: { enable_thinking: false } } : {})
        });
        return parse(reply.choices[0].message.content);
      })().catch(() => null);
      try {
        return await Promise.race([request, timeout]);
      } finally {
        clearTimeout(timer);
      }
    };
    const result = queue.then(run, run);
    queue = result.catch(() => null);
    return result;
  }

  return {
    model,
    modelId,
    get ready() { return Boolean(engine); },
    get loading() { return Boolean(loading); },
    load,
    judgeMeaning: (word, meaningZh, sentence) => ask(meaningPrompt(word, meaningZh, sentence), MEANING_SCHEMA, parseMeaning),
    ideaZh: (word, meaningZh) => ask(ideaPrompt(word, meaningZh), IDEA_SCHEMA, parseIdea),
    example: (word, meaningZh) => ask(examplePrompt(word, meaningZh), EXAMPLE_SCHEMA, parseExample),
    async isCached() {
      try { return await (await lib()).hasModelInCache(modelId); } catch { return false; }
    },
    async unload() {
      const current = engine;
      engine = null;
      if (!current) return;
      try { await current.unload(); } catch { /* already gone */ }
      if (current.terminate) current.terminate();
    },
    async remove() {
      await this.unload();
      await (await lib()).deleteModelAllInfoInCache(modelId);
    }
  };
}
