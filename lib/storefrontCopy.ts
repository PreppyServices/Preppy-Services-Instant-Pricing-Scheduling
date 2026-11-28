// Customer facing storefront copy and the mode=book payload.
// No hyphens, dashes, ratings, or insurance wording beyond "Certificate of insurance on request."
// Monthly amounts are the approved tier prices. They are never discounted.
// The Apps Script builds the calendar title from `service`. `plan` is the
// chosen tier and price. The full request summary rides on `notes`.

import type { UtmParams } from "./batchUtm";

export const STOREFRONT_TITLE = "Storefront Glass Cleaning Plan | Preppy Services";

export const STOREFRONT_DESCRIPTION =
  "Monthly storefront glass cleaning in Miami. Tiny storefronts are $240 a month, medium storefronts are $400 a month, and large or flagship storefronts are $600 a month. Each plan is 4 visits a month, 3 exterior only and 1 inside and out. Larger or unclear sizes are priced after a walk by.";

export const STOREFRONT_CANONICAL = "https://quote.preppyservices.com/storefront";

export const STOREFRONT_VISIT_MIX =
  "4 visits a month, 3 exterior only and 1 inside and out";

export const STOREFRONT_TIERS = {
  tiny: {
    id: "tiny",
    name: "Tiny storefront",
    detail: "under about 22 ft of glass",
    priceLabel: "$240 a month",
    monthly: 240,
  },
  medium: {
    id: "medium",
    name: "Medium storefront",
    detail: "about 25 to 45 ft of glass",
    priceLabel: "$400 a month",
    monthly: 400,
  },
  large: {
    id: "large",
    name: "Large storefront or flagship",
    detail: "about 50 ft of glass or more",
    priceLabel: "$600 a month",
    monthly: 600,
  },
  walkby: {
    id: "walkby",
    name: "Not sure / larger, price after a walk by",
    detail: "",
    priceLabel: null,
    monthly: null,
  },
} as const;

export const STOREFRONT_TIER_LIST = [
  STOREFRONT_TIERS.tiny,
  STOREFRONT_TIERS.medium,
  STOREFRONT_TIERS.large,
  STOREFRONT_TIERS.walkby,
] as const;

export type StorefrontTier = (typeof STOREFRONT_TIER_LIST)[number];
export type StorefrontTierId = StorefrontTier["id"];

export function storefrontTierById(id: StorefrontTierId): StorefrontTier {
  switch (id) {
    case "tiny":
      return STOREFRONT_TIERS.tiny;
    case "medium":
      return STOREFRONT_TIERS.medium;
    case "large":
      return STOREFRONT_TIERS.large;
    case "walkby":
      return STOREFRONT_TIERS.walkby;
    default: {
      const unexpected: never = id;
      throw new Error(`Unknown storefront tier ${String(unexpected)}`);
    }
  }
}

export const STOREFRONT_COPY = {
  brand: "Preppy Services",
  title: "Storefront glass",
  subtitle: "Monthly glass cleaning for your shop.",
  method: "Trusted, careful glass and home care.",
  businessTypeLabel: "Business type",
  sizeLabel: "Storefront size",
  visitMix: STOREFRONT_VISIT_MIX,
  insured: "Certificate of insurance on request.",
  firstVisit: "First visit",
  slotHint: "Morning times, Monday to Saturday.",
  loadingSlots: "Loading mornings",
  noSlots: "No morning is open in the next 14 days. Email us and we will place you.",
  retry: "Try again",
  moreTimes: "More times",
  yourName: "Your name",
  businessName: "Business name",
  businessAddress: "Business address",
  email: "Email",
  phone: "Phone",
  submit: "Reserve my first visit",
  sending: "Reserving",
  confirmation: "Thanks! We'll text you to confirm your first visit.",
  error: "Could not reserve. Please try again, or email us.",
  emailFallback: "Email my booking to info@preppyservices.com",
  pickType: "Pick a business type.",
  pickTier: "Pick a storefront size.",
  pickSlot: "Pick a morning time.",
  needName: "Add your name.",
  needBusiness: "Add the business name.",
  needAddress: "Add the business address.",
  needEmail: "Add a valid email.",
  needPhone: "Add a 10 digit phone number.",
} as const;

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
  tierId: StorefrontTierId;
  utm?: UtmParams;
};

export function storefrontCalendarTitle(business: string): string {
  return `STOREFRONT: ${business}`;
}

export function storefrontPlanLine(tier: StorefrontTier): string {
  if (tier.priceLabel == null || tier.monthly == null) {
    return `${tier.name}, ${STOREFRONT_VISIT_MIX}`;
  }
  return `${tier.name}, ${tier.priceLabel}, ${STOREFRONT_VISIT_MIX}`;
}

/** Calendar title source. The script uses service, then name, then address. */
export function storefrontServiceTitle(business: string, tier: StorefrontTier): string {
  if (tier.monthly == null) {
    return `${business} · ${tier.name} · Flag to Geoffrey for Jobber`;
  }
  return `${business} · ${tier.name} $${tier.monthly} · Flag to Geoffrey for Jobber`;
}

export function storefrontSizeNote(tier: StorefrontTier): string {
  if (tier.priceLabel == null || tier.monthly == null) {
    return `Size: ${tier.name}.`;
  }
  const size = tier.detail ? `${tier.name}, ${tier.detail}` : tier.name;
  return `Size: ${size}. Price: ${tier.priceLabel}.`;
}

export function storefrontSummary(input: StorefrontBookInput): string {
  const tier = storefrontTierById(input.tierId);
  return [
    "STOREFRONT REQUEST. Flag to Geoffrey for Jobber.",
    `Business: ${input.business}.`,
    `Type: ${input.businessType}.`,
    `Address: ${input.address}.`,
    storefrontSizeNote(tier),
    `Slot: ${input.slotLabel}.`,
    `Contact: ${input.name}, ${input.email}, ${input.phone}.`,
  ].join(" ");
}

export function buildStorefrontBookQuery(input: StorefrontBookInput): URLSearchParams {
  const tier = storefrontTierById(input.tierId);
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
  params.set("plan", storefrontPlanLine(tier));
  params.set("service", storefrontServiceTitle(input.business, tier));
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
  const tier = storefrontTierById(input.tierId);
  const body = [
    storefrontSummary(input),
    `Service: ${storefrontServiceTitle(input.business, tier)}`,
    `Plan: ${storefrontPlanLine(tier)}`,
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
