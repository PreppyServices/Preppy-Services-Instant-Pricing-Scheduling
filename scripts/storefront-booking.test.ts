/**
 * Storefront mode=book uses the residential Apps Script URL and field names.
 * A TEST name and email are sent unchanged.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STOREFRONT_PLAN,
  buildStorefrontBookQuery,
  storefrontMailto,
} from "../lib/storefrontBooking.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const input = {
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

const params = buildStorefrontBookQuery(input);
const summary =
  "STOREFRONT REQUEST. Flag to Geoffrey for Jobber. Business: Panther Coffee. Type: Cafe. Address: 2390 NW 2nd Ave. Slot: Tue, Nov 24, 8:00 AM. Contact: Alex TEST, alex.TEST@example.com, 3055550199.";

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
  plan: STOREFRONT_PLAN,
  service: `${STOREFRONT_PLAN} · Notes: ${summary}`,
  notes: summary,
  signer: "Alex TEST",
  signedType: "typed",
  businessType: "Cafe",
};

for (const [key, value] of Object.entries(expected)) {
  check(params.get(key) === value, `${key} is ${JSON.stringify(value)} but got ${JSON.stringify(params.get(key))}`);
}

check(params.get("plan") === "Storefront $240 a month, 4 visits a month, 3 exterior, 1 inside and out", "plan line is exact");
check(params.get("name") === "Alex TEST", "TEST in the name stays");
check(params.get("email") === "alex.TEST@example.com", "TEST in the email stays");
check(!params.has("utm_source"), "an empty batch adds no utm param");
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

const widget = readFileSync(join(process.cwd(), "components/PreppyLuxuryWidget.tsx"), "utf8");
check(widget.includes("SCHEDULER_EXEC_URL"), "residential booking still uses the shared exec URL");
check(widget.includes("buildResidentialBookQuery"), "residential booking still builds the residential query");
check(!widget.includes("/api/booking/jobber") || widget.includes("notifyJobber"), "residential jobber call stays where it was");
const storefront = readFileSync(join(process.cwd(), "components/StorefrontBooking.tsx"), "utf8");
check(!storefront.includes("/api/booking/jobber"), "storefront does not call the Jobber route");
check(!storefront.includes("notifyJobber"), "storefront does not notify Jobber");

const mailto = storefrontMailto(input);
check(mailto.startsWith("mailto:info@preppyservices.com?"), "failure fallback emails info@preppyservices.com");
const mailParams = new URLSearchParams(mailto.slice(mailto.indexOf("?") + 1));
check(mailParams.get("subject") === "Booking request", "fallback subject matches the residential booking email");
check((mailParams.get("body") || "").includes(summary), "fallback body carries the storefront details");

check(
  params.toString() ===
    "mode=book&type=storefront&start=2026-11-24T13%3A00%3A00.000Z&business=STOREFRONT%3A+Panther+Coffee&name=Alex+TEST&contact=Alex+TEST&email=alex.TEST%40example.com&phone=3055550199&address=2390+NW+2nd+Ave&plan=Storefront+%24240+a+month%2C+4+visits+a+month%2C+3+exterior%2C+1+inside+and+out&service=Storefront+%24240+a+month%2C+4+visits+a+month%2C+3+exterior%2C+1+inside+and+out+%C2%B7+Notes%3A+STOREFRONT+REQUEST.+Flag+to+Geoffrey+for+Jobber.+Business%3A+Panther+Coffee.+Type%3A+Cafe.+Address%3A+2390+NW+2nd+Ave.+Slot%3A+Tue%2C+Nov+24%2C+8%3A00+AM.+Contact%3A+Alex+TEST%2C+alex.TEST%40example.com%2C+3055550199.&notes=STOREFRONT+REQUEST.+Flag+to+Geoffrey+for+Jobber.+Business%3A+Panther+Coffee.+Type%3A+Cafe.+Address%3A+2390+NW+2nd+Ave.+Slot%3A+Tue%2C+Nov+24%2C+8%3A00+AM.+Contact%3A+Alex+TEST%2C+alex.TEST%40example.com%2C+3055550199.&signer=Alex+TEST&signedType=typed&businessType=Cafe",
  "storefront booking query string"
);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("storefront booking guard passed");
