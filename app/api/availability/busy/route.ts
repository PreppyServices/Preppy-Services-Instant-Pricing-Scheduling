import { handleAvailabilityBusy } from "../../../../lib/jobberBusyFeed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handleAvailabilityBusy({
    icsUrl: process.env.JOBBER_ICS_URL,
    fetch,
    nowMs: Date.now(),
    warn: (line) => {
      console.warn(line);
    },
  });
}
