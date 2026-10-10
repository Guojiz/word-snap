import test from "node:test";
import assert from "node:assert/strict";
import {
  inLanguage, feedbackPrompt, examplePrompt, wordListPrompt, contrastPrompt,
  parseFeedback, parseExample, parseIdea, parseContrast, parseWordList, wordListToImport, createAI, API_MODEL
} from "../js/ai.js";

const ja = { a: "日本語", b: "中文" };
const es = { a: "Español", b: "English" };
const zhForEn = { a: "中文", b: "English" };
const text = messages => messages.map(m => m.content).join("\n");

test("prompts name the language studied and the language for explanations", () => {
  const fb = text(feedbackPrompt("食べる", "吃", "私はりんごを食べる。", "", ja));
  assert.match(fb, /learn 日本語/);
  assert.match(fb, /in 中文 explaining/);
  assert.match(fb, /corrected 日本語 sentence/);
  assert.match(text(examplePrompt("comer", "to eat", es)), /natural Español example sentence \(8 to 16 words\)/);
  assert.match(text(examplePrompt("吃", "to eat", zhForEn)), /10 to 30 characters/);
  assert.match(text(contrastPrompt("買う", "买", "飼う", "养", ja)), /diff: in 中文, under 80 characters/);
  // No language given: the English → Chinese defaults.
  assert.match(text(feedbackPrompt("sway", "摇摆", "Trees sway.")), /learn English/);
});

test("inLanguage goes by script, and unknown languages only need text", () => {
  assert.equal(inLanguage("これは試験です", "日本語"), true);
  assert.equal(inLanguage("This is a test", "日本語"), false);
  assert.equal(inLanguage("这是错的", "English"), false, "a Latin-script language must not come back in Chinese");
  assert.equal(inLanguage("Это тест", "Русский"), true);
  assert.equal(inLanguage("anything", "Klingon"), true);
  assert.equal(inLanguage("", "Klingon"), false);
});

test("feedback and contrast in another language pair", () => {
  const fb = parseFeedback(JSON.stringify({
    ok: false, where: "comí", why: "Here the present tense is needed because of 'todos los días'.",
    fix: "Yo como manzanas todos los días.", better: ""
  }), es);
  assert.equal(fb.ok, false);
  assert.match(fb.why, /present tense/);
  assert.equal(fb.fix, "Yo como manzanas todos los días.");
  // The reason came back in the wrong language: not trusted.
  assert.equal(parseFeedback(JSON.stringify({ ok: false, where: "x", why: "这里应该用现在时。", fix: "", better: "" }), es), null);
  const jaFb = parseFeedback(JSON.stringify({ ok: false, where: "を", why: "这里要用助词「が」。", fix: "猫が好きです。", better: "" }), ja);
  assert.equal(jaFb.fix, "猫が好きです。");
  const c = parseContrast(JSON.stringify({ diff: "買う是买东西；飼う是养动物，读音一样。", a_example: "本を買う。", b_example: "犬を飼う。" }), ja);
  assert.equal(c.aEx, "本を買う。");
  assert.equal(parseExample(JSON.stringify({ sentence: "我每天早上吃一个苹果。", translation: "I eat an apple every morning." }), zhForEn).tr,
    "I eat an apple every morning.");
  assert.equal(parseIdea(JSON.stringify({ idea: "I'm hungry and want to eat noodles." }), zhForEn), "I'm hungry and want to eat noodles.");
});

test("word list: cleaned for the import format, deduplicated, language switch kept", () => {
  const list = parseWordList(JSON.stringify({
    target: "日本語", native: "中文",
    items: [
      { word: "食べる", reading: "たべる", meaning: "吃，吃饭", example: "朝ご飯を食べる。", translation: "吃早饭。" },
      { word: "食べる", meaning: "duplicate", example: "", translation: "" },
      { word: "行く", meaning: "去=前往", example: "Go", translation: "去" },
      { word: "", meaning: "empty", example: "", translation: "" },
      { word: "a | b", meaning: "x", example: "", translation: "" }
    ]
  }), { a: "English", b: "中文" });
  assert.deepEqual(list.lang, { a: "日本語", b: "中文" });
  assert.equal(list.items.length, 3);
  assert.equal(list.items[0].meaning, "吃；吃饭");
  assert.equal(list.items[1].meaning, "去；前往");
  assert.equal(list.items[1].example, "", "an example in the wrong language is dropped");
  assert.equal(list.items[2].word, "a / b");
  const lines = wordListToImport(list).split("\n");
  assert.equal(lines[0], "@lang: 日本語 | 中文");
  assert.equal(lines[1], "食べる（たべる）,吃；吃饭 | 朝ご飯を食べる。 | 吃早饭。", "the reading travels in the word column");
  assert.equal(list.items[1].reading, "", "no reading given, none invented");
  assert.equal(lines[2], "行く,去；前往");
  // Same language as now: no @lang line.
  const same = parseWordList(JSON.stringify({ target: "English", native: "中文", items: [{ word: "sway", meaning: "摇摆", example: "", translation: "" }] }));
  assert.equal(same.lang, null);
  assert.equal(parseWordList("{}"), null);
  assert.match(text(wordListPrompt("日语 N3 动词 10 个", { a: "English", b: "中文" }, 30)), /at most 30/);
});

test("wordList runs on a strong engine with a long limit and a large token budget", async () => {
  const log = [];
  const engine = {
    chat: { completions: { create: async request => {
      log.push(request);
      return { choices: [{ message: { content: JSON.stringify({ target: "English", native: "中文", items: [{ word: "sway", meaning: "摇摆", example: "The trees sway in the wind.", translation: "树在风中摇摆。" }] }) } }] };
    } } },
    interruptGenerate() {},
    async unload() {}
  };
  const ai = createAI({ model: API_MODEL, createEngine: async () => engine, timeoutMs: 1000 });
  await ai.load();
  const list = await ai.wordList("IELTS verbs", { a: "English", b: "中文" }, 20);
  assert.equal(list.items[0].word, "sway");
  assert.equal(log[0].max_tokens, 6000);
});
