// Batch-link attribution for the quote widget.
//
// SMS links carry utm_source, utm_medium, utm_campaign, utm_content, and
// sometimes utm_term. The widget keeps those values for the browser tab and
// sends them with the residential booking. The Apps Script engine has no
// separate notes column, so the same values are also appended to plan and
// service, which is where unit, price, and resident notes already travel.

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmParams = Partial<Record<UtmKey, string>>;

export const UTM_STORAGE_KEY = "preppy_utm";

const MAX_UTM_LENGTH = 80;

export type UtmStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function sanitizeUtmValue(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, "").trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  // Values only. An email or a phone number is not a batch slug.
  if (cleaned.includes("@")) return null;
  const digitCount = cleaned.match(/\d/g)?.length ?? 0;
  if (digitCount >= 10) return null;
  const stripped = cleaned.replace(/[^A-Za-z0-9 ._-]/g, "").trim().replace(/\s+/g, " ");
  if (!stripped) return null;
  return stripped.slice(0, MAX_UTM_LENGTH).trim() || null;
}

export function readUtmSearch(search: string): UtmParams {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const byKey = new Map<string, string>();
  for (const [key, value] of params.entries()) {
    const normal = key.toLowerCase();
    if (!byKey.has(normal)) byKey.set(normal, value);
  }
  const out: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = sanitizeUtmValue(byKey.get(key) ?? null);
    if (value) out[key] = value;
  }
  return out;
}

export function hasUtm(utm: UtmParams): boolean {
  return UTM_KEYS.some((key) => !!utm[key]);
}

export function parseStoredUtm(raw: string | null): UtmParams {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== "object") return {};
    const out: UtmParams = {};
    for (const key of UTM_KEYS) {
      const value = sanitizeUtmValue(typeof data[key] === "string" ? data[key] : null);
      if (value) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function readSessionUtm(storage: UtmStorage | null): UtmParams {
  if (!storage) return {};
  try {
    return parseStoredUtm(storage.getItem(UTM_STORAGE_KEY));
  } catch {
    return {};
  }
}

export function writeSessionUtm(storage: UtmStorage | null, utm: UtmParams): void {
  if (!storage || !hasUtm(utm)) return;
  try {
    const payload: UtmParams = {};
    for (const key of UTM_KEYS) {
      if (utm[key]) payload[key] = utm[key];
    }
    storage.setItem(UTM_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Private mode and blocked storage should not stop a quote.
  }
}

/**
 * Landing URL wins when it carries any UTM value. A later in-page load with
 * no UTM params keeps the values already stored for this tab.
 */
export function captureLandingUtm(search: string, storage: UtmStorage | null): UtmParams {
  const fromUrl = readUtmSearch(search);
  if (hasUtm(fromUrl)) {
    writeSessionUtm(storage, fromUrl);
    return fromUrl;
  }
  return readSessionUtm(storage);
}

/** Drop a UTM value that is actually the resident's name, email, or phone. */
export function utmSafeForRecord(
  utm: UtmParams,
  blocked: Array<string | null | undefined>
): UtmParams {
  const banned = new Set(
    blocked
      .map((value) => (value ?? "").trim().toLowerCase())
      .filter((value) => value.length > 0)
  );
  const out: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = sanitizeUtmValue(utm[key]);
    if (!value) continue;
    if (banned.has(value.trim().toLowerCase())) continue;
    out[key] = value;
  }
  return out;
}

export function utmNote(utm: UtmParams): string {
  return UTM_KEYS.filter((key) => utm[key])
    .map((key) => `${key} ${utm[key]}`)
    .join(" · ");
}

export function applyUtmToService(service: string, utm: UtmParams): string {
  const note = utmNote(utm);
  if (!note) return service;
  return service ? `${service} · ${note}` : note;
}

export function applyUtmToParams(params: URLSearchParams, utm: UtmParams): void {
  for (const key of UTM_KEYS) {
    const value = utm[key];
    if (value) params.set(key, value);
  }
}

export type ResidentialBookInput = {
  start: string;
  building: string;
  name: string;
  email: string;
  phone: string;
  unitLine: string;
  unit: string;
  total: number | null;
  glassIntro: boolean;
  note: string;
  serviceType: string;
  leadId: string | null;
  utm: UtmParams;
};

/**
 * Query string for the shared scheduling engine. With an empty UTM object the
 * fields match the previous booking request. Batch values are added as their
 * own parameters and on plan/service.
 */
export function buildResidentialBookQuery(input: ResidentialBookInput): URLSearchParams {
  const utm = utmSafeForRecord(input.utm, [input.name, input.email, input.phone]);
  const svc = applyUtmToService(
    (input.serviceType === "glass" ? "Balcony glass cleaning" : "Residential service") +
      (input.building ? " · " + input.building : "") +
      (input.unitLine ? " · line " + input.unitLine : "") +
      (input.unit ? " · Unit " + input.unit : "") +
      (input.total ? " · $" + input.total + (input.glassIntro ? " first service" : "") : "") +
      (input.note ? " · Notes: " + input.note : ""),
    utm
  );
  const addr = [input.building, input.unit ? "Unit " + input.unit : ""].filter(Boolean).join(" · ");
  const params = new URLSearchParams();
  params.set("mode", "book");
  params.set("type", "residential");
  params.set("start", input.start);
  if (input.building) params.set("business", input.building);
  params.set("name", input.name);
  params.set("contact", input.name);
  params.set("email", input.email);
  params.set("phone", input.phone);
  if (addr) params.set("address", addr);
  params.set("plan", svc);
  params.set("service", svc);
  params.set("signer", input.name);
  params.set("signedType", "typed");
  if (input.leadId) params.set("lead", input.leadId);
  applyUtmToParams(params, utm);
  return params;
}
