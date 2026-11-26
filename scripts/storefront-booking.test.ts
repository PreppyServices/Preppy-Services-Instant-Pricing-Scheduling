/**
 * Storefront mode=book uses the residential Apps Script URL and field names.
 * A TEST name and email are sent unchanged.
 * This file builds the query string only. It does not call the Apps Script.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { firstServicePrice } from "../lib/introPricing.ts";
import {
  STOREFRONT_TIER_LIST,
  STOREFRONT_VISIT_MIX,
  type StorefrontTier,
  type StorefrontTierId,
} from "../lib/storefrontCopy.ts";
import {
  buildStorefrontBookQuery,
  storefrontMailto,
  storefrontPlanLine,
  storefrontServiceTitle,
} from "../lib/storefrontCopy.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const base = {
  start: "2026-11-24T13:00:00.000Z",
  slotLabel: "Tue, Nov 24, 8:00 AM",
  business: "Panther Coffee",
  businessType: "Cafe",
  address: "2390 NW 2nd Ave",
  name: "Alex TEST",
  email: "alex.TEST@example.com",
  phone: "3055550199",
  utm: {},
};

function booked(tierId: StorefrontTierId) {
  return buildStorefrontBookQuery({ ...base, tierId });
}

function sizeNote(tier: StorefrontTier): string {
  if (tier.monthly == null || tier.priceLabel == null) return `Size: ${tier.name}.`;
  return `Size: ${tier.name}, ${tier.detail}. Price: ${tier.priceLabel}.`;
}

const tiny = STOREFRONT_TIER_LIST[0];
check(tiny.id === "tiny" && tiny.monthly === 240, "tiny tier is $240");
const params = booked("tiny");
const summary =
  "STOREFRONT REQUEST. Flag to Geoffrey for Jobber. Business: Panther Coffee. Type: Cafe. Address: 2390 NW 2nd Ave. Size: Tiny storefront, under about 22 ft of glass. Price: $240 a month. Slot: Tue, Nov 24, 8:00 AM. Contact: Alex TEST, alex.TEST@example.com, 3055550199.";
const tinyPlan = "Tiny storefront, $240 a month, 4 visits a month, 3 exterior only and 1 inside and out";
const tinyService = "Panther Coffee · Tiny storefront $240 · Flag to Geoffrey for Jobber";

const expected: Record<string, string> = {
  mode: "book",
  type: "storefront",
  start: "2026-11-24T13:00:00.000Z",
  business: "STOREFRONT: Panther Coffee",
  name: "Alex TEST",
  contact: "Alex TEST",
  email: "alex.TEST@example.com",
  phone: "3055550199",
  address: "2390 NW 2nd Ave",
  plan: tinyPlan,
  service: tinyService,
  notes: summary,
  signer: "Alex TEST",
  signedType: "typed",
  businessType: "Cafe",
};

for (const [key, value] of Object.entries(expected)) {
  check(params.get(key) === value, `${key} is ${JSON.stringify(value)} but got ${JSON.stringify(params.get(key))}`);
}

check(params.get("plan") === tinyPlan, "plan line is exact");
check(params.get("plan") === storefrontPlanLine(tiny), "plan helper matches the tiny line");
check(params.get("name") === "Alex TEST", "TEST in the name stays");
check(params.get("email") === "alex.TEST@example.com", "TEST in the email stays");
check(!params.has("utm_source"), "an empty batch adds no utm param");
check(
  [...params.keys()].join(",") ===
    "mode,type,start,business,name,contact,email,phone,address,plan,service,notes,signer,signedType,businessType",
  "storefront booking keeps the existing field names"
);

const locked = new URLSearchParams();
for (const [key, value] of Object.entries(expected)) locked.set(key, value);
check(params.toString() === locked.toString(), "storefront booking query string");

const execFile = readFileSync(join(process.cwd(), "lib/schedulerExec.ts"), "utf8");
const execMatch = execFile.match(/https:\/\/script\.google\.com\/macros\/s\/[^"]+/);
check(!!execMatch, "shared exec URL is defined");
const storefrontComponent = readFileSync(join(process.cwd(), "components/StorefrontBooking.tsx"), "utf8");
check(
  storefrontComponent.includes("SCHEDULER_EXEC_URL") &&
    storefrontComponent.includes("buildStorefrontBookQuery"),
  "storefront submits through the shared exec URL"
);
check(
  storefrontComponent.includes(`${"${SCHEDULER_EXEC_URL}"}`) ||
    storefrontComponent.includes("SCHEDULER_EXEC_URL}?${buildStorefrontBookQuery"),
  "the book request is a GET query on the exec URL"
);
check(storefrontComponent.includes("STOREFRONT_TIER_LIST"), "the page lists the size tiers");
check(!storefrontComponent.includes("firstServicePrice"), "storefront does not apply the first service rate");
check(!storefrontComponent.includes("introPricing"), "storefront does not import residential discounts");
check(!storefrontComponent.includes("20%"), "storefront does not mention a percent discount");

const widget = readFileSync(join(process.cwd(), "components/PreppyLuxuryWidget.tsx"), "utf8");
check(widget.includes("SCHEDULER_EXEC_URL"), "residential booking still uses the shared exec URL");
check(widget.includes("buildResidentialBookQuery"), "residential booking still builds the residential query");
check(!widget.includes("/api/booking/jobber") || widget.includes("notifyJobber"), "residential jobber call stays where it was");
const storefront = readFileSync(join(process.cwd(), "components/StorefrontBooking.tsx"), "utf8");
check(!storefront.includes("/api/booking/jobber"), "storefront does not call the Jobber route");
check(!storefront.includes("notifyJobber"), "storefront does not notify Jobber");
check(!/mode=book/.test(storefront.replace("buildStorefrontBookQuery", "")), "the page does not hardcode a book request");

const input = { ...base, tierId: "tiny" as const };
const mailto = storefrontMailto(input);
check(mailto.startsWith("mailto:info@preppyservices.com?"), "failure fallback emails info@preppyservices.com");
const mailParams = new URLSearchParams(mailto.slice(mailto.indexOf("?") + 1));
check(mailParams.get("subject") === "Booking request", "fallback subject matches the residential booking email");
const mailBody = mailParams.get("body") || "";
check(mailBody.includes(summary), "fallback body carries the storefront details");
check(mailBody.includes(tinyService), "fallback body carries the calendar service line");
check(mailBody.includes(tinyPlan), "fallback body carries the plan line");
check(mailBody.includes("Alex TEST"), "fallback body carries the contact name");
check(mailBody.includes("2390 NW 2nd Ave"), "fallback body carries the address");

for (const tier of STOREFRONT_TIER_LIST) {
  const sent = booked(tier.id);
  const plan = sent.get("plan") || "";
  const service = sent.get("service") || "";
  const notes = sent.get("notes") || "";
  check(plan === storefrontPlanLine(tier), `${tier.id} plan line`);
  check(service === storefrontServiceTitle("Panther Coffee", tier), `${tier.id} service line`);
  check(notes.includes(sizeNote(tier)), `${tier.id} notes carry the size`);
  check(plan.includes(STOREFRONT_VISIT_MIX), `${tier.id} plan keeps the visit mix`);
  check(!/every visit/i.test(`${plan} ${service} ${notes}`), `${tier.id} does not say every visit`);
  check(!plan.includes("20%"), `${tier.id} plan has no discount`);
  if (tier.monthly == null || tier.priceLabel == null) {
    check(!/\$\d/.test(`${plan} ${service} ${notes}`), "walk by sends no dollar amount");
    check(plan === `Not sure / larger, price after a walk by, ${STOREFRONT_VISIT_MIX}`, "walk by plan line");
    continue;
  }
  const discounted = firstServicePrice(tier.monthly);
  check(plan.includes(tier.priceLabel), `${tier.id} plan uses the full monthly price`);
  check(service.includes(`$${tier.monthly}`), `${tier.id} service uses the full monthly price`);
  check(!plan.includes(`$${discounted}`), `${tier.id} plan is not the discounted amount`);
  check(!service.includes(String(discounted)), `${tier.id} service is not the discounted amount`);
  check(!notes.includes(`$${discounted}`), `${tier.id} notes are not the discounted amount`);
  check(tier.monthly !== discounted, `${tier.id} monthly amount is not the first service rate`);
}

const medium = booked("medium");
check(
  medium.get("plan") ===
    "Medium storefront, $400 a month, 4 visits a month, 3 exterior only and 1 inside and out",
  "medium plan line is exact"
);
check(
  medium.get("service") === "Panther Coffee · Medium storefront $400 · Flag to Geoffrey for Jobber",
  "medium service line is exact"
);
const large = booked("large");
check(
  large.get("plan") ===
    "Large storefront or flagship, $600 a month, 4 visits a month, 3 exterior only and 1 inside and out",
  "large plan line is exact"
);
check(
  large.get("service") ===
    "Panther Coffee · Large storefront or flagship $600 · Flag to Geoffrey for Jobber",
  "large service line is exact"
);
const walkby = booked("walkby");
check(
  walkby.get("service") ===
    "Panther Coffee · Not sure / larger, price after a walk by · Flag to Geoffrey for Jobber",
  "walk by service line is exact"
);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("storefront booking guard passed");
