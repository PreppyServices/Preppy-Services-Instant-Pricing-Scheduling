import { createHash } from "crypto";
import type { UtmParams } from "../batchUtm";
import { utmNote } from "../batchUtm";
import type { OfferedDay } from "./availability";
import { slotEnd } from "./availability";
import { contactValid, needsUnit } from "./contact";
import { quoteGlass } from "./quote";
import { verifySlot, type SlotClaims } from "./token";

export type BookInput = {
  slotToken: string;
  name: string;
  phone: string;
  email: string;
  unit: string;
  notes?: string;
  lead?: string;
  utm?: UtmParams;
  packageId?: string | null;
  gift?: boolean | null;
  promoCode?: string | null;
  /** Ignored. The signed token is the only price. */
  price?: number;
};

export type LineItem = { name: string; unitPrice: number };

export type JobDraft = {
  title: string;
  price: number;
  durationMin: number;
  start: string;
  end: string;
  building: string;
  unit: string;
  line: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  lead: string;
  instructions: string;
  interior: boolean;
  lineItems: LineItem[];
  notifyTeam: false;
  allowReviewRequest: false;
  packageId: string | null;
  gift: boolean | null;
  promoCode: string | null;
};

export type HoldDraft = {
  title: string;
  start: string;
  end: string;
  sendUpdates: "none";
  guests: "none";
};

export type RenameDraft = {
  eventId: string;
  title: string;
  description: string;
  sendUpdates: "none";
  guests: "none";
};

export type BookSuccess = { ok: true; preview: boolean };
export type BookFailure =
  | { ok: false; reason: "slot_taken"; days: OfferedDay[]; more: OfferedDay[] }
  | { ok: false; reason: "invalid" | "failed" };

export type BookResult = BookSuccess | BookFailure;

export function bookingIdempotencyKey(phone: string, start: string): string {
  const digits = phone.replace(/\D/g, "");
  return createHash("sha256").update(`${digits}|${start}`).digest("hex");
}

export async function bookAppointment(
  input: BookInput,
  deps: {
    secret: string;
    writesEnabled: boolean;
    promoOn?: boolean;
    loadOffer: (claims: SlotClaims) => Promise<{ days: OfferedDay[]; more: OfferedDay[]; openStarts: string[] } | null>;
    placeHold: (draft: HoldDraft) => Promise<{ id: string }>;
    deleteHold: (eventId: string) => Promise<void>;
    renameHold: (draft: RenameDraft) => Promise<void>;
    createJob: (draft: JobDraft) => Promise<{ id: string; url: string }>;
    alertJoe: (message: string) => Promise<void>;
    recall: (key: string) => Promise<BookSuccess | null>;
    remember: (key: string, result: BookSuccess) => Promise<void>;
  }
): Promise<BookResult> {
  const claims = verifySlot(input.slotToken, deps.secret);
  if (!claims) return { ok: false, reason: "invalid" };
  const quote = quoteGlass(claims.b, claims.line, claims.interior, claims.intro, deps.promoOn === true);
  if (!quote || quote.total !== claims.price || quote.durationMin !== claims.durationMin) {
    return { ok: false, reason: "invalid" };
  }
  const unit = input.unit.trim();
  if (
    !contactValid({
      name: input.name,
      phone: input.phone,
      email: input.email,
      unit,
      unitRequired: true,
    }) ||
    needsUnit(unit)
  ) {
    return { ok: false, reason: "invalid" };
  }

  const offer = await deps.loadOffer(claims);
  if (!offer) return { ok: false, reason: "failed" };
  const stillOpen = offer.openStarts.includes(claims.start);
  if (!stillOpen) return { ok: false, reason: "slot_taken", days: offer.days, more: offer.more };

  if (!deps.writesEnabled) return { ok: true, preview: true };

  const key = bookingIdempotencyKey(input.phone, claims.start);
  const prior = await deps.recall(key);
  if (prior?.ok) return prior;

  const name = input.name.trim();
  const holdEnd = slotEnd(claims.start, claims.durationMin, true).toISOString();
  const jobEnd = slotEnd(claims.start, claims.durationMin, false).toISOString();
  const notes = (input.notes ?? "").trim();
  const lead = (input.lead ?? "").trim();
  const utm = input.utm ?? {};
  const instructions = [
    `Phone ${input.phone.trim()}`,
    notes ? `Notes ${notes}` : "",
    lead ? `Lead ${lead}` : "",
    utmNote(utm),
    "No charge today.",
    input.packageId ? `Package ${input.packageId}` : "",
    input.gift ? "Gift" : "",
    input.promoCode ? `Promo ${input.promoCode}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const lineItems: LineItem[] = [{ name: "Balcony glass detailing", unitPrice: quote.chargedLine }];
  if (quote.interior) lineItems.push({ name: "Interior glass", unitPrice: quote.interiorAddOn });
  const job: JobDraft = {
    title: `Balcony glass · ${claims.b} ${unit}`,
    price: quote.total,
    durationMin: quote.durationMin,
    start: claims.start,
    end: jobEnd,
    building: claims.b,
    unit,
    line: claims.line,
    name,
    email: input.email.trim(),
    phone: input.phone.trim(),
    notes,
    lead,
    instructions,
    interior: quote.interior,
    lineItems,
    notifyTeam: false,
    allowReviewRequest: false,
    packageId: input.packageId ?? null,
    gift: input.gift ?? null,
    promoCode: input.promoCode ?? null,
  };

  let holdId: string | null = null;
  try {
    const hold = await deps.placeHold({
      title: `HOLD · ${claims.b} ${unit}`,
      start: claims.start,
      end: holdEnd,
      sendUpdates: "none",
      guests: "none",
    });
    holdId = hold.id;
    const created = await deps.createJob(job);
    try {
      await deps.renameHold({
        eventId: hold.id,
        title: `JOB · ${claims.b} ${unit} · ${name}`,
        description: `${created.url}\n${instructions}`,
        sendUpdates: "none",
        guests: "none",
      });
    } catch {
      // The visit is booked. A failed rename does not undo it.
    }
    const result: BookSuccess = { ok: true, preview: false };
    await deps.remember(key, result);
    return result;
  } catch {
    if (holdId) {
      try {
        await deps.deleteHold(holdId);
      } catch {
        // The customer still sees the failure copy.
      }
    }
    try {
      await deps.alertJoe(`Booking failed for ${claims.b} ${unit} at ${claims.start}`);
    } catch {
      // Alert delivery must not change the customer response.
    }
    return { ok: false, reason: "failed" };
  }
}
