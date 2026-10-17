// Copies the web app into www/. No dependencies.
//   node tools/build-www.mjs          → www/ for the Capacitor (Android) app
//   node tools/build-www.mjs --site   → www/ for GitHub Pages: adds the service worker
//                                       (stamped with the commit) and the site's own files
// www/ is generated and ignored by git; the Pages workflow uploads it as the whole site,
// so nothing outside this list (android/, tests, tools, design notes…) is ever published.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "www");
const site = process.argv.includes("--site");

const ENTRIES = [
  "index.html",
  "vocabulary-match.html",
  "manifest.webmanifest",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon.svg",
  "js",
  "vendor",
  "wordbooks",
  // The accuracy eval, so the on-device model can be measured on the phone itself.
  "tools/ai-eval.html",
  "tests/fixtures"
];
// The app shell has no service worker (Capacitor serves the files itself).
const SITE_ENTRIES = ["service-worker.js", "LICENSE"];

/** A cache name that changes with every deployed commit, so visitors never keep stale files. */
function cacheName(sha) {
  return `word-snap-${String(sha || "dev").slice(0, 12)}`;
}

function commitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "dev";
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const entries = site ? [...ENTRIES, ...SITE_ENTRIES] : ENTRIES;
for (const entry of entries) {
  const from = join(root, entry);
  if (!existsSync(from)) continue;
  mkdirSync(dirname(join(out, entry)), { recursive: true });
  cpSync(from, join(out, entry), { recursive: true });
}

if (site) {
  const swPath = join(out, "service-worker.js");
  const sw = readFileSync(swPath, "utf8");
  const stamped = sw.replace(/const CACHE_NAME = "word-snap-[^"]*";/, `const CACHE_NAME = "${cacheName(commitSha())}";`);
  if (stamped === sw) throw new Error("service-worker.js: CACHE_NAME line not found");
  writeFileSync(swPath, stamped);
}
console.log(`www/ ready (${entries.filter(e => existsSync(join(root, e))).length} entries${site ? ", site build" : ""})`);
