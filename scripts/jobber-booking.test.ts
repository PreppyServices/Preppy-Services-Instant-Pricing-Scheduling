/**
 * Jobber booking sync stays inert until configured, rejects a foreign origin
 * and a lead with no contact, and never writes secrets or email into logs.
 */
import { handleJobberBooking, type JobberDeps, type JobberEnv } from "../lib/jobberBooking.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const SECRET = "super-secret-refresh";
const CLIENT_SECRET = "client-secret-value";
const EMAIL = "resident@example.com";

const enabledEnv: JobberEnv = {
  JOBBER_SYNC_ENABLED: "true",
  JOBBER_CLIENT_ID: "client-id-value",
  JOBBER_CLIENT_SECRET: CLIENT_SECRET,
  JOBBER_REFRESH_TOKEN: SECRET,
};

const lead = {
  bookingId: "BK-100",
  status: "ok",
  start: "2026-12-05T23:00:00.000Z",
  slot: "Sat Dec 5, 6:00 PM",
  building: "Gran Paraiso",
  line: "01",
  unit: "3204",
  priceShown: 280,
  intro: true,
  name: "  Ada Lovelace  ",
  email: EMAIL,
  phone: "3055550199",
  notes: "gate code",
  utm: { utm_source: "quo_sms" },
};

function bookingRequest(body: unknown, origin = "https://quote.preppyservices.com") {
  return new Request("https://quote.preppyservices.com/api/booking/jobber", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Call = { url: string; body: string };

function classify(call: Call): string {
  if (call.url.includes("/oauth/token")) return "token";
  const query = JSON.parse(call.body).query as string;
  if (query.includes("requestCreateNote")) return "requestCreateNote";
  if (query.includes("requestEdit")) return "requestEdit";
  if (query.includes("requestCreate")) return "requestCreate";
  if (query.includes("clientCreate")) return "clientCreate";
  if (query.includes("clients(")) return "search";
  if (query.includes("requests(")) return "requests";
  return "other";
}

function happyFetch(calls: Call[]) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push({ url, body });
    if (url.includes("/oauth/token")) {
      return jsonResponse({ access_token: "access-token-value" });
    }
    const query = body ? (JSON.parse(body).query as string) : "";
    if (query.includes("clients(")) {
      return jsonResponse({ data: { clients: { nodes: [] } } });
    }
    if (query.includes("clientCreate")) {
      return jsonResponse({ data: { clientCreate: { client: { id: "C1" }, userErrors: [] } } });
    }
    if (query.includes("requests(")) {
      return jsonResponse({ data: { requests: { nodes: [] } } });
    }
    if (query.includes("requestCreateNote")) {
      return jsonResponse({ data: { requestCreateNote: { requestNote: { id: "N1" }, userErrors: [] } } });
    }
    if (query.includes("requestCreate")) {
      return jsonResponse({
        data: { requestCreate: { request: { id: "R1", title: "Widget booking" }, userErrors: [] } },
      });
    }
    return jsonResponse({ data: {} });
  };
}

function logsHaveSecrets(lines: string[]) {
  const blob = lines.join("\n");
  return blob.includes(SECRET) || blob.includes(CLIENT_SECRET) || blob.includes(EMAIL) || blob.includes("3055550199");
}

async function run(request: Request, env: JobberEnv, fetchImpl: JobberDeps["fetch"]) {
  const lines: string[] = [];
  const response = await handleJobberBooking(request, {
    env,
    fetch: fetchImpl,
    log: (line) => lines.push(line),
  });
  const body = (await response.json()) as { synced: boolean; reason?: string };
  return { response, body, lines };
}

const disabledFetch: JobberDeps["fetch"] = async () => {
  throw new Error("disabled path must not call fetch");
};
const disabled = await run(bookingRequest(lead), {}, disabledFetch);
check(disabled.response.status === 202, "disabled path returns 202");
check(disabled.body.synced === false && disabled.body.reason === "disabled", "disabled path reports disabled");
check(disabled.lines.length === 1, "disabled path logs one line");
const disabledLog = JSON.parse(disabled.lines[0] || "{}") as {
  bookingId?: string;
  building?: string;
  status?: string;
};
check(disabledLog.bookingId === "BK-100", "disabled log keeps bookingId");
check(disabledLog.building === "Gran Paraiso", "disabled log keeps building");
check(disabledLog.status === "ok", "disabled log keeps status");
check(!logsHaveSecrets(disabled.lines), "disabled log has no secret or email");

const preview = await run(
  bookingRequest(lead, "https://preppy-services-instant-pricing-scheduling-git-cursor-team.vercel.app"),
  {},
  disabledFetch
);
check(preview.response.status === 202 && preview.body.reason === "disabled", "project preview origin is allowed");

const foreign = await run(bookingRequest(lead, "https://evil.example"), enabledEnv, disabledFetch);
check(foreign.response.status === 403 && foreign.body.reason === "origin", "bad origin is rejected");
check(foreign.lines.length === 0, "bad origin writes no log");

const otherProject = await run(
  bookingRequest(lead, "https://not-this-project.vercel.app"),
  enabledEnv,
  disabledFetch
);
check(otherProject.response.status === 403, "another vercel.app project is rejected");

const noContact = await run(
  bookingRequest({ ...lead, email: "  ", phone: "", name: "Ada" }),
  enabledEnv,
  disabledFetch
);
check(noContact.response.status === 400 && noContact.body.reason === "contact", "missing contact is rejected");

const noName = await run(
  bookingRequest({ ...lead, name: " " }),
  enabledEnv,
  disabledFetch
);
check(noName.response.status === 400, "missing name is rejected");

const calls: Call[] = [];
const happy = await run(bookingRequest(lead), enabledEnv, happyFetch(calls));
check(happy.response.status === 202 && happy.body.synced === true, "happy path returns 202 synced");
const order = calls.map(classify);
let cursor = -1;
for (const step of ["token", "search", "clientCreate", "requestCreate"]) {
  const next = order.indexOf(step, cursor + 1);
  check(next > cursor, `${step} is called in order, saw ${order.join(",")}`);
  cursor = next;
}
const createCall = calls.find((call) => classify(call) === "requestCreate");
const createBody = createCall ? (JSON.parse(createCall.body) as { variables?: { input?: Record<string, unknown> } }) : null;
const createInput = createBody?.variables?.input || {};
check(createInput.clientId === "C1", "requestCreate receives the new client id");
check(
  createInput.title === "Widget booking BK-100 · Gran Paraiso · line 01 · Sat Dec 5, 6:00 PM",
  "requestCreate title matches the booking"
);
check(!Object.prototype.hasOwnProperty.call(createInput, "source"), "requestCreate does not send a source field");
check(calls.some((call) => classify(call) === "requestCreateNote"), "details are sent as a request note");
check(!logsHaveSecrets(happy.lines), "happy path log has no secret or email");

const failed = await run(bookingRequest(lead), enabledEnv, async (input) => {
  if (String(input).includes("/oauth/token")) return jsonResponse({ error: "invalid_grant" }, 400);
  return jsonResponse({ data: {} });
});
check(failed.response.status === 202 && failed.body.synced === false, "Jobber error returns 202 failed");
check(failed.body.reason === "token", "Jobber token failure names token");
check(!logsHaveSecrets(failed.lines), "failed log has no secret or email");

const unconfirmedCalls: Call[] = [];
const unconfirmed = await run(
  bookingRequest({ ...lead, status: "timeout", bookingId: null }),
  enabledEnv,
  happyFetch(unconfirmedCalls)
);
check(unconfirmed.body.synced === true, "a timeout still creates the Jobber request");
const unconfirmedCreate = unconfirmedCalls.find((call) => classify(call) === "requestCreate");
const unconfirmedTitle =
  (unconfirmedCreate &&
    (JSON.parse(unconfirmedCreate.body) as { variables?: { input?: { title?: string } } }).variables?.input?.title) ||
  "";
check(unconfirmedTitle.startsWith("UNCONFIRMED Widget booking NO-ID"), "a failed Apps Script booking is marked unconfirmed");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("jobber booking guard passed");
