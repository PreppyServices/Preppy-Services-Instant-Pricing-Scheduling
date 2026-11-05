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

/** True for ?intro=1, ?first=1, or ?promo=intro (1/true accepted on the flags). */
export function isIntroRequest(params: SearchReader): boolean {
  if (flagOn(params, "intro") || flagOn(params, "first")) return true;
  return paramValue(params, "promo").trim().toLowerCase() === "intro";
}

/** Flyer first-service price: 20% off the regular line, rounded to the dollar. */
export function firstServicePrice(regular: number): number {
  return Math.round(regular * INTRO_RATE);
}

/**
 * Reflect the first-service toggle in the query string without touching
 * building, line, unit, or name. Canonical on-state is intro=1.
 */
export function setIntroSearch(params: URLSearchParams, on: boolean): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  if (on) next.set("intro", "1");
  else next.delete("intro");
  next.delete("first");
  if ((next.get("promo") ?? "").trim().toLowerCase() === "intro") next.delete("promo");
  return next;
}
