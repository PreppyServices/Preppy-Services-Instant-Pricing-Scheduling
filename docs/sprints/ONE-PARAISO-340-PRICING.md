# One Paraiso balcony-glass offer

Joe, 2026-11-09 5:27 PM ET: lines **01** and **06** are **$340** before the first-service discount and **$272** after 20%. The $300 offer on those lines is retired. Lines **03** and **04** stay **$280**. No other building, line, or service price changes with this offer.

## How the quote is priced

`https://quote.preppyservices.com` renders `components/PreppyLuxuryWidget.tsx` through `app/WidgetShell.tsx` on `/` and `/november`. The calculator reads `pricing["One Paraiso"].lines` in `data/buildings.ts`. This repository has no price API and no Supabase client. The widget does not load line prices from a database.

The 20% first-service price is `firstServicePrice` in `lib/introPricing.ts` (`Math.round(regular * 0.8)`). It applies when the visit asks for it (`?intro=1`, `?first=1`, `?promo=intro`, the November/holiday flyer params, or `/november`). The on-screen total, the booking-link `quote` parameter, and the in-widget scheduler note all use that same exterior amount. With interior glass off, those paths are $340 or $272.

Interior glass is a separate add-on. Intro quotes add a flat $100. Regular quotes for lines 01 and 06 stay at the previous $100 via `preservedRegularInterior`, so raising the exterior price does not switch those lines onto the $340 catalog tier ($120).

`PreppyLuxuryWidget_FINAL.tsx` is an unimported snapshot and is not the live catalog. `app/b/[building]` has no page, so it is not a customer route.

## Repo to site

| | |
| --- | --- |
| GitHub | `PreppyServices/Preppy-Services-Instant-Pricing-Scheduling` |
| Site | `https://quote.preppyservices.com` |
| Vercel project | `preppy-services-instant-pricing-scheduling` |
| Vercel team | `preppyservices-projects` |

The repo has no `vercel.json` and no `.vercel/project.json`. Existing notes map production to the Git deployment of the default branch on that Vercel project. The Vercel connector on this session returned 403 for team `preppyservices-projects`, so the project id was not re-read from the API. This file records the mapping only. It contains no credentials.
