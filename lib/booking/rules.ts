// Slot rules for balcony glass. The client never sends a price or a duration.
// Travel buffer is added after the job when checking conflicts. It is not part
// of the duration we show the customer.

import { firstServicePrice } from "../introPricing";
import {
  addDays,
  dateKey,
  dateKeyInZone,
  dateKeyParts,
  earliestStart,
  isSunday,
  monthDates,
  partsInZone,
  zonedToUtc,
} from "./time";

export const TRAVEL_BUFFER_MIN = 30;
export const REGULAR_FLOOR = 150;
export const FIRST_SERVICE_FLOOR = 120;
export const WINDOW_DAYS = 14;
export const BEST_PER_DAY = 4;

/** Closed all day. Sundays are separate and never become slots. */
export const HARD_CLOSED = new Set(["2026-11-26", "2026-12-25", "2027-01-01"]);

export type Interval = { startMs: number; endMs: number };

export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

export function applyPriceFloor(
  catalogRegular: number,
  intro: boolean
): { regular: number; charged: number } {
  const regular = Math.max(Math.round(catalogRegular), REGULAR_FLOOR);
  const charged = intro
    ? Math.max(firstServicePrice(regular), FIRST_SERVICE_FLOOR)
    : regular;
  return { regular, charged };
}

/** Promo math cannot undercut the regular or first service floor. */
export function chargedLinePrice(
  catalogRegular: number,
  intro: boolean,
  promoOn: boolean
): number {
  const base = applyPriceFloor(catalogRegular, intro).charged;
  if (!promoOn) return base;
  return Math.max(base, intro ? FIRST_SERVICE_FLOOR : REGULAR_FLOOR);
}

/**
 * Duration from the regular unit price.
 * $150 or less: 60. $151 to $350: 120. Over $350, or Gran Paraiso lines 01 and 07: 180.
 * Interior glass adds 60.
 */
export function durationMinFor(
  regularPrice: number,
  building: string,
  line: string,
  interior: boolean
): number {
  const granLong = building === "Gran Paraiso" && (line === "01" || line === "07");
  let minutes = granLong || regularPrice > 350 ? 180 : regularPrice <= 150 ? 60 : 120;
  if (interior) minutes += 60;
  return minutes;
}

export function dayStarts(key: string): Date[] {
  const { year, month, day } = dateKeyParts(key);
  const starts: Date[] = [];
  for (let hour = 8; hour <= 18; hour += 1) {
    starts.push(zonedToUtc(year, month, day, hour, 0));
    if (hour < 18) starts.push(zonedToUtc(year, month, day, hour, 30));
  }
  return starts;
}

export function bestStarts<T>(items: T[], max = BEST_PER_DAY): T[] {
  if (items.length <= max) return items.slice();
  const picked: T[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < max; i += 1) {
    const index = Math.round((i * (items.length - 1)) / (max - 1));
    if (seen.has(index)) continue;
    seen.add(index);
    picked.push(items[index]);
  }
  return picked;
}

export function openStartsForDate(
  key: string,
  now: Date,
  durationMin: number,
  busy: Interval[],
  closed: ReadonlySet<string>
): Date[] {
  if (isSunday(key) || closed.has(key) || HARD_CLOSED.has(key)) return [];
  const earliest = earliestStart(now).getTime();
  const occupyMs = (durationMin + TRAVEL_BUFFER_MIN) * 60 * 1000;
  const open: Date[] = [];
  for (const start of dayStarts(key)) {
    const startMs = start.getTime();
    if (startMs < earliest) continue;
    const interval = { startMs, endMs: startMs + occupyMs };
    if (busy.some((block) => intervalsOverlap(interval, block))) continue;
    open.push(start);
  }
  return open;
}

export type DayStarts = { date: string; starts: Date[] };

export function buildOpenDays(input: {
  now: Date;
  durationMin: number;
  busy: Interval[];
  extraClosed?: string[];
  windowDays?: number;
}): DayStarts[] {
  const closed = new Set([...(input.extraClosed ?? [])]);
  const today = dateKeyInZone(input.now);
  const dates = eachDateSafe(today, input.windowDays ?? WINDOW_DAYS);
  const days: DayStarts[] = [];
  for (const date of dates) {
    const starts = openStartsForDate(date, input.now, input.durationMin, input.busy, closed);
    if (starts.length) days.push({ date, starts });
  }
  return days;
}

function eachDateSafe(start: string, count: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < count; i += 1) dates.push(addDays(start, i));
  return dates;
}

/** This month and next, from today forward. Sundays and closed days are omitted. */
export function commercialOpenDates(now: Date, extraClosed: string[] = []): string[] {
  const parts = partsInZone(now);
  const today = dateKey(parts);
  const closed = new Set([...HARD_CLOSED, ...extraClosed]);
  const months = [
    { year: parts.year, month: parts.month },
    parts.month === 12
      ? { year: parts.year + 1, month: 1 }
      : { year: parts.year, month: parts.month + 1 },
  ];
  const dates: string[] = [];
  for (const month of months) {
    for (const key of monthDates(month.year, month.month)) {
      if (key < today) continue;
      if (isSunday(key) || closed.has(key)) continue;
      dates.push(key);
    }
  }
  return dates;
}

/** Hours on the booking grid that the calendar did not list as free. */
export function busyFromOpenSlots(openStarts: string[], dates: string[]): Interval[] {
  const open = new Set(openStarts.map((iso) => new Date(iso).getTime()));
  const busy: Interval[] = [];
  for (const key of dates) {
    if (isSunday(key)) continue;
    const { year, month, day } = dateKeyParts(key);
    for (let hour = 8; hour <= 18; hour += 1) {
      const start = zonedToUtc(year, month, day, hour, 0);
      if (open.has(start.getTime())) continue;
      busy.push({ startMs: start.getTime(), endMs: start.getTime() + 60 * 60 * 1000 });
    }
  }
  return busy;
}

export type CalendarEvent = {
  start: string;
  end: string;
  title?: string;
  allDay?: boolean;
  blocked?: boolean;
};

const NAMED_BLOCK = /^(HOLD|ADMIN|PERSONAL)\b/i;

export function classifyEvents(events: CalendarEvent[]): { busy: Interval[]; closed: string[] } {
  const busy: Interval[] = [];
  const closed: string[] = [];
  for (const event of events) {
    const title = (event.title ?? "").trim();
    const named = NAMED_BLOCK.test(title);
    const redBlocked = event.blocked === true || /\bBLOCKED\b/i.test(title);
    if (!named && !redBlocked) continue;
    const start = new Date(event.start);
    const end = new Date(event.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    if (event.allDay) {
      let cursor = dateKeyInZone(start);
      const endKey = dateKeyInZone(new Date(Math.max(start.getTime(), end.getTime() - 1)));
      let guard = 0;
      while (cursor <= endKey && guard < 40) {
        closed.push(cursor);
        cursor = addDays(cursor, 1);
        guard += 1;
      }
      continue;
    }
    busy.push({ startMs: start.getTime(), endMs: end.getTime() });
  }
  return { busy, closed };
}

export type VisitSpan = {
  startAt?: string | null;
  endAt?: string | null;
  allDay?: boolean;
  anytime?: boolean;
};

/** Scheduled visits block their window. Unscheduled anytime visits each block 2 hours. */
export function busyFromVisits(visits: VisitSpan[], earliest: Date): { busy: Interval[]; closed: string[] } {
  const busy: Interval[] = [];
  const closed: string[] = [];
  let cursor = earliest.getTime();
  for (const visit of visits) {
    if (visit.allDay && visit.startAt) {
      const start = new Date(visit.startAt);
      if (!Number.isNaN(start.getTime())) closed.push(dateKeyInZone(start));
      continue;
    }
    const unscheduled = visit.anytime === true || !visit.startAt;
    if (unscheduled) {
      const startMs = cursor;
      const endMs = startMs + 2 * 60 * 60 * 1000;
      busy.push({ startMs, endMs });
      cursor = endMs;
      continue;
    }
    const startMs = new Date(visit.startAt as string).getTime();
    if (Number.isNaN(startMs)) continue;
    const endMs = visit.endAt ? new Date(visit.endAt).getTime() : startMs + 2 * 60 * 60 * 1000;
    busy.push({ startMs, endMs: Number.isNaN(endMs) ? startMs + 2 * 60 * 60 * 1000 : endMs });
  }
  return { busy, closed };
}

export function mergeBusy(...groups: Interval[][]): Interval[] {
  return groups.flat();
}

export function parseGoogleAvailability(
  payload: unknown,
  dates: string[]
): { busy: Interval[]; closed: string[] } {
  if (!payload || typeof payload !== "object") return { busy: [], closed: [] };
  const data = payload as {
    ok?: boolean;
    slots?: { start?: string }[];
    busy?: { start?: string; end?: string }[];
    events?: CalendarEvent[];
  };
  const events = classifyEvents(Array.isArray(data.events) ? data.events : []);
  const explicit: Interval[] = [];
  if (Array.isArray(data.busy)) {
    for (const block of data.busy) {
      if (!block.start || !block.end) continue;
      const startMs = new Date(block.start).getTime();
      const endMs = new Date(block.end).getTime();
      if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue;
      explicit.push({ startMs, endMs });
    }
  }
  const openStarts = Array.isArray(data.slots)
    ? data.slots.map((slot) => slot.start).filter((start): start is string => Boolean(start))
    : [];
  const fromSlots =
    data.ok === true || openStarts.length > 0 ? busyFromOpenSlots(openStarts, dates) : [];
  return {
    busy: mergeBusy(fromSlots, explicit, events.busy),
    closed: events.closed,
  };
}
