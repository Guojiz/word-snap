import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanMeaning, parseCsvLine, nextFromBook, bookProgress, bookGroup } from "../js/wordbooks.js";

test("ECDICT translation becomes a short card meaning", () => {
  assert.equal(cleanMeaning("v. 放弃, 抛弃, 遗弃\\nn. 放任, 狂热"), "放弃；抛弃；遗弃");
  assert.equal(cleanMeaning("n. 罩；风帽；（布质）面罩\\n[网络] 胡德；兜帽"), "罩；风帽；面罩");
  assert.equal(cleanMeaning("[网络] only network"), "");
  assert.equal(cleanMeaning("第一个字母 A; 一个; 第一的\\r\\nart. 累加器"), "第一个字母A；一个；第一的", "no \\r left over");
  assert.ok(cleanMeaning("n. 一个很长很长很长的释义；第二个很长很长的释义；第三个").length <= 18);
});

test("CSV lines with quotes and commas", () => {
  assert.deepEqual(parseCsvLine('a,"b, c",,"say ""hi"""'), ["a", "b, c", "", 'say "hi"']);
});

test("next words skip what is already in the library, in book order", () => {
  const words = [["state", "州"], ["might", "力量"], ["part", "部分"], ["area", "区域"]];
  const library = new Set(["might", "area"]);
  assert.deepEqual(nextFromBook(words, library, 2), [["state", "州"], ["part", "部分"]]);
  assert.equal(bookProgress(words, library), 2);
});

test("generated books are well formed", () => {
  const index = JSON.parse(readFileSync(new URL("../wordbooks/index.json", import.meta.url)));
  assert.ok(index.books.length >= 8);
  for (const book of index.books) {
    const data = JSON.parse(readFileSync(new URL(`../wordbooks/${book.id}.json`, import.meta.url)));
    assert.equal(data.words.length, book.count);
    assert.ok(book.count > 1000, book.id);
    const seen = new Set();
    for (const [word, meaning] of data.words.slice(0, 500)) {
      assert.ok(word && meaning, book.id);
      assert.ok(!seen.has(word), `${book.id} duplicate ${word}`);
      seen.add(word);
    }
  }
});

test("books start with words new at their level, not with function words", () => {
  assert.equal(bookGroup("environmental", 900, new Set()), 0);
  assert.equal(bookGroup("school", 300, new Set(["school"])), 1);
  assert.equal(bookGroup("the", 1, new Set()), 2);
  const read = id => JSON.parse(readFileSync(new URL(`../wordbooks/${id}.json`, import.meta.url))).words;
  const zk = new Set(read("zk").map(([w]) => w));
  const ielts = read("ielts").slice(0, 100).map(([w]) => w);
  assert.ok(!ielts.some(w => ["in", "on", "as", "go", "say", "the"].includes(w)), ielts.slice(0, 10).join(","));
  assert.ok(ielts.filter(w => zk.has(w)).length === 0, "IELTS opens with words a middle-school book does not have");
  const meanings = Object.fromEntries(read("zk"));
  assert.equal(meanings.can, "能；可以；罐头");
  assert.ok(!Object.values(meanings).some(m => /\\|\r/.test(m)));
});
