/**
 * Residential booking query. A priced booking keeps today's parameter shape.
 * An empty line and an empty price gain a confirmation tail.
 */
import { buildResidentialBookQuery } from "../lib/batchUtm.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const priced = buildResidentialBookQuery({
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

const expected: Record<string, string> = {
  mode: "book",
  type: "residential",
  start: "2026-11-12T15:00:00.000Z",
  business: "Gran Paraiso",
  name: "Alex",
  contact: "Alex",
  email: "alex@example.com",
  phone: "3055550199",
  address: "Gran Paraiso · Unit 3204",
  plan: "Balcony glass cleaning · Gran Paraiso · line 04 · Unit 3204 · $280 first service · Notes: gate",
  service: "Balcony glass cleaning · Gran Paraiso · line 04 · Unit 3204 · $280 first service · Notes: gate",
  signer: "Alex",
  signedType: "typed",
  lead: "A1042",
};

for (const [key, value] of Object.entries(expected)) {
  check(priced.get(key) === value, `${key} stays ${JSON.stringify(value)}`);
}
check(!priced.has("utm_source"), "a priced booking without a batch has no utm param");
check(
  priced.toString() ===
    "mode=book&type=residential&start=2026-11-12T15%3A00%3A00.000Z&business=Gran+Paraiso&name=Alex&contact=Alex&email=alex%40example.com&phone=3055550199&address=Gran+Paraiso+%C2%B7+Unit+3204&plan=Balcony+glass+cleaning+%C2%B7+Gran+Paraiso+%C2%B7+line+04+%C2%B7+Unit+3204+%C2%B7+%24280+first+service+%C2%B7+Notes%3A+gate&service=Balcony+glass+cleaning+%C2%B7+Gran+Paraiso+%C2%B7+line+04+%C2%B7+Unit+3204+%C2%B7+%24280+first+service+%C2%B7+Notes%3A+gate&signer=Alex&signedType=typed&lead=A1042",
  "priced booking query string is unchanged"
);

const unpriced = buildResidentialBookQuery({
  start: "2026-11-12T15:00:00.000Z",
  building: "Gran Paraiso",
  name: "Alex",
  email: "alex@example.com",
  phone: "3055550199",
  unitLine: "",
  unit: "3204",
  total: null,
  glassIntro: false,
  note: "",
  serviceType: "glass",
  leadId: null,
  utm: {},
});
check(
  unpriced.get("service") ===
    "Balcony glass cleaning · Gran Paraiso · Unit 3204 · Line not picked, price to confirm",
  "empty line and price append the confirmation tail"
);
check(unpriced.get("plan") === unpriced.get("service"), "confirmation tail is on plan and service");
check(unpriced.get("mode") === "book", "unpriced booking still uses mode book");

const lineOnly = buildResidentialBookQuery({
  start: "2026-11-12T15:00:00.000Z",
  building: "Gran Paraiso",
  name: "Alex",
  email: "alex@example.com",
  phone: "3055550199",
  unitLine: "04",
  unit: "",
  total: null,
  glassIntro: false,
  note: "",
  serviceType: "glass",
  leadId: null,
  utm: {},
});
check(
  !(lineOnly.get("service") || "").includes("price to confirm"),
  "a picked line does not get the confirmation tail"
);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("book query guard passed");
