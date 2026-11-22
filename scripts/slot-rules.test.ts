/**
 * Appointment slots: no Sundays in America/New_York, at least 24 hours out,
 * and no start after 4:00 PM America/New_York.
 */
import { isBookableSlot, reserveDecision } from "../lib/slotRules.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const HOUR = 60 * 60 * 1000;
const farBefore = (startMs: number) => startMs - 48 * HOUR;

const sunday10 = Date.parse("2026-11-29T15:00:00.000Z");
check(
  !isBookableSlot(new Date(sunday10).toISOString(), farBefore(sunday10)),
  "Sunday 10 AM ET is rejected"
);

const saturday10 = Date.parse("2026-11-28T15:00:00.000Z");
check(
  !isBookableSlot(new Date(saturday10).toISOString(), saturday10 - 23 * HOUR - 59 * 60 * 1000),
  "Saturday 23h59m out is rejected"
);

const monday10 = Date.parse("2026-11-30T15:00:00.000Z");
check(
  isBookableSlot(new Date(monday10).toISOString(), monday10 - 24 * HOUR - 60 * 1000),
  "Monday 24h01m out is accepted"
);

// 2026-11-28T20:00:00.000Z is Saturday 3:00 PM ET. It is still Saturday in ET
// and at or before 4:00 PM, so the weekday rule accepts it.
const saturdayAfternoonUtc = Date.parse("2026-11-28T20:00:00.000Z");
check(
  isBookableSlot(new Date(saturdayAfternoonUtc).toISOString(), farBefore(saturdayAfternoonUtc)),
  "Saturday 8:00 PM UTC (3:00 PM ET, still Saturday) is accepted when more than 24h out"
);

// 2026-11-28T23:30:00.000Z is Saturday 6:30 PM ET, still Saturday, and after 4:00 PM.
const saturday1130Utc = Date.parse("2026-11-28T23:30:00.000Z");
check(
  !isBookableSlot(new Date(saturday1130Utc).toISOString(), farBefore(saturday1130Utc)),
  "Saturday 11:30 PM UTC is still Saturday in ET and is rejected because it is after 4:00 PM ET"
);

const sunday9pm = Date.parse("2026-11-30T02:00:00.000Z");
check(
  !isBookableSlot(new Date(sunday9pm).toISOString(), farBefore(sunday9pm)),
  "Sunday 9 PM ET (Monday in UTC) is rejected"
);

const saturday6pm = Date.parse("2026-11-28T23:00:00.000Z");
check(
  !isBookableSlot(new Date(saturday6pm).toISOString(), farBefore(saturday6pm)),
  "Saturday 6:00 PM ET is rejected"
);

const monday4 = Date.parse("2026-11-30T21:00:00.000Z");
check(
  isBookableSlot(new Date(monday4).toISOString(), monday4 - 24 * HOUR - 60 * 1000),
  "Monday 4:00 PM ET more than 24h out is accepted"
);

const monday430 = Date.parse("2026-11-30T21:30:00.000Z");
check(
  !isBookableSlot(new Date(monday430).toISOString(), farBefore(monday430)),
  "Monday 4:30 PM ET is rejected"
);

const tuesday9pm = Date.parse("2026-12-02T02:00:00.000Z");
check(
  !isBookableSlot(new Date(tuesday9pm).toISOString(), farBefore(tuesday9pm)),
  "Tuesday 9:00 PM ET (Wednesday in UTC) is rejected"
);

check(!isBookableSlot("not-a-time", Date.now()), "an unparseable start is rejected");

const bookableMonday = new Date(monday4).toISOString();
const nowForMonday = monday4 - 24 * HOUR - 60 * 1000;
check(
  reserveDecision("Gran Paraiso", bookableMonday, nowForMonday) === "send",
  "a bookable slot is sent"
);
check(
  reserveDecision("  ", bookableMonday, nowForMonday) === "missing-building",
  "an empty building is not refreshed as a closed slot"
);
check(
  reserveDecision("Gran Paraiso", new Date(saturday10).toISOString(), saturday10 - 23 * HOUR - 59 * 60 * 1000) ===
    "closed",
  "a slot that dropped under 24h refreshes the list"
);
check(
  reserveDecision("Gran Paraiso", new Date(sunday10).toISOString(), farBefore(sunday10)) === "closed",
  "a Sunday slot refreshes the list instead of the generic error"
);
check(
  reserveDecision("Gran Paraiso", new Date(monday430).toISOString(), farBefore(monday430)) === "closed",
  "a start after 4:00 PM ET refreshes the list"
);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("slot rules guard passed");
