const QUOTE_ORIGIN = "https://quote.preppyservices.com";
const PROJECT_SLUG = "preppy-services-instant-pricing-scheduling";
const MAX_BODY_BYTES = 8192;
const TOKEN_URL = "https://api.getjobber.com/api/oauth/token";
const GRAPHQL_URL = "https://api.getjobber.com/api/graphql";
const DEFAULT_API_VERSION = "2025-04-16";
const TITLE_MAX = 255;

const CLOSED_REQUEST_STATUSES = new Set(["archived", "completed", "converted"]);

export type BookingStatus = "ok" | "error" | "timeout";
export type JobberResult = "synced" | "failed" | "disabled";

export type JobberEnv = {
  JOBBER_SYNC_ENABLED?: string;
  JOBBER_CLIENT_ID?: string;
  JOBBER_CLIENT_SECRET?: string;
  JOBBER_REFRESH_TOKEN?: string;
  JOBBER_API_VERSION?: string;
  BOOKING_ALERT_WEBHOOK_URL?: string;
};

export type JobberDeps = {
  env: JobberEnv;
  fetch: typeof fetch;
  log?: (line: string) => void;
};

type ParsedBooking = {
  bookingId: string | null;
  status: BookingStatus;
  start: string;
  slot: string;
  building: string;
  line: string;
  unit: string;
  priceShown: string;
  intro: boolean;
  name: string;
  email: string;
  phone: string;
  notes: string;
  utm: Record<string, string>;
};

type ClientNode = {
  id?: string;
  isArchived?: boolean;
  emails?: Array<{ address?: string | null }>;
  phones?: Array<{ number?: string | null; normalizedPhoneNumber?: string | null }>;
};

type RequestNode = {
  id?: string;
  title?: string | null;
  requestStatus?: string | null;
};

function json(status: number, body: { synced: boolean; reason?: string }): Response {
  return Response.json(body, { status });
}

function trimText(value: unknown, max = 500): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, max);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function isBookingStatus(value: string): value is BookingStatus {
  return value === "ok" || value === "error" || value === "timeout";
}

export function isAllowedBookingOrigin(origin: string | null): boolean {
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.origin === QUOTE_ORIGIN) return true;
  return url.protocol === "https:" && url.hostname.endsWith(".vercel.app") && url.hostname.includes(PROJECT_SLUG);
}

function syncConfigured(env: JobberEnv): boolean {
  return (
    env.JOBBER_SYNC_ENABLED === "true" &&
    !!env.JOBBER_CLIENT_ID &&
    !!env.JOBBER_CLIENT_SECRET &&
    !!env.JOBBER_REFRESH_TOKEN
  );
}

function parseBooking(data: unknown): ParsedBooking | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  const name = trimText(raw.name, 120);
  const email = trimText(raw.email, 160);
  const phone = trimText(raw.phone, 40);
  if (!name || (!email && !phone)) return null;
  const statusRaw = trimText(raw.status, 20);
  const status: BookingStatus = isBookingStatus(statusRaw) ? statusRaw : "error";
  const bookingId = trimText(raw.bookingId, 80) || null;
  const utm: Record<string, string> = {};
  if (raw.utm && typeof raw.utm === "object") {
    for (const [key, value] of Object.entries(raw.utm as Record<string, unknown>)) {
      const cleanedKey = trimText(key, 40);
      const cleanedValue = trimText(value, 80);
      if (cleanedKey && cleanedValue) utm[cleanedKey] = cleanedValue;
    }
  }
  return {
    bookingId,
    status,
    start: trimText(raw.start, 80),
    slot: trimText(raw.slot, 120),
    building: trimText(raw.building, 120),
    line: trimText(raw.line, 40),
    unit: trimText(raw.unit, 40),
    priceShown: trimText(raw.priceShown, 40),
    intro: raw.intro === true,
    name,
    email,
    phone,
    notes: trimText(raw.notes, 1000),
    utm,
  };
}

function logSync(
  log: (line: string) => void,
  booking: Pick<ParsedBooking, "bookingId" | "building" | "status">,
  jobber: JobberResult,
  reason: string
) {
  log(
    JSON.stringify({
      bookingId: booking.bookingId,
      building: booking.building,
      status: booking.status,
      jobber,
      reason,
    })
  );
}

async function postAlert(
  fetchImpl: typeof fetch,
  url: string | undefined,
  booking: Pick<ParsedBooking, "bookingId" | "building" | "line" | "slot" | "status">,
  jobber: JobberResult
) {
  if (!url) return;
  const body = {
    bookingId: booking.bookingId,
    building: booking.building,
    line: booking.line,
    slot: booking.slot,
    status: booking.status,
    jobber,
  };
  try {
    await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // A missed alert must not change the visitor response.
  }
}

function titlePrefix(status: BookingStatus): string {
  switch (status) {
    case "ok":
      return "";
    case "error":
    case "timeout":
      return "UNCONFIRMED ";
    default: {
      const neverStatus: never = status;
      return neverStatus;
    }
  }
}

export function buildJobberTitle(booking: Pick<ParsedBooking, "bookingId" | "building" | "line" | "slot" | "status">): string {
  const base = `Widget booking ${booking.bookingId || "NO-ID"} · ${booking.building} · line ${booking.line} · ${booking.slot}`;
  return `${titlePrefix(booking.status)}${base}`.slice(0, TITLE_MAX);
}

function noteMessage(booking: ParsedBooking): string {
  const utm = Object.entries(booking.utm)
    .map(([key, value]) => `${key} ${value}`)
    .join(" · ");
  return [
    `Unit: ${booking.unit}`,
    `Price shown: ${booking.priceShown}`,
    `Intro: ${booking.intro ? "yes" : "no"}`,
    `Phone: ${booking.phone}`,
    `Email: ${booking.email}`,
    `Notes: ${booking.notes}`,
    utm ? `UTM: ${utm}` : "",
  ]
    .filter((line) => line.length > 0)
    .join("\n")
    .slice(0, 4000);
}

function titleWithDetails(title: string, booking: ParsedBooking): string {
  const tail = [
    booking.unit ? `unit ${booking.unit}` : "",
    booking.priceShown ? `price ${booking.priceShown}` : "",
    `intro ${booking.intro ? "yes" : "no"}`,
    booking.phone ? `phone ${booking.phone}` : "",
    booking.email ? `email ${booking.email}` : "",
    booking.notes ? `notes ${booking.notes}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (tail ? `${title} · ${tail}` : title).slice(0, TITLE_MAX);
}

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const data = (await res.json()) as unknown;
    if (!data || typeof data !== "object") return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function refreshAccessToken(fetchImpl: typeof fetch, env: JobberEnv): Promise<string | null> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: env.JOBBER_CLIENT_ID || "",
    client_secret: env.JOBBER_CLIENT_SECRET || "",
    refresh_token: env.JOBBER_REFRESH_TOKEN || "",
  });
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(12000),
  });
  const jsonBody = await readJson(res);
  const access = jsonBody && typeof jsonBody.access_token === "string" ? jsonBody.access_token : "";
  if (!res.ok || !access) return null;
  return access;
}

async function graphql(
  fetchImpl: typeof fetch,
  token: string,
  version: string,
  query: string,
  variables: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const res = await fetchImpl(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-JOBBER-GRAPHQL-VERSION": version,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(12000),
  });
  const jsonBody = await readJson(res);
  if (!res.ok || !jsonBody || !jsonBody.data || typeof jsonBody.data !== "object") return null;
  if (Array.isArray(jsonBody.errors) && jsonBody.errors.length > 0) return null;
  return jsonBody.data as Record<string, unknown>;
}

function mutationErrors(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return true;
  const errors = (payload as { userErrors?: unknown }).userErrors;
  return Array.isArray(errors) && errors.length > 0;
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function samePhone(left: string, right: string): boolean {
  const a = digits(left);
  const b = digits(right);
  if (a.length < 10 || b.length < 10) return false;
  return a.slice(-10) === b.slice(-10);
}

function clientMatches(node: ClientNode, booking: ParsedBooking, by: "email" | "phone"): boolean {
  if (node.isArchived) return false;
  if (by === "email") {
    const wanted = booking.email.toLowerCase();
    return (node.emails || []).some((item) => (item.address || "").trim().toLowerCase() === wanted);
  }
  return (node.phones || []).some((item) => samePhone(item.normalizedPhoneNumber || item.number || "", booking.phone));
}

const FIND_CLIENTS = `
  query FindClients($searchTerm: String!) {
    clients(searchTerm: $searchTerm, first: 10) {
      nodes { id isArchived emails { address } phones { number normalizedPhoneNumber } }
    }
  }
`;

async function findClient(
  fetchImpl: typeof fetch,
  token: string,
  version: string,
  booking: ParsedBooking,
  by: "email" | "phone"
): Promise<{ id: string } | { id: "" } | null> {
  const searchTerm = by === "email" ? booking.email : booking.phone;
  const data = await graphql(fetchImpl, token, version, FIND_CLIENTS, { searchTerm });
  if (!data) return null;
  const connection = data.clients as { nodes?: ClientNode[] } | undefined;
  const nodes = Array.isArray(connection?.nodes) ? connection.nodes : [];
  const match = nodes.find((node) => !!node.id && clientMatches(node, booking, by));
  return { id: match?.id || "" };
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = (parts[0] || name).slice(0, 80);
  const lastName = (parts.slice(1).join(" ") || firstName).slice(0, 80);
  return { firstName, lastName };
}

const CREATE_CLIENT = `
  mutation ClientCreate($input: ClientCreateInput!) {
    clientCreate(input: $input) {
      client { id }
      userErrors { message path }
    }
  }
`;

async function createClient(
  fetchImpl: typeof fetch,
  token: string,
  version: string,
  booking: ParsedBooking
): Promise<string | null> {
  const { firstName, lastName } = splitName(booking.name);
  const input: Record<string, unknown> = { firstName, lastName };
  if (booking.email) {
    input.emails = [{ description: "MAIN", primary: true, address: booking.email }];
  }
  if (booking.phone) {
    input.phones = [{ description: "MAIN", primary: true, number: booking.phone, smsAllowed: true }];
  }
  const data = await graphql(fetchImpl, token, version, CREATE_CLIENT, { input });
  const payload = data?.clientCreate as { client?: { id?: string }; userErrors?: unknown[] } | undefined;
  if (!data || mutationErrors(payload) || !payload?.client?.id) return null;
  return payload.client.id;
}

const FIND_REQUESTS = `
  query ExistingRequests($clientId: EncodedId!, $searchTerm: String!) {
    requests(searchTerm: $searchTerm, filter: { clientId: $clientId }, first: 20) {
      nodes { id title requestStatus }
    }
  }
`;

async function hasOpenDuplicate(
  fetchImpl: typeof fetch,
  token: string,
  version: string,
  clientId: string,
  bookingId: string
): Promise<boolean | null> {
  const data = await graphql(fetchImpl, token, version, FIND_REQUESTS, {
    clientId,
    searchTerm: bookingId,
  });
  if (!data) return null;
  const connection = data.requests as { nodes?: RequestNode[] } | undefined;
  const nodes = Array.isArray(connection?.nodes) ? connection.nodes : [];
  return nodes.some((node) => {
    const title = node.title || "";
    const status = node.requestStatus || "";
    return title.includes(bookingId) && !CLOSED_REQUEST_STATUSES.has(status);
  });
}

const CREATE_REQUEST = `
  mutation RequestCreate($input: RequestCreateInput!) {
    requestCreate(input: $input) {
      request { id title }
      userErrors { message path }
    }
  }
`;

const CREATE_NOTE = `
  mutation RequestNote($requestId: EncodedId!, $input: RequestCreateNoteInput!) {
    requestCreateNote(requestId: $requestId, input: $input) {
      requestNote { id }
      userErrors { message path }
    }
  }
`;

const EDIT_REQUEST = `
  mutation RequestEdit($requestId: EncodedId!, $input: RequestEditInput!) {
    requestEdit(requestId: $requestId, input: $input) {
      request { id title }
      userErrors { message path }
    }
  }
`;

async function createRequest(
  fetchImpl: typeof fetch,
  token: string,
  version: string,
  clientId: string,
  booking: ParsedBooking
): Promise<{ requestId: string; noted: boolean } | null> {
  // RequestCreateInput on the published Jobber schema (verified against the
  // 2025-01-20 introspection; the 2025-04-16 changelog does not add fields)
  // is clientId, propertyId, assessment, referringClientId, requestDetails,
  // and title. There is no source input and no note input. Details go on
  // requestCreateNote, which the same schema does allow.
  const title = buildJobberTitle(booking);
  const created = await graphql(fetchImpl, token, version, CREATE_REQUEST, {
    input: { clientId, title },
  });
  const payload = created?.requestCreate as { request?: { id?: string }; userErrors?: unknown[] } | undefined;
  const requestId = payload?.request?.id || "";
  if (!created || mutationErrors(payload) || !requestId) return null;
  const noted = await graphql(fetchImpl, token, version, CREATE_NOTE, {
    requestId,
    input: { message: noteMessage(booking) },
  });
  const notePayload = noted?.requestCreateNote as { userErrors?: unknown[] } | undefined;
  if (noted && !mutationErrors(notePayload)) return { requestId, noted: true };
  const edited = await graphql(fetchImpl, token, version, EDIT_REQUEST, {
    requestId,
    input: { title: titleWithDetails(title, booking) },
  });
  const editPayload = edited?.requestEdit as { userErrors?: unknown[] } | undefined;
  if (!edited || mutationErrors(editPayload)) return null;
  return { requestId, noted: false };
}

async function pushToJobber(
  fetchImpl: typeof fetch,
  env: JobberEnv,
  booking: ParsedBooking
): Promise<{ ok: boolean; reason: string }> {
  const version = env.JOBBER_API_VERSION || DEFAULT_API_VERSION;
  const token = await refreshAccessToken(fetchImpl, env);
  if (!token) return { ok: false, reason: "token" };

  let clientId = "";
  if (booking.email) {
    const found = await findClient(fetchImpl, token, version, booking, "email");
    if (!found) return { ok: false, reason: "search" };
    clientId = found.id;
  }
  if (!clientId && booking.phone) {
    const found = await findClient(fetchImpl, token, version, booking, "phone");
    if (!found) return { ok: false, reason: "search" };
    clientId = found.id;
  }
  if (!clientId) {
    const created = await createClient(fetchImpl, token, version, booking);
    if (!created) return { ok: false, reason: "client" };
    clientId = created;
  }

  if (booking.bookingId) {
    const duplicate = await hasOpenDuplicate(fetchImpl, token, version, clientId, booking.bookingId);
    if (duplicate === null) return { ok: false, reason: "search" };
    if (duplicate) return { ok: true, reason: "duplicate" };
  }

  const request = await createRequest(fetchImpl, token, version, clientId, booking);
  if (!request) return { ok: false, reason: "request" };
  return { ok: true, reason: "synced" };
}

export async function handleJobberBooking(request: Request, deps: JobberDeps): Promise<Response> {
  const log = deps.log ?? (() => {});
  try {
    if (!isAllowedBookingOrigin(request.headers.get("origin"))) {
      return json(403, { synced: false, reason: "origin" });
    }
    const declared = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return json(413, { synced: false, reason: "body" });
    }
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return json(413, { synced: false, reason: "body" });
    }
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      return json(400, { synced: false, reason: "body" });
    }
    const booking = parseBooking(data);
    if (!booking) return json(400, { synced: false, reason: "contact" });

    if (!syncConfigured(deps.env)) {
      logSync(log, booking, "disabled", "disabled");
      await postAlert(deps.fetch, deps.env.BOOKING_ALERT_WEBHOOK_URL, booking, "disabled");
      return json(202, { synced: false, reason: "disabled" });
    }

    let result: { ok: boolean; reason: string };
    try {
      result = await pushToJobber(deps.fetch, deps.env, booking);
    } catch {
      result = { ok: false, reason: "failed" };
    }
    const jobber: JobberResult = result.ok ? "synced" : "failed";
    logSync(log, booking, jobber, result.reason);
    await postAlert(deps.fetch, deps.env.BOOKING_ALERT_WEBHOOK_URL, booking, jobber);
    if (result.ok) return json(202, { synced: true, reason: result.reason });
    return json(202, { synced: false, reason: result.reason });
  } catch {
    return json(202, { synced: false, reason: "failed" });
  }
}
