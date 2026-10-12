// CI guard: fails if code ever makes the Google review option depend on the
// rating (review gating). Heuristic by design — any file that mentions Google
// AND compares a rating against a number must be reviewed by a human.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");
const RATING_COMPARISON = /\brating\w*\s*(>=|<=|>|<|===|==)\s*[1-5]\b|\b[1-5]\s*(>=|<=|>|<)\s*rating/i;
const GOOGLE = /google/i;
// Files allowed to compare ratings: validation of the 1–5 range and seed data. None of them render the Google option.
const ALLOW = new Set(["lib/validation.ts", "server/data/demo/seed.ts", "server/data/demo/index.ts"]);

const failures = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name)) {
      const rel = relative(ROOT, p).split("\\").join("/");
      const src = readFileSync(p, "utf8");
      if (!ALLOW.has(rel) && GOOGLE.test(src) && RATING_COMPARISON.test(src)) failures.push(rel);
    }
  }
}
walk(ROOT);

const thankYou = readFileSync(join(ROOT, "components/customer/thank-you.tsx"), "utf8");
if (/\brating\b/.test(thankYou.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""))) {
  failures.push("components/customer/thank-you.tsx receives or reads a rating");
}

if (failures.length) {
  console.error("✗ Possible review gating — the Google review option must not depend on the rating:\n  " + failures.join("\n  "));
  process.exit(1);
}
console.log("✓ No review gating detected: the Google review option is independent of the rating.");
