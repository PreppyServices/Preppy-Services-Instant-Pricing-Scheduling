// Browser tag scaffolding. IDs come from NEXT_PUBLIC_* env vars.
// When an ID is missing or does not match the expected shape, that tag is skipped.

export type TrackingConfig = {
  metaPixelId?: string;
  ga4Id?: string;
  gadsId?: string;
  gadsConversionLabel?: string;
};

export type TrackingEventName = "PageView" | "ViewContent" | "Schedule";

export type TrackingEvent = {
  name: TrackingEventName;
  eventId: string;
  params: Record<string, string | number>;
};

const PIXEL_ID = /^\d{5,20}$/;
const GA4_ID = /^G-[A-Z0-9]{4,24}$/;
const GADS_ID = /^AW-\d{5,20}$/;
const GADS_LABEL = /^[A-Za-z0-9_-]{4,40}$/;

function readId(raw: string | undefined, pattern: RegExp): string | undefined {
  const value = (raw ?? "").trim();
  return pattern.test(value) ? value : undefined;
}

export function trackingConfigFromEnv(env: {
  NEXT_PUBLIC_META_PIXEL_ID?: string;
  NEXT_PUBLIC_GA4_ID?: string;
  NEXT_PUBLIC_GADS_ID?: string;
  NEXT_PUBLIC_GADS_CONVERSION_LABEL?: string;
}): TrackingConfig {
  return {
    metaPixelId: readId(env.NEXT_PUBLIC_META_PIXEL_ID, PIXEL_ID),
    ga4Id: readId(env.NEXT_PUBLIC_GA4_ID, GA4_ID),
    gadsId: readId(env.NEXT_PUBLIC_GADS_ID, GADS_ID),
    gadsConversionLabel: readId(env.NEXT_PUBLIC_GADS_CONVERSION_LABEL, GADS_LABEL),
  };
}

export function publicTrackingConfig(): TrackingConfig {
  return trackingConfigFromEnv({
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    NEXT_PUBLIC_GA4_ID: process.env.NEXT_PUBLIC_GA4_ID,
    NEXT_PUBLIC_GADS_ID: process.env.NEXT_PUBLIC_GADS_ID,
    NEXT_PUBLIC_GADS_CONVERSION_LABEL: process.env.NEXT_PUBLIC_GADS_CONVERSION_LABEL,
  });
}

export function trackingEnabled(config: TrackingConfig): boolean {
  return !!(config.metaPixelId || config.ga4Id || config.gadsId);
}

/** Script URLs that would be inserted. Empty when nothing is configured. */
export function trackingScriptSrcs(config: TrackingConfig): string[] {
  const srcs: string[] = [];
  if (config.metaPixelId) srcs.push("https://connect.facebook.net/en_US/fbevents.js");
  const gtagId = config.ga4Id || config.gadsId;
  if (gtagId) {
    srcs.push(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagId)}`);
  }
  return srcs;
}

export function newEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function pageViewEvent(eventId: string): TrackingEvent {
  return { name: "PageView", eventId, params: {} };
}

export function viewContentEvent(input: {
  eventId: string;
  building: string;
  line: string;
  value: number;
}): TrackingEvent {
  return {
    name: "ViewContent",
    eventId: input.eventId,
    params: {
      content_name: input.building,
      content_category: input.line,
      value: input.value,
      currency: "USD",
    },
  };
}

export function scheduleEvent(input: {
  eventId: string;
  building: string;
  value: number | null;
}): TrackingEvent {
  const params: Record<string, string | number> = {
    content_name: input.building,
    currency: "USD",
  };
  if (input.value != null) params.value = input.value;
  return { name: "Schedule", eventId: input.eventId, params };
}

export function adsSendTo(config: TrackingConfig): string | undefined {
  if (!config.gadsId || !config.gadsConversionLabel) return undefined;
  return `${config.gadsId}/${config.gadsConversionLabel}`;
}
