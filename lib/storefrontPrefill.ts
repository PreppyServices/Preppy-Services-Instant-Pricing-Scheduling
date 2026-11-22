// Bid link prefill. Values are decoded by URLSearchParams, trimmed, and cut
// at 120 characters. They stay plain text. escapeHtml is the HTML form of
// the same text for any sink that would otherwise parse markup.

export const STOREFRONT_TEXT_MAX = 120;

export const STOREFRONT_BUSINESS_TYPES = [
  { value: "shop", label: "Shop" },
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Cafe" },
  { value: "gallery", label: "Gallery" },
  { value: "showroom", label: "Showroom" },
  { value: "museum", label: "Museum" },
  { value: "other", label: "Other" },
] as const;

export type StorefrontBusinessType = (typeof STOREFRONT_BUSINESS_TYPES)[number]["value"];

export type StorefrontPrefill = {
  business: string;
  address: string;
  businessType: StorefrontBusinessType | "";
};

export function storefrontText(raw: string | null | undefined): string {
  if (raw == null) return "";
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  return cleaned.slice(0, STOREFRONT_TEXT_MAX).trim();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** HTML escaped text. Render this, or render storefrontText as a text node. */
export function renderStorefrontText(raw: string | null | undefined): string {
  return escapeHtml(storefrontText(raw));
}

export function matchBusinessType(raw: string | null | undefined): StorefrontBusinessType | "" {
  const cleaned = storefrontText(raw).toLowerCase();
  if (!cleaned) return "";
  const hit = STOREFRONT_BUSINESS_TYPES.find(
    (type) => type.value === cleaned || type.label.toLowerCase() === cleaned
  );
  return hit ? hit.value : "";
}

export function businessTypeLabel(value: string): string {
  const hit = STOREFRONT_BUSINESS_TYPES.find((type) => type.value === value);
  return hit ? hit.label : "";
}

export function readStorefrontPrefill(search: string): StorefrontPrefill {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    business: storefrontText(params.get("biz")),
    address: storefrontText(params.get("addr")),
    businessType: matchBusinessType(params.get("type")),
  };
}

function appendAll(target: URLSearchParams, key: string, value: string | string[] | undefined) {
  if (typeof value === "string") {
    target.append(key, value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) target.append(key, item);
  }
}

export function searchParamsFromRecord(
  record: Record<string, string | string[] | undefined>
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) appendAll(params, key, value);
  return params;
}

/**
 * Home page `?type=storefront` opens the storefront flow.
 * Every other parameter is kept. A type value that is not the word
 * storefront stays, so a business type can still preselect.
 */
export function storefrontHomeRedirect(params: URLSearchParams): string | null {
  const types = params.getAll("type");
  if (!types.some((value) => value.trim().toLowerCase() === "storefront")) return null;
  const next = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (key.toLowerCase() === "type" && value.trim().toLowerCase() === "storefront") continue;
    next.append(key, value);
  }
  const qs = next.toString();
  return qs ? `/storefront?${qs}` : "/storefront";
}
