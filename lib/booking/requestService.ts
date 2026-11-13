import type { UtmParams } from "../batchUtm";
import { utmNote } from "../batchUtm";
import { contactValid } from "./contact";

export type RequestKind = "sunday" | "commercial" | "pressure" | "paint" | "unpriced";

export function requestTitle(kind: RequestKind): string {
  switch (kind) {
    case "sunday":
      return "SUNDAY REQUEST";
    case "commercial":
      return "OVERNIGHT COMMERCIAL";
    case "pressure":
      return "PRESSURE WASHING";
    case "paint":
      return "PAINTING";
    case "unpriced":
      return "QUOTE REQUEST";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export type RequestInput = {
  kind: RequestKind;
  building: string;
  unit?: string;
  name: string;
  phone: string;
  email: string;
  details?: string;
  notes?: string;
  preferredDate?: string;
  lead?: string;
  utm?: UtmParams;
  packageId?: string | null;
  gift?: boolean | null;
  promoCode?: string | null;
  photos?: { name: string }[];
};

export type RequestDraft = {
  title: string;
  building: string;
  unit: string;
  name: string;
  phone: string;
  email: string;
  instructions: string;
  preferredDate: string;
};

export type RequestResult = { ok: true; preview: boolean } | { ok: false; reason: "invalid" | "failed" };

const KINDS = new Set<RequestKind>(["sunday", "commercial", "pressure", "paint", "unpriced"]);

export function isRequestKind(value: string): value is RequestKind {
  return KINDS.has(value as RequestKind);
}

export async function submitRequest(
  input: RequestInput,
  deps: {
    writesEnabled: boolean;
    openDays?: string[];
    createRequest: (draft: RequestDraft) => Promise<{ id: string }>;
  }
): Promise<RequestResult> {
  if (!isRequestKind(input.kind)) return { ok: false, reason: "invalid" };
  const building = input.building.trim();
  const details = (input.details ?? "").trim();
  const photos = input.photos ?? [];
  if (!building) return { ok: false, reason: "invalid" };
  if (!contactValid({ name: input.name, phone: input.phone, email: input.email })) {
    return { ok: false, reason: "invalid" };
  }
  if ((input.kind === "pressure" || input.kind === "paint") && details.length < 3) {
    return { ok: false, reason: "invalid" };
  }
  if (input.kind === "commercial") {
    const day = (input.preferredDate ?? "").trim();
    if (!day || !(deps.openDays ?? []).includes(day)) return { ok: false, reason: "invalid" };
  }
  if (photos.length > 6) return { ok: false, reason: "invalid" };
  if (!deps.writesEnabled) return { ok: true, preview: true };

  const preferredDate = (input.preferredDate ?? "").trim();
  const notes = (input.notes ?? "").trim();
  const instructions = [
    requestTitle(input.kind),
    preferredDate ? `Preferred date ${preferredDate}` : "",
    details ? `Details ${details}` : "",
    notes ? `Notes ${notes}` : "",
    `Phone ${input.phone.trim()}`,
    input.lead ? `Lead ${input.lead}` : "",
    utmNote(input.utm ?? {}),
    photos.length ? `Photos ${photos.map((photo) => photo.name).join(", ")}` : "",
    "No visit held.",
  ]
    .filter(Boolean)
    .join("\n");
  try {
    await deps.createRequest({
      title: requestTitle(input.kind),
      building,
      unit: (input.unit ?? "").trim(),
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      instructions,
      preferredDate,
    });
    return { ok: true, preview: false };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
