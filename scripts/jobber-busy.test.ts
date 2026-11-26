/**
 * Jobber iCalendar busy blocks.
 * Parsing keeps only start and end. Overlap uses a 3 hour window and a 30 minute buffer.
 * The busy route fails closed to an empty list, and the pickers fail open when that call fails.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadJobberBusy } from "../lib/jobberBusyClient.ts";
import {
  allowedJobberIcsUrl,
  handleAvailabilityBusy,
  JOBBER_BUSY_WARN,
  JOBBER_ICS_TIMEOUT_MS,
  type BusyFetch,
} from "../lib/jobberBusyFeed.ts";
import {
  BOOKING_WINDOW_MIN,
  BUSY_BUFFER_MIN,
  busyInHorizon,
  JOBBER_BUSY_HORIZON_MS,
  parseIcsBusy,
  readBusyResponse,
  removeBusySlots,
} from "../lib/jobberBusy.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

function calendar(body: string): string {
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR\r\n`;
}

function event(lines: string[]): string {
  return calendar(["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n"));
}

const PRIVATE = [
  "Jordan Hale",
  "Casey Nguyen",
  "Avery Quinn",
  "Riley Chen",
  "Morgan Lee",
  "Parker Diaz",
  "100 Test Street",
  "200 Fake Ave",
  "fake-utc-1",
  "fake-tz-1",
  "fake-all-day",
  "fake-cancelled",
  "fake-transparent",
  "fake-folded",
  "https://example.test/jordan",
  "lobby visit",
  "Cancelled Riley",
  "Transparent Morgan",
];

function leaks(text: string, label: string) {
  for (const secret of PRIVATE) {
    check(!text.includes(secret), `${label} contains ${JSON.stringify(secret)}`);
  }
}

function onlyStartEnd(blocks: { start: string; end: string }[], label: string) {
  for (const block of blocks) {
    check(
      JSON.stringify(Object.keys(block)) === JSON.stringify(["start", "end"]),
      `${label} block keys are ${JSON.stringify(Object.keys(block))}`
    );
  }
}

check(BOOKING_WINDOW_MIN === 180, "booking window is 180 minutes");
check(BUSY_BUFFER_MIN === 30, "busy buffer is 30 minutes");
check(JOBBER_BUSY_HORIZON_MS === 21 * 24 * 60 * 60 * 1000, "busy horizon is 21 days");
check(JOBBER_ICS_TIMEOUT_MS === 3000, "feed timeout is 3 seconds");
check(JOBBER_BUSY_WARN === "jobber busy feed unavailable", "warn line is fixed");
check(!JOBBER_BUSY_WARN.includes("http"), "warn line has no URL");
check(!JOBBER_BUSY_WARN.toLowerCase().includes("getjobber"), "warn line has no host");

const utc = parseIcsBusy(
  event(["DTSTART:20261124T140000Z", "DTEND:20261124T170000Z", "SUMMARY:Jordan Hale"])
);
check(
  JSON.stringify(utc) ===
    JSON.stringify([{ start: "2026-11-24T14:00:00.000Z", end: "2026-11-24T17:00:00.000Z" }]),
  "UTC Z start and end parse to ISO"
);
leaks(JSON.stringify(utc), "UTC parse");

const quotedTz = parseIcsBusy(
  event([
    'DTSTART;TZID="America/New_York":20261124T090000',
    'DTEND;TZID="America/New_York":20261124T120000',
  ])
);
check(
  JSON.stringify(quotedTz) ===
    JSON.stringify([{ start: "2026-11-24T14:00:00.000Z", end: "2026-11-24T17:00:00.000Z" }]),
  "quoted America/New_York 9:00 to 12:00 is 14:00Z to 17:00Z"
);

const julyDay = parseIcsBusy(
  event(["DTSTART;VALUE=DATE:20260704", "DTEND;VALUE=DATE:20260705", "SUMMARY:Avery Quinn"])
);
check(
  JSON.stringify(julyDay) ===
    JSON.stringify([{ start: "2026-07-04T04:00:00.000Z", end: "2026-07-05T04:00:00.000Z" }]),
  "a July all day value is the whole EDT day"
);

const marchDay = parseIcsBusy(event(["DTSTART;VALUE=DATE:20260308", "DTEND;VALUE=DATE:20260309"]));
check(
  JSON.stringify(marchDay) ===
    JSON.stringify([{ start: "2026-03-08T05:00:00.000Z", end: "2026-03-09T04:00:00.000Z" }]),
  "March 8 all day crosses the spring forward midnight"
);

const novemberDay = parseIcsBusy(event(["DTSTART;VALUE=DATE:20261101", "DTEND;VALUE=DATE:20261102"]));
check(
  JSON.stringify(novemberDay) ===
    JSON.stringify([{ start: "2026-11-01T04:00:00.000Z", end: "2026-11-02T05:00:00.000Z" }]),
  "November 1 all day crosses the fall back midnight"
);

const openAllDay = parseIcsBusy(event(["DTSTART;VALUE=DATE:20261124"]));
check(
  JSON.stringify(openAllDay) ===
    JSON.stringify([{ start: "2026-11-24T05:00:00.000Z", end: "2026-11-25T05:00:00.000Z" }]),
  "an all day start without DTEND lasts one ET day"
);

const foldedStart = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "DTSTART:20261128T1500",
  " 00Z",
  "DTEND:20261128T160000Z",
  "SUMMARY:Parker Diaz",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");
check(foldedStart.includes("\r\n "), "folded sample uses CRLF and a space");
const folded = parseIcsBusy(foldedStart);
check(
  JSON.stringify(folded) ===
    JSON.stringify([{ start: "2026-11-28T15:00:00.000Z", end: "2026-11-28T16:00:00.000Z" }]),
  "a folded UTC start is unfolded before parsing"
);
leaks(JSON.stringify(folded), "folded parse");

const tabFolded = "BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261128T180000Z\nDTEND:20261128T1900\n\t00Z\nEND:VEVENT\nEND:VCALENDAR\n";
const tabParsed = parseIcsBusy(tabFolded);
check(
  JSON.stringify(tabParsed) ===
    JSON.stringify([{ start: "2026-11-28T18:00:00.000Z", end: "2026-11-28T19:00:00.000Z" }]),
  "a tab folded line is unfolded"
);

check(
  parseIcsBusy(event(["DTSTART:20261124T090000", "DTEND:20261124T120000"])).length === 0,
  "a floating local time is skipped"
);
check(
  parseIcsBusy(
    event([
      "DTSTART;TZID=America/Chicago:20261124T090000",
      "DTEND;TZID=America/Chicago:20261124T120000",
    ])
  ).length === 0,
  "a timezone other than America/New_York is skipped"
);
check(
  parseIcsBusy(
    event(["DTSTART:20261124T140000Z", "DTEND:20261124T170000Z", "status:cancelled", "SUMMARY:Riley Chen"])
  ).length === 0,
  "a lowercase cancelled event is skipped"
);
check(
  parseIcsBusy(event(["DTSTART:20261124T140000Z", "SUMMARY:Casey Nguyen"])).length === 0,
  "a timed event without DTEND is skipped"
);
check(parseIcsBusy("not a calendar").length === 0, "text that is not a calendar has no blocks");

const fixturePath = join(process.cwd(), "scripts/fixtures/jobber-busy.ics");
const fixture = readFileSync(fixturePath, "utf8");
check(fixture.includes("\r\n"), "fixture uses CRLF");
check(fixture.includes("\n Parker Diaz"), "fixture folds a fake name");
const fixtureBlocks = parseIcsBusy(fixture);
onlyStartEnd(fixtureBlocks, "fixture");
leaks(JSON.stringify(fixtureBlocks), "fixture parse");
check(
  JSON.stringify(fixtureBlocks) ===
    JSON.stringify([
      { start: "2026-11-24T14:00:00.000Z", end: "2026-11-24T17:00:00.000Z" },
      { start: "2026-11-25T14:00:00.000Z", end: "2026-11-25T16:00:00.000Z" },
      { start: "2026-11-26T05:00:00.000Z", end: "2026-11-27T05:00:00.000Z" },
      { start: "2026-11-27T15:00:00.000Z", end: "2026-11-27T16:00:00.000Z" },
    ]),
  "fixture keeps the UTC visit, the ET visit once, the all day visit, and the folded visit"
);
check(
  !fixtureBlocks.some((block) => block.start.startsWith("1970")),
  "a timezone definition is not a visit"
);

const visit = [{ start: "2026-11-24T15:00:00.000Z", end: "2026-11-24T16:00:00.000Z" }];

function keptStarts(start: string, windowMin: number, bufferMin: number): string[] {
  return removeBusySlots([{ start, label: start }], visit, windowMin, bufferMin).map((slot) => slot.start);
}

check(keptStarts("2026-11-24T12:00:00.000Z", 180, 0).length === 1, "a slot that ends when the visit starts is free");
check(keptStarts("2026-11-24T12:00:00.001Z", 180, 0).length === 0, "a slot that crosses the visit start is taken");
check(keptStarts("2026-11-24T16:00:00.000Z", 180, 0).length === 1, "a slot that starts when the visit ends is free");
check(keptStarts("2026-11-24T15:59:00.000Z", 180, 0).length === 0, "a slot that starts before the visit ends is taken");
check(keptStarts("2026-11-24T11:30:00.000Z", 180, 30).length === 1, "a slot that only touches the buffered visit is free");
check(keptStarts("2026-11-24T11:30:00.001Z", 180, 30).length === 0, "the buffer before the visit takes the slot");
check(keptStarts("2026-11-24T16:30:00.000Z", 180, 30).length === 1, "a slot that starts when the buffer ends is free");
check(keptStarts("2026-11-24T16:29:00.000Z", 180, 30).length === 0, "the buffer after the visit takes the slot");

const labeled = [
  { start: "2026-11-24T11:30:00.000Z", label: "keep me" },
  { start: "2026-11-24T15:00:00.000Z", label: "drop me" },
];
const filtered = removeBusySlots(labeled, visit, BOOKING_WINDOW_MIN, BUSY_BUFFER_MIN);
check(filtered.length === 1 && filtered[0] === labeled[0], "a free slot keeps its original object");
check(
  removeBusySlots([{ start: "nope", label: "x" }], visit, BOOKING_WINDOW_MIN, BUSY_BUFFER_MIN).length === 1,
  "an unreadable slot is kept"
);
check(
  removeBusySlots([{ start: "2026-11-24T12:00:00.000Z" }], [{ start: "nope", end: "nope" }], 180, 30).length ===
    1,
  "an unreadable busy block is ignored"
);

const allDay = [{ start: "2026-11-26T05:00:00.000Z", end: "2026-11-27T05:00:00.000Z" }];
const during = { start: "2026-11-26T13:00:00.000Z", label: "Thu 8:00 AM" };
const after = { start: "2026-11-27T13:00:00.000Z", label: "Fri 8:00 AM" };
const aroundDay = removeBusySlots([during, after], allDay, BOOKING_WINDOW_MIN, BUSY_BUFFER_MIN);
check(aroundDay.length === 1 && aroundDay[0] === after, "an all day visit hides that morning only");

const nowMs = Date.parse("2026-11-22T18:00:00.000Z");
const horizonIcs = event([
  "DTSTART:20261121T120000Z",
  "DTEND:20261122T180000Z",
  "DTSTART:20261122T170000Z",
  "DTEND:20261122T190000Z",
]);
check(parseIcsBusy(horizonIcs).length === 1, "a second DTSTART replaces the first inside one event");
const horizonFeed = [
  event(["DTSTART:20261121T120000Z", "DTEND:20261122T180000Z", "SUMMARY:Riley Chen"]),
  event(["DTSTART:20261122T170000Z", "DTEND:20261122T190000Z"]),
  event(["DTSTART:20261213T180000Z", "DTEND:20261213T190000Z"]),
  event(["DTSTART:20261213T170000Z", "DTEND:20261213T190000Z", "SUMMARY:Parker Diaz"]),
].join("\r\n");
const horizonBlocks = busyInHorizon(parseIcsBusy(horizonFeed), nowMs);
check(
  JSON.stringify(horizonBlocks) ===
    JSON.stringify([
      { start: "2026-11-22T17:00:00.000Z", end: "2026-11-22T19:00:00.000Z" },
      { start: "2026-12-13T17:00:00.000Z", end: "2026-12-13T19:00:00.000Z" },
    ]),
  "only blocks that overlap now through 21 days are kept"
);
leaks(JSON.stringify(horizonBlocks), "horizon blocks");

check(readBusyResponse(null) === null, "a missing busy payload fails open");
check(readBusyResponse({ ok: false, busy: [] }) === null, "ok false fails open");
check(JSON.stringify(readBusyResponse({ ok: true, busy: [] })) === "[]", "an empty busy list is a success");
const stripped = readBusyResponse({
  ok: true,
  busy: [{ start: "2026-11-24T14:00:00.000Z", end: "2026-11-24T17:00:00.000Z", summary: "Jordan Hale" }],
});
check(
  JSON.stringify(stripped) ===
    JSON.stringify([{ start: "2026-11-24T14:00:00.000Z", end: "2026-11-24T17:00:00.000Z" }]),
  "a busy payload drops every field except start and end"
);
leaks(JSON.stringify(stripped), "stripped busy payload");

const FEED_URL = "https://secure.getjobber.com/calendar/fake.ics?token=fixture-token-value";

check(allowedJobberIcsUrl(FEED_URL)?.href === FEED_URL, "a secure Jobber feed URL is allowed with its query");
check(allowedJobberIcsUrl("https://calendar.getjobber.com/b.ics") !== null, "calendar.getjobber.com is allowed");
check(allowedJobberIcsUrl("http://secure.getjobber.com/a.ics") === null, "http is rejected");
check(allowedJobberIcsUrl("https://getjobber.com/a.ics") === null, "the bare host is rejected");
check(allowedJobberIcsUrl("https://secure.getjobber.com.evil.example/a.ics") === null, "a suffix trick is rejected");
check(allowedJobberIcsUrl("https://evil.example/secure.getjobber.com") === null, "a path trick is rejected");
check(allowedJobberIcsUrl("https://notgetjobber.com/a.ics") === null, "a lookalike host is rejected");
check(allowedJobberIcsUrl("https://user:secret@secure.getjobber.com/a.ics") === null, "userinfo is rejected");
check(allowedJobberIcsUrl("https://secure.getjobber.com:8443/a.ics") === null, "a custom port is rejected");

type Seen = { url: string; redirect: string | null; hasSignal: boolean };

function mockFetch(handler: (url: string, seen: Seen[]) => Response | Promise<Response>): {
  fetch: BusyFetch;
  seen: Seen[];
} {
  const seen: Seen[] = [];
  const fetch: BusyFetch = async (input, init) => {
    const url = String(input);
    seen.push({
      url,
      redirect: typeof init?.redirect === "string" ? init.redirect : null,
      hasSignal: init?.signal instanceof AbortSignal,
    });
    return handler(url, seen);
  };
  return { fetch, seen };
}

async function runFeed(icsUrl: string | undefined, fetchImpl: BusyFetch, timeoutMs?: number) {
  const warnings: string[] = [];
  const response = await handleAvailabilityBusy({
    icsUrl,
    fetch: fetchImpl,
    nowMs,
    warn: (line) => warnings.push(line),
    timeoutMs,
  });
  const body = (await response.json()) as {
    ok: boolean;
    source: string;
    busy: { start: string; end: string }[];
    fetchedAt?: string;
  };
  return { response, body, warnings };
}

const disabled = await runFeed(undefined, mockFetch(() => new Response("no")).fetch);
check(disabled.response.status === 200, "disabled status is 200");
check(
  JSON.stringify(disabled.body) === JSON.stringify({ ok: true, source: "disabled", busy: [] }),
  "an unset URL returns source disabled"
);
check(disabled.response.headers.get("cache-control") === "no-store", "disabled is not cached");
check(disabled.warnings.length === 0, "disabled does not warn");

const blank = await runFeed("   ", mockFetch(() => new Response("no")).fetch);
check(blank.body.source === "disabled", "a blank URL is disabled");

const disabledSeen = mockFetch(() => new Response(fixture));
await runFeed(undefined, disabledSeen.fetch);
check(disabledSeen.seen.length === 0, "disabled does not fetch");

const okFetch = mockFetch((url) => {
  check(url === FEED_URL, "the feed request keeps the query token");
  return new Response(fixture, { status: 200 });
});
const ok = await runFeed(FEED_URL, okFetch.fetch);
check(ok.response.status === 200, "a good feed status is 200");
check(ok.body.ok === true && ok.body.source === "jobber-ics", "a good feed reports jobber-ics");
check(ok.body.fetchedAt === "2026-11-22T18:00:00.000Z", "fetchedAt is the request time");
check(
  ok.response.headers.get("cache-control") === "public, s-maxage=300, stale-while-revalidate=600",
  "a good feed is cached for five minutes"
);
check(JSON.stringify(ok.body.busy) === JSON.stringify(fixtureBlocks), "the route returns the fixture blocks inside 21 days");
onlyStartEnd(ok.body.busy, "route");
check(ok.warnings.length === 0, "a good feed does not warn");
check(okFetch.seen.length === 1 && okFetch.seen[0].redirect === "manual", "redirects are followed manually");
check(okFetch.seen[0].hasSignal, "the feed fetch has a timeout signal");
const okText = JSON.stringify(ok.body);
leaks(okText, "route body");
check(!okText.includes("fixture-token-value"), "the route body has no feed token");
check(!okText.toLowerCase().includes("getjobber"), "the route body has no feed host");

const redirectFetch = mockFetch((url) => {
  if (url === FEED_URL) {
    return new Response(null, {
      status: 302,
      headers: { location: "https://calendar.getjobber.com/b.ics" },
    });
  }
  return new Response(fixture, { status: 200 });
});
const redirected = await runFeed(FEED_URL, redirectFetch.fetch);
check(redirected.body.source === "jobber-ics", "a Jobber redirect is followed");
check(redirectFetch.seen.map((call) => call.url).join(" ") === `${FEED_URL} https://calendar.getjobber.com/b.ics`, "the redirect target is the second request");
leaks(JSON.stringify(redirected.body), "redirect body");

const badRedirect = mockFetch(() => {
  return new Response("Jordan Hale", {
    status: 302,
    headers: { location: "https://evil.example/steal.ics" },
  });
});
const rejectedRedirect = await runFeed(FEED_URL, badRedirect.fetch);
check(rejectedRedirect.body.ok === false && rejectedRedirect.body.source === "error", "a foreign redirect is an error");
check(badRedirect.seen.length === 1, "a foreign redirect is not fetched");
check(rejectedRedirect.warnings.length === 1 && rejectedRedirect.warnings[0] === JOBBER_BUSY_WARN, "a foreign redirect warns once");
check(!rejectedRedirect.warnings[0].includes("evil.example"), "the warn line hides the redirect");
check(!JSON.stringify(rejectedRedirect.body).includes("Jordan Hale"), "an error body does not echo the feed");
check(!JSON.stringify(rejectedRedirect.body).includes("fixture-token-value"), "an error body hides the feed token");

const httpFetch = mockFetch(() => new Response(fixture));
const httpResult = await runFeed("http://secure.getjobber.com/a.ics", httpFetch.fetch);
check(httpResult.body.source === "error" && httpFetch.seen.length === 0, "http is not fetched");

const downFetch = mockFetch(() => new Response("Jordan Hale at 100 Test Street", { status: 500 }));
const down = await runFeed(FEED_URL, downFetch.fetch);
check(
  JSON.stringify(down.body) === JSON.stringify({ ok: false, source: "error", busy: [] }),
  "a failed status returns source error and no blocks"
);
check(down.warnings.length === 1 && down.warnings[0] === JOBBER_BUSY_WARN, "a failed status warns once");
leaks(JSON.stringify(down.body), "status error body");
leaks(down.warnings.join("\n"), "status error warn");

const thrown = mockFetch(() => {
  throw new Error(`boom ${FEED_URL} Jordan Hale`);
});
const blewUp = await runFeed(FEED_URL, thrown.fetch);
check(blewUp.body.source === "error" && blewUp.warnings.length === 1, "a thrown fetch is an error");
check(!blewUp.warnings[0].includes("Jordan") && !blewUp.warnings[0].includes("fixture-token"), "a thrown fetch is not logged");

const htmlFetch = mockFetch(() => new Response("<html>Jordan Hale</html>", { status: 200 }));
const html = await runFeed(FEED_URL, htmlFetch.fetch);
check(html.body.source === "error", "a page that is not a calendar is an error");
leaks(JSON.stringify(html.body), "html error body");

const emptyCal = await runFeed(
  FEED_URL,
  mockFetch(() => new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n")).fetch
);
check(emptyCal.body.ok === true && emptyCal.body.busy.length === 0, "an empty calendar is a successful empty list");

const hanging: BusyFetch = (_input, init) => {
  return new Promise((_resolve, reject) => {
    const signal = init?.signal;
    if (!signal) {
      reject(new Error("missing signal"));
      return;
    }
    // AbortSignal.timeout does not keep the event loop alive by itself.
    const keepAlive = setInterval(() => {}, 20);
    const finish = (err: unknown) => {
      clearInterval(keepAlive);
      reject(err);
    };
    if (signal.aborted) {
      finish(signal.reason);
      return;
    }
    signal.addEventListener("abort", () => finish(signal.reason));
  });
};
const timed = await runFeed(FEED_URL, hanging, 40);
check(timed.body.source === "error" && timed.warnings.length === 1, "a timeout returns source error");
check(!timed.warnings[0].includes("http"), "a timeout warn has no URL");

let clientUrl = "";
const clientOk = await loadJobberBusy("/api/availability/busy", async (input) => {
  clientUrl = String(input);
  return new Response(
    JSON.stringify({
      ok: true,
      busy: [{ start: "2026-11-24T14:00:00.000Z", end: "2026-11-24T17:00:00.000Z", summary: "Jordan Hale" }],
    }),
    { status: 200 }
  );
});
check(clientUrl === "/api/availability/busy", "the picker calls the busy route");
check(
  JSON.stringify(clientOk) ===
    JSON.stringify([{ start: "2026-11-24T14:00:00.000Z", end: "2026-11-24T17:00:00.000Z" }]),
  "the picker keeps start and end only"
);
check(
  (await loadJobberBusy("/api/availability/busy", async () => new Response("no", { status: 500 }))) === null,
  "a busy HTTP error fails open"
);
check(
  (await loadJobberBusy(
    "/api/availability/busy",
    async () => new Response(JSON.stringify({ ok: false, source: "error", busy: [] }), { status: 200 })
  )) === null,
  "source error fails open"
);
check(
  (await loadJobberBusy("/api/availability/busy", async () => {
    throw new Error("offline");
  })) === null,
  "a thrown busy call fails open"
);
check(
  JSON.stringify(
    await loadJobberBusy(
      "/api/availability/busy",
      async () => new Response(JSON.stringify({ ok: true, source: "disabled", busy: [] }), { status: 200 })
    )
  ) === "[]",
  "source disabled keeps every slot"
);

function sliceBetween(text: string, start: string, end: string): string {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  check(from !== -1 && to !== -1, `missing ${start} before ${end}`);
  return text.slice(from, to);
}

const widget = readFileSync(join(process.cwd(), "components/PreppyLuxuryWidget.tsx"), "utf8");
const widgetLoad = sliceBetween(widget, "const loadSlots = React.useCallback", "const openScheduler");
check(widgetLoad.includes('"?mode=availability"'), "the widget still asks Apps Script for availability");
check(widgetLoad.includes('"/api/availability/busy"'), "the widget asks for Jobber busy blocks");
check(widgetLoad.includes("Promise.all"), "the widget loads availability and busy together");
check(widgetLoad.includes("removeBusySlots"), "the widget applies removeBusySlots while loading");
check(
  widgetLoad.includes(": offered"),
  "a failed busy read keeps the Apps Script slots"
);
const visibleAt = widget.indexOf("const visibleSlots = slots.filter((slot) => isBookableSlot(slot.start, Date.now()))");
check(visibleAt !== -1, "the widget still applies the slot rules");
check(widget.indexOf("removeBusySlots") < visibleAt, "busy filtering happens before the slot rules");

const storefront = readFileSync(join(process.cwd(), "components/StorefrontBooking.tsx"), "utf8");
const storefrontLoad = sliceBetween(storefront, "const loadSlots = useCallback", "useEffect");
check(storefrontLoad.includes('"?mode=availability"'), "storefront still asks Apps Script for availability");
check(storefrontLoad.includes("storefrontSlotsFromAvailability"), "storefront still uses the morning filter");
check(!storefront.includes("listStorefrontSlots("), "storefront does not invent local mornings");
check(storefrontLoad.includes('"/api/availability/busy"'), "storefront asks for Jobber busy blocks");
check(
  storefrontLoad.indexOf("storefrontSlotsFromAvailability") < storefrontLoad.indexOf("removeBusySlots"),
  "storefront applies the morning rules and then the busy filter"
);
check(storefrontLoad.includes('read.state === "error"'), "a failed availability read still errors");
check(storefrontLoad.includes(": read.slots"), "a failed busy read keeps the morning list");

const route = readFileSync(join(process.cwd(), "app/api/availability/busy/route.ts"), "utf8");
check(route.includes('export const runtime = "nodejs"'), "the busy route runs on node");
check(route.includes("process.env.JOBBER_ICS_URL"), "the busy route reads the env var");
check(route.includes("handleAvailabilityBusy"), "the busy route uses the tested handler");
check(route.includes("console.warn"), "the busy route warns on failure");
check(!/https?:\/\//.test(route), "the route file has no feed URL");
check(!route.toLowerCase().includes("getjobber"), "the route file has no feed host");

const bookingRoute = readFileSync(join(process.cwd(), "app/api/booking/jobber/route.ts"), "utf8");
check(!bookingRoute.includes("JOBBER_ICS_URL"), "the booking route stays free of the calendar URL");
check(bookingRoute.includes("handleJobberBooking"), "the booking route still delegates to the inert handler");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("jobber busy guard passed");
