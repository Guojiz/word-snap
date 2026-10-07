// Copies the web app into www/ for the Capacitor (Android) build. No dependencies.
// The site itself is served from the repository root; www/ is generated and ignored by git.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "www");

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

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const entry of ENTRIES) {
  const from = join(root, entry);
  if (!existsSync(from)) continue;
  mkdirSync(dirname(join(out, entry)), { recursive: true });
  cpSync(from, join(out, entry), { recursive: true });
}
console.log(`www/ ready (${ENTRIES.filter(e => existsSync(join(root, e))).length} entries)`);
