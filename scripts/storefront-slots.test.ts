/**
 * Storefront mornings: Sunday is out, under 24 hours is out,
 * Thanksgiving 2026-11-26 is out, and only 8, 9, 10, and 11 AM ET start.
 */
import {
  STOREFRONT_EXCLUDED_DATES,
  etWallTimeToUtc,
  isBookableSlot,
  isStorefrontSlot,
  listStorefrontSlots,
} from "../lib/slotRules.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const HOUR = 60 * 60 * 1000;
const farBefore = (startMs: number) => startMs - 48 * HOUR;

check(
  STOREFRONT_EXCLUDED_DATES.join(",") === "2026-11-26,2026-12-25,2027-01-01",
  "holiday list is Thanksgiving, Christmas, and New Year"
);

const sunday8 = Date.parse("2026-11-29T13:00:00.000Z");
check(
  !isStorefrontSlot(new Date(sunday8).toISOString(), farBefore(sunday8)),
  "Sunday 8:00 AM ET is rejected"
);

const monday8 = Date.parse("2026-11-30T13:00:00.000Z");
check(
  !isStorefrontSlot(new Date(monday8).toISOString(), monday8 - 23 * HOUR - 59 * 60 * 1000),
  "Monday 8:00 AM ET under 24 hours is rejected"
);
check(
  isStorefrontSlot(new Date(monday8).toISOString(), monday8 - 24 * HOUR - 60 * 1000),
  "Monday 8:00 AM ET just over 24 hours is accepted"
);

const thanksgiving8 = Date.parse("2026-11-26T13:00:00.000Z");
check(
  isBookableSlot(new Date(thanksgiving8).toISOString(), farBefore(thanksgiving8)),
  "Thanksgiving morning still passes the residential rule"
);
check(
  !isStorefrontSlot(new Date(thanksgiving8).toISOString(), farBefore(thanksgiving8)),
  "Thursday Nov 26 2026 is excluded"
);

for (const ymd of ["2026-12-25", "2027-01-01"]) {
  const utc = etWallTimeToUtc(ymd, 9, 0);
  check(utc != null, `${ymd} 9:00 AM ET converts`);
  if (utc == null) continue;
  check(
    !isStorefrontSlot(new Date(utc).toISOString(), farBefore(utc)),
    `${ymd} is excluded`
  );
}

const hours: Array<[number, string, boolean]> = [
  [7, "2026-11-30T12:00:00.000Z", false],
  [8, "2026-11-30T13:00:00.000Z", true],
  [9, "2026-11-30T14:00:00.000Z", true],
  [10, "2026-11-30T15:00:00.000Z", true],
  [11, "2026-11-30T16:00:00.000Z", true],
  [12, "2026-11-30T17:00:00.000Z", false],
];
for (const [hour, iso, accepted] of hours) {
  check(
    isStorefrontSlot(iso, farBefore(Date.parse(iso))) === accepted,
    `Monday ${hour}:00 ET accepted=${accepted}`
  );
}

const elevenOhOne = Date.parse("2026-11-30T16:01:00.000Z");
check(
  !isStorefrontSlot(new Date(elevenOhOne).toISOString(), farBefore(elevenOhOne)),
  "11:01 AM ET is rejected"
);

const monday4 = Date.parse("2026-11-30T21:00:00.000Z");
check(
  isBookableSlot(new Date(monday4).toISOString(), farBefore(monday4)),
  "Monday 4:00 PM ET stays bookable for residential"
);
check(
  !isStorefrontSlot(new Date(monday4).toISOString(), farBefore(monday4)),
  "Monday 4:00 PM ET is not a storefront start"
);

check(etWallTimeToUtc("2026-11-30", 8) === Date.parse("2026-11-30T13:00:00.000Z"), "November 8:00 AM is EST");
check(etWallTimeToUtc("2026-07-15", 8) === Date.parse("2026-07-15T12:00:00.000Z"), "July 8:00 AM is EDT");

const now = Date.parse("2026-11-22T18:47:00.000Z");
const listed = listStorefrontSlots(now);
check(listed.length > 0, "the next 14 days include a morning");
check(listed[0]?.start === "2026-11-24T13:00:00.000Z", "first open morning is Tue Nov 24 8:00 AM ET");
check(
  listed.every((slot) => isStorefrontSlot(slot.start, now)),
  "listed slots pass the storefront rule"
);
check(
  listed.every((slot) => [8, 9, 10, 11].includes(new Date(slot.start).getUTCHours() - 5)),
  "listed hours are 8 through 11 AM ET"
);
check(
  !listed.some((slot) => slot.start.startsWith("2026-11-26")),
  "Thanksgiving is not listed"
);
check(
  !listed.some((slot) => slot.start.startsWith("2026-11-29")),
  "Sunday Nov 29 is not listed"
);
check(
  !listed.some((slot) => slot.start.startsWith("2026-11-23T1")),
  "Monday Nov 23 mornings are under 24 hours"
);
check(
  listed.every((slot) => !/[\u002D\u2013\u2014]/.test(slot.day) && !/[\u002D\u2013\u2014]/.test(slot.time)),
  "slot labels have no hyphen or dash"
);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("storefront slot guard passed");
