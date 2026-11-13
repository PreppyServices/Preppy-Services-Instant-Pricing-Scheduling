import { quoteGlass, type GlassQuote } from "./quote";
import {
  bestStarts,
  buildOpenDays,
  commercialOpenDates,
  TRAVEL_BUFFER_MIN,
  type Interval,
} from "./rules";
import { signSlot } from "./token";

export type OfferedSlot = { start: string; token: string };
export type OfferedDay = { date: string; slots: OfferedSlot[] };

const TOKEN_TTL_MS = 30 * 60 * 1000;

export type ResidentialAvailability = {
  ok: true;
  kind: "residential";
  regularTotal: number;
  total: number;
  durationMin: number;
  intro: boolean;
  interior: boolean;
  days: OfferedDay[];
  more: OfferedDay[];
  openStarts: string[];
};

export type CommercialAvailability = {
  ok: true;
  kind: "commercial";
  dates: string[];
  regularTotal: number | null;
  total: number | null;
  durationMin: number | null;
};

export type AvailabilityResult =
  | ResidentialAvailability
  | CommercialAvailability
  | { ok: false; reason: "unpriced" };

export function createAvailability(input: {
  building: string;
  line: string;
  interior: boolean;
  intro: boolean;
  kind: "residential" | "commercial";
  now: Date;
  busy: Interval[];
  closedDates?: string[];
  secret: string;
  promoOn?: boolean;
}): AvailabilityResult {
  const quote = input.line
    ? quoteGlass(input.building, input.line, input.interior, input.intro, input.promoOn === true)
    : null;
  const closed = input.closedDates ?? [];
  if (input.kind === "commercial") {
    return {
      ok: true,
      kind: "commercial",
      dates: commercialOpenDates(input.now, closed),
      regularTotal: quote?.regularTotal ?? null,
      total: quote?.total ?? null,
      durationMin: quote?.durationMin ?? null,
    };
  }
  if (input.kind !== "residential") {
    const exhaustive: never = input.kind;
    return exhaustive;
  }
  if (!quote) return { ok: false, reason: "unpriced" };
  const offered = offerDays(quote, input.now, input.busy, closed, input.secret);
  return {
    ok: true,
    kind: "residential",
    regularTotal: quote.regularTotal,
    total: quote.total,
    durationMin: quote.durationMin,
    intro: quote.intro,
    interior: quote.interior,
    days: offered.days.slice(0, 3),
    more: offered.days.slice(3),
    openStarts: offered.openStarts,
  };
}

function offerDays(
  quote: GlassQuote,
  now: Date,
  busy: Interval[],
  closed: string[],
  secret: string
): { days: OfferedDay[]; openStarts: string[] } {
  const open = buildOpenDays({
    now,
    durationMin: quote.durationMin,
    busy,
    extraClosed: closed,
  });
  const exp = Date.now() + TOKEN_TTL_MS;
  const days = open.map((day) => ({
    date: day.date,
    slots: bestStarts(day.starts).map((start) => signStart(quote, start, exp, secret)),
  }));
  return {
    days,
    openStarts: open.flatMap((day) => day.starts.map((start) => start.toISOString())),
  };
}

function signStart(quote: GlassQuote, start: Date, exp: number, secret: string): OfferedSlot {
  const iso = start.toISOString();
  return {
    start: iso,
    token: signSlot(
      {
        start: iso,
        durationMin: quote.durationMin,
        price: quote.total,
        b: quote.building,
        line: quote.line,
        interior: quote.interior,
        intro: quote.intro,
        exp,
      },
      secret
    ),
  };
}

export function slotEnd(startIso: string, durationMin: number, includeBuffer = false): Date {
  const extra = includeBuffer ? TRAVEL_BUFFER_MIN : 0;
  return new Date(new Date(startIso).getTime() + (durationMin + extra) * 60 * 1000);
}
