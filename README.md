# Preppy Services instant pricing

Quote widget for balcony glass cleaning. Visitors pick a building, see a price, and book a time. The booking is stored by the Apps Script scheduling engine.

## Booking pipeline

The widget still books through the Apps Script `/exec` URL. That write is the primary store. After Apps Script answers, the widget also posts the same booking to `/api/booking/jobber`. The visitor is never shown the result of that post.

Jobber sync does nothing until it is configured. This repository does not create the variables below in Vercel. Set them in the project dashboard only when the Jobber app is ready.

| Variable | Required to sync | Purpose |
| --- | --- | --- |
| `JOBBER_SYNC_ENABLED` | Yes. Must be the string `true`. | Turns the sync on. Any other value, including unset, returns `{ synced: false, reason: "disabled" }`. |
| `JOBBER_CLIENT_ID` | Yes | Jobber app client id. Used only to refresh an access token. |
| `JOBBER_CLIENT_SECRET` | Yes | Jobber app client secret. Used only to refresh an access token. |
| `JOBBER_REFRESH_TOKEN` | Yes | Jobber OAuth refresh token. The route does not write a rotated token back anywhere. |
| `JOBBER_API_VERSION` | No | Sent as `X-JOBBER-GRAPHQL-VERSION`. Defaults to `2025-04-16`. |
| `BOOKING_ALERT_WEBHOOK_URL` | No | If set, the route POSTs `{ bookingId, building, line, slot, status, jobber }` after the attempt. The body has no contact details. Unset means the alert is skipped. |

When sync is disabled, or a required Jobber variable is missing, the route returns HTTP 202 `{ synced: false, reason: "disabled" }` and logs one JSON line with `bookingId`, `building`, and `status` only.

When sync is on, the route refreshes an access token, finds the client by email and then by phone, creates the client when neither matches, and creates a request. The request title is `Widget booking {bookingId or NO-ID} · {building} · line {line} · {slot}`. If Apps Script did not confirm the booking, the title starts with `UNCONFIRMED`. Unit, price, intro flag, phone, email, notes, and UTM go on a request note. The published Jobber `RequestCreateInput` has no `source` field and no note field, so those details are not sent as `source: EXTERNAL`. An open request whose title already contains the same booking id is left as is.

A Jobber failure still returns HTTP 202 `{ synced: false, reason }` and a log line. Tokens, secrets, and contact details are not logged.

The route accepts only `https://quote.preppyservices.com` and `https://*.vercel.app` hosts for this project (`preppy-services-instant-pricing-scheduling`). The JSON body is capped at 8 KB. A name plus a phone or an email is required.
