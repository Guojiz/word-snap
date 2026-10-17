// Static checks for the single-file app, run in CI next to the unit tests:
//   node tools/check-page.mjs
// 1. every inline <script> parses;
// 2. every file the service worker precaches exists;
// 3. <div> tags balance and element ids are unique;
// 4. every literal t("group.key") used by the page exists in both the English and Chinese tables.
// Exits non-zero with a list of problems.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "vocabulary-match.html"), "utf8");
const problems = [];

// 1. inline scripts
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const [i, code] of scripts.entries()) {
  try {
    new Function(code); // parse only
  } catch (error) {
    problems.push(`inline script #${i + 1} does not parse: ${error.message}`);
  }
}

// 2. precached files
const sw = readFileSync(join(root, "service-worker.js"), "utf8");
const shell = sw.match(/const APP_SHELL = \[([\s\S]*?)\];/);
if (!shell) problems.push("service-worker.js: APP_SHELL not found");
else {
  for (const [, path] of shell[1].matchAll(/"([^"]+)"/g)) {
    if (path === "./") continue;
    if (!existsSync(join(root, path))) problems.push(`service-worker.js precaches a missing file: ${path}`);
  }
}

// 3. markup
const body = html.slice(html.indexOf("<body"));
const opened = (body.match(/<div[\s>]/g) || []).length;
const closed = (body.match(/<\/div>/g) || []).length;
if (opened !== closed) problems.push(`<div> tags do not balance: ${opened} opened, ${closed} closed`);
const ids = new Map();
for (const [, id] of body.matchAll(/\sid="([^"$]+)"/g)) ids.set(id, (ids.get(id) || 0) + 1);
for (const [id, n] of ids) if (n > 1) problems.push(`id "${id}" is used ${n} times`);

// 4. i18n keys
const start = html.indexOf("const I18N = {");
if (start < 0) problems.push("I18N table not found");
else {
  let depth = 0, end = -1;
  for (let i = html.indexOf("{", start); i < html.length; i++) {
    const c = html[i];
    if (c === "{") depth += 1;
    else if (c === "}") { depth -= 1; if (depth === 0) { end = i + 1; break; } }
    else if (c === '"' || c === "'" || c === "`") {
      // skip string literals so braces inside strings do not count
      const quote = c;
      for (i += 1; i < html.length && html[i] !== quote; i++) if (html[i] === "\\") i += 1;
    }
  }
  let table = null;
  try {
    table = new Function(`return (${html.slice(html.indexOf("{", start), end)});`)();
  } catch (error) {
    problems.push(`I18N table does not evaluate: ${error.message}`);
  }
  if (table) {
    const has = (lang, key) => key.split(".").reduce((node, part) => (node == null ? node : node[part]), table[lang]) != null;
    const used = new Set([...html.matchAll(/\bt\("([a-zA-Z]+\.[a-zA-Z0-9_]+)"\s*[,)]/g)].map(m => m[1])); // literal keys only, not "prefix_" + x
    for (const key of used) {
      for (const lang of ["en", "zh"]) if (!has(lang, key)) problems.push(`i18n key "${key}" missing in ${lang}`);
    }
  }
}

if (problems.length) {
  console.error(`check-page: ${problems.length} problem(s)\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`check-page: ok (${scripts.length} scripts, ${ids.size} ids, i18n checked)`);
