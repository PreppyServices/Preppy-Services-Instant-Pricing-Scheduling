// lib/ogBuilding.ts
//
// Shared verified-building resolver for the quote-widget OG link preview.
//
// Maps an inbound building param (from ?b= or ?building=) to a canonical
// verified building name, or null when the building is not recognized. Used by
// both the share page metadata (app/page.tsx) and the OG image route
// (app/og/preppy/route.tsx) so an unknown or unverified building never echoes
// arbitrary user input into the link-preview card. When this returns null, the
// caller renders the neutral "Preppy Services" card instead of a named building.
//
// This module only resolves a DISPLAY NAME. It makes no pricing claim and no
// "verified" or "confirmed" status claim — it simply checks whether the
// supplied building matches one of the buildings Preppy already covers, drawing
// from the single source of truth in data/buildings.ts (no duplicated list,
// no drift).

import { verifiedBuildings } from "../data/buildings";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Pre-normalize the verified list once at module load.
const VERIFIED: { canonical: string; norm: string }[] = verifiedBuildings.map(
  (canonical) => ({ canonical, norm: normalize(canonical) })
);

/**
 * Resolve an inbound building param to its canonical verified name.
 * Returns null when the building is empty or not recognized, which signals
 * callers to fall back to neutral Preppy Services branding.
 */
export function resolveVerifiedBuilding(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const target = normalize(raw);
  if (!target) return null;

  // 1) Exact normalized match (handles "Gran Paraiso", "Brickell Flatiron",
  //    "Mint", etc. regardless of casing/punctuation).
  for (const b of VERIFIED) {
    if (b.norm === target) return b.canonical;
  }

  // Require a meaningful length before allowing partial matches, so a stray
  // short token cannot latch onto an unrelated building.
  if (target.length < 4) return null;

  // 2) Canonical name starts with the target (e.g. "elysee" -> "Elysee Miami").
  for (const b of VERIFIED) {
    if (b.norm.startsWith(target)) return b.canonical;
  }

  // 3) Target starts with the canonical name (e.g. "elysee miami beach" ->
  //    "Elysee Miami").
  for (const b of VERIFIED) {
    if (target.startsWith(b.norm)) return b.canonical;
  }

  // 4) Containment either direction as a final, conservative fallback.
  for (const b of VERIFIED) {
    if (b.norm.includes(target) || target.includes(b.norm)) return b.canonical;
  }

  return null;
}
