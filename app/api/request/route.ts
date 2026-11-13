import { NextResponse } from "next/server";
import { schedulerWritesEnabled } from "../../../lib/booking/flags";
import { loadCalendarBusy } from "../../../lib/booking/live";
import { createJobberRequest } from "../../../lib/booking/live";
import { commercialOpenDates } from "../../../lib/booking/rules";
import {
  isRequestKind,
  submitRequest,
  type RequestInput,
  type RequestKind,
} from "../../../lib/booking/requestService";
import type { UtmParams } from "../../../lib/batchUtm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const env = process.env;
  const writesEnabled = schedulerWritesEnabled(env);
  let payload: RequestInput;
  try {
    payload = await readPayload(request);
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  let openDays: string[] = [];
  if (payload.kind === "commercial") {
    try {
      const calendar = await loadCalendarBusy(env, new Date());
      openDays = commercialOpenDates(new Date(), calendar.closed);
    } catch {
      if (writesEnabled) return NextResponse.json({ ok: false, reason: "failed" }, { status: 503 });
    }
  }
  const result = await submitRequest(payload, {
    writesEnabled,
    openDays,
    createRequest: (draft) => createJobberRequest(env, draft),
  });
  const status = requestStatus(result);
  return NextResponse.json(result, { status });
}

function requestStatus(result: { ok: boolean; reason?: string }): number {
  if (result.ok) return 200;
  if (result.reason === "failed") return 502;
  return 400;
}

async function readPayload(request: Request): Promise<RequestInput> {
  const type = request.headers.get("content-type") || "";
  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const photos: { name: string }[] = [];
    for (const entry of form.getAll("photos")) {
      if (typeof entry === "string") continue;
      if (entry.size > 8_000_000) throw new Error("photo");
      photos.push({ name: entry.name || "photo" });
    }
    return {
      kind: kindOf(form.get("kind")),
      building: text(form.get("building")),
      unit: text(form.get("unit")),
      name: text(form.get("name")),
      phone: text(form.get("phone")),
      email: text(form.get("email")),
      details: text(form.get("details")),
      notes: text(form.get("notes")),
      preferredDate: text(form.get("preferredDate")),
      lead: text(form.get("lead")),
      utm: parseUtm(text(form.get("utm"))),
      packageId: text(form.get("packageId")) || null,
      gift: text(form.get("gift")) === "true",
      promoCode: text(form.get("promoCode")) || null,
      photos,
    };
  }
  const body = (await request.json()) as Partial<RequestInput>;
  return {
    kind: kindOf(body.kind),
    building: body.building || "",
    unit: body.unit || "",
    name: body.name || "",
    phone: body.phone || "",
    email: body.email || "",
    details: body.details || "",
    notes: body.notes || "",
    preferredDate: body.preferredDate || "",
    lead: body.lead || "",
    utm: body.utm,
    packageId: body.packageId ?? null,
    gift: body.gift ?? null,
    promoCode: body.promoCode ?? null,
    photos: body.photos ?? [],
  };
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function kindOf(value: unknown): RequestKind {
  const raw = String(value || "");
  return isRequestKind(raw) ? raw : "unpriced";
}

function parseUtm(raw: string): UtmParams | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as UtmParams;
  } catch {
    return undefined;
  }
}
