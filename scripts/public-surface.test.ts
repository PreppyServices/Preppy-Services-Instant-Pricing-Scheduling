/**
 * Public quote surfaces must not offer interior paint.
 * Allowlisted hits are comments or tests that forbid the word, not services.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { businessJsonLdJson } from "../lib/businessSchema.ts";
import { llmsTxt } from "../lib/llmsTxt.ts";
import { OG_SERVICE_LINE } from "../lib/ogServiceLine.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

check(OG_SERVICE_LINE === "Balcony Glass, Custom Home Care", "OG service line changed");
check(!/paint/i.test(OG_SERVICE_LINE), "OG service line mentions paint");
check(!/[—–-]/.test(OG_SERVICE_LINE), "OG service line contains a dash");

const card = readFileSync(join(root, "app/og/preppy/card.tsx"), "utf8");
check(card.includes("{OG_SERVICE_LINE}"), "OG card must render OG_SERVICE_LINE");
check(!/paint/i.test(card), "OG card source mentions paint");

const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
check(!/paint/i.test(layout), "root metadata mentions paint");
check(!layout.includes("interior painting"), "root keywords still list interior painting");

const storefrontPage = readFileSync(join(root, "app/storefront/page.tsx"), "utf8");
check(!/paint/i.test(storefrontPage), "storefront page mentions paint");

check(!/paint/i.test(llmsTxt), "public /llms.txt mentions paint");
check(!/paint/i.test(businessJsonLdJson()), "JSON-LD mentions paint");

const widget = readFileSync(join(root, "components/PreppyLuxuryWidget.tsx"), "utf8");
const changeLabels = ["Change building", "Cambiar edificio", "Changer de bâtiment"];
for (const label of changeLabels) {
  check(widget.includes(`"${label}"`), `widget missing ${JSON.stringify(label)}`);
  check(!/[·•–—-]/.test(label), `change building copy has a dash: ${label}`);
  check(!/paint|bonded|licensed|fully insured|call /i.test(label), `change building copy is off limits: ${label}`);
}

const skipDir = new Set(["node_modules", ".git", ".next", "public"]);
const textExt = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".md",
  ".json",
  ".css",
  ".txt",
  ".html",
]);

/**
 * These files may contain the letters p-a-i-n-t because they forbid it
 * or document that the public llms text must not mention it.
 */
const allowPaint = new Set([
  "lib/llmsTxt.ts",
  "scripts/schema-markup.test.ts",
  "scripts/public-surface.test.ts",
  "tests/widget-deeplink.spec.ts",
]);

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    if (skipDir.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full);
      continue;
    }
    const ext = entry.includes(".") ? entry.slice(entry.lastIndexOf(".")) : "";
    if (!textExt.has(ext)) continue;
    const rel = relative(root, full);
    const text = readFileSync(full, "utf8");
    if (!/paint/i.test(text)) continue;
    if (!allowPaint.has(rel)) {
      const lines = text
        .split("\n")
        .map((line, index) => (/paint/i.test(line) ? `${rel}:${index + 1}: ${line.trim()}` : ""))
        .filter(Boolean);
      failures.push(`unexpected paint hit\n${lines.join("\n")}`);
    }
  }
}

walk(root);

const llmsSource = readFileSync(join(root, "lib/llmsTxt.ts"), "utf8");
check(/or painting\./.test(llmsSource), "llms authoring comment should keep the painting ban");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("public surface guard passed");
