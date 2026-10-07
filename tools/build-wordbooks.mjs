// Builds wordbooks/*.json from ECDICT (https://github.com/skywind3000/ECDICT, MIT).
//   node tools/build-wordbooks.mjs path/to/ecdict.csv
// Each book is the ECDICT words carrying an exam tag, most frequent first
// (COCA rank `frq`, then BNC rank), with a short Chinese meaning cut from
// `translation`. The output is committed; ecdict.csv itself is not.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanMeaning, parseCsvLine } from "../js/wordbooks.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];
if (!source || !existsSync(source)) {
  console.error("usage: node tools/build-wordbooks.mjs path/to/ecdict.csv");
  process.exit(1);
}

export const BOOKS = [
  { id: "zk", zh: "中考", en: "Middle school (zhongkao)" },
  { id: "gk", zh: "高考", en: "High school (gaokao)" },
  { id: "cet4", zh: "大学英语四级", en: "CET-4" },
  { id: "cet6", zh: "大学英语六级", en: "CET-6" },
  { id: "ky", zh: "考研", en: "Postgraduate exam (kaoyan)" },
  { id: "toefl", zh: "托福", en: "TOEFL" },
  { id: "ielts", zh: "雅思", en: "IELTS" },
  { id: "gre", zh: "GRE", en: "GRE" }
];

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
  const meaning = cleanMeaning(row[T]);
  if (!meaning) continue;
  const rank = Number(row[FRQ]) || Number(row[BNC]) || 1e9;
  for (const tag of tags) books[tag].push({ word, meaning, rank });
}

const outDir = join(root, "wordbooks");
mkdirSync(outDir, { recursive: true });
const index = [];
for (const book of BOOKS) {
  const words = books[book.id].sort((a, b) => a.rank - b.rank || a.word.localeCompare(b.word)).map(w => [w.word, w.meaning]);
  writeFileSync(join(outDir, `${book.id}.json`), JSON.stringify({ id: book.id, words }) + "\n");
  index.push({ ...book, count: words.length });
  console.log(`${book.id}: ${words.length}`);
}
writeFileSync(join(outDir, "index.json"), JSON.stringify({ source: "ECDICT (MIT) https://github.com/skywind3000/ECDICT", books: index }, null, 2) + "\n");
