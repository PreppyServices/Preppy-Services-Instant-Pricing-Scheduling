/** Exact catalog-name match used by the quote widget. No prefix alias. */
export function matchCatalogBuilding(
  names: readonly string[],
  raw: string | null | undefined
): string | null {
  const query = (raw ?? "").trim().toLowerCase();
  if (!query) return null;
  return names.find((name) => name.toLowerCase() === query) ?? null;
}

export type LandingBuilding = {
  building: string;
  buildingParamRaw: string;
  buildingUnmatched: boolean;
  line: string;
};

/**
 * Building and exact line from a quote URL. An organic visit (no b or
 * building param) stays empty. A deep link resolves only on an exact catalog
 * name. An unmatched param stays empty and sets the unmatched flag.
 */
export function resolveLandingBuilding(
  names: readonly string[],
  search: string,
  lineExists: (building: string, line: string) => boolean
): LandingBuilding {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const buildingParamRaw = (params.get("b") || params.get("building") || "").trim();
  const matched = matchCatalogBuilding(names, buildingParamRaw);
  const rawLine = params.get("line") || params.get("l") || "";
  const line = matched && rawLine && lineExists(matched, rawLine) ? rawLine : "";
  return {
    building: matched ?? "",
    buildingUnmatched: buildingParamRaw.length > 0 && !matched,
    buildingParamRaw,
    line,
  };
}
