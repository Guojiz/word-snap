import test from "node:test";
import assert from "node:assert/strict";
import { checkSentence, findTarget, hintFor, applySuggestion, load } from "../js/sentence.js";

const { nlp } = await load();

test("a subject–verb agreement mistake fails, the corrected sentence passes", async () => {
  const bad = await checkSentence("school", "She go to school every day.");
  assert.equal(bad.ok, false);
  const issue = bad.issues.find(i => i.kind === "Agreement");
  assert.ok(issue);
  assert.ok(issue.suggestions.includes("goes"));
  const fixed = applySuggestion("She go to school every day.", issue, "goes");
  assert.equal((await checkSentence("school", fixed)).ok, true);
});

test("any grammatical word order passes (the sentence another app rejected)", async () => {
  const r = await checkSentence("sway", "The lanterns hanging above the street swayed.");
  assert.equal(r.ok, true, JSON.stringify(r.issues));
  assert.equal(r.target.form, "swayed");
});

test("agreement across a prepositional phrase is caught", async () => {
  const r = await checkSentence("sway", "The lanterns on the bridge sways gently above the crowd.");
  assert.equal(r.ok, false);
  const issue = r.issues.find(i => i.kind === "Agreement");
  assert.ok(issue, JSON.stringify(r.issues));
  assert.deepEqual(issue.suggestions, ["sway"]);
  assert.equal((await checkSentence("sway", "The lanterns on the bridge sway gently above the crowd.")).ok, true);
});

test("contractions and modals are not agreement errors", async () => {
  for (const text of ["I'd like to eat a banana.", "She'll eat a banana after lunch.", "The children can eat a banana each."]) {
    const r = await checkSentence("banana", text);
    assert.equal(r.ok, true, `${text} ${JSON.stringify(r.issues)}`);
  }
  for (const text of ["The air in the city is full of particulate pollution."]) {
    const r = await checkSentence("particulate", text);
    assert.equal(r.ok, true, `${text} ${JSON.stringify(r.issues)}`);
  }
});

test("the target word must be used", async () => {
  const r = await checkSentence("furor", "The decision made people very angry.");
  assert.equal(r.ok, false);
  assert.equal(r.target.found, false);
});

test("inflected forms and phrases count as using the word", () => {
  assert.equal(findTarget(nlp, "run", "She ran to the store.").form, "ran");
  assert.equal(findTarget(nlp, "tuber", "Potatoes are tubers.").form, "tubers");
  assert.equal(findTarget(nlp, "take part in", "We took part in the race.").form, "took part in");
  assert.equal(findTarget(nlp, "UNESCO", "UNESCO protects old towns.").found, true);
});

test("too short, no verb, or only the word fail", async () => {
  assert.deepEqual((await checkSentence("furor", "A big furor.")).structure.sort(), ["noVerb", "short"]);
  assert.ok((await checkSentence("furor", "furor")).structure.includes("onlyWord"));
});

test("a rare target word is not flagged as a spelling mistake", async () => {
  const r = await checkSentence("obstreperous", "The obstreperous children ran around the room.");
  assert.equal(r.ok, true, JSON.stringify(r.issues));
});

test("hints: the translated example, or frames by part of speech", async () => {
  assert.deepEqual(await hintFor("furor", { exZh: "这个决定引起了轩然大波。" }), { kind: "idea", text: "这个决定引起了轩然大波。" });
  assert.match((await hintFor("notorious")).text, /very notorious/);
  assert.match((await hintFor("tuber")).text, /The tuber/);
});

test("an -ing form or participle with no helping verb fails", async () => {
  const r = await checkSentence("sway", "I swaying on the swing");
  assert.equal(r.ok, false);
  assert.deepEqual(r.issues.find(i => i.kind === "MissingVerb").suggestions, ["am swaying", "swayed"]);
  assert.equal((await checkSentence("eat", "He eaten the cake every day.")).ok, false);
  for (const text of ["I am swaying on the swing.", "I like swaying on the swing.", "Swaying in the wind, the trees looked alive.", "The crowd was swayed by his speech."]) {
    assert.equal((await checkSentence("sway", text)).ok, true, text);
  }
});
