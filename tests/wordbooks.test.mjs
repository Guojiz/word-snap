import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanMeaning, parseCsvLine, nextFromBook, bookProgress } from "../js/wordbooks.js";

test("ECDICT translation becomes a short card meaning", () => {
  assert.equal(cleanMeaning("v. 放弃, 抛弃, 遗弃\\nn. 放任, 狂热"), "放弃；抛弃；遗弃");
  assert.equal(cleanMeaning("n. 罩；风帽；（布质）面罩\\n[网络] 胡德；兜帽"), "罩；风帽；面罩");
  assert.equal(cleanMeaning("[网络] only network"), "");
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
