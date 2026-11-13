// Conservative unit to line mapping. Same rules the quote widget already uses.
// PH, UPH, LPH, TH, and irregular units never auto map from the last two digits.

import { pricing } from "../../data/buildings";

export function resolveUnitToLine(
  unit: string | null | undefined,
  buildingName: string
): { line: string; source: "exact" | "last2" | "none" } {
  if (!unit || !buildingName) return { line: "", source: "none" };
  const lines = pricing[buildingName]?.lines;
  if (!lines) return { line: "", source: "none" };
  const u = unit.trim().toUpperCase();
  if (!u) return { line: "", source: "none" };

  if (lines[u] !== undefined) return { line: u, source: "exact" };

  if (/^(PH|UPH|LPH|TH|TS|TOWNHOUSE|TOWNHOME|PENTHOUSE)/i.test(u)) {
    return { line: "", source: "none" };
  }

  if (!/^\d+$/.test(u)) return { line: "", source: "none" };

  if (/^\d{3,5}$/.test(u)) {
    const last2 = u.slice(-2);
    if (/^\d{2}$/.test(last2) && lines[last2] !== undefined) {
      return { line: last2, source: "last2" };
    }
  }

  if (/^\d{1,2}$/.test(u)) {
    const padded = u.padStart(2, "0");
    if (lines[padded] !== undefined) return { line: padded, source: "exact" };
  }

  return { line: "", source: "none" };
}
