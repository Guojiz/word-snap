// Builds wordbooks/*.json from ECDICT (https://github.com/skywind3000/ECDICT, MIT).
//   node tools/build-wordbooks.mjs path/to/ecdict.csv
// Each book is the ECDICT words carrying an exam tag, with a short Chinese
// meaning cut from `translation` (hand-checked for common polysemous words in
// tools/wordbook-meanings.json). Order: words new at this level first (not in an
// easier book), then the ones an easier book has, then the most frequent function
// words — each group most frequent first (COCA rank `frq`, then BNC rank).
// The output is committed; ecdict.csv itself is not.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanMeaning, parseCsvLine, bookGroup } from "../js/wordbooks.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];
if (!source || !existsSync(source)) {
  console.error("usage: node tools/build-wordbooks.mjs path/to/ecdict.csv");
  process.exit(1);
}

// easier: the books whose words a learner of this one is expected to know already.
export const BOOKS = [
  { id: "zk", zh: "中考", en: "Middle school (zhongkao)", easier: [] },
  { id: "gk", zh: "高考", en: "High school (gaokao)", easier: ["zk"] },
  { id: "cet4", zh: "大学英语四级", en: "CET-4", easier: ["zk", "gk"] },
  { id: "cet6", zh: "大学英语六级", en: "CET-6", easier: ["zk", "gk", "cet4"] },
  { id: "ky", zh: "考研", en: "Postgraduate exam (kaoyan)", easier: ["zk", "gk", "cet4"] },
  { id: "toefl", zh: "托福", en: "TOEFL", easier: ["zk", "gk", "cet4"] },
  { id: "ielts", zh: "雅思", en: "IELTS", easier: ["zk", "gk", "cet4"] },
  { id: "gre", zh: "GRE", en: "GRE", easier: ["zk", "gk", "cet4", "cet6"] }
];
const MEANINGS = JSON.parse(readFileSync(join(root, "tools/wordbook-meanings.json"), "utf8"));

const lines = readFileSync(source, "utf8").split(/\r?\n/);
const header = parseCsvLine(lines[0]);
const col = name => header.indexOf(name);
const [W, T, TAG, BNC, FRQ] = ["word", "translation", "tag", "bnc", "frq"].map(col);

const books = Object.fromEntries(BOOKS.map(b => [b.id, []]));
for (let i = 1; i < lines.length; i++) {
  if (!lines[i]) continue;
  const row = parseCsvLine(lines[i]);
  const tags = (row[TAG] || "").split(/\s+/).filter(tag => books[tag]);
  if (!tags.length) continue;
  const word = (row[W] || "").trim();
  // Proper nouns and abbreviations are not study words.
  if (!/^[a-z][a-z' -]*$/.test(word)) continue;
  const meaning = (typeof MEANINGS[word] === "string" && MEANINGS[word]) || cleanMeaning(row[T]);
  // Place and person names that slipped in lower-case (york = 约克郡).
  if (!meaning || /郡|王朝|人名|地名|姓氏/.test(meaning)) continue;
  const rank = Number(row[FRQ]) || Number(row[BNC]) || 1e9;
  for (const tag of tags) books[tag].push({ word, meaning, rank });
}

const outDir = join(root, "wordbooks");
mkdirSync(outDir, { recursive: true });
const index = [];
for (const book of BOOKS) {
  const easier = new Set(book.easier.flatMap(id => books[id].map(w => w.word)));
  const words = books[book.id]
    .map(w => ({ ...w, group: bookGroup(w.word, w.rank, easier) }))
    .sort((a, b) => a.group - b.group || a.rank - b.rank || a.word.localeCompare(b.word))
    .map(w => [w.word, w.meaning]);
  writeFileSync(join(outDir, `${book.id}.json`), JSON.stringify({ id: book.id, words }) + "\n");
  const { easier: _skip, ...entry } = book;
  index.push({ ...entry, count: words.length });
  console.log(`${book.id}: ${words.length}`);
}
writeFileSync(join(outDir, "index.json"), JSON.stringify({ source: "ECDICT (MIT) https://github.com/skywind3000/ECDICT", books: index }, null, 2) + "\n");
