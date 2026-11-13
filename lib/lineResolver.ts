// Unit → balcony price.
//
// Buildings without floorBands or unitOverrides keep the last-two-digits rule
// and ignore the floor. PH and UPH quote only when that exact line key exists.
//
// Buildings that declare them resolve in this order:
//   1. exact unit override (whitespace ignored, so "PH 3201" matches PH3201)
//   2. exact PHI / PHII / PH code on a band's `also` list
//   3. floor plus line, skipping floors 1–2 and any skipFloors
//   4. null — the widget asks the resident to text or call
//
// PHI10 means line 10. PHII04 means line 04.

import type { BuildingPricing, FloorBand } from "../data/buildings";

export type PricedSource = "exact" | "last2" | "override" | "also" | "floor-band";

export type UnitResolution =
  | {
      status: "priced";
      line: string;
      regular: number;
      source: PricedSource;
    }
  | { status: "call"; line: string | null }
  | { status: "none" };

type ParsedUnit = {
  code: string;
  line: string | null;
  floor: number | null;
};

const BLOCKED_PREFIX = /^(PH|UPH|LPH|TH|TS|TOWNHOUSE|TOWNHOME|PENTHOUSE)/i;

export function quotesByUnit(entry: BuildingPricing | undefined): boolean {
  if (!entry) return false;
  return (entry.floorBands?.length ?? 0) > 0 || Object.keys(entry.unitOverrides ?? {}).length > 0;
}

function compactUnit(unit: string): string {
  return unit.trim().toUpperCase().replace(/\s+/g, "");
}

function parseUnit(unit: string): ParsedUnit {
  const code = compactUnit(unit);
  const phii = /^PHII(\d+)$/.exec(code);
  if (phii) return { code, line: phii[1].padStart(2, "0"), floor: null };
  const phi = /^PHI(\d+)$/.exec(code);
  if (phi) return { code, line: phi[1].padStart(2, "0"), floor: null };
  const uph = /^UPH(\d+)$/.exec(code);
  if (uph) return { code, line: uph[1].padStart(2, "0"), floor: null };
  const ph = /^PH(\d+)$/.exec(code);
  if (ph) return { code, line: ph[1].padStart(2, "0"), floor: null };
  if (/^\d{3,5}$/.test(code)) {
    return { code, line: code.slice(-2), floor: Number(code.slice(0, -2)) };
  }
  if (/^\d{1,2}$/.test(code)) {
    return { code, line: code.padStart(2, "0"), floor: null };
  }
  return { code, line: null, floor: null };
}

function matchAlso(bands: readonly FloorBand[], code: string): FloorBand | null {
  for (const band of bands) {
    if (band.also?.some((entry) => entry.toUpperCase() === code)) return band;
  }
  return null;
}

function matchFloorLine(
  bands: readonly FloorBand[],
  floor: number,
  line: string,
  skipFloors: readonly number[]
): FloorBand | null {
  if (skipFloors.includes(floor)) return null;
  for (const band of bands) {
    const [min, max] = band.floors;
    if (floor >= min && floor <= max && band.lines.includes(line)) return band;
  }
  return null;
}

function resolveFloorBands(entry: BuildingPricing, parsed: ParsedUnit): UnitResolution {
  const override = entry.unitOverrides?.[parsed.code];
  if (override !== undefined) {
    return {
      status: "priced",
      line: parsed.line && parsed.line.length === 2 ? parsed.line : parsed.code,
      regular: override,
      source: "override",
    };
  }
  const bands = entry.floorBands ?? [];
  const also = matchAlso(bands, parsed.code);
  if (also) {
    return {
      status: "priced",
      line: parsed.line ?? parsed.code,
      regular: also.regular,
      source: "also",
    };
  }
  if (parsed.floor != null && (parsed.floor <= 2 || (entry.skipFloors ?? []).includes(parsed.floor))) {
    return { status: "call", line: parsed.line };
  }
  if (parsed.floor != null && parsed.line) {
    const band = matchFloorLine(bands, parsed.floor, parsed.line, entry.skipFloors ?? []);
    if (band) {
      return {
        status: "priced",
        line: parsed.line,
        regular: band.regular,
        source: "floor-band",
      };
    }
  }
  return { status: "call", line: parsed.line };
}

function resolveLineKey(entry: BuildingPricing, parsed: ParsedUnit): UnitResolution {
  const lines = entry.lines;
  const code = parsed.code;
  if (!code) return { status: "none" };
  if (lines[code] !== undefined) {
    return { status: "priced", line: code, regular: lines[code], source: "exact" };
  }
  if (BLOCKED_PREFIX.test(code)) return { status: "none" };
  if (!/^\d+$/.test(code)) return { status: "none" };
  if (/^\d{3,5}$/.test(code)) {
    const last2 = code.slice(-2);
    if (/^\d{2}$/.test(last2) && lines[last2] !== undefined) {
      return { status: "priced", line: last2, regular: lines[last2], source: "last2" };
    }
  }
  if (/^\d{1,2}$/.test(code)) {
    const padded = code.padStart(2, "0");
    if (lines[padded] !== undefined) {
      return { status: "priced", line: padded, regular: lines[padded], source: "exact" };
    }
  }
  return { status: "none" };
}

/** Regular price for a unit, or null when the widget should not quote it. */
export function resolveUnitQuote(
  buildingName: string,
  unit: string | null | undefined,
  catalog: Record<string, BuildingPricing>
): UnitResolution {
  if (!unit || !buildingName) return { status: "none" };
  const entry = catalog[buildingName];
  if (!entry) return { status: "none" };
  const parsed = parseUnit(unit);
  if (!parsed.code) return { status: "none" };
  if (quotesByUnit(entry)) return resolveFloorBands(entry, parsed);
  return resolveLineKey(entry, parsed);
}
