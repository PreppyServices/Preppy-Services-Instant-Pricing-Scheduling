// Click IDs from ad landing URLs. Stored beside preppy_utm, not inside it.
// Values only: no emails, no phones, and a hard length cap.

export const CLICK_ID_KEYS = ["gclid", "fbclid"] as const;
export type ClickIdKey = (typeof CLICK_ID_KEYS)[number];
export type ClickIds = Partial<Record<ClickIdKey, string>>;

export const CLICK_ID_STORAGE_KEY = "preppy_click_ids";

const MAX_CLICK_ID_LENGTH = 150;

export type ClickIdStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function sanitizeClickId(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!cleaned || cleaned.includes("@")) return null;
  const digits = cleaned.match(/\d/g)?.length ?? 0;
  if (digits >= 10 && cleaned.replace(/\D/g, "").length === cleaned.replace(/[\s().+-]/g, "").length) {
    return null;
  }
  if (!/^[A-Za-z0-9._~-]{8,150}$/.test(cleaned)) return null;
  return cleaned.slice(0, MAX_CLICK_ID_LENGTH);
}

export function readClickIds(search: string): ClickIds {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const out: ClickIds = {};
  for (const key of CLICK_ID_KEYS) {
    let raw: string | null = null;
    for (const [k, v] of params.entries()) {
      if (k.toLowerCase() === key) {
        raw = v;
        break;
      }
    }
    const value = sanitizeClickId(raw);
    if (value) out[key] = value;
  }
  return out;
}

export function hasClickIds(ids: ClickIds): boolean {
  return CLICK_ID_KEYS.some((key) => !!ids[key]);
}

function parseStored(raw: string | null): ClickIds {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const out: ClickIds = {};
    for (const key of CLICK_ID_KEYS) {
      const value = sanitizeClickId(typeof data[key] === "string" ? data[key] : null);
      if (value) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function captureClickIds(search: string, storage: ClickIdStorage | null): ClickIds {
  const fromUrl = readClickIds(search);
  if (hasClickIds(fromUrl)) {
    if (storage) {
      try {
        const payload: ClickIds = {};
        for (const key of CLICK_ID_KEYS) {
          if (fromUrl[key]) payload[key] = fromUrl[key];
        }
        storage.setItem(CLICK_ID_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Storage can be blocked. The booking still proceeds.
      }
    }
    return fromUrl;
  }
  if (!storage) return {};
  try {
    return parseStored(storage.getItem(CLICK_ID_STORAGE_KEY));
  } catch {
    return {};
  }
}

export function applyClickIds(params: URLSearchParams, ids: ClickIds | undefined): void {
  if (!ids) return;
  for (const key of CLICK_ID_KEYS) {
    const value = sanitizeClickId(ids[key]);
    if (value) params.set(key, value);
  }
}
