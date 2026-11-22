import { readBusyResponse, type BusyBlock } from "./jobberBusy";

export type BusyClientFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** Read Jobber busy blocks. A failed call returns null so the picker can fail open. */
export async function loadJobberBusy(
  url: string,
  fetchImpl: BusyClientFetch = fetch
): Promise<BusyBlock[] | null> {
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    return readBusyResponse(await res.json());
  } catch {
    return null;
  }
}
