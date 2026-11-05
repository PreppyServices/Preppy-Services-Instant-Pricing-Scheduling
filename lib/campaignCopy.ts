// Customer-facing November campaign copy.
// Titles, descriptions, kickers, and preview-card lines must not contain
// hyphens or dashes. Separators are middle dots.

const DASH = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212-]/g;

export const QUOTE_ORIGIN = "https://quote.preppyservices.com";

export const NOVEMBER_DESCRIPTION =
  "Select your Miami building and unit line for instant balcony glass, floors, frames, and railing pricing.";

export const NOVEMBER_HEADLINE = "Holiday Balcony Cleaning";
export const NOVEMBER_CTA = "Click Here to Get Your Unit Pricing ›";
export const NOVEMBER_KICKER_FALLBACK = "Preppy Services · Miami";

export function novemberTitle(firstName: string): string {
  return firstName
    ? `Prepared for ${firstName} · Click Here to Get Your Unit Pricing`
    : "Preppy Services · Click Here to Get Your Unit Pricing";
}

export function novemberKicker(firstName: string): string {
  return firstName ? `Prepared for ${firstName}` : NOVEMBER_KICKER_FALLBACK;
}

/** Display label for a verified building, with hyphens rewritten out of the card. */
export function campaignBuildingLabel(name: string): string {
  return name
    .replace(/\s+[\u2010\u2011\u2012\u2013\u2014\u2015\u2212-]\s+/g, " · ")
    .replace(DASH, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+·\s+/g, " · ")
    .trim();
}

export function novemberSubline(building: string): string {
  const place = building ? campaignBuildingLabel(building) : "All Miami Buildings";
  return `${place} · Glass · Floors · Frames · Railing`;
}

/**
 * Trim a customer name, drop punctuation that is not part of a name, and
 * title-case tokens that arrived in all lowercase or all uppercase.
 * Mixed-case tokens such as McKay are preserved.
 */
export function sanitizeCampaignName(raw: string | null | undefined): string {
  if (!raw) return "";
  const cleaned = raw
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(DASH, " ")
    .replace(/[^\p{L}\p{M}'’.\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48)
    .trim();
  if (!cleaned) return "";
  return cleaned.split(" ").map(presentToken).filter(Boolean).join(" ");
}

export function campaignFirstName(raw: string | null | undefined): string {
  return sanitizeCampaignName(raw).split(" ")[0] || "";
}

export function sanitizeCampaignUnit(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(DASH, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
}

function presentToken(token: string): string {
  const core = token.replace(/[^\p{L}]/gu, "");
  if (!core) return "";
  const hasLower = /\p{Ll}/u.test(core);
  const hasUpper = /\p{Lu}/u.test(core);
  if (hasLower && hasUpper) return token;
  const lower = token.toLocaleLowerCase("en-US");
  return lower.replace(/(^|['’])(\p{L})/gu, (_match, pre: string, ch: string) => {
    return pre + ch.toLocaleUpperCase("en-US");
  });
}

export function isNovemberOgRequest(mode: string, campaign: string): boolean {
  return mode.trim().toLowerCase() === "november" || campaign.trim().toLowerCase() === "nov20";
}

/** Versioned preview image. `v=3` busts aggressive iMessage image caches. */
export function novemberOgImageUrl(opts: {
  name?: string;
  building?: string;
  unit?: string;
}): string {
  const qs = new URLSearchParams();
  qs.set("mode", "november");
  qs.set("v", "3");
  if (opts.name) qs.set("name", opts.name);
  if (opts.building) qs.set("b", opts.building);
  if (opts.building && opts.unit) qs.set("unit", opts.unit);
  return `${QUOTE_ORIGIN}/og/preppy?${qs.toString()}`;
}
