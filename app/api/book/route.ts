import { NextResponse } from "next/server";
import { pricing } from "../../../data/buildings";
import { matchCatalogBuilding } from "../../../lib/catalogBuilding";
import { createAvailability, type OfferedDay } from "../../../lib/booking/availability";
import { bookAppointment, type BookSuccess } from "../../../lib/booking/bookService";
import { readFeatureFlags, schedulerWritesEnabled } from "../../../lib/booking/flags";
import {
  alertJoe,
  createJobberJob,
  deleteGoogleHold,
  loadCalendarBusy,
  placeGoogleHold,
  renameGoogleHold,
} from "../../../lib/booking/live";
import { hmacSecret, type SlotClaims } from "../../../lib/booking/token";
import type { UtmParams } from "../../../lib/batchUtm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const memory = new Map<string, BookSuccess>();

async function recall(key: string): Promise<BookSuccess | null> {
  return memory.get(key) ?? null;
}

async function remember(key: string, result: BookSuccess): Promise<void> {
  memory.set(key, result);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    slotToken?: string;
    name?: string;
    phone?: string;
    email?: string;
    unit?: string;
    notes?: string;
    lead?: string;
    utm?: UtmParams;
    packageId?: string | null;
    gift?: boolean | null;
    promoCode?: string | null;
    price?: number;
  };
  const env = process.env;
  const writesEnabled = schedulerWritesEnabled(env);
  const flags = readFeatureFlags(env);
  const secret = hmacSecret(env);
  try {
    const result = await bookAppointment(
      {
        slotToken: body.slotToken || "",
        name: body.name || "",
        phone: body.phone || "",
        email: body.email || "",
        unit: body.unit || "",
        notes: body.notes || "",
        lead: body.lead || "",
        utm: body.utm,
        packageId: body.packageId ?? null,
        gift: body.gift ?? null,
        promoCode: body.promoCode ?? null,
        price: body.price,
      },
      {
        secret,
        writesEnabled,
        promoOn: flags.holidayPromo,
        loadOffer: (claims) => reloadOffer(env, claims, flags.holidayPromo, secret),
        placeHold: (draft) => placeGoogleHold(env, draft),
        deleteHold: (eventId) => deleteGoogleHold(env, eventId),
        renameHold: (draft) => renameGoogleHold(env, draft),
        createJob: (draft) => createJobberJob(env, draft),
        alertJoe: (message) => alertJoe(env, message),
        recall,
        remember,
      }
    );
    const status = bookStatus(result);
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json({ ok: false, reason: "failed" }, { status: 500 });
  }
}

function bookStatus(result: { ok: boolean; reason?: string }): number {
  if (result.ok) return 200;
  if (result.reason === "slot_taken") return 409;
  return 400;
}

async function reloadOffer(
  env: NodeJS.ProcessEnv,
  claims: SlotClaims,
  promoOn: boolean,
  secret: string
): Promise<{ days: OfferedDay[]; more: OfferedDay[]; openStarts: string[] } | null> {
  const building = matchCatalogBuilding(Object.keys(pricing), claims.b) ?? claims.b;
  const calendar = await loadCalendarBusy(env, new Date());
  const offer = createAvailability({
    building,
    line: claims.line,
    interior: claims.interior,
    intro: claims.intro,
    kind: "residential",
    now: new Date(),
    busy: calendar.busy,
    closedDates: calendar.closed,
    secret,
    promoOn,
  });
  if (!offer.ok || offer.kind !== "residential") return null;
  return { days: offer.days, more: offer.more, openStarts: offer.openStarts };
}
