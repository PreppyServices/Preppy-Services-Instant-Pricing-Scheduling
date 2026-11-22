/**
 * Bid link prefill: URL decoded, trimmed, max 120, HTML escaped as text.
 * Home ?type=storefront keeps the other parameters.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITEMAP_URLS } from "../lib/sitemapUrls.ts";
import { STOREFRONT_COPY, STOREFRONT_DESCRIPTION, STOREFRONT_TITLE } from "../lib/storefrontCopy.ts";
import { STOREFRONT_BUSINESS_TYPES } from "../lib/storefrontPrefill.ts";
import {
  readStorefrontPrefill,
  renderStorefrontText,
  searchParamsFromRecord,
  storefrontHomeRedirect,
  storefrontText,
} from "../lib/storefrontPrefill.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const DASH = /[\u002D\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/;

const panther = readStorefrontPrefill("?biz=Panther%20Coffee&addr=2390%20NW%202nd%20Ave");
check(panther.business === "Panther Coffee", "biz is URL decoded");
check(panther.address === "2390 NW 2nd Ave", "addr is URL decoded");
check(panther.businessType === "", "a missing type does not invent a business type");

const plus = readStorefrontPrefill("biz=Panther+Coffee&addr=+2390+NW+2nd+Ave+");
check(plus.business === "Panther Coffee", "plus signs decode as spaces");
check(plus.address === "2390 NW 2nd Ave", "address is trimmed");

const long = readStorefrontPrefill(`?biz=${encodeURIComponent(`  ${"A".repeat(200)}  `)}`);
check(long.business.length === 120, "business name is cut at 120 characters");
check(storefrontText(`\n\t  Cafe  \n`).length === 4, "control characters are removed and the value is trimmed");

const hostile = "<img src=x onerror=\"alert(1)\">Panther & Coffee";
const escaped = renderStorefrontText(`  ${hostile}  `);
check(storefrontText(hostile) === hostile, "the stored value keeps the characters");
check(escaped === "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;Panther &amp; Coffee", "HTML is escaped");
check(!escaped.includes("<"), "escaped text has no raw tag");
check(!escaped.includes(">"), "escaped text has no raw tag close");

const tagged = readStorefrontPrefill(`?biz=${encodeURIComponent("<b>Panther</b>")}&addr=${encodeURIComponent("<script>alert(1)</script>")}`);
check(tagged.business === "<b>Panther</b>", "a business name stays text, not markup");
check(renderStorefrontText(tagged.business) === "&lt;b&gt;Panther&lt;/b&gt;", "a bold tag renders as text");
check(renderStorefrontText(tagged.address) === "&lt;script&gt;alert(1)&lt;/script&gt;", "a script tag renders as text");

check(readStorefrontPrefill("?type=cafe").businessType === "cafe", "type=cafe preselects cafe");
check(readStorefrontPrefill("?type=Restaurant").businessType === "restaurant", "type matches the label");
check(readStorefrontPrefill("?type=STOREFRONT").businessType === "", "type=storefront is not a business type");
check(readStorefrontPrefill("?type=%3Ccafe%3E").businessType === "", "a tagged type does not preselect");

const home = storefrontHomeRedirect(
  new URLSearchParams("type=storefront&biz=Panther%20Coffee&addr=2390%20NW%202nd%20Ave&utm_source=bid")
);
check(
  home === "/storefront?biz=Panther+Coffee&addr=2390+NW+2nd+Ave&utm_source=bid",
  "home storefront links keep the other parameters"
);
check(storefrontHomeRedirect(new URLSearchParams("type=cafe&biz=A")) === null, "a business type on the home page stays home");
check(storefrontHomeRedirect(new URLSearchParams("")) === null, "a bare home page stays home");

const both = storefrontHomeRedirect(new URLSearchParams("type=storefront&type=cafe&biz=Panther+Coffee"));
check(both === "/storefront?type=cafe&biz=Panther+Coffee", "a business type survives next to the route switch");

const fromRecord = storefrontHomeRedirect(
  searchParamsFromRecord({ type: "storefront", biz: "Panther Coffee", addr: ["2390 NW 2nd Ave"] })
);
check(
  fromRecord === "/storefront?biz=Panther+Coffee&addr=2390+NW+2nd+Ave",
  "repeated and single search params both redirect"
);

const widget = readFileSync(join(process.cwd(), "components/PreppyLuxuryWidget.tsx"), "utf8");
const booking = readFileSync(join(process.cwd(), "components/StorefrontBooking.tsx"), "utf8");
check(widget.includes('href="/storefront"'), "the service tabs link to /storefront");
check(widget.includes("Storefront"), "the tab label is Storefront");
check(!booking.includes("dangerouslySetInnerHTML"), "storefront fields are not injected as HTML");
check(booking.includes("value={businessName}"), "business name is a text input value");
check(booking.includes("value={address}"), "address is a text input value");

check(SITEMAP_URLS.includes("https://quote.preppyservices.com/storefront"), "sitemap lists /storefront");
check(STOREFRONT_TITLE === "Storefront Glass Cleaning Plan | Preppy Services", "page title");
check(!/noindex/i.test(readFileSync(join(process.cwd(), "app/storefront/page.tsx"), "utf8")), "storefront stays indexable");

const visible = [
  ...Object.values(STOREFRONT_COPY),
  STOREFRONT_DESCRIPTION,
  STOREFRONT_TITLE,
  ...STOREFRONT_BUSINESS_TYPES.map((type) => type.label),
];
for (const line of visible) {
  check(!DASH.test(line), `visible copy has a hyphen or dash: ${JSON.stringify(line)}`);
}
const blob = visible.join("\n");
check(blob.includes("Insured."), "the plan says Insured.");
check(!/fully insured/i.test(blob), "the plan does not say fully insured");
check(!/\bbonded\b/i.test(blob), "no bonded claim");
check(!/\blicen[sc]ed\b/i.test(blob), "no license claim");
check(!/workers/i.test(blob), "no workers comp claim");
check(!/inside and outside every visit/i.test(blob), "visits are not inside and outside every time");
check((blob.match(/insured/gi) ?? []).length === 1, "Insured. is the only insurance wording");
check(!/\d(?:\.\d)?\s*stars?/i.test(blob), "no star rating");
check(!/review/i.test(blob), "no review count");
check(!/rating/i.test(blob), "no rating");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("storefront prefill guard passed");
