/*
 * Optional on-device AI for the sentence cards. Free, no server, off by default.
 *
 * Layers (the app always has layer 0; this file is layer 1):
 *   0. Rules        js/sentence.js — grammar, spelling, target word, structure.
 *   1. Small model  WebLLM on WebGPU, weights downloaded once from Hugging Face.
 *   2. System model (later, in the packaged app) — same interface as createAI().
 *   3. API key      js/ai-api.js — the learner's own key for a large model
 *                   (createAI({ model: API_MODEL, createEngine })). Large models
 *                   also get feedback (what is wrong / why / how to fix) and contrast.
 *
 * The model only does narrow jobs with JSON-schema output, never free grading:
 *   judgeMeaning  is the word used with this meaning, in a way that makes sense?
 *                 (kept for tools/ai-eval.html; the app does not use it until a
 *                 small model reaches 85% on tests/fixtures/meaning-judgments.json)
 *   idea          a situation in the learner's language to write about ("I have no idea")
 *   example       an example sentence + translation (the app checks it with Harper for English)
 *   wordList      (strong models) a word list from a free-form request
 * Prompts take the app's language pair { a, b }: the learner studies A and reads
 * explanations in B. The small on-device models are only offered for English → 中文.
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

/** The model entry for an API-key engine. strong: trusted for meaning feedback and contrast. */
export const API_MODEL = { id: "api", name: "API", strong: true };

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
  return (f16 ? model.f16 : model.f32) || model.id;
}

// ---- prompts and parsers (pure, tested in Node) ----
//
// lang = { a, b } is the app's language pair: the learner studies side A and
// knows side B (the meaning side), so explanations are written in B. It defaults
// to English → 中文, the pair the small on-device models were tested on.

export const DEFAULT_LANG = { a: "English", b: "中文" };

function langOf(lang) {
  const a = lang && typeof lang.a === "string" && lang.a.trim() ? lang.a.trim() : DEFAULT_LANG.a;
  const b = lang && typeof lang.b === "string" && lang.b.trim() ? lang.b.trim() : DEFAULT_LANG.b;
  return { a, b };
}

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/** Known languages → the script their text must contain. Unknown languages: any non-empty text. */
const LANG_SCRIPTS = [
  { re: /^(中文|汉语|漢語|简体中文|繁體中文|普通话|chinese|mandarin)$/i, script: /\p{Script=Han}/u, cjk: true },
  { re: /^(日本語|日语|日文|japanese)$/i, script: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, cjk: true },
  { re: /^(한국어|韩语|韓語|korean)$/i, script: /\p{Script=Hangul}/u, cjk: true },
  { re: /^(русский|俄语|russian|українська|ukrainian)$/i, script: /\p{Script=Cyrillic}/u },
  { re: /^(العربية|阿拉伯语|arabic)$/i, script: /\p{Script=Arabic}/u },
  { re: /^(ไทย|泰语|thai)$/i, script: /\p{Script=Thai}/u },
  { re: /^(english|英语|英文|español|spanish|西班牙语|français|french|法语|deutsch|german|德语|italiano|italian|意大利语|português|portuguese|葡萄牙语|nederlands|dutch|tiếng việt|vietnamese|越南语|bahasa indonesia|indonesian|türkçe|turkish|polski|polish)$/i, script: /\p{Script=Latin}/u, latin: true }
];

function scriptOf(name) {
  return LANG_SCRIPTS.find(entry => entry.re.test(String(name || "").trim())) || null;
}

/** Whether text looks like it is written in `name` (by script; unknown languages pass if non-empty). */
export function inLanguage(text, name) {
  const s = String(text || "").trim();
  if (!s) return false;
  const entry = scriptOf(name);
  if (!entry) return true;
  if (!entry.script.test(s)) return false;
  // A Latin-script language must not come back in Chinese/Japanese/Korean.
  return !(entry.latin && CJK.test(s));
}

/** Words for spaced languages; characters for Chinese/Japanese/Korean. */
function lengthOf(text, name) {
  const s = String(text || "");
  const entry = scriptOf(name);
  if (entry && entry.cjk) return (s.match(/[\p{L}\p{N}]/gu) || []).length;
  return s.split(/\s+/).filter(Boolean).length;
}

function isCjk(name) {
  const entry = scriptOf(name);
  return Boolean(entry && entry.cjk);
}

function system(lang) {
  const { a, b } = langOf(lang);
  return `You help students whose own language is ${b} learn ${a}. Write every explanation in ${b}. Reply with JSON only.`;
}

/** Kept for tools/ai-eval.html (English → Chinese only). */
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

export function ideaPrompt(word, meaning, lang) {
  const { a, b } = langOf(lang);
  return [
    { role: "system", content: system(lang) },
    {
      role: "user",
      content:
        `The student must write a ${a} sentence with "${word}" (meaning: ${meaning}) but has no idea what to write.\n` +
        `idea: one short, everyday sentence in ${b} (under 30 ${isCjk(b) ? "characters" : "words"}) that the student can translate into ${a} ` +
        `using "${word}". Write only ${b}; do not include any ${a}.`
    }
  ];
}

export const EXAMPLE_SCHEMA = {
  type: "object",
  properties: { sentence: { type: "string" }, translation: { type: "string" } },
  required: ["sentence", "translation"]
};

export function examplePrompt(word, meaning, lang) {
  const { a, b } = langOf(lang);
  const size = isCjk(a) ? "10 to 30 characters" : "8 to 16 words";
  return [
    { role: "system", content: system(lang) },
    {
      role: "user",
      content:
        `Write one simple, natural ${a} example sentence (${size}) using "${word}" with the meaning: ${meaning}.\n` +
        `sentence: the ${a} sentence. translation: its ${b} translation.`
    }
  ];
}

export const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    ok: { type: "boolean" },
    where: { type: "string" },
    why: { type: "string" },
    fix: { type: "string" },
    better: { type: "string" }
  },
  required: ["ok", "where", "why", "fix", "better"]
};

/**
 * For strong models: a full check like a teacher's, in three parts.
 * grammarNote: what the on-device grammar checker found (English only), if anything.
 */
export function feedbackPrompt(word, meaning, sentence, grammarNote = "", lang) {
  const { a, b } = langOf(lang);
  return [
    { role: "system", content: system(lang) },
    {
      role: "user",
      content:
        `A student was asked to write a ${a} sentence using "${word}" (meaning in ${b}: ${meaning}).\n` +
        `Student's sentence: "${sentence}"\n` +
        (grammarNote ? `A grammar checker reported: ${grammarNote}\n` : "") +
        "\nCheck grammar, spelling, word choice, and whether the word is used with the meaning above in a sentence that makes sense. " +
        "Any correct word order is fine; do not ask for a different style.\n" +
        "ok: true if the sentence is correct and uses the word with that meaning; false otherwise.\n" +
        "where: if ok is false, the wrong part copied from the sentence; otherwise empty.\n" +
        `why: if ok is false, one or two short sentences in ${b} explaining the mistake; otherwise empty.\n` +
        `fix: if ok is false, the corrected ${a} sentence, changed as little as possible; otherwise empty.\n` +
        `better: a more natural ${a} version if one clearly exists, otherwise empty.`
    }
  ];
}

export const CONTRAST_SCHEMA = {
  type: "object",
  properties: {
    diff: { type: "string" },
    a_example: { type: "string" },
    b_example: { type: "string" }
  },
  required: ["diff", "a_example", "b_example"]
};

/** For strong models: two words the student keeps mixing up. */
export function contrastPrompt(x, xMeaning, y, yMeaning, lang) {
  const { a, b } = langOf(lang);
  return [
    { role: "system", content: system(lang) },
    {
      role: "user",
      content:
        `A student keeps confusing "${x}" (${xMeaning}) with "${y}" (${yMeaning}).\n` +
        `diff: in ${b}, ${isCjk(b) ? "under 80 characters" : "under 40 words"}, how to tell them apart (meaning, use, or a memory trick from spelling or sound).\n` +
        `a_example: one short ${a} sentence using "${x}". b_example: one short ${a} sentence using "${y}".`
    }
  ];
}

export const WORDLIST_SCHEMA = {
  type: "object",
  properties: {
    target: { type: "string" },
    native: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          meaning: { type: "string" },
          example: { type: "string" },
          translation: { type: "string" }
        },
        required: ["word", "meaning", "example", "translation"]
      }
    }
  },
  required: ["target", "native", "items"]
};

/** For strong models: a word list from a free-form request ("IELTS verbs, 30", "日语 N3 常用词"). */
export function wordListPrompt(request, lang, max = 60) {
  const { a, b } = langOf(lang);
  return [
    { role: "system", content: system(lang) },
    {
      role: "user",
      content:
        `The learner's current setting: learning ${a}, meanings in ${b}.\n` +
        `Learner's request: "${String(request || "").slice(0, 300)}"\n\n` +
        "Make a vocabulary list for this request.\n" +
        `target: the language to learn. It stays ${a} unless the request clearly asks for another language (for example Japanese). ` +
        `native: the language for meanings; it stays ${b} unless the request says otherwise. ` +
        "Write both as the language's own name, e.g. English, 中文, 日本語, 한국어, Español, Français, Deutsch.\n" +
        `items: as many words as the request asks for (20 if it does not say), at most ${max}. Each item:\n` +
        "- word: in the target language, dictionary form (phrases are fine);\n" +
        "- meaning: short, in the native language; separate senses with ; and never use commas;\n" +
        "- example: one short, natural target-language sentence that really uses the word;\n" +
        "- translation: the example in the native language.\n" +
        "No duplicates. Pick useful, accurate words for the request; do not invent words."
    }
  ];
}

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

const HAN = /\p{Script=Han}/u;

/** → { ok, reasonZh } or null. A "wrong" verdict without a Chinese reason is not trusted. */
export function parseMeaning(text) {
  const value = parseJSON(text);
  if (!value || typeof value.ok !== "boolean") return null;
  if (value.ok) return { ok: true, reasonZh: "" };
  const reasonZh = clip(value.reason, 80);
  if (!HAN.test(reasonZh)) return null;
  return { ok: false, reasonZh };
}

/** A sentence in language `name`, of a sensible length; "" otherwise. */
function sentenceIn(text, name, max = 200) {
  const s = clip(text, max);
  const n = lengthOf(s, name);
  const [min, most] = isCjk(name) ? [4, 80] : [3, 40];
  return n >= min && n <= most && inLanguage(s, name) ? s : "";
}

/** An explanation in language `name` that says something (not a bare word). */
function explanationIn(text, name, max, minLength) {
  const s = clip(text, max);
  return inLanguage(s, name) && lengthOf(s, name) >= minLength ? s : "";
}

/** → idea string in B, or null. */
export function parseIdea(text, lang) {
  const { a, b } = langOf(lang);
  const value = parseJSON(text);
  if (!value) return null;
  const idea = explanationIn(value.idea, b, 60, isCjk(b) ? 5 : 3);
  if (!idea) return null;
  // The idea is for translating, so it must not already be in A (when the scripts differ).
  const entryA = scriptOf(a);
  if (entryA && entryA.latin && !(scriptOf(b) || {}).latin && /[A-Za-z]{3,}/.test(idea)) return null;
  return idea;
}

/** → { text, tr } or null. The app still checks the sentence for the target word (and with Harper for English). */
export function parseExample(text, lang) {
  const { a, b } = langOf(lang);
  const value = parseJSON(text);
  if (!value) return null;
  const sentence = sentenceIn(value.sentence ?? value.en, a);
  const tr = clip(value.translation ?? value.zh, 160);
  if (!sentence || lengthOf(sentence, a) < (isCjk(a) ? 6 : 4) || !inLanguage(tr, b)) return null;
  return { text: sentence, tr };
}

/** → { ok, where, why, fix, better } or null. A "wrong" verdict needs a reason in B. */
export function parseFeedback(text, lang) {
  const { a, b } = langOf(lang);
  const value = parseJSON(text);
  if (!value || typeof value.ok !== "boolean") return null;
  const better = sentenceIn(value.better, a);
  if (value.ok) return { ok: true, where: "", why: "", fix: "", better };
  const why = explanationIn(value.why, b, 200, isCjk(b) ? 4 : 3);
  if (!why) return null;
  return { ok: false, where: clip(value.where, 80), why, fix: sentenceIn(value.fix, a), better };
}

/** → { diff, aEx, bEx } or null. */
export function parseContrast(text, lang) {
  const { a, b } = langOf(lang);
  const value = parseJSON(text);
  if (!value) return null;
  const diff = explanationIn(value.diff, b, 200, isCjk(b) ? 5 : 4);
  if (!diff) return null;
  return { diff, aEx: sentenceIn(value.a_example, a), bEx: sentenceIn(value.b_example, a) };
}

/** Text that cannot break the import line "word,meaning | example | translation". */
function importField(text, max) {
  return clip(String(text || "").replace(/[\r\n\t|]+/g, " / "), max);
}

function langName(text) {
  const s = clip(text, 24);
  return s && !/[|,@]/.test(s) ? s : "";
}

/** → { lang: { a, b } | null, items: [{ word, meaning, example, translation }] } or null. */
export function parseWordList(text, lang, max = 100) {
  const current = langOf(lang);
  const value = parseJSON(text);
  if (!value || !Array.isArray(value.items)) return null;
  const a = langName(value.target) || current.a;
  const b = langName(value.native) || current.b;
  const seen = new Set();
  const items = [];
  for (const raw of value.items) {
    if (!raw || typeof raw !== "object" || items.length >= max) continue;
    // The app splits word and meaning on the first of tab, "=", "，", ",", so the word
    // holds none of them and the meaning holds none that would come first.
    const word = importField(raw.word, 60).replace(/[=,，]/g, " ").replace(/\s+/g, " ").trim();
    const meaning = importField(raw.meaning, 80).replace(/[=，,]/g, isCjk(b) ? "；" : ";").replace(/\s+/g, " ").trim();
    const key = word.toLowerCase();
    if (!word || !meaning || seen.has(key)) continue;
    seen.add(key);
    // Examples are optional: drop one that is not a sentence in the target language.
    const example = sentenceIn(importField(raw.example, 200), a);
    const translation = example ? importField(raw.translation, 160) : "";
    items.push({ word, meaning, example, translation });
  }
  if (!items.length) return null;
  const changed = a !== current.a || b !== current.b;
  return { lang: changed ? { a, b } : null, items };
}

/** The import text the app already understands (see parseImportText in vocabulary-match.html). */
export function wordListToImport(list) {
  const lines = [];
  if (list.lang) lines.push(`@lang: ${list.lang.a} | ${list.lang.b}`);
  for (const item of list.items) {
    lines.push(item.example
      ? `${item.word},${item.meaning} | ${item.example}${item.translation ? ` | ${item.translation}` : ""}`
      : `${item.word},${item.meaning}`);
  }
  return lines.join("\n");
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
 *   model        an entry of MODELS (or its id), or API_MODEL
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
  function ask(messages, schema, parse, maxTokens = 200, limitMs = timeoutMs) {
    const run = async () => {
      if (!engine) return null;
      let timer;
      const timeout = new Promise(resolve => {
        timer = setTimeout(() => {
          try { engine.interruptGenerate(); } catch { /* engine gone */ }
          resolve(null);
        }, limitMs);
      });
      const request = (async () => {
        const reply = await engine.chat.completions.create({
          messages,
          temperature: 0,
          max_tokens: maxTokens,
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
    strong: Boolean(model.strong),
    get ready() { return Boolean(engine); },
    get loading() { return Boolean(loading); },
    load,
    judgeMeaning: (word, meaningZh, sentence) => ask(meaningPrompt(word, meaningZh, sentence), MEANING_SCHEMA, parseMeaning),
    // lang = { a, b }: the app's language pair (see DEFAULT_LANG).
    idea: (word, meaning, lang) => ask(ideaPrompt(word, meaning, lang), IDEA_SCHEMA, text => parseIdea(text, lang)),
    example: (word, meaning, lang) => ask(examplePrompt(word, meaning, lang), EXAMPLE_SCHEMA, text => parseExample(text, lang)),
    feedback: (word, meaning, sentence, grammarNote, lang) =>
      ask(feedbackPrompt(word, meaning, sentence, grammarNote, lang), FEEDBACK_SCHEMA, text => parseFeedback(text, lang), 400),
    contrast: (x, xMeaning, y, yMeaning, lang) =>
      ask(contrastPrompt(x, xMeaning, y, yMeaning, lang), CONTRAST_SCHEMA, text => parseContrast(text, lang), 300),
    /** Strong models only: a list can take a while to write. */
    wordList: (request, lang, max = 60) =>
      ask(wordListPrompt(request, lang, max), WORDLIST_SCHEMA, text => parseWordList(text, lang, max), 6000, Math.max(timeoutMs, 120000)),
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
