import { NextResponse } from "next/server";
import { pricing } from "../../../data/buildings";
import { matchCatalogBuilding } from "../../../lib/catalogBuilding";
import { createAvailability } from "../../../lib/booking/availability";
import { readFeatureFlags, schedulerWritesEnabled } from "../../../lib/booking/flags";
import { hmacSecret } from "../../../lib/booking/token";
import { loadCalendarBusy } from "../../../lib/booking/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const names = Object.keys(pricing);
  const rawBuilding = url.searchParams.get("b") || url.searchParams.get("building") || "";
  const building = matchCatalogBuilding(names, rawBuilding) ?? "";
  const line = url.searchParams.get("line") || "";
  const interior = ["1", "true"].includes((url.searchParams.get("interior") || "").toLowerCase());
  const intro = ["1", "true"].includes((url.searchParams.get("intro") || "").toLowerCase());
  const kind = url.searchParams.get("kind") === "commercial" ? "commercial" : "residential";
  const now = new Date();
  const env = process.env;
  try {
    const calendar = await loadCalendarBusy(env, now);
    const result = createAvailability({
      building,
      line,
      interior,
      intro,
      kind,
      now,
      busy: calendar.busy,
      closedDates: calendar.closed,
      secret: hmacSecret(env),
      promoOn: readFeatureFlags(env).holidayPromo,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ ok: false, reason: "failed" }, { status: 503 });
  }
}
