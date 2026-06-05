# SPRINT 1397 — Quote Widget Production Preview Deploy Verification V1 (REPORT)

**Answer: PRODUCTION IS CURRENT for the `b=` OG preview fix.** Verified by live read-only inspection. Held for ChatGPT audit. No code/data changed, no deploy, no texts sent.

## Environment verification

- Repo path: `/Users/joelanigan/Developer/Preppy/Preppy-Services-Instant-Pricing-Scheduling` (serves `quote.preppyservices.com`). Confirmed.
- Branch: `main`. Confirmed.
- Baseline HEAD: `37b7381 — docs(og): verify b param preview support`. Confirmed.
- Working tree: clean.

## Code support (source side)

- `app/og/preppy/route.tsx` reads `searchParams.get("building") ?? searchParams.get("b")` (default `"Preppy Services"`).
- `app/page.tsx` `generateMetadata` reads `asString(sp.b || sp.building)` and forwards it as `building=` into the OG image URL and the title.
- Both fix commits are ancestors of `main`: `7fb3546 — Fix quote OG building parameter fallback` and `f205ad0 — Fix OG preview personalization and metadata wiring`. So `main` contains the fix.

## Vercel project identity

- The repo has **no `.vercel/project.json` and no `vercel.json`**, and this session has no Vercel API token or Vercel connector, so the exact Vercel project name and the deployed build SHA could not be read directly. This single sub-item is unverifiable from here.
- However, the deployment **state** that matters (does production reflect the `b` fix) was verified directly against the live site, which is stronger than the project name. See below.

## Live verification (read-only, via web fetch)

Fetched the live URLs and read the page title metadata (rendered by `app/page.tsx generateMetadata`):

| URL | Live `og:title` / title |
| --- | --- |
| `https://quote.preppyservices.com/?name=David&b=Gran%20Paraiso` | `Prepared for David · Gran Paraiso · Preppy Services` |
| `https://quote.preppyservices.com/?name=David&building=Gran%20Paraiso` | `Prepared for David · Gran Paraiso · Preppy Services` |
| `https://quote.preppyservices.com/?name=David&b=Elysee` | `Prepared for David · Elysee · Preppy Services` |

Interpretation:

- For a **`b=`** link, the live title includes the real building (`Gran Paraiso`, `Elysee`). The title is produced by `generateMetadata`, which only renders `Prepared for <name> · <building> · Preppy Services` when it reads the building from `b` or `building`. A build from before `f205ad0` would not surface the building from `b=`.
- The **`building=`** control still works (unchanged behavior).
- **None default to One Paraiso.**

This is direct, live proof that the deployed build at `quote.preppyservices.com` includes the `b` metadata fix. Production is current for this fix.

(Note: the title comes from the page metadata, which also builds the `og:image` URL as `/og/preppy?...&building=<value>`; the OG image route additionally reads `building ?? b`. The live title is the observable confirmation that the metadata layer is deployed; the OG route's `b` support is committed in `main` and reached via the forwarded `building=`.)

## Conclusion and next action

- **Production is current.** The customer-visible One Paraiso default is not present in the live `b=` path.
- Therefore, if iMessage still shows One Paraiso for a specific previously sent link, the cause is **iMessage per-URL OG cache**, not a deploy gap. iMessage caches a link preview keyed by the exact URL and can keep showing a stale card even after the server is correct.

### Recommended fresh self-test (do this yourself, do not mass send)

1. In iMessage, send to **your own number** a personalized link you have **not previewed before**, for example a real VIP combination not yet sent, such as `https://quote.preppyservices.com/?name=<TestName>&b=<RealBuilding>`. A never-before-seen URL is not in the iMessage cache, so it fetches the current (correct) card.
2. Confirm the preview shows the correct building and not One Paraiso.
3. For VIP sends, each personalized link already differs by `name` and `b`, so most are fresh URLs and will preview correctly. Do not rely on re-sending a URL whose old card iMessage already cached; vary the link instead. No building aliases are invented; use the real building values from the contact master.

The agent did not send any text and recommends Joe run the self-test before the VIP daily-80.

## Verification of "no change"

- No code, data, pricing, verifiedBuildings, send, Supabase, migration, env, or package file changed. Only the two Sprint 1397 docs were added.
- No SMS sent; no customer outreach; no deployment.

## Risk / rollback

- **Risk:** none from this sprint (read-only verification + docs).
- **Rollback:** revert only the two Sprint 1397 docs. No code rollback applicable.

## Close criteria status

- Clear answer: **production is current** (verified live). 
- Proof provided (three live titles, `b=` renders the real building, no One Paraiso). 
- Next SMS test instruction provided (fresh, never-cached personalized self-test link; vary the URL).
- Unverifiable sub-item stated precisely (exact Vercel project name / deployed SHA, due to no `.vercel`/`vercel.json` and no Vercel connector) — does not affect the verified production state.

**Held for ChatGPT audit. No deploy needed; the fix is live. Remaining step is an iMessage-cache-safe self-test, then VIP sends with fresh personalized links.**
