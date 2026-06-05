# SPRINT 1397 — Quote Widget Production Preview Deploy Verification V1 (PLAN)

**Repo:** `Preppy-Services-Instant-Pricing-Scheduling` (serves `quote.preppyservices.com`).
**Branch:** `main`. **Baseline HEAD:** `37b7381 — docs(og): verify b param preview support`. Working tree clean.
**Type:** read-only deployment verification. No code change, no deploy, no send.

## Objective

Determine whether `quote.preppyservices.com` is deployed from current quote-widget `main` (which already supports `b=` for OG preview). If stale, report the exact deploy action. If current, prove it and recommend a fresh personalized SMS test link to bypass iMessage cache. Do not fake a live claim.

## Method

1. Confirm repo, branch, baseline, clean tree.
2. Confirm `app/og/preppy/route.tsx` reads `building ?? b` and `app/page.tsx` forwards `b` as `building=`, and that the fix commits (`7fb3546`, `f205ad0`) are in `main`.
3. Identify the Vercel project for the domain if discoverable from the repo (`.vercel`, `vercel.json`) or a connector. No Vercel write actions.
4. Read-only inspection of the live site for the `b=` and `building=` links, reading the OG/title metadata, to observe whether production reflects the `b` fix.
5. Conclude: current / stale / unverifiable, with proof or the precise blocker.

## Constraints

Read-only. No deployment without explicit approval. No texts. No code/data/pricing/send changes. Findings and the next action are documented in `SPRINT-1397-REPORT.md`.

## Outcome

See `SPRINT-1397-REPORT.md`: production is verified **current** for the `b=` preview via live metadata. The remaining risk is iMessage per-URL OG cache, not a deploy gap. Next action is a fresh personalized self-test link, not a re-send of an already-cached URL.
