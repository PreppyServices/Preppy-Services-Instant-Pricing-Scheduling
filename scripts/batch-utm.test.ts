/**
 * Batch-link UTM capture. Values are kept for the tab and placed on the
 * residential booking request. Names, emails, and phones are not stored as
 * UTM values.
 */
import {
  UTM_KEYS,
  UTM_STORAGE_KEY,
  applyUtmToParams,
  buildResidentialBookQuery,
  captureLandingUtm,
  readUtmSearch,
  sanitizeUtmValue,
  utmSafeForRecord,
  type UtmStorage,
} from "../lib/batchUtm.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const GRAN_PARAISO =
  "https://quote.preppyservices.com/?utm_source=quo_sms&utm_medium=sms&utm_campaign=newsletter_2026_11&utm_content=gran_paraiso&building=Gran%20Paraiso";

const NO_BUILDING =
  "https://quote.preppyservices.com/?utm_source=quo_sms&utm_medium=sms&utm_campaign=newsletter_2026_11&utm_content=no_building_d1";

class MemoryStorage implements UtmStorage {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

check(sanitizeUtmValue("  quo_sms  ") === "quo_sms", "trim a batch source");
check(sanitizeUtmValue("newsletter_2026_11") === "newsletter_2026_11", "keep the campaign");
check(sanitizeUtmValue("gran_paraiso") === "gran_paraiso", "keep the content slug");
check(sanitizeUtmValue("no_building_d1") === "no_building_d1", "keep the no-building batch");
check(sanitizeUtmValue("resident@example.com") === null, "drop an email");
check(sanitizeUtmValue("305-555-0199") === null, "drop a phone number");
check(sanitizeUtmValue("+1 (305) 555-0199") === null, "drop a formatted phone");
check(sanitizeUtmValue("   ") === null, "drop blank");
check(sanitizeUtmValue(null) === null, "drop null");
check(sanitizeUtmValue("a".repeat(120)) === "a".repeat(80), "limit length to 80");
check(sanitizeUtmValue("quo\u0000sms") === "quosms", "strip control characters");
check(sanitizeUtmValue("gran<script>") === "granscript", "strip markup");
check(sanitizeUtmValue("1000_museum") === "1000_museum", "keep a short numeric slug");

const gran = readUtmSearch(new URL(GRAN_PARAISO).search);
check(gran.utm_source === "quo_sms", "gran source");
check(gran.utm_medium === "sms", "gran medium");
check(gran.utm_campaign === "newsletter_2026_11", "gran campaign");
check(gran.utm_content === "gran_paraiso", "gran content");
check(gran.utm_term === undefined, "gran has no term");
check(!("building" in gran), "building param is not a utm field");

const noBuilding = readUtmSearch(new URL(NO_BUILDING).search);
check(noBuilding.utm_content === "no_building_d1", "no-building batch content");

const mixedCase = readUtmSearch("?UTM_SOURCE=quo_sms&utm_term=balcony%20glass");
check(mixedCase.utm_source === "quo_sms", "utm keys are case insensitive");
check(mixedCase.utm_term === "balcony glass", "term keeps an internal space");

const dirty = readUtmSearch(
  "?utm_source=person@example.com&utm_medium=sms&utm_content=3055550199&utm_campaign=newsletter_2026_11"
);
check(dirty.utm_source === undefined, "email source is omitted");
check(dirty.utm_content === undefined, "phone content is omitted");
check(dirty.utm_medium === "sms", "a clean sibling value is kept");
check(dirty.utm_campaign === "newsletter_2026_11", "campaign survives dirty siblings");

const storage = new MemoryStorage();
const landed = captureLandingUtm(new URL(GRAN_PARAISO).search, storage);
check(landed.utm_content === "gran_paraiso", "landing capture returns the batch");
check(storage.getItem(UTM_STORAGE_KEY)?.includes("gran_paraiso") === true, "session stores the batch");

const afterSwitch = captureLandingUtm("", storage);
check(afterSwitch.utm_content === "gran_paraiso", "empty url keeps the session batch");
check(afterSwitch.utm_campaign === "newsletter_2026_11", "empty url keeps the campaign");

const nextBatch = captureLandingUtm(new URL(NO_BUILDING).search, storage);
check(nextBatch.utm_content === "no_building_d1", "a new landing replaces the session batch");
check(!JSON.parse(storage.getItem(UTM_STORAGE_KEY) || "{}").name, "session json has no name");

const named = utmSafeForRecord(
  { utm_source: "quo_sms", utm_content: "Alex", utm_term: "alex@example.com" },
  ["Alex", "alex@example.com", "3055550199"]
);
check(named.utm_source === "quo_sms", "safe record keeps the source");
check(named.utm_content === undefined, "safe record drops a value equal to the name");
check(named.utm_term === undefined, "safe record drops a value equal to the email");

const plain = buildResidentialBookQuery({
  start: "2026-11-12T15:00:00.000Z",
  building: "Gran Paraiso",
  name: "Alex",
  email: "alex@example.com",
  phone: "3055550199",
  unitLine: "04",
  unit: "3204",
  total: 280,
  glassIntro: true,
  note: "gate",
  serviceType: "glass",
  leadId: "A1042",
  utm: {},
});
check(plain.get("mode") === "book", "mode stays book");
check(plain.get("type") === "residential", "type stays residential");
check(plain.get("business") === "Gran Paraiso", "business stays the building");
check(plain.get("lead") === "A1042", "lead is unchanged when present");
check(
  plain.get("service") ===
    "Balcony glass cleaning · Gran Paraiso · line 04 · Unit 3204 · $280 first service · Notes: gate",
  "service text is unchanged without a batch"
);
check(plain.get("plan") === plain.get("service"), "plan matches service");
check(plain.get("address") === "Gran Paraiso · Unit 3204", "address stays building and unit");
for (const key of UTM_KEYS) {
  check(!plain.has(key), `no ${key} when the visit has no batch`);
}

const booked = buildResidentialBookQuery({
  start: "2026-11-12T15:00:00.000Z",
  building: "Missoni Baia",
  name: "Alex",
  email: "alex@example.com",
  phone: "3055550199",
  unitLine: "02",
  unit: "1202",
  total: 260,
  glassIntro: false,
  note: "",
  serviceType: "glass",
  leadId: null,
  utm: gran,
});
check(booked.get("utm_source") === "quo_sms", "book request sends source");
check(booked.get("utm_medium") === "sms", "book request sends medium");
check(booked.get("utm_campaign") === "newsletter_2026_11", "book request sends campaign");
check(booked.get("utm_content") === "gran_paraiso", "book request sends the batch");
check(!booked.has("utm_term"), "absent term is omitted");
check(!booked.has("lead"), "absent lead stays absent");
check(booked.get("business") === "Missoni Baia", "building switch does not change the batch params");
const service = booked.get("service") || "";
check(
  service.startsWith("Balcony glass cleaning · Missoni Baia · line 02 · Unit 1202 · $260 · "),
  "price and building stay in front of the batch note"
);
check(service.includes("utm_source quo_sms"), "service note includes source");
check(service.includes("utm_medium sms"), "service note includes medium");
check(service.includes("utm_campaign newsletter_2026_11"), "service note includes campaign");
check(service.includes("utm_content gran_paraiso"), "service note includes the batch");
check(!service.includes("@"), "service note has no email");
check(!service.includes("3055550199"), "service note has no phone");
check(!service.includes("—"), "service note has no em dash");
check(!service.includes(" - "), "service note has no spaced hyphen");
check(booked.get("plan") === service, "plan carries the same batch note");

const identity = buildResidentialBookQuery({
  start: "2026-11-12T15:00:00.000Z",
  building: "Paraiso Bay",
  name: "Alex",
  email: "alex@example.com",
  phone: "3055550199",
  unitLine: "",
  unit: "10",
  total: null,
  glassIntro: false,
  note: "",
  serviceType: "glass",
  leadId: null,
  utm: { utm_source: "quo_sms", utm_content: "Alex", utm_campaign: "newsletter_2026_11" },
});
check(identity.get("utm_content") == null, "name is not sent as the batch");
check(identity.get("utm_source") === "quo_sms", "source still sends when content matched a name");
check(!(identity.get("service") || "").includes("utm_content"), "name is not written into the service note");
check((identity.get("service") || "").includes("utm_campaign newsletter_2026_11"), "campaign still reaches the note");

const calendar = new URLSearchParams();
applyUtmToParams(calendar, noBuilding);
check(calendar.get("utm_content") === "no_building_d1", "calendar link can carry the batch");
check(!calendar.has("utm_term"), "calendar link omits an empty term");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("batch utm guard passed");
