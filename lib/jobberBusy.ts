import { etWallTimeToUtc } from "./slotRules";

/** Apps Script books a 3 hour window from each offered start. */
export const BOOKING_WINDOW_MIN = 180;

/** A Jobber visit blocks this many extra minutes on both sides. */
export const BUSY_BUFFER_MIN = 30;

/** Busy blocks outside this horizon are not returned to the pickers. */
export const JOBBER_BUSY_HORIZON_MS = 21 * 24 * 60 * 60 * 1000;

const NEW_YORK = "America/New_York";

export type BusyBlock = {
  start: string;
  end: string;
};

type ParsedInstant = {
  ms: number;
  allDay: boolean;
  ymd: string;
};

type OpenEvent = {
  start: ParsedInstant | null;
  end: ParsedInstant | null;
  skip: boolean;
};

/**
 * Busy intervals from a Jobber iCalendar feed.
 * Only start and end are returned. Summary, description, location, uid, and url are dropped.
 * RRULE is ignored because the feed is already expanded.
 */
export function parseIcsBusy(ics: string): BusyBlock[] {
  const lines = unfoldIcs(ics);
  const blocks: BusyBlock[] = [];
  let depth = 0;
  let current: OpenEvent | null = null;

  for (const line of lines) {
    const prop = splitProperty(line);
    if (!prop) continue;
    if (prop.name === "BEGIN") {
      if (prop.value.toUpperCase() === "VEVENT" && depth === 0) {
        depth = 1;
        current = { start: null, end: null, skip: false };
      } else if (depth > 0) {
        depth += 1;
      }
      continue;
    }
    if (prop.name === "END") {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && current) {
        pushEvent(current, blocks);
        current = null;
      }
      continue;
    }
    if (!current || depth !== 1) continue;
    const value = prop.value.trim();
    if (prop.name === "STATUS" && value.toUpperCase() === "CANCELLED") {
      current.skip = true;
      continue;
    }
    if (prop.name === "TRANSP" && value.toUpperCase() === "TRANSPARENT") {
      current.skip = true;
      continue;
    }
    if (prop.name === "DTSTART") {
      current.start = parseInstant(value, prop.params);
      continue;
    }
    if (prop.name === "DTEND") {
      current.end = parseInstant(value, prop.params);
    }
  }

  return blocks;
}

/**
 * Drop a slot when [start, start + windowMin) overlaps a busy block
 * widened by bufferMin on both sides. Touching an endpoint stays free.
 * A slot with an unreadable start is kept.
 */
export function removeBusySlots<T extends { start: string }>(
  slots: readonly T[],
  busy: readonly BusyBlock[],
  windowMin: number,
  bufferMin: number
): T[] {
  const windowMs = windowMin * 60_000;
  const bufferMs = bufferMin * 60_000;
  const widened: { start: number; end: number }[] = [];
  for (const block of busy) {
    const start = Date.parse(block.start);
    const end = Date.parse(block.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || !(end > start)) continue;
    widened.push({ start: start - bufferMs, end: end + bufferMs });
  }
  if (widened.length === 0) return slots.slice();
  return slots.filter((slot) => {
    const start = Date.parse(slot.start);
    if (!Number.isFinite(start)) return true;
    const end = start + windowMs;
    for (const block of widened) {
      if (start < block.end && block.start < end) return false;
    }
    return true;
  });
}

/** Keep blocks that overlap [now, now + horizon). Original bounds are preserved. */
export function busyInHorizon(
  blocks: readonly BusyBlock[],
  nowMs: number,
  horizonMs = JOBBER_BUSY_HORIZON_MS
): BusyBlock[] {
  const horizon = nowMs + horizonMs;
  const selected: BusyBlock[] = [];
  for (const block of blocks) {
    const start = Date.parse(block.start);
    const end = Date.parse(block.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (start < horizon && end > nowMs) {
      selected.push({ start: block.start, end: block.end });
    }
  }
  return selected;
}

/**
 * A successful busy payload becomes blocks of start and end.
 * Any other payload, including ok:false, is a failed read.
 */
export function readBusyResponse(data: unknown): BusyBlock[] | null {
  if (!data || typeof data !== "object") return null;
  const body = data as { ok?: unknown; busy?: unknown };
  if (body.ok !== true || !Array.isArray(body.busy)) return null;
  const blocks: BusyBlock[] = [];
  for (const item of body.busy) {
    if (!item || typeof item !== "object") continue;
    const row = item as { start?: unknown; end?: unknown };
    if (typeof row.start !== "string" || typeof row.end !== "string") continue;
    blocks.push({ start: row.start, end: row.end });
  }
  return blocks;
}

function pushEvent(event: OpenEvent, blocks: BusyBlock[]) {
  if (event.skip || !event.start) return;
  const endMs = resolveEnd(event.start, event.end);
  if (endMs == null || !(endMs > event.start.ms)) return;
  blocks.push({
    start: new Date(event.start.ms).toISOString(),
    end: new Date(endMs).toISOString(),
  });
}

function resolveEnd(start: ParsedInstant, end: ParsedInstant | null): number | null {
  if (end) return end.ms;
  if (!start.allDay) return null;
  const next = nextCalendarDay(start.ymd);
  if (!next) return null;
  return etWallTimeToUtc(next, 0, 0);
}

function unfoldIcs(ics: string): string[] {
  let text = ics;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "");
  return text.split("\n");
}

function splitProperty(line: string): { name: string; params: Map<string, string>; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let inQuotes = false;
  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch !== ":" || inQuotes) continue;
    const left = trimmed.slice(0, i);
    const value = trimmed.slice(i + 1);
    const semi = left.indexOf(";");
    const name = (semi === -1 ? left : left.slice(0, semi)).trim().toUpperCase();
    if (!name) return null;
    const params = parseParams(semi === -1 ? "" : left.slice(semi + 1));
    return { name, params, value };
  }
  return null;
}

function parseParams(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  let i = 0;
  while (i < raw.length) {
    while (i < raw.length && (raw[i] === ";" || raw[i] === " ")) i += 1;
    const keyStart = i;
    while (i < raw.length && raw[i] !== "=" && raw[i] !== ";") i += 1;
    const key = raw.slice(keyStart, i).trim().toUpperCase();
    if (!key) continue;
    if (i >= raw.length || raw[i] !== "=") {
      map.set(key, "");
      continue;
    }
    i += 1;
    let value = "";
    if (raw[i] === '"') {
      i += 1;
      while (i < raw.length && raw[i] !== '"') {
        value += raw[i];
        i += 1;
      }
      if (raw[i] === '"') i += 1;
    } else {
      const valueStart = i;
      while (i < raw.length && raw[i] !== ";") i += 1;
      value = raw.slice(valueStart, i).trim();
    }
    map.set(key, value);
  }
  return map;
}

function parseInstant(value: string, params: Map<string, string>): ParsedInstant | null {
  const trimmed = value.trim();
  const kind = (params.get("VALUE") ?? "").toUpperCase();
  if (kind === "DATE" || /^\d{8}$/.test(trimmed)) {
    const ymd = ymdFromCompact(trimmed);
    if (!ymd) return null;
    const ms = etWallTimeToUtc(ymd, 0, 0);
    if (ms == null) return null;
    return { ms, allDay: true, ymd };
  }
  const match = /^(\d{8})T(\d{6})(Z)?$/.exec(trimmed);
  if (!match) return null;
  const ymd = ymdFromCompact(match[1]);
  if (!ymd) return null;
  const hour = Number(match[2].slice(0, 2));
  const minute = Number(match[2].slice(2, 4));
  const second = Number(match[2].slice(4, 6));
  if (match[3] === "Z") {
    const ms = utcInstant(ymd, hour, minute, second);
    if (ms == null) return null;
    return { ms, allDay: false, ymd };
  }
  const tzid = params.get("TZID") ?? "";
  if (tzid !== NEW_YORK) return null;
  const wall = etWallTimeToUtc(ymd, hour, minute);
  if (wall == null) return null;
  return { ms: wall + second * 1000, allDay: false, ymd };
}

function ymdFromCompact(compact: string): string | null {
  if (!/^\d{8}$/.test(compact)) return null;
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

function utcInstant(ymd: string, hour: number, minute: number, second: number): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (hour > 23 || minute > 59 || second > 59) return null;
  const ms = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute ||
    check.getUTCSeconds() !== second
  ) {
    return null;
  }
  return ms;
}

function nextCalendarDay(ymd: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const shifted = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return shifted.toISOString().slice(0, 10);
}
