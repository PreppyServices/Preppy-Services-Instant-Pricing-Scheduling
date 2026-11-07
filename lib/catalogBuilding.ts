/** Exact catalog-name match used by the quote widget. No prefix alias. */
export function matchCatalogBuilding(
  names: readonly string[],
  raw: string | null | undefined
): string | null {
  const query = (raw ?? "").trim().toLowerCase();
  if (!query) return null;
  return names.find((name) => name.toLowerCase() === query) ?? null;
}
