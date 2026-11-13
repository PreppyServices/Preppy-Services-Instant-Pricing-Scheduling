/**
 * Ad click IDs and tag scaffolding. Unset env IDs load no scripts.
 */
import { applyClickIds, captureClickIds, readClickIds, sanitizeClickId } from "../lib/clickIds.ts";
import { conversionsApiStatus } from "../lib/capi.ts";
import {
  adsSendTo,
  pageViewEvent,
  scheduleEvent,
  trackingConfigFromEnv,
  trackingEnabled,
  trackingScriptSrcs,
  viewContentEvent,
} from "../lib/trackingConfig.ts";

const failures: string[] = [];
function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

check(sanitizeClickId("person@example.com") === null, "email is not a click id");
check(sanitizeClickId("3055550199") === null, "phone is not a click id");
check(sanitizeClickId("short") === null, "short token dropped");
check(sanitizeClickId("CjwKCAjw_gclid_example") === "CjwKCAjw_gclid_example", "gclid kept");
check(sanitizeClickId("IwAR2fbclidExampleToken") === "IwAR2fbclidExampleToken", "fbclid kept");

const fromUrl = readClickIds("?gclid=CjwKCAjw_gclid_example&fbclid=IwAR2fbclidExampleToken&utm_content=gran_paraiso");
check(fromUrl.gclid === "CjwKCAjw_gclid_example", "gclid read");
check(fromUrl.fbclid === "IwAR2fbclidExampleToken", "fbclid read");
check(!("utm_content" in fromUrl), "utm stays out of click ids");

const storage = new Map<string, string>();
const mem = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
};
const landed = captureClickIds("?GCLID=CjwKCAjw_gclid_example", mem);
check(landed.gclid === "CjwKCAjw_gclid_example", "click id key is case insensitive");
check(storage.get("preppy_click_ids")?.includes("gclid") === true, "stored beside preppy_utm");
check(!storage.has("preppy_utm"), "does not write the utm key");
const kept = captureClickIds("", mem);
check(kept.gclid === "CjwKCAjw_gclid_example", "session keeps the click id");

const params = new URLSearchParams();
applyClickIds(params, fromUrl);
check(params.get("gclid") === fromUrl.gclid, "booking gets gclid");
check(params.get("fbclid") === fromUrl.fbclid, "booking gets fbclid");
applyClickIds(params, { gclid: "person@example.com" });
check(params.get("gclid") === fromUrl.gclid, "email does not replace gclid");

const empty = trackingConfigFromEnv({});
check(!trackingEnabled(empty), "unset env loads nothing");
check(trackingScriptSrcs(empty).length === 0, "unset env has no script urls");

const bad = trackingConfigFromEnv({
  NEXT_PUBLIC_META_PIXEL_ID: "not an id",
  NEXT_PUBLIC_GA4_ID: "UA-123",
  NEXT_PUBLIC_GADS_ID: "https://evil.example",
  NEXT_PUBLIC_GADS_CONVERSION_LABEL: "bad label",
});
check(!trackingEnabled(bad), "malformed ids are ignored");
check(trackingScriptSrcs(bad).length === 0, "malformed ids add no scripts");

const ok = trackingConfigFromEnv({
  NEXT_PUBLIC_META_PIXEL_ID: "1234567890",
  NEXT_PUBLIC_GA4_ID: "G-ABC1234",
  NEXT_PUBLIC_GADS_ID: "AW-123456789",
  NEXT_PUBLIC_GADS_CONVERSION_LABEL: "AbCdEfGh",
});
check(trackingEnabled(ok), "valid ids enable tags");
const srcs = trackingScriptSrcs(ok);
check(srcs.length === 2, "pixel and one gtag script");
check(srcs[0] === "https://connect.facebook.net/en_US/fbevents.js", "meta script");
check(srcs[1].startsWith("https://www.googletagmanager.com/gtag/js?id=G-ABC1234"), "gtag uses ga4 id");
check(adsSendTo(ok) === "AW-123456789/AbCdEfGh", "ads conversion send_to");
check(adsSendTo({ gadsId: "AW-123456789" }) === undefined, "ads label required");

const page = pageViewEvent("evt-page");
check(page.name === "PageView" && page.eventId === "evt-page", "page view carries event id");
const view = viewContentEvent({
  eventId: "evt-view",
  building: "Hyde Midtown Miami",
  line: "10",
  value: 150,
});
check(view.name === "ViewContent" && view.params.value === 150, "view content is the quote");
const booked = scheduleEvent({ eventId: "evt-book", building: "Hyde Midtown Miami", value: 120 });
check(booked.name === "Schedule" && booked.eventId === "evt-book", "booking confirm is Schedule");

const capi = conversionsApiStatus();
check(capi.enabled === false && capi.reason === "not_configured", "capi stays off");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("tracking tag guard passed");
