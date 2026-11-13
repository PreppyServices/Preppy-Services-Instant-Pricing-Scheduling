"use client";

import { useEffect } from "react";
import {
  adsSendTo,
  newEventId,
  pageViewEvent,
  publicTrackingConfig,
  scheduleEvent,
  trackingEnabled,
  trackingScriptSrcs,
  viewContentEvent,
  type TrackingConfig,
  type TrackingEvent,
} from "../lib/trackingConfig";

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string };
type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

const config: TrackingConfig = publicTrackingConfig();
const queue: TrackingEvent[] = [];
let started = false;
let ready = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("tracking script"));
    document.head.appendChild(script);
  });
}

function installMeta(pixelId: string) {
  if (window.fbq) return;
  const fbq = function (this: Fbq, ...args: unknown[]) {
    if (typeof (fbq as Fbq & { callMethod?: (...a: unknown[]) => void }).callMethod === "function") {
      (fbq as Fbq & { callMethod: (...a: unknown[]) => void }).callMethod(...args);
    } else {
      fbq.queue?.push(args);
    }
  } as Fbq;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;
  void loadScript("https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", pixelId);
}

function installGtag(configId: string) {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
  }
  void loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(configId)}`);
  window.gtag("config", configId);
}

function send(event: TrackingEvent) {
  if (config.metaPixelId && window.fbq) {
    const payload = event.name === "PageView" ? {} : event.params;
    window.fbq("track", event.name, payload, { eventID: event.eventId });
  }
  if (config.ga4Id && window.gtag && event.name !== "PageView") {
    const gaName = event.name === "ViewContent" ? "view_item" : "generate_lead";
    window.gtag("event", gaName, { ...event.params, event_id: event.eventId });
  }
  const sendTo = adsSendTo(config);
  if (sendTo && window.gtag && event.name === "Schedule") {
    window.gtag("event", "conversion", {
      send_to: sendTo,
      transaction_id: event.eventId,
      value: event.params.value,
      currency: "USD",
    });
  }
}

function flush() {
  ready = true;
  const page = pageViewEvent(newEventId());
  send(page);
  for (const event of queue.splice(0)) send(event);
}

function boot() {
  if (started || !trackingEnabled(config)) return;
  started = true;
  if (config.metaPixelId) installMeta(config.metaPixelId);
  const gtagId = config.ga4Id || config.gadsId;
  if (gtagId) {
    installGtag(gtagId);
    if (config.gadsId && config.gadsId !== gtagId && window.gtag) {
      window.gtag("config", config.gadsId);
    }
  }
  flush();
}

function enqueue(event: TrackingEvent) {
  if (!trackingEnabled(config)) return;
  if (ready) {
    send(event);
    return;
  }
  queue.push(event);
  armTracking();
}

export function armTracking() {
  if (typeof window === "undefined" || !trackingEnabled(config) || started) return;
  const run = () => boot();
  const onInteract = () => {
    window.removeEventListener("pointerdown", onInteract);
    window.removeEventListener("keydown", onInteract);
    run();
  };
  window.addEventListener("pointerdown", onInteract, { once: true, passive: true });
  window.addEventListener("keydown", onInteract, { once: true });
  const idle = window.requestIdleCallback;
  if (typeof idle === "function") idle(() => run(), { timeout: 4000 });
  else window.setTimeout(run, 4000);
}

export function trackQuoteView(input: { building: string; line: string; value: number }) {
  enqueue(
    viewContentEvent({
      eventId: newEventId(),
      building: input.building,
      line: input.line,
      value: input.value,
    })
  );
}

export function trackSchedule(input: { building: string; value: number | null }) {
  enqueue(
    scheduleEvent({
      eventId: newEventId(),
      building: input.building,
      value: input.value,
    })
  );
}

export function QuoteTracking() {
  useEffect(() => {
    armTracking();
  }, []);
  return null;
}

export function configuredScriptSrcs(): string[] {
  return trackingScriptSrcs(config);
}
