// America/New_York wall times for the booking grid.
// Offsets are whole hours, so UTC half hours line up with Miami half hours.

export const TIME_ZONE = "America/New_York";

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
};

export function partsInZone(date: Date, timeZone = TIME_ZONE): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday: bag.weekday,
  };
}

export function zoneOffsetMs(date: Date, timeZone = TIME_ZONE): number {
  const parts = partsInZone(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - date.getTime();
}

/** UTC instant for a wall-clock time in the booking time zone. */
export function zonedToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone = TIME_ZONE
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const first = zoneOffsetMs(guess, timeZone);
  let result = new Date(guess.getTime() - first);
  const second = zoneOffsetMs(result, timeZone);
  if (second !== first) result = new Date(guess.getTime() - second);
  return result;
}

export function dateKey(parts: { year: number; month: number; day: number }): string {
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

export function dateKeyInZone(date: Date, timeZone = TIME_ZONE): string {
  return dateKey(partsInZone(date, timeZone));
}

export function dateKeyParts(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

export function addDays(key: string, days: number, timeZone = TIME_ZONE): string {
  const { year, month, day } = dateKeyParts(key);
  const noon = zonedToUtc(year, month, day, 12, 0, timeZone);
  return dateKeyInZone(new Date(noon.getTime() + days * 24 * 60 * 60 * 1000), timeZone);
}

export function eachDate(startKey: string, count: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < count; i += 1) dates.push(addDays(startKey, i));
  return dates;
}

export function weekdayOf(key: string): string {
  const { year, month, day } = dateKeyParts(key);
  return partsInZone(zonedToUtc(year, month, day, 12, 0)).weekday;
}

export function isSunday(key: string): boolean {
  return weekdayOf(key) === "Sun";
}

const HALF_HOUR_MS = 30 * 60 * 1000;

/** Round up to the next half hour. An exact half hour stays put. */
export function ceilToHalfHour(date: Date): Date {
  const ms = date.getTime();
  const remainder = ms % HALF_HOUR_MS;
  if (remainder === 0) return new Date(ms);
  return new Date(ms + (HALF_HOUR_MS - remainder));
}

/** Earliest same-day start: now plus 2.5 hours, rounded up to the next half hour. */
export function earliestStart(now: Date): Date {
  return ceilToHalfHour(new Date(now.getTime() + 2.5 * 60 * 60 * 1000));
}

export function formatInZone(
  date: Date,
  lang: "en" | "es" | "fr",
  options: Intl.DateTimeFormatOptions
): string {
  const locale = lang === "es" ? "es-US" : lang === "fr" ? "fr-FR" : "en-US";
  return new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, ...options }).format(date);
}

export function clockLabel(date: Date, lang: "en" | "es" | "fr" = "en"): string {
  return formatInZone(date, lang, { hour: "numeric", minute: "2-digit" });
}

export function weekdayLabel(key: string, lang: "en" | "es" | "fr"): string {
  const { year, month, day } = dateKeyParts(key);
  return formatInZone(zonedToUtc(year, month, day, 12, 0), lang, { weekday: "long" });
}

export function monthLabel(key: string, lang: "en" | "es" | "fr"): string {
  const { year, month, day } = dateKeyParts(key);
  return formatInZone(zonedToUtc(year, month, day, 12, 0), lang, { month: "long" });
}

export function monthDates(year: number, month: number): string[] {
  const start = dateKey({ year, month, day: 1 });
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const end = dateKey({ year: next.year, month: next.month, day: 1 });
  const dates: string[] = [];
  let cursor = start;
  while (cursor < end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}
