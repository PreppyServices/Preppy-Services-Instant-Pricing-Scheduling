import { busyInHorizon, parseIcsBusy, type BusyBlock } from "./jobberBusy";

export const JOBBER_ICS_TIMEOUT_MS = 3000;
export const JOBBER_BUSY_WARN = "jobber busy feed unavailable";

const MAX_REDIRECTS = 5;
const HOST_SUFFIX = ".getjobber.com";

export type BusyFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type BusyFeedDeps = {
  icsUrl: string | undefined;
  fetch: BusyFetch;
  nowMs: number;
  warn: (line: string) => void;
  timeoutMs?: number;
};

/**
 * HTTPS Jobber calendar hosts only. The query string is preserved so a feed
 * token still works, and that URL is never written into the response or the warn line.
 */
export function allowedJobberIcsUrl(raw: string): URL | null {
  if (!raw || /[\s\u0000-\u001f\\]/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port !== "") return null;
  const host = url.hostname.toLowerCase();
  if (!host.endsWith(HOST_SUFFIX)) return null;
  const prefix = host.slice(0, -HOST_SUFFIX.length);
  if (!prefix || prefix.startsWith(".") || prefix.endsWith(".")) return null;
  if (host.split(".").some((label) => label.length === 0)) return null;
  return url;
}

export async function handleAvailabilityBusy(deps: BusyFeedDeps): Promise<Response> {
  const icsUrl = deps.icsUrl?.trim() ?? "";
  if (!icsUrl) {
    return Response.json(
      { ok: true, source: "disabled", busy: [] satisfies BusyBlock[] },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
  try {
    const ics = await readIcs(icsUrl, deps.fetch, deps.timeoutMs ?? JOBBER_ICS_TIMEOUT_MS);
    if (!/BEGIN:VCALENDAR/i.test(ics)) throw new Error("unavailable");
    const busy = busyInHorizon(parseIcsBusy(ics), deps.nowMs);
    return Response.json(
      {
        ok: true,
        source: "jobber-ics",
        busy,
        fetchedAt: new Date(deps.nowMs).toISOString(),
      },
      {
        status: 200,
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      }
    );
  } catch {
    deps.warn(JOBBER_BUSY_WARN);
    return Response.json(
      { ok: false, source: "error", busy: [] satisfies BusyBlock[] },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}

async function readIcs(rawUrl: string, fetchImpl: BusyFetch, timeoutMs: number): Promise<string> {
  const signal = AbortSignal.timeout(timeoutMs);
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const url = allowedJobberIcsUrl(current);
    if (!url) throw new Error("unavailable");
    const response = await fetchImpl(url.href, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: { accept: "text/calendar" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")?.trim();
      await discard(response);
      if (!location || hop === MAX_REDIRECTS) throw new Error("unavailable");
      current = new URL(location, url).href;
      continue;
    }
    if (!response.ok) {
      await discard(response);
      throw new Error("unavailable");
    }
    return await response.text();
  }
  throw new Error("unavailable");
}

async function discard(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // The status already decided this hop is not the calendar.
  }
}
