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

export const STOREFRONT_TIME_ZONE = "America/New_York";

export const STOREFRONT_START_HOURS = [8, 9, 10, 11] as const;

export const STOREFRONT_HORIZON_DAYS = 14;

/** Days shown before the visitor asks for the rest of the 14 day window. */
export const STOREFRONT_PREVIEW_DAYS = 7;

/** YYYY-MM-DD in America/New_York. Add dates here for later holidays. */
export const STOREFRONT_EXCLUDED_DATES = ["2026-11-26", "2026-12-25", "2027-01-01"] as const;

const STOREFRONT_EXCLUDED = new Set<string>(STOREFRONT_EXCLUDED_DATES);

export type EtParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
};

export function etParts(ms: number): EtParts | null {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STOREFRONT_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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
  const year = Number(read("year"));
  const month = Number(read("month"));
  const day = Number(read("day"));
  if (
    !weekday ||
    [hour, minute, second, year, month, day].some((value) => !Number.isFinite(value))
  ) {
    return null;
  }
  if (hour === 24) hour = 0;
  return { year, month, day, hour, minute, second, weekday };
}

export function etDateString(ms: number): string | null {
  const parts = etParts(ms);
  if (!parts) return null;
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

function addCalendarDays(ymd: string, days: number): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

/** UTC millis for a wall clock time in America/New_York. */
export function etWallTimeToUtc(ymd: string, hour: number, minute = 0): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  let utc = Date.UTC(year, month - 1, day, hour + 5, minute, 0);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = etParts(utc);
    if (!parts) return null;
    const got = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const want = Date.UTC(year, month - 1, day, hour, minute, 0);
    const diff = want - got;
    if (diff === 0) return utc;
    utc += diff;
  }
  const parts = etParts(utc);
  if (
    parts &&
    parts.year === year &&
    parts.month === month &&
    parts.day === day &&
    parts.hour === hour &&
    parts.minute === minute &&
    parts.second === 0
  ) {
    return utc;
  }
  return null;
}

/**
 * A first visit start is bookable only when the residential rule accepts it,
 * the America/New_York time is exactly 8:00, 9:00, 10:00, or 11:00 AM,
 * and the America/New_York date is not on the holiday list.
 */
export function isStorefrontSlot(startIso: string, nowMs: number): boolean {
  if (!isBookableSlot(startIso, nowMs)) return false;
  const startMs = Date.parse(startIso);
  if (!Number.isFinite(startMs)) return false;
  const clock = etParts(startMs);
  if (!clock) return false;
  if (clock.minute !== 0 || clock.second !== 0) return false;
  if (!STOREFRONT_START_HOURS.includes(clock.hour as (typeof STOREFRONT_START_HOURS)[number])) {
    return false;
  }
  const ymd = etDateString(startMs);
  if (!ymd || STOREFRONT_EXCLUDED.has(ymd)) return false;
  return true;
}

export type StorefrontSlot = {
  start: string;
  day: string;
  time: string;
  label: string;
};

function plainSpace(value: string): string {
  return value.replace(/[\u202f\u00a0]/g, " ");
}

export function formatStorefrontWhen(ms: number): { day: string; time: string; label: string } | null {
  const day = plainSpace(
    new Intl.DateTimeFormat("en-US", {
      timeZone: STOREFRONT_TIME_ZONE,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(ms))
  );
  const time = plainSpace(
    new Intl.DateTimeFormat("en-US", {
      timeZone: STOREFRONT_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(ms))
  );
  if (!day || !time) return null;
  return { day, time, label: `${day}, ${time}` };
}

export type SchedulerAvailabilitySlot = {
  start: string;
  label: string;
  afterHours: boolean;
};

/**
 * Same availability payload the residential widget accepts:
 * `{ ok: true, slots: [...] }` from `?mode=availability`.
 * Anything else is a failed read. This does not invent times.
 */
export function readSchedulerAvailability(
  data: unknown
): { ok: true; slots: SchedulerAvailabilitySlot[] } | { ok: false } {
  if (!data || typeof data !== "object") return { ok: false };
  const record = data as { ok?: unknown; slots?: unknown };
  if (!record.ok || !Array.isArray(record.slots)) return { ok: false };
  const slots: SchedulerAvailabilitySlot[] = [];
  for (const item of record.slots) {
    if (!item || typeof item !== "object") continue;
    const row = item as { start?: unknown; label?: unknown; afterHours?: unknown };
    if (typeof row.start !== "string" || !row.start) continue;
    slots.push({
      start: row.start,
      label: typeof row.label === "string" ? row.label : "",
      afterHours: row.afterHours === true,
    });
  }
  return { ok: true, slots };
}

/**
 * Keep only the mornings the Apps Script actually offered.
 * A start the script omitted is never added back.
 */
export function listStorefrontSlots(
  offered: ReadonlyArray<{ start: string }>,
  nowMs: number
): StorefrontSlot[] {
  const today = etDateString(nowMs);
  const lastDay = today ? addCalendarDays(today, STOREFRONT_HORIZON_DAYS - 1) : null;
  if (!today || !lastDay) return [];
  const seen = new Set<string>();
  const slots: StorefrontSlot[] = [];
  for (const item of offered) {
    if (!item || typeof item.start !== "string" || seen.has(item.start)) continue;
    if (!isStorefrontSlot(item.start, nowMs)) continue;
    const startMs = Date.parse(item.start);
    const ymd = etDateString(startMs);
    if (!ymd || ymd < today || ymd > lastDay) continue;
    const formatted = formatStorefrontWhen(startMs);
    if (!formatted) continue;
    seen.add(item.start);
    slots.push({ start: item.start, ...formatted });
  }
  slots.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return slots;
}

/** First 7 America/New_York days stay visible. The rest of the 14 day window waits. */
export function splitStorefrontSlotWindow<T extends { start: string }>(
  slots: readonly T[],
  nowMs: number
): { visible: T[]; later: T[] } {
  const today = etDateString(nowMs);
  const end = today ? addCalendarDays(today, STOREFRONT_PREVIEW_DAYS - 1) : null;
  if (!today || !end) return { visible: [...slots], later: [] };
  const visible: T[] = [];
  const later: T[] = [];
  for (const slot of slots) {
    const ymd = etDateString(Date.parse(slot.start));
    if (ymd && ymd > end) later.push(slot);
    else visible.push(slot);
  }
  return { visible, later };
}

export function storefrontSlotsFromAvailability(
  data: unknown,
  nowMs: number
): { state: "loaded"; slots: StorefrontSlot[] } | { state: "error" } {
  const read = readSchedulerAvailability(data);
  if (!read.ok) return { state: "error" };
  return { state: "loaded", slots: listStorefrontSlots(read.slots, nowMs) };
}
