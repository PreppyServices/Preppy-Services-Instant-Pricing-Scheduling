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

// Hyphen, nonbreaking hyphen, figure dash, en dash, em dash, horizontal bar, minus.
const DASH = /[\u002D\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/;

/** Customer-facing prose. URLs, markdown link targets, and code spans are ignored. */
function customerProse(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/[^\s)]+/g, " ")
    .replace(/^[ \t]*-[ \t]+/gm, "");
}

function checkNoDash(text: string, label: string) {
  const prose = customerProse(text);
  const at = prose.search(DASH);
  if (at === -1) return;
  const snippet = prose.slice(Math.max(0, at - 30), at + 31);
  failures.push(`${label} still has a hyphen or dash near: ${JSON.stringify(snippet)}`);
}

function collectSchemaProse(value: unknown, out: string[]) {
  if (typeof value === "string") {
    if (!/^https?:\/\/\S+$/.test(value.trim())) out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectSchemaProse(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) {
      collectSchemaProse(child, out);
    }
  }
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
check(!html.includes("FAQPage"), "JSON-LD must not include FAQPage");
check(!html.includes("streetAddress"), "JSON-LD must not include a street address");
check(!html.includes("2915 Biscayne"), "JSON-LD must not include the street");
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
  "streetAddress",
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
check(!types.includes("FAQPage"), "JSON-LD must not include FAQPage");
check(!types.includes("Question"), "JSON-LD must not include FAQ questions");
check(!types.includes("Review"), "JSON-LD must not include Review");
check(!types.includes("AggregateRating"), "JSON-LD must not include AggregateRating");

const graph = businessGraph["@graph"];
check(graph.length === 1, "JSON-LD graph must be the LocalBusiness only");
const business = graph[0] as {
  description?: string;
  telephone?: string;
  sameAs?: string[];
  address?: Record<string, string>;
  makesOffer?: { name?: string; url?: string; itemOffered?: { url?: string } };
  areaServed?: { name: string }[];
  openingHoursSpecification?: { opens: string; closes: string; dayOfWeek: string[] }[];
};
check(
  business.description ===
    "Preppy Services is a Miami field services company. Core work is balcony glass cleaning for residential towers. Trusted, careful glass and home care. Get an instant quote at quote.preppyservices.com. Details on request. Interior glass is an add on priced by tier, not included in the balcony price.",
  "LocalBusiness description"
);
check(!business.description?.includes("$"), "description must not include dollar amounts");
check(!html.includes("add-on"), "JSON-LD must spell add on without a hyphen");
const schemaProse: string[] = [];
collectSchemaProse(businessGraph, schemaProse);
checkNoDash(schemaProse.join("\n"), "JSON-LD customer-facing text");
check(business.telephone === "+13054140305", "telephone must be +13054140305");
check(!business.address?.streetAddress, "address must not include streetAddress");
check(business.address?.addressLocality === "Miami", "address locality");
check(business.address?.addressRegion === "FL", "address region");
check(business.address?.postalCode === "33137", "address postal code");
check(business.address?.addressCountry === "US", "address country");
const hours = business.openingHoursSpecification;
check(hours?.length === 1, "openingHoursSpecification must be one entry");
check(hours?.[0]?.opens === "08:00" && hours?.[0]?.closes === "18:00", "hours must be 08:00-18:00");
check(
  hours?.[0]?.dayOfWeek.join("|") === "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday",
  "hours must be Monday through Saturday"
);
check(!hours?.[0]?.dayOfWeek.includes("Sunday"), "Sunday is closed");
check(business.makesOffer?.name === "Balcony glass cleaning", "makesOffer name");
check(business.makesOffer?.url === "https://quote.preppyservices.com", "makesOffer must link to the quote page");
check(
  business.makesOffer?.itemOffered?.url === "https://quote.preppyservices.com",
  "offered service must link to the quote page"
);
check(
  business.areaServed?.map((area) => area.name).join("|") ===
    "Miami|Miami Beach|Brickell|Edgewater|Downtown Miami|Coral Gables",
  "areaServed must be Miami, Miami Beach, Brickell, Edgewater, Downtown Miami, and Coral Gables"
);
check(
  business.areaServed?.every((area) => (area as { addressRegion?: string }).addressRegion === "FL") ===
    true,
  "areaServed places must be in FL"
);
check(!/paint/i.test(html), "JSON-LD must not mention painting");
check(
  business.sameAs?.join("|") ===
    [
      "https://instagram.com/preppyservices/",
      "https://www.facebook.com/profile.php?id=61580467193527",
      "https://www.tiktok.com/@preppyservices",
    ].join("|"),
  "sameAs must be Instagram, Facebook, and TikTok"
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
check(llmsBody.includes("# Preppy Services: unit pricing"), "/llms.txt H1 must use a colon");
check(llmsBody.includes("Preppy Services"), "/llms.txt must contain Preppy Services");
check(llmsBody.includes("https://quote.preppyservices.com"), "/llms.txt missing quote URL");
check(llmsBody.includes("Get an instant quote at quote.preppyservices.com."), "/llms.txt missing the quote line");
check(llmsBody.includes("Trusted, careful glass and home care."), "/llms.txt missing the care line");
check(llmsBody.includes("Details on request."), "/llms.txt missing details on request");
check(llmsBody.includes("info@preppyservices.com"), "/llms.txt missing email");
check(!/water[\s-]*fed/i.test(llmsBody), "/llms.txt must not say water fed");
check(!/\bladders?\b/i.test(llmsBody), "/llms.txt must not say ladders");
check(!/\blifts?\b/i.test(llmsBody), "/llms.txt must not say lifts");
check(!/\brope\b/i.test(llmsBody), "/llms.txt must not say rope");
check(!/from the ground/i.test(llmsBody), "/llms.txt must not say from the ground");
check(!/from inside the unit/i.test(llmsBody), "/llms.txt must not describe cleaning from inside the unit");
check(!/on the balcony/i.test(llmsBody), "/llms.txt must not describe cleaning on the balcony");
check(!/building exterior/i.test(llmsBody), "/llms.txt must not mention the building exterior");
check(!/water[\s-]*fed/i.test(html), "JSON-LD must not say water fed");
check(!/\bladders?\b/i.test(html), "JSON-LD must not say ladders");
check(!/\blifts?\b/i.test(html), "JSON-LD must not say lifts");
check(!/\brope\b/i.test(html), "JSON-LD must not say rope");
check(!/from the ground/i.test(html), "JSON-LD must not say from the ground");
check(!/from inside the unit/i.test(html), "JSON-LD must not describe cleaning from inside the unit");
check(!/on the balcony/i.test(html), "JSON-LD must not describe cleaning on the balcony");
check(!/building exterior/i.test(html), "JSON-LD must not mention the building exterior");
check(
  llmsBody.includes("Monday through Saturday, 8:00 a.m. to 6:00 p.m. ET, closed Sunday"),
  "/llms.txt missing hours"
);
check(llmsBody.includes("https://www.tiktok.com/@preppyservices"), "/llms.txt missing TikTok");
check(llmsBody.includes("https://instagram.com/preppyservices/"), "/llms.txt missing Instagram");
check(
  llmsBody.includes("https://www.facebook.com/profile.php?id=61580467193527"),
  "/llms.txt missing Facebook"
);
check(!llmsBody.includes("$"), "/llms.txt must not include prices");
check(!llmsBody.includes("2915"), "/llms.txt must not include a street address");
check(!llmsBody.includes("Biscayne Blvd"), "/llms.txt must not include a street address");
check(!llmsBody.includes("+13054140305"), "/llms.txt must not include the phone number");
check(!/305-414-0305/.test(llmsBody), "/llms.txt must not include the phone number");
check(!/workers'?\s*comp/i.test(llmsBody), "/llms.txt must not mention workers' compensation");
check(!/\binsured\b/i.test(llmsBody), "/llms.txt must not use an insured shorthand");
check(!/\bBTR\b/.test(llmsBody), "/llms.txt must not claim a BTR");
check(!/\blicen[sc]ed\b/i.test(llmsBody), "/llms.txt must not claim a license");
check(!/paint/i.test(llmsBody), "/llms.txt must not mention painting");
check(!/\d(?:\.\d)?\s*stars?/i.test(llmsBody), "/llms.txt must not include a star count");
check(
  llmsBody.includes("Interior glass is an add on priced by tier, not included in the balcony price."),
  "/llms.txt must spell add on without a hyphen"
);
check(!llmsBody.includes("add-on"), "/llms.txt must not hyphenate add on");
checkNoDash(llmsBody, "/llms.txt prose");

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
