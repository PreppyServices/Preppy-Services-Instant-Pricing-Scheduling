// First-service / new-customer balcony glass pricing for SMS deep links.
// Catalog prices in data/buildings.ts stay the regular line price. This module
// only decides whether a link asked for the intro rate, and what 20% off is.

export const INTRO_RATE = 0.8;

const TRUTHY = new Set(["1", "true"]);

type SearchReader = { get(name: string): string | null };

function paramValue(params: SearchReader, key: string): string {
  const direct = params.get(key);
  if (direct != null) return direct;
  // SMS clients sometimes capitalize the key. Match intro/first/promo loosely.
  const scan = params as URLSearchParams;
  if (typeof scan.entries === "function") {
    for (const [k, v] of scan.entries()) {
      if (k.toLowerCase() === key) return v;
    }
  }
  return "";
}

function flagOn(params: SearchReader, key: string): boolean {
  return TRUTHY.has(paramValue(params, key).trim().toLowerCase());
}

const OFF = new Set(["0", "false", "off", "no"]);

/** Flyer values that open the holiday hero and apply the first-service rate. */
const FLYER_ON = new Set([
  "1",
  "true",
  "yes",
  "november",
  "holiday",
  "building",
  "sunset",
  "daylight",
  "tower",
  "square",
  "gran-paraiso",
]);

export type HolidayFlyerId = "mirrored" | "sunset" | "daylight";

export type FlyerLanding = {
  /** Render the holiday flyer above the calculator. */
  showFlyer: boolean;
  /** Path or query implies intro even without ?intro=1. Toggle-off persists intro=0. */
  impliesIntro: boolean;
  /** Newsletter wording (/november, ?promo=november, ?flyer=november). */
  newsletter: boolean;
  flyerId: HolidayFlyerId;
};

function promoValue(params: SearchReader): string {
  return paramValue(params, "promo").trim().toLowerCase();
}

function flyerValue(params: SearchReader): string {
  return paramValue(params, "flyer").trim().toLowerCase();
}

/** Explicit opt-out. Checked before campaign paths so a toggle-off survives refresh. */
export function isExplicitIntroOff(params: SearchReader): boolean {
  return OFF.has(paramValue(params, "intro").trim().toLowerCase());
}

export function isNovemberPath(pathname: string): boolean {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  return path === "/november";
}

function viewValue(params: SearchReader): string {
  return paramValue(params, "view").trim().toLowerCase();
}

/**
 * Holiday flyer landing: /november, ?flyer=1, ?flyer=november, ?promo=november,
 * and ?promo=holiday. The hero is the clean upper Edgewater balcony photo.
 * ?view=daylight or ?view=sunset swaps in the other real Edgewater photo.
 */
export function readFlyerLanding(pathname: string, params: SearchReader): FlyerLanding {
  const pathNovember = isNovemberPath(pathname);
  const flyer = flyerValue(params);
  const promo = promoValue(params);
  const view = viewValue(params);
  const flyerOn = FLYER_ON.has(flyer);
  const promoOn = promo === "november" || promo === "holiday";
  const showFlyer = pathNovember || flyerOn || promoOn;
  const newsletter = pathNovember || promo === "november" || flyer === "november";

  let flyerId: HolidayFlyerId = "mirrored";
  if (view === "daylight" || flyer === "daylight") flyerId = "daylight";
  else if (view === "sunset" || flyer === "sunset") flyerId = "sunset";

  return {
    showFlyer,
    impliesIntro: showFlyer,
    newsletter,
    flyerId,
  };
}

export const FLYER_ASSETS: Record<
  HolidayFlyerId,
  { src: string; alt: string; width: number; height: number; priceBand: boolean }
> = {
  mirrored: {
    src: "/preppy-holiday-flyer-v4.jpg",
    width: 1080,
    height: 1350,
    priceBand: false,
    alt: "Preppy Services November newsletter. Holiday balcony cleaning. Glass, floors, frames, and railing.",
  },
  sunset: {
    src: "/flyers/real_edgewater_sunset_holiday_card.jpg",
    width: 1080,
    height: 1350,
    priceBand: true,
    alt: "Real Edgewater sunset balcony over Biscayne Bay. Preppy Services holiday balcony glass, 20% off the first visit. Instant balcony pricing at quote.preppyservices.com.",
  },
  daylight: {
    src: "/flyers/real_edgewater_daylight_holiday_card.jpg",
    width: 1080,
    height: 1350,
    priceBand: true,
    alt: "Real Edgewater daylight balcony over Biscayne Bay. Preppy Services November newsletter offer, 20% off the first visit. Instant balcony pricing at quote.preppyservices.com.",
  },
};

/**
 * True for ?intro=1, ?first=1, ?promo=intro, the November flyer landing
 * (/november, ?promo=november, ?promo=holiday, ?flyer=1 / ?flyer=november),
 * unless intro is explicitly off (intro=0).
 */
export function isIntroRequest(params: SearchReader, pathname = ""): boolean {
  if (isExplicitIntroOff(params)) return false;
  if (flagOn(params, "intro") || flagOn(params, "first")) return true;
  const promo = promoValue(params);
  if (promo === "intro" || promo === "november" || promo === "holiday") return true;
  if (FLYER_ON.has(flyerValue(params))) return true;
  if (pathname && isNovemberPath(pathname)) return true;
  return false;
}

/** Flyer first-service price: 20% off the regular line, rounded to the dollar. */
export function firstServicePrice(regular: number): number {
  return Math.round(regular * INTRO_RATE);
}

/**
 * Flat interior-glass add-on on first-service / new-customer quotes.
 * Matches the Gran Paraiso balcony-glass flyer ("Add interior glass" $100).
 * The 20% intro rate applies only to the exterior line, not to this add-on.
 */
export const INTRO_INTERIOR_ADDON = 100;

/**
 * Interior glass dollars once a line is priced (the add-on is offered).
 *
 * Regular quotes use the shared catalog tier (`addOnPricing`, keyed by the
 * regular exterior price) unless `preservedRegular` is set. That lock is the
 * exact interior dollar a line already quoted before its exterior price moved.
 * A missing tier stays $0 — this does not invent a regular interior price.
 *
 * Intro quotes use the flat $100 for every building and ignore both the
 * catalog tier and any preserved regular dollar.
 */
export function interiorGlassAddOn(
  catalogAddOn: number | undefined,
  intro: boolean,
  preservedRegular?: number
): number {
  if (intro) return INTRO_INTERIOR_ADDON;
  if (preservedRegular !== undefined) return preservedRegular;
  return catalogAddOn ?? 0;
}

/** Interior dollars for one catalog line. Intro ignores the preserved lock. */
export function quoteInteriorAddOn(
  building: string,
  line: string,
  exteriorPrice: number,
  intro: boolean,
  catalog: Record<number, number>,
  preserved: Record<string, Record<string, number>>
): number {
  return interiorGlassAddOn(catalog[exteriorPrice], intro, preserved[building]?.[line]);
}

/**
 * Reflect the first-service toggle in the query string without touching
 * building, line, unit, or name. Canonical on-state is intro=1.
 * When the page itself implies intro (for example /november), turning it off
 * writes intro=0 so a refresh does not snap the discount back on.
 */
export function setIntroSearch(
  params: URLSearchParams,
  on: boolean,
  implied = false
): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  if (on) next.set("intro", "1");
  else if (implied) next.set("intro", "0");
  else next.delete("intro");
  next.delete("first");
  if ((next.get("promo") ?? "").trim().toLowerCase() === "intro") next.delete("promo");
  return next;
}
