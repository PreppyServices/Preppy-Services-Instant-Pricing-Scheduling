// Storefront booking uses the same Apps Script mode=book request as the
// residential widget. The script builds the calendar title from `service`.
// `plan` stays the approved line. The full request summary rides on `notes`.

import type { UtmParams } from "./batchUtm";

export const STOREFRONT_PLAN =
  "Storefront $240 a month, 4 visits a month, 3 exterior, 1 inside and out";

export const STOREFRONT_INFO_EMAIL = "info@preppyservices.com";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type StorefrontBookInput = {
  start: string;
  slotLabel: string;
  business: string;
  businessType: string;
  address: string;
  name: string;
  email: string;
  phone: string;
  utm?: UtmParams;
};

export function storefrontCalendarTitle(business: string): string {
  return `STOREFRONT: ${business}`;
}

/** Calendar title source. The script uses service, then name, then address. */
export function storefrontServiceTitle(business: string): string {
  return `${business} · Storefront $240 · Flag to Geoffrey for Jobber`;
}

export function storefrontSummary(input: StorefrontBookInput): string {
  return [
    "STOREFRONT REQUEST. Flag to Geoffrey for Jobber.",
    `Business: ${input.business}.`,
    `Type: ${input.businessType}.`,
    `Address: ${input.address}.`,
    `Slot: ${input.slotLabel}.`,
    `Contact: ${input.name}, ${input.email}, ${input.phone}.`,
  ].join(" ");
}

export function buildStorefrontBookQuery(input: StorefrontBookInput): URLSearchParams {
  const summary = storefrontSummary(input);
  const params = new URLSearchParams();
  params.set("mode", "book");
  params.set("type", "storefront");
  params.set("start", input.start);
  params.set("business", storefrontCalendarTitle(input.business));
  params.set("name", input.name);
  params.set("contact", input.name);
  params.set("email", input.email);
  params.set("phone", input.phone);
  params.set("address", input.address);
  params.set("plan", STOREFRONT_PLAN);
  params.set("service", storefrontServiceTitle(input.business));
  params.set("notes", summary);
  params.set("signer", input.name);
  params.set("signedType", "typed");
  params.set("businessType", input.businessType);
  const utm = input.utm ?? {};
  for (const key of UTM_KEYS) {
    const value = utm[key];
    if (value) params.set(key, value);
  }
  return params;
}

export function isStorefrontEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

export function isStorefrontPhone(raw: string): boolean {
  return raw.replace(/\D/g, "").length === 10;
}

export function storefrontMailto(input: StorefrontBookInput): string {
  const body = [
    storefrontSummary(input),
    `Service: ${storefrontServiceTitle(input.business)}`,
    `Plan: ${STOREFRONT_PLAN}`,
    `Date: ${input.slotLabel}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone}`,
  ].join("\n");
  const params = new URLSearchParams();
  params.set("subject", "Booking request");
  params.set("body", body);
  return `mailto:${STOREFRONT_INFO_EMAIL}?${params.toString()}`;
}
