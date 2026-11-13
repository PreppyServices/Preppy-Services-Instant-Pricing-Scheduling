import { createHmac, timingSafeEqual } from "crypto";

export type SlotClaims = {
  start: string;
  durationMin: number;
  price: number;
  b: string;
  line: string;
  interior: boolean;
  intro: boolean;
  exp: number;
};

export function signSlot(claims: SlotClaims, secret: string): string {
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySlot(token: string, secret: string): SlotClaims | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SlotClaims;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.start !== "string" || Number.isNaN(new Date(parsed.start).getTime())) return null;
    if (typeof parsed.durationMin !== "number" || typeof parsed.price !== "number") return null;
    if (typeof parsed.b !== "string" || typeof parsed.line !== "string") return null;
    if (typeof parsed.interior !== "boolean" || typeof parsed.intro !== "boolean") return null;
    if (typeof parsed.exp !== "number") return null;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Server-only. Writes stay off unless BOOKING_HMAC_SECRET is set, so this fallback cannot authorize a live booking. */
export function hmacSecret(env: Record<string, string | undefined>): string {
  if (env.BOOKING_HMAC_SECRET) return env.BOOKING_HMAC_SECRET;
  return "preview-writes-off";
}
