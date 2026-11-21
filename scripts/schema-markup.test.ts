/**
 * Machine-readable business info on the quote site.
 * Homepage HTML carries LocalBusiness JSON-LD. /llms.txt returns 200.
 * No prices, ratings, or review counts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { businessGraph, businessJsonLdHtml } from "../lib/businessSchema.ts";
import { llmsTxtResponse } from "../lib/llmsTxt.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

function walk(value: unknown, visit: (record: Record<string, unknown>) => void) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  visit(record);
  for (const child of Object.values(record)) walk(child, visit);
}

const html = businessJsonLdHtml();
check(
  html.includes("application/ld+json") &&
    html.includes("LocalBusiness") &&
    html.includes("Preppy Services"),
  "homepage HTML includes application/ld+json with LocalBusiness and Preppy Services"
);
check(html.includes("FAQPage"), "homepage JSON-LD missing FAQPage");
check(html.includes("PREPROCK HOLDINGS LLC"), "JSON-LD missing legal name");
check(html.includes("https://preppyservices.com/#business"), "JSON-LD missing @id");
check(html.includes("Balcony glass cleaning"), "JSON-LD missing makesOffer name");
check(!html.includes("$"), "JSON-LD must not include prices");
check(!html.includes("20%"), "JSON-LD must not include a discount");
check(!html.includes("Gran Paraiso"), "JSON-LD must not include building catalog names");

const types: string[] = [];
const forbiddenKeys = [
  "price",
  "priceCurrency",
  "priceSpecification",
  "lowPrice",
  "highPrice",
  "aggregateRating",
  "review",
  "reviewCount",
  "ratingValue",
  "starRating",
];
walk(businessGraph, (record) => {
  const kind = record["@type"];
  if (typeof kind === "string") types.push(kind);
  if (Array.isArray(kind)) {
    for (const item of kind) {
      if (typeof item === "string") types.push(item);
    }
  }
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      failures.push(`JSON-LD must not include ${key}`);
    }
  }
});
check(types.includes("LocalBusiness"), "parsed graph missing LocalBusiness");
check(types.includes("FAQPage"), "parsed graph missing FAQPage");
check(!types.includes("Review"), "JSON-LD must not include Review");
check(!types.includes("AggregateRating"), "JSON-LD must not include AggregateRating");

const graph = businessGraph["@graph"];
const business = graph[0] as {
  telephone?: string;
  sameAs?: string[];
  makesOffer?: { name?: string; url?: string; itemOffered?: { url?: string } };
  areaServed?: { name: string }[];
  openingHoursSpecification?: unknown;
};
const faq = graph[1] as { mainEntity?: unknown[] };
check(business.telephone === "+1-305-414-0305", "telephone must be the number shown on the site");
check(business.openingHoursSpecification === undefined, "hours are omitted until verified");
check(!html.includes("openingHoursSpecification"), "JSON-LD must not include opening hours");
check(business.makesOffer?.name === "Balcony glass cleaning", "makesOffer name");
check(business.makesOffer?.url === "https://quote.preppyservices.com", "makesOffer must link to the quote page");
check(
  business.makesOffer?.itemOffered?.url === "https://quote.preppyservices.com",
  "offered service must link to the quote page"
);
check(
  business.areaServed?.map((area) => area.name).join("|") ===
    "Miami|Miami Beach|Brickell|Downtown Miami|Edgewater",
  "areaServed changed"
);
check(
  business.sameAs?.join("|") ===
    "https://instagram.com/preppyservices/|https://www.facebook.com/profile.php?id=61580467193527",
  "sameAs must be Instagram and Facebook only"
);
check(!html.toLowerCase().includes("tiktok"), "JSON-LD must not include TikTok");
check(
  (faq.mainEntity?.length ?? 0) >= 3 && (faq.mainEntity?.length ?? 0) <= 5,
  "FAQPage must have 3 to 5 questions"
);

const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
check(layout.includes("businessJsonLdJson"), "root layout must emit the JSON-LD on every page");
check(
  layout.includes("application/ld+json"),
  "root layout must include the application/ld+json script"
);

const route = readFileSync(join(process.cwd(), "app/llms.txt/route.ts"), "utf8");
check(route.includes("export function GET"), "/llms.txt route must export GET");
check(route.includes("llmsTxtResponse"), "/llms.txt route must return the public text");

const llmsRes = llmsTxtResponse();
const llmsBody = await llmsRes.text();
check(llmsRes.status === 200, `/llms.txt status ${llmsRes.status}, expected 200`);
check(llmsBody.includes("Preppy Services"), "/llms.txt must contain Preppy Services");
check(llmsBody.includes("https://quote.preppyservices.com"), "/llms.txt missing quote URL");
check(llmsBody.includes("https://preppyservices.com/faq"), "/llms.txt missing FAQ URL");
check(llmsBody.includes("COI"), "/llms.txt missing COI");
check(!llmsBody.includes("$"), "/llms.txt must not include prices");
check(!llmsBody.includes("08:00"), "/llms.txt must not include unverified hours");
check(!/tiktok/i.test(llmsBody), "/llms.txt must not include TikTok");
check(!/review count|stars|rating/i.test(llmsBody), "/llms.txt must not include review counts");

const origin = process.env.SCHEMA_ORIGIN;
if (origin) {
  const home = await fetch(`${origin}/`);
  const homeHtml = await home.text();
  check(home.ok, `homepage status ${home.status}`);
  check(
    homeHtml.includes("application/ld+json") &&
      homeHtml.includes("LocalBusiness") &&
      homeHtml.includes("Preppy Services"),
    "served homepage HTML missing LocalBusiness JSON-LD"
  );
  const intro = await fetch(`${origin}/?intro=1`);
  const introHtml = await intro.text();
  check(intro.ok, `intro homepage status ${intro.status}`);
  check(
    introHtml.includes("application/ld+json") && introHtml.includes("LocalBusiness"),
    "served /?intro=1 HTML missing LocalBusiness JSON-LD"
  );
  const llms = await fetch(`${origin}/llms.txt`);
  const served = await llms.text();
  check(llms.status === 200, `served /llms.txt status ${llms.status}`);
  check(served.includes("Preppy Services"), "served /llms.txt missing Preppy Services");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  origin
    ? "schema markup guard passed (homepage HTML and /llms.txt)"
    : "schema markup guard passed"
);
