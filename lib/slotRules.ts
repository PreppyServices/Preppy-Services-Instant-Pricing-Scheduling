const NOTICE_MS = 24 * 60 * 60 * 1000;
const LATEST_MINUTE = 16 * 60;

type EtClock = {
  weekday: string;
  hour: number;
  minute: number;
  second: number;
};

function etClock(ms: number): EtClock | null {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = read("weekday");
  let hour = Number(read("hour"));
  const minute = Number(read("minute"));
  const second = Number(read("second"));
  if (!weekday || !Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) {
    return null;
  }
  if (hour === 24) hour = 0;
  return { weekday, hour, minute, second };
}

export type ReserveDecision = "send" | "missing-building" | "closed";

/** What reserveSlot should do before it talks to Apps Script. */
export function reserveDecision(building: string, startIso: string, nowMs: number): ReserveDecision {
  if (!building.trim()) return "missing-building";
  if (!isBookableSlot(startIso, nowMs)) return "closed";
  return "send";
}

/**
 * A slot can be shown and booked only when all of these hold:
 * the start is at least 24 hours after now (absolute time),
 * the America/New_York weekday is Monday through Saturday,
 * and the America/New_York clock time is 4:00 PM or earlier.
 */
export function isBookableSlot(startIso: string, nowMs: number): boolean {
  const startMs = Date.parse(startIso);
  if (!Number.isFinite(startMs)) return false;
  if (startMs - nowMs < NOTICE_MS) return false;
  const clock = etClock(startMs);
  if (!clock || clock.weekday === "Sun") return false;
  const minuteOfDay = clock.hour * 60 + clock.minute;
  if (minuteOfDay > LATEST_MINUTE) return false;
  if (minuteOfDay === LATEST_MINUTE && clock.second > 0) return false;
  return true;
}
