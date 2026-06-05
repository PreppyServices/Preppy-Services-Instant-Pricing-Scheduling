# SPRINT 1396 — Quote Widget OG B Param Preview Fix V1 (PLAN)

**Repo:** `Preppy-Services-Instant-Pricing-Scheduling` (the quote-widget project serving `quote.preppyservices.com`).
**Branch:** `main`. **HEAD before this sprint:** `9f4620c — Add quote widget intelligence arc closeout marker`. Working tree clean.

## Objective

Add `b=` as an alias for `building=` in the quote-widget OG preview route so VIP SMS links of the form `?name=...&b=...` render the correct building in the iMessage preview instead of defaulting to One Paraiso, while preserving `building=` behavior.

## Pre-check (gating)

Before any edit, locate the OG route and the metadata layer that builds the `og:image` URL, and confirm whether `b=` is already handled. The change should be a narrow alias addition only, with no pricing, quote-calculation, verifiedBuildings, or send behavior change.

## Intended change (only if not already present)

In the OG route, read `building` with `b` as an alias:

```ts
searchParams.get("building") ?? searchParams.get("b") ?? ""
```

And ensure the metadata layer that constructs the OG image URL forwards the `b` value, so the card receives the real building.

## Outcome of the pre-check

See `SPRINT-1396-REPORT.md`. The pre-check found the fix is **already implemented and committed**: the OG route (`app/og/preppy/route.tsx`) already reads `searchParams.get("building") ?? searchParams.get("b")` (commit `7fb3546`), and the page metadata (`app/page.tsx`) already reads `sp.b || sp.building` and forwards it as `building=` (commit `f205ad0`). The OG default is "Preppy Services", not One Paraiso. No code change is required; a no-op edit was deliberately avoided. The remaining customer-visible risk, if any, is a deployment/cache gap, documented in the report.

## Files

- `docs/sprints/SPRINT-1396-PLAN.md`, `docs/sprints/SPRINT-1396-REPORT.md` (this verify-only documentation). No code files changed.
