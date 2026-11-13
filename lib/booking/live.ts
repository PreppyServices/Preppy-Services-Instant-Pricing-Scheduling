// Live calendar and Jobber adapters. Routes call these only after the write flag
// and secret checks. Preview bookings never reach placeHold or jobCreate.

import { jobberConfigured, schedulerWritesEnabled } from "./flags";
import {
  busyFromVisits,
  mergeBusy,
  parseGoogleAvailability,
  type Interval,
  type VisitSpan,
} from "./rules";
import { dateKeyInZone, earliestStart, eachDate } from "./time";
import type { HoldDraft, JobDraft, RenameDraft } from "./bookService";
import type { RequestDraft } from "./requestService";
import { splitName } from "./contact";

export const SCHEDULER_EXEC_URL =
  "https://script.google.com/macros/s/AKfycbzD4dusH3GuPPMbDkCAysmUGNszMaDPRTZpyhOYror3JjSJTbmScRpYpnFED0nPJ-UQ3w/exec";

const JOBBER_GRAPHQL = "https://api.getjobber.com/api/graphql";
const JOBBER_VERSION = "2025-04-16";
const TOKEN_APP = "preppy-widget";

type Env = Record<string, string | undefined>;

export async function loadCalendarBusy(
  env: Env,
  now: Date
): Promise<{ busy: Interval[]; closed: string[] }> {
  const writes = schedulerWritesEnabled(env);
  const dates = eachDate(dateKeyInZone(now), 16);
  let googleBusy: Interval[] = [];
  let closed: string[] = [];
  try {
    const payload = await fetchGoogleAvailability(env);
    const parsed = parseGoogleAvailability(payload, dates);
    googleBusy = parsed.busy;
    closed = parsed.closed;
  } catch (error) {
    if (writes) throw error;
  }
  let visitBusy: Interval[] = [];
  if (jobberConfigured(env)) {
    try {
      const visits = await fetchJobberVisits(env, now);
      const parsed = busyFromVisits(visits, earliestStart(now));
      visitBusy = parsed.busy;
      closed = [...closed, ...parsed.closed];
    } catch (error) {
      if (writes) throw error;
    }
  }
  return { busy: mergeBusy(googleBusy, visitBusy), closed };
}

export async function fetchGoogleAvailability(env: Env): Promise<unknown> {
  const base = env.SCHEDULER_EXEC_URL || SCHEDULER_EXEC_URL;
  const response = await fetch(`${base}?mode=availability`, { redirect: "follow" });
  if (!response.ok) throw new Error("Calendar availability failed");
  return response.json();
}

async function scriptBook(env: Env, params: URLSearchParams): Promise<Record<string, unknown>> {
  const base = env.SCHEDULER_EXEC_URL || SCHEDULER_EXEC_URL;
  const response = await fetch(`${base}?${params.toString()}`, { redirect: "follow" });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok || data.ok === false) throw new Error("Calendar write failed");
  return data;
}

export async function placeGoogleHold(env: Env, draft: HoldDraft): Promise<{ id: string }> {
  const params = new URLSearchParams({
    mode: "book",
    action: "hold",
    title: draft.title,
    start: draft.start,
    end: draft.end,
    sendUpdates: draft.sendUpdates,
    guests: draft.guests,
  });
  const data = await scriptBook(env, params);
  const id = String(data.eventId || data.id || "");
  if (!id) throw new Error("Calendar hold failed");
  return { id };
}

export async function renameGoogleHold(env: Env, draft: RenameDraft): Promise<void> {
  const params = new URLSearchParams({
    mode: "book",
    action: "rename",
    eventId: draft.eventId,
    title: draft.title,
    description: draft.description,
    sendUpdates: draft.sendUpdates,
    guests: draft.guests,
  });
  await scriptBook(env, params);
}

export async function deleteGoogleHold(env: Env, eventId: string): Promise<void> {
  const params = new URLSearchParams({
    mode: "book",
    action: "delete",
    eventId,
    sendUpdates: "none",
    guests: "none",
  });
  await scriptBook(env, params);
}

export async function alertJoe(env: Env, message: string): Promise<void> {
  if (!env.JOE_ALERT_WEBHOOK || !env.JOE_ALERT_PHONE) return;
  await fetch(env.JOE_ALERT_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: env.JOE_ALERT_PHONE, message }),
  });
}

type TokenRow = {
  app: string;
  refresh_token: string;
  access_token: string | null;
  expires_at: string | null;
};

async function supabase(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function readToken(env: Env): Promise<TokenRow> {
  const response = await supabase(env, `jobber_tokens?app=eq.${TOKEN_APP}&select=*`);
  if (!response.ok) throw new Error("Jobber token lookup failed");
  const rows = (await response.json()) as TokenRow[];
  if (!rows.length || !rows[0].refresh_token) throw new Error("Jobber token is missing");
  return rows[0];
}

async function saveToken(env: Env, previous: string, next: TokenRow): Promise<TokenRow> {
  const rpc = await supabase(env, "rpc/jobber_save_token", {
    method: "POST",
    body: JSON.stringify({
      p_app: TOKEN_APP,
      p_expected_refresh: previous,
      p_refresh: next.refresh_token,
      p_access: next.access_token,
      p_expires: next.expires_at,
    }),
  });
  if (rpc.ok) {
    const row = (await rpc.json()) as TokenRow | TokenRow[] | null;
    const saved = Array.isArray(row) ? row[0] : row;
    if (saved?.access_token) return saved;
  }
  const patched = await supabase(
    env,
    `jobber_tokens?app=eq.${TOKEN_APP}&refresh_token=eq.${encodeURIComponent(previous)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        refresh_token: next.refresh_token,
        access_token: next.access_token,
        expires_at: next.expires_at,
      }),
    }
  );
  if (!patched.ok) throw new Error("Jobber token save failed");
  const rows = (await patched.json()) as TokenRow[];
  if (!rows.length) return readToken(env);
  return rows[0];
}

export async function jobberAccessToken(env: Env): Promise<string> {
  const row = await readToken(env);
  const expires = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (row.access_token && expires > Date.now() + 60_000) return row.access_token;
  const body = new URLSearchParams({
    client_id: env.JOBBER_CLIENT_ID || "",
    client_secret: env.JOBBER_CLIENT_SECRET || "",
    grant_type: "refresh_token",
    refresh_token: row.refresh_token,
  });
  const response = await fetch("https://api.getjobber.com/api/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!response.ok || !payload.access_token) throw new Error("Jobber token refresh failed");
  const saved = await saveToken(env, row.refresh_token, {
    app: TOKEN_APP,
    refresh_token: payload.refresh_token || row.refresh_token,
    access_token: payload.access_token,
    expires_at: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000).toISOString(),
  });
  return saved.access_token || payload.access_token;
}

async function graphql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(JOBBER_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-JOBBER-GRAPHQL-VERSION": JOBBER_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (!response.ok || body.errors?.length || !body.data) {
    throw new Error(body.errors?.[0]?.message || "Jobber request failed");
  }
  return body.data;
}

function assertClean(result: { userErrors?: { message: string }[] } | null | undefined): void {
  if (result?.userErrors?.length) throw new Error(result.userErrors[0].message);
}

type ClientNode = {
  id: string;
  emails?: { address?: string }[];
  phones?: { number?: string }[];
  clientProperties?: { nodes?: { id: string }[] };
};

function phoneTail(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

export async function fetchJobberVisits(env: Env, now: Date): Promise<VisitSpan[]> {
  const token = await jobberAccessToken(env);
  const after = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
  const before = new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000).toISOString();
  const scheduled = await graphql<{
    visits: { nodes: { startAt?: string | null; endAt?: string | null }[] };
  }>(
    token,
    `query WindowVisits($after: ISO8601DateTime!, $before: ISO8601DateTime!) {
      visits(first: 100, filter: { startAt: { after: $after, before: $before } }) {
        nodes { startAt endAt }
      }
    }`,
    { after, before }
  );
  const spans: VisitSpan[] = (scheduled.visits?.nodes ?? []).map((visit) => ({
    startAt: visit.startAt,
    endAt: visit.endAt,
  }));
  try {
    const anytime = await graphql<{
      visits: { nodes: { startAt?: string | null; endAt?: string | null }[] };
    }>(
      token,
      `query AnytimeVisits {
        visits(first: 50, filter: { status: UNSCHEDULED }) {
          nodes { startAt endAt }
        }
      }`,
      {}
    );
    for (const visit of anytime.visits?.nodes ?? []) {
      if (!visit.startAt) spans.push({ anytime: true, startAt: null, endAt: null });
    }
  } catch (error) {
    if (schedulerWritesEnabled(env)) throw error;
  }
  return spans;
}

function propertyAddress(building: string, unit: string) {
  return {
    street1: building,
    street2: unit ? `Unit ${unit}` : "",
    city: "Miami",
    province: "Florida",
    country: "United States",
  };
}

async function findClient(token: string, email: string, phone: string): Promise<ClientNode | null> {
  const query = `query FindClients($term: String!) {
    clients(searchTerm: $term, first: 8) {
      nodes {
        id
        emails { address }
        phones { number }
        clientProperties(first: 20) { nodes { id } }
      }
    }
  }`;
  const byEmail = await graphql<{ clients: { nodes: ClientNode[] } }>(token, query, { term: email });
  const emailHit = (byEmail.clients?.nodes ?? []).find((client) =>
    (client.emails ?? []).some((item) => (item.address ?? "").toLowerCase() === email.toLowerCase())
  );
  if (emailHit) return emailHit;
  const byPhone = await graphql<{ clients: { nodes: ClientNode[] } }>(token, query, { term: phone });
  const tail = phoneTail(phone);
  return (
    (byPhone.clients?.nodes ?? []).find((client) =>
      (client.phones ?? []).some((item) => phoneTail(item.number ?? "") === tail)
    ) ?? null
  );
}

async function ensureProperty(token: string, client: ClientNode, building: string, unit: string): Promise<string> {
  const existing = client.clientProperties?.nodes?.[0]?.id;
  if (existing) return existing;
  const created = await graphql<{
    propertyCreate: { properties: { id: string }[]; userErrors: { message: string }[] };
  }>(
    token,
    `mutation AddProperty($clientId: EncodedId!, $input: PropertyCreateInput!) {
      propertyCreate(clientId: $clientId, input: $input) {
        properties { id }
        userErrors { message }
      }
    }`,
    {
      clientId: client.id,
      input: { properties: [{ address: propertyAddress(building, unit) }] },
    }
  );
  assertClean(created.propertyCreate);
  const id = created.propertyCreate.properties?.[0]?.id;
  if (!id) throw new Error("Property was not created");
  return id;
}

export async function createJobberJob(env: Env, draft: JobDraft): Promise<{ id: string; url: string }> {
  const token = await jobberAccessToken(env);
  const found = await findClient(token, draft.email, draft.phone);
  let client = found;
  if (!client) {
    const name = splitName(draft.name);
    const created = await graphql<{
      clientCreate: { client: ClientNode | null; userErrors: { message: string }[] };
    }>(
      token,
      `mutation CreateClient($input: ClientCreateInput!) {
        clientCreate(input: $input) {
          client { id clientProperties(first: 5) { nodes { id } } }
          userErrors { message }
        }
      }`,
      {
        input: {
          firstName: name.firstName,
          lastName: name.lastName || undefined,
          emails: [{ address: draft.email, primary: true, description: "MAIN" }],
          phones: [{ number: draft.phone, primary: true, smsAllowed: true, description: "MOBILE" }],
          properties: [{ address: propertyAddress(draft.building, draft.unit) }],
        },
      }
    );
    assertClean(created.clientCreate);
    client = created.clientCreate.client;
  }
  if (!client) throw new Error("Client was not created");
  const propertyId = await ensureProperty(token, client, draft.building, draft.unit);
  const job = await graphql<{
    jobCreate: {
      job: { id: string; jobberWebUri?: string; visits?: { nodes: { id: string; startAt?: string | null }[] } } | null;
      userErrors: { message: string }[];
    };
  }>(
    token,
    `mutation CreateJob($input: JobCreateInput!) {
      jobCreate(input: $input) {
        job { id jobberWebUri visits(first: 5) { nodes { id startAt } } }
        userErrors { message }
      }
    }`,
    {
      input: {
        propertyId,
        title: draft.title,
        instructions: draft.instructions,
        allowReviewRequest: false,
        invoicing: { invoicingType: "FIXED_PRICE", invoicingSchedule: "ON_COMPLETION" },
        scheduling: { createVisits: true, notifyTeam: false, assignedTo: [] },
        timeframe: {
          startAt: draft.start,
          durationUnits: "MINUTES",
          durationValue: draft.durationMin,
        },
        lineItems: draft.lineItems.map((item) => ({
          name: item.name,
          quantity: 1,
          unitPrice: item.unitPrice,
          saveToProductsAndServices: false,
        })),
      },
    }
  );
  assertClean(job.jobCreate);
  const created = job.jobCreate.job;
  if (!created?.id) throw new Error("Job was not created");
  const visit = created.visits?.nodes?.[0];
  if (visit && !visit.startAt) {
    const start = new Date(draft.start);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(start);
    const bag: Record<string, string> = {};
    for (const part of parts) if (part.type !== "literal") bag[part.type] = part.value;
    const scheduled = await graphql<{ visitCreate: { userErrors: { message: string }[] } }>(
      token,
      `mutation ScheduleVisit($jobId: EncodedId!, $date: ISO8601Date!, $time: ISO8601Time!) {
        visitCreate(jobId: $jobId, input: { visits: [{ schedule: {
          startAt: { date: $date, time: $time, timezone: "America/New_York" }
          notifyTeam: false
          teamMemberIdsToAssign: []
        } }] }) {
          createdVisits { id startAt }
          userErrors { message }
        }
      }`,
      {
        jobId: created.id,
        date: `${bag.year}-${bag.month}-${bag.day}`,
        time: `${bag.hour === "24" ? "00" : bag.hour}:${bag.minute}:00`,
      }
    );
    assertClean(scheduled.visitCreate);
  }
  return { id: created.id, url: created.jobberWebUri || `https://secure.getjobber.com/jobs/${created.id}` };
}

export async function createJobberRequest(env: Env, draft: RequestDraft): Promise<{ id: string }> {
  const token = await jobberAccessToken(env);
  const found = await findClient(token, draft.email, draft.phone);
  let client = found;
  if (!client) {
    const name = splitName(draft.name);
    const created = await graphql<{
      clientCreate: { client: ClientNode | null; userErrors: { message: string }[] };
    }>(
      token,
      `mutation CreateClient($input: ClientCreateInput!) {
        clientCreate(input: $input) {
          client { id clientProperties(first: 5) { nodes { id } } }
          userErrors { message }
        }
      }`,
      {
        input: {
          firstName: name.firstName,
          lastName: name.lastName || undefined,
          emails: [{ address: draft.email, primary: true, description: "MAIN" }],
          phones: [{ number: draft.phone, primary: true, smsAllowed: true, description: "MOBILE" }],
          properties: [{ address: propertyAddress(draft.building, draft.unit) }],
        },
      }
    );
    assertClean(created.clientCreate);
    client = created.clientCreate.client;
  }
  if (!client) throw new Error("Client was not created");
  const propertyId = await ensureProperty(token, client, draft.building, draft.unit);
  const request = await graphql<{
    requestCreate: { request: { id: string } | null; userErrors: { message: string }[] };
  }>(
    token,
    `mutation CreateRequest($input: RequestCreateInput!) {
      requestCreate(input: $input) {
        request { id }
        userErrors { message }
      }
    }`,
    {
      input: {
        clientId: client.id,
        propertyId,
        title: draft.title,
        requestDetails: {
          form: {
            sections: [
              {
                label: "Request",
                items: [
                  { label: "Preferred date", answerText: draft.preferredDate },
                  { label: "Instructions", answerText: draft.instructions },
                ],
              },
            ],
          },
        },
      },
    }
  );
  assertClean(request.requestCreate);
  if (!request.requestCreate.request?.id) throw new Error("Request was not created");
  return { id: request.requestCreate.request.id };
}
