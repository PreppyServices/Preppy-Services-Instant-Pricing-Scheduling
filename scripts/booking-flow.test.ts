import { readFileSync } from "node:fs";
import { pricing } from "../data/buildings.ts";
import { createAvailability } from "../lib/booking/availability.ts";
import { bookAppointment, bookingIdempotencyKey, type BookSuccess, type JobDraft } from "../lib/booking/bookService.ts";
import { needsUnit } from "../lib/booking/contact.ts";
import { readFeatureFlags, schedulerWritesEnabled } from "../lib/booking/flags.ts";
import { COPY, durationLabel, featureLines } from "../lib/booking/i18n.ts";
import { initialBuilding, readLaunch } from "../lib/booking/launch.ts";
import { quoteGlass } from "../lib/booking/quote.ts";
import { submitRequest } from "../lib/booking/requestService.ts";
import {
  applyPriceFloor,
  bestStarts,
  buildOpenDays,
  busyFromOpenSlots,
  busyFromVisits,
  chargedLinePrice,
  classifyEvents,
  commercialOpenDates,
  durationMinFor,
  mergeBusy,
  openStartsForDate,
} from "../lib/booking/rules.ts";
import { earliestStart, zonedToUtc } from "../lib/booking/time.ts";
import { signSlot, verifySlot } from "../lib/booking/token.ts";

const failures: string[] = [];
function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const secret = "test-secret";
const fridayNoon = new Date("2026-11-13T17:00:00.000Z");
const friday1241 = new Date("2026-11-13T17:41:00.000Z");

check(zonedToUtc(2026, 11, 13, 15, 30).toISOString() === "2026-11-13T20:30:00.000Z", "ET winter offset");
check(zonedToUtc(2026, 11, 14, 8, 0).toISOString() === "2026-11-14T13:00:00.000Z", "Saturday 8:00 ET");
check(zonedToUtc(2026, 3, 8, 8, 0).toISOString() === "2026-03-08T12:00:00.000Z", "ET summer offset");

check(earliestStart(friday1241).toISOString() === "2026-11-13T20:30:00.000Z", "2.5h rounds up to 3:30 PM ET");
check(earliestStart(new Date("2026-11-13T19:00:00.000Z")).toISOString() === "2026-11-13T21:30:00.000Z", "exact half hour stays");
check(earliestStart(new Date("2026-11-13T19:01:00.000Z")).toISOString() === "2026-11-13T22:00:00.000Z", "one minute past rounds to 5:00 PM ET");

const sameDay = openStartsForDate("2026-11-13", friday1241, 60, [], new Set());
check(sameDay.length > 0 && sameDay[0].toISOString() === "2026-11-13T20:30:00.000Z", "same day starts at the rounded time");
check(sameDay.every((start) => start.getTime() >= earliestStart(friday1241).getTime()), "no start before the same day rule");

const window = buildOpenDays({ now: fridayNoon, durationMin: 60, busy: [] });
const windowDates = window.map((day) => day.date);
check(!windowDates.includes("2026-11-15"), "Sunday is hidden");
check(!windowDates.includes("2026-11-26"), "Thanksgiving is hidden");
check(windowDates.includes("2026-11-14"), "Saturday stays open");
check(commercialOpenDates(fridayNoon).every((date) => date !== "2026-11-15" && date !== "2026-11-26" && date >= "2026-11-13"), "commercial calendar hides Sunday, holiday, and past days");
check(!commercialOpenDates(new Date("2026-12-20T15:00:00.000Z")).includes("2026-12-25"), "Christmas is hidden");
check(!commercialOpenDates(new Date("2026-12-28T15:00:00.000Z")).includes("2027-01-01"), "New Year is hidden");

check(durationMinFor(150, "Elsewhere", "01", false) === 60, "$150 is 60 min");
check(durationMinFor(350, "Elsewhere", "01", false) === 120, "$350 is 120 min");
check(durationMinFor(351, "Elsewhere", "01", false) === 180, "$351 is 180 min");
check(durationMinFor(200, "Gran Paraiso", "01", false) === 180, "Gran Paraiso 01 is 180 min");
check(durationMinFor(200, "Gran Paraiso", "07", false) === 180, "Gran Paraiso 07 is 180 min");
check(durationMinFor(200, "Gran Paraiso", "02", false) === 120, "Gran Paraiso 02 stays 120 min");
check(durationMinFor(200, "Gran Paraiso", "02", true) === 180, "interior adds 60 min");
check(durationLabel("en", 60) === "About 1 hour", "one hour copy");
check(durationLabel("en", 120) === "About 2 hours", "two hour copy");
check(durationLabel("en", 180) === "About 3 hours", "three hour copy");

const low = applyPriceFloor(100, false);
const lowIntro = applyPriceFloor(100, true);
check(low.regular === 150 && low.charged === 150, "regular floor is $150");
check(lowIntro.charged === 120, "first service floor is $120");
check(applyPriceFloor(550, true).charged === 440, "a real line keeps 20% off");
check(chargedLinePrice(100, true, true) >= 120, "promo cannot pass the first service floor");
check(chargedLinePrice(100, false, true) >= 150, "promo cannot pass the regular floor");

const catalogBefore = pricing["Gran Paraiso"].lines["01"];
const gran = quoteGlass("Gran Paraiso", "01", false, false);
check(gran?.total === 450 && gran.durationMin === 180, "Gran Paraiso 01 quote");
check(pricing["Gran Paraiso"].lines["01"] === catalogBefore && catalogBefore === 450, "price table was not rewritten");
const line04 = quoteGlass("Gran Paraiso", "04", true, true);
check(line04?.regularLine === 210 && line04.chargedLine === 168 && line04.durationMin === 180, "line 04 intro interior duration");

check(initialBuilding("") === "", "cold visit has no building");
check(initialBuilding("") !== "1000 Museum", "1000 Museum is not the default");
const sorted = Object.keys(pricing).sort((a, b) => a.localeCompare(b));
check(initialBuilding("") !== sorted[0], "no catalog fallback building");
const deep = readLaunch("?b=Gran%20Paraiso&unit=2304&name=Maria&book=1", "/");
check(deep.building === "Gran Paraiso" && deep.line === "04" && deep.unit === "2304" && deep.name === "Maria", "deep link maps unit 2304");
check(!needsUnit("2304") && needsUnit("04"), "a full unit is not asked again");
check(readLaunch("?b=1000%20Museum", "/").building === "1000 Museum", "1000 Museum still resolves when asked");

const ten = zonedToUtc(2026, 11, 17, 10, 0);
const noon = zonedToUtc(2026, 11, 17, 12, 0);
const one = zonedToUtc(2026, 11, 17, 13, 0);
const two = zonedToUtc(2026, 11, 17, 14, 0);
const monday = new Date("2026-11-16T17:00:00.000Z");
const googleBusy = [{ startMs: ten.getTime(), endMs: noon.getTime() }];
const jobberBusy = busyFromVisits([{ startAt: one.toISOString(), endAt: two.toISOString() }], earliestStart(monday));
const merged = mergeBusy(googleBusy, jobberBusy.busy);
const tuesday = openStartsForDate("2026-11-17", monday, 60, merged, new Set()).map((start) => start.toISOString());
check(!tuesday.includes(ten.toISOString()), "Google busy removes 10:00");
check(!tuesday.includes(zonedToUtc(2026, 11, 17, 12, 0).toISOString()), "Jobber visit removes 12:00");
check(tuesday.includes(zonedToUtc(2026, 11, 17, 8, 0).toISOString()), "8:00 stays open");
check(tuesday.includes(two.toISOString()), "a job can start when the previous visit ends");

const anytime = busyFromVisits([{ anytime: true }], earliestStart(monday));
check(anytime.busy.length === 1 && anytime.busy[0].endMs - anytime.busy[0].startMs === 2 * 60 * 60 * 1000, "anytime visit blocks 2 hours");

const closed = classifyEvents([
  {
    title: "BLOCKED",
    allDay: true,
    blocked: true,
    start: "2026-11-19T05:00:00.000Z",
    end: "2026-11-20T05:00:00.000Z",
  },
  { title: "HOLD", start: ten.toISOString(), end: noon.toISOString() },
]);
check(closed.closed.includes("2026-11-19"), "all day BLOCKED closes the day");
check(!buildOpenDays({ now: monday, durationMin: 60, busy: [], extraClosed: closed.closed }).some((day) => day.date === "2026-11-19"), "closed day is hidden");
const holdBusy = openStartsForDate("2026-11-17", monday, 60, closed.busy, new Set());
check(!holdBusy.some((start) => start.toISOString() === ten.toISOString()), "HOLD blocks that hour");

const gap = busyFromOpenSlots([zonedToUtc(2026, 11, 17, 8, 0).toISOString()], ["2026-11-17"]);
check(gap.some((block) => block.startMs === ten.getTime()), "a missing Google hour is busy");

const offer = createAvailability({
  building: "Gran Paraiso",
  line: "04",
  interior: false,
  intro: false,
  kind: "residential",
  now: fridayNoon,
  busy: [],
  secret,
});
check(offer.ok === true && offer.kind === "residential" && offer.total === 210 && offer.durationMin === 120, "server prices the line");
if (offer.ok && offer.kind === "residential") {
  check(offer.days.length > 0 && offer.days.length <= 3, "first screen is the next 3 open days");
  check(offer.days.every((day) => day.slots.length >= 1 && day.slots.length <= 4), "each day shows at most 4 times");
  check(!offer.days.some((day) => day.date === "2026-11-15" || day.date === "2026-11-26"), "offered days skip Sunday and the holiday");
  check(bestStarts([1, 2, 3, 4, 5, 6]).length === 4, "best starts stay short");
  const token = offer.days[0].slots[0].token;
  const claims = verifySlot(token, secret);
  check(claims?.price === 210 && claims.durationMin === 120, "token carries the server price");
  check(verifySlot(`${token.slice(0, -1)}x`, secret) === null, "tampered token fails");
  const bad = signSlot({ ...claims!, price: 1 }, secret);
  let holds = 0;
  let jobs = 0;
  const seen: JobDraft[] = [];
  const baseDeps = {
    secret,
    writesEnabled: false,
    loadOffer: async () => ({ days: offer.days, more: offer.more, openStarts: offer.openStarts }),
    placeHold: async () => {
      holds += 1;
      return { id: "hold-1" };
    },
    deleteHold: async () => {
      holds -= 1;
    },
    renameHold: async () => {},
    createJob: async (draft: JobDraft) => {
      jobs += 1;
      seen.push(draft);
      return { id: "job-1", url: "https://secure.getjobber.com/jobs/job-1" };
    },
    alertJoe: async () => {},
    recall: async () => null,
    remember: async () => {},
  };
  const preview = await bookAppointment(
    { slotToken: token, name: "Maria", phone: "(305) 555 0199", email: "maria@example.com", unit: "2304", price: 1 },
    baseDeps
  );
  check(preview.ok === true && preview.preview === true && holds === 0 && jobs === 0, "preview writes nothing");
  const rejected = await bookAppointment(
    { slotToken: bad, name: "Maria", phone: "3055550199", email: "maria@example.com", unit: "2304" },
    { ...baseDeps, writesEnabled: true }
  );
  check(rejected.ok === false && rejected.reason === "invalid" && jobs === 0, "client price cannot replace the token");

  const store = new Map<string, BookSuccess>();
  let deleted = 0;
  let alerts = 0;
  const live = {
    ...baseDeps,
    writesEnabled: true,
    placeHold: async () => ({ id: "hold-1" }),
    deleteHold: async () => {
      deleted += 1;
    },
    createJob: async () => {
      throw new Error("jobber down");
    },
    alertJoe: async () => {
      alerts += 1;
    },
    recall: async (key: string) => store.get(key) ?? null,
    remember: async (key: string, result: BookSuccess) => {
      store.set(key, result);
    },
  };
  const rolled = await bookAppointment(
    { slotToken: token, name: "Maria", phone: "3055550199", email: "maria@example.com", unit: "2304" },
    live
  );
  check(rolled.ok === false && rolled.reason === "failed" && deleted === 1 && alerts === 1, "Jobber failure deletes the hold and alerts Joe");

  let renamed = 0;
  deleted = 0;
  const stood = await bookAppointment(
    { slotToken: token, name: "Maria", phone: "3055550199", email: "maria@example.com", unit: "2304" },
    {
      ...live,
      createJob: async (draft: JobDraft) => {
        jobs += 1;
        seen.push(draft);
        return { id: "job-2", url: "https://secure.getjobber.com/jobs/job-2" };
      },
      renameHold: async () => {
        renamed += 1;
        throw new Error("rename");
      },
      deleteHold: async () => {
        deleted += 1;
      },
    }
  );
  check(stood.ok === true && deleted === 0 && renamed === 1, "a failed rename leaves the booking");
  check(seen[0]?.notifyTeam === false && seen[0].allowReviewRequest === false, "team and review notices stay off");
  check(seen[0]?.lineItems[0].name === "Balcony glass detailing" && seen[0].price === 210, "line item uses the server price");
  check(seen[0]?.title.startsWith("Balcony glass · Gran Paraiso"), "job title");

  const key = bookingIdempotencyKey("(305) 555 0199", claims!.start);
  check(key === bookingIdempotencyKey("3055550199", claims!.start), "idempotency key uses the phone digits");
  const again = await bookAppointment(
    { slotToken: token, name: "Maria", phone: "3055550199", email: "maria@example.com", unit: "2304" },
    {
      ...live,
      createJob: async () => {
        jobs += 1;
        return { id: "job-3", url: "https://secure.getjobber.com/jobs/job-3" };
      },
      renameHold: async () => {},
    }
  );
  check(again.ok === true && jobs === 1, "the same phone and start does not create a second job");
}

const flags = readFeatureFlags({});
const lines = featureLines(flags, "en");
check(!flags.packages && !flags.gift && !flags.holidayPromo && !flags.deposit, "feature flags default off");
check(lines.packages === null && lines.gift === null && lines.holiday === null && lines.showNoCharge, "off flags render nothing");
check(schedulerWritesEnabled({}) === false, "writes default off");
check(schedulerWritesEnabled({ SCHEDULER_WRITES_ENABLED: "true" }) === false, "writes stay off without secrets");

let requests = 0;
const previewRequest = await submitRequest(
  {
    kind: "pressure",
    building: "Gran Paraiso",
    name: "Maria",
    phone: "3055550199",
    email: "maria@example.com",
    details: "The north balcony rail and the pool deck.",
    photos: [{ name: "rail.jpg" }],
  },
  { writesEnabled: false, createRequest: async () => { requests += 1; return { id: "r" }; } }
);
check(previewRequest.ok === true && previewRequest.preview === true && requests === 0, "quote requests do not write while the flag is off");
const sunday = await submitRequest(
  { kind: "commercial", building: "Shop", name: "Maria", phone: "3055550199", email: "maria@example.com", preferredDate: "2026-11-15" },
  { writesEnabled: true, openDays: ["2026-11-16"], createRequest: async () => { requests += 1; return { id: "r" }; } }
);
check(sunday.ok === false && requests === 0, "a closed commercial day is rejected");

const banned = /[-–—]/;
for (const lang of ["en", "es", "fr"] as const) {
  for (const [key, value] of Object.entries(COPY[lang])) {
    check(!banned.test(value), `${lang} ${key} has a dash`);
  }
}
const widget = readFileSync(new URL("../components/PreppyLuxuryWidget.tsx", import.meta.url), "utf8");
const booking = readFileSync(new URL("../components/booking/BookingApp.tsx", import.meta.url), "utf8");
const legacy = readFileSync(new URL("../PreppyLuxuryWidget_FINAL.tsx", import.meta.url), "utf8");
check(!widget.includes("calendar.app.google") && !booking.includes("calendar.app.google") && !legacy.includes("calendar.app.google"), "dead Google appointment links are gone");
check(!booking.includes("1000 Museum"), "the booking screen does not name a default building");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("booking flow checks passed");
