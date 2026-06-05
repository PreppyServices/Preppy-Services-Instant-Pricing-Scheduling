# SPRINT 1396 — Quote Widget OG B Param Preview Fix V1 (REPORT)

**Status:** verified. **The fix is already implemented and committed. No code change was needed or made.** Held for ChatGPT audit. Not committed, not pushed, not deployed. No texts sent.

## Environment verification

- Repo path: `/Users/joelanigan/Developer/Preppy/Preppy-Services-Instant-Pricing-Scheduling` (the quote-widget project serving `quote.preppyservices.com`). Confirmed.
- Branch: `main`. Confirmed.
- HEAD: `9f4620c — Add quote widget intelligence arc closeout marker`. Confirmed.
- Working tree: clean before this sprint.

## The OG route and metadata layer

The OG preview is produced by two files, and **both already handle `b=`**:

1. **`app/og/preppy/route.tsx`** (the OG image route) — line 49 to 52:
   ```ts
   const rawBuilding = clean(
     searchParams.get("building") ?? searchParams.get("b"),
     "Preppy Services"
   );
   ```
   It reads `building` first, then `b` as the alias, and falls back to `"Preppy Services"` only when neither is present. The in-file comment (Sprint 1321) states this was done to stop the card "always defaulting to One Paraiso". Committed in `7fb3546 — Fix quote OG building parameter fallback`.

2. **`app/page.tsx`** (`generateMetadata`, which builds the `og:image` URL the SMS preview actually reads) — line 28 and 37:
   ```ts
   const building = asString(sp.b || sp.building).trim().slice(0, 48); // reads b
   ...
   if (p.building) qs.set("building", p.building);                     // forwards as building=
   ```
   It reads `b` (with `b` precedence), then forwards the resolved value to the OG route as `building=`, and the title uses the same value with a `"Preppy Services — Luxury Home Services"` default when nothing is present. Committed in `f205ad0 — Fix OG preview personalization and metadata wiring`.

## Before / after

- **Requested change:** make the OG route read `searchParams.get("building") ?? searchParams.get("b") ?? ""`.
- **Current state:** the OG route already reads `searchParams.get("building") ?? searchParams.get("b")` (with a `"Preppy Services"` default). The requested edit is therefore a **literal no-op**, and it was deliberately not applied to avoid a spurious diff.
- **Net:** no before/after code delta. The `b=` alias is already live in source, in both the metadata builder and the OG route.

## One Paraiso check

`"One Paraiso"` appears in the OG/metadata path only as a comment in `app/og/preppy/route.tsx` (line 48). It is not a default in the OG route, the metadata builder, or the title logic; the defaults there are `"Preppy Services"`. In `data/buildings.ts` it is just one entry in the building catalog, not an OG fallback. So a valid `b=` building does not fall back to One Paraiso in code.

## Pipeline trace (a real VIP link)

`quote.preppyservices.com/?name=David&b=Elysee`:
1. `app/page.tsx` `extractOgParams` reads `building = "Elysee"` (from `b`).
2. `buildOgImageUrl` emits `/og/preppy?name=David&building=Elysee`.
3. `app/og/preppy/route.tsx` reads `building = "Elysee"`, humanizes it, and renders "Elysee" on the card. Title becomes `Prepared for David · Elysee · Preppy Services`.

No One Paraiso anywhere in this path.

## Verification checklist

- Repo is the quote-widget repo — yes.
- Branch `main`, clean tree, HEAD `9f4620c` — yes.
- OG route located (`app/og/preppy/route.tsx`) and metadata builder located (`app/page.tsx`) — yes.
- Previously handled `building=` but not `b=` — **no; `b=` is already handled and committed** (`7fb3546`, `f205ad0`). This contradicts the sprint premise, reported honestly rather than fabricating an edit.
- After state handles both `building=` and `b=` — yes (already true).
- No pricing / quote-calculation / verifiedBuildings file changed — yes (nothing changed).
- No send code changed — yes.
- No Supabase / migration / env / package change — yes.
- Scoped typecheck/build — not run, because no code changed; there is nothing new to type-check.

## Sample URL runtime check

A live preview against this codebase would require running the widget dev server or its deployment. The agent did not run or deploy it. Code-level proof is provided above. The three sample URLs would resolve as:
- `?building=Gran%20Paraiso` -> card shows "Gran Paraiso" (unchanged).
- `?b=Gran%20Paraiso` -> metadata reads `b`, forwards `building=Gran Paraiso`, card shows "Gran Paraiso".
- `?b=One%20Paraiso` -> card shows "One Paraiso" (correct, because the operator supplied it).

## Why the customer-visible bug may still appear (and the real next step)

Because the source is already correct, a preview that still shows One Paraiso for a `b=` link is not a code defect in `main`. The likely causes are outside code and outside this sprint's permitted actions:

1. **Deployment gap.** The production app serving `quote.preppyservices.com` may be running a build from before `7fb3546` / `f205ad0`. The fix is in `main` but may not be the deployed build. Resolution: deploy the current `main` to the widget's Vercel project (owner-on-keyboard; the agent did not deploy).
2. **iMessage / platform OG cache.** iMessage caches link previews aggressively per URL. An old card can persist even after a correct deploy. Resolution: vary the link (the personalized links already differ by `name`/`b`, which usually sidesteps the cache) or wait for cache expiry; do not rely on re-sending the identical URL.

Both are operator actions, not code changes. The agent does not deploy or send.

## Rollback

- Revert only the two Sprint 1396 docs. No code or data changed, so there is nothing else to roll back. Pricing, quote data, SMS staging, and the Preppy OS operator spine are untouched.

## Close criteria status (honest)

- `b=` links no longer fall back to One Paraiso when a valid building is supplied — **already true in source** (`7fb3546`, `f205ad0`).
- `building=` links still work — yes (unchanged).
- No pricing/sending/booking/data behavior changed — yes (nothing changed).
- Report includes before/after, files, verification, rollback — yes (this document).

**Held for ChatGPT audit. The code fix is already present and committed; the remaining risk is deploy/cache, which is an owner-on-keyboard step, not a code change.**
