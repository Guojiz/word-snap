/*
 * Built-in word books (wordbooks/*.json, made from ECDICT by tools/build-wordbooks.mjs).
 * Pure helpers, shared by the build script and the app; tested in Node.
 */

/** One CSV line → fields ("" escapes, commas inside quotes). ECDICT keeps each record on one line. */
export function parseCsvLine(line) {
  const out = [];
  let field = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(field); field = ""; }
    else field += c;
  }
  out.push(field);
  return out;
}

const POS = /^(?:[a-z]+\.\s*)+/i;

/**
 * ECDICT translation ("v. 放弃, 抛弃, 遗弃\nn. 放任, 狂热") → a short card meaning
 * ("放弃；抛弃；遗弃"): no part of speech, no [网络] / [医] notes, no brackets,
 * at most three senses and about 18 characters.
 */
export function cleanMeaning(translation, maxSenses = 3, maxLength = 18) {
  const senses = [];
  for (const raw of String(translation || "").split(/\\n|\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("[")) continue;
    const body = line.replace(POS, "")
      .replace(/[（(][^（）()]*[）)]/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/<[^>]*>/g, "");
    for (const part of body.split(/[;；,，]/)) {
      const sense = part.replace(/\s+/g, "").replace(/^[的地]$/, "");
      if (!sense || !/\p{Script=Han}/u.test(sense) || senses.includes(sense)) continue;
      if (senses.length && senses.join("；").length + 1 + sense.length > maxLength) break;
      senses.push(sense);
      if (senses.length >= maxSenses) break;
    }
    if (senses.length >= maxSenses) break;
  }
  return senses.join("；");
}

/**
 * The next `count` words of a book that are not in the library yet (book order is
 * most frequent first). library: a Set of lower-cased words already present.
 */
export function nextFromBook(words, library, count) {
  const out = [];
  for (const [word, meaning] of words) {
    if (out.length >= count) break;
    if (library.has(word.toLowerCase())) continue;
    out.push([word, meaning]);
  }
  return out;
}

/** How many of a book's words are already in the library. */
export function bookProgress(words, library) {
  let have = 0;
  for (const [word] of words) if (library.has(word.toLowerCase())) have += 1;
  return have;
}
