import type { CustomQuoteReason, Resolution } from "./pricing";

type SmsContext = {
  resolution: Resolution;
  name: string | null;
  buildingDisplayName: string | null;
  address: string | null;
  unit: string | null;
};

export function buildSmsBody(ctx: SmsContext): string {
  const { resolution, name, buildingDisplayName, address, unit } = ctx;
  const greeting = name ? `Hi Preppy! This is ${name}.` : "Hi Preppy!";
  const where = formatLocation({ buildingDisplayName, address, unit });

  switch (resolution.kind) {
    case "instant_price": {
      const { service, price, line, penthouse } = resolution;
      const penthouseHint = penthouse
        ? " (please confirm if my unit is a penthouse — pricing may differ.)"
        : "";
      return joinSentences([
        greeting,
        where ? `${where} (line ${line}).` : `Line ${line}.`,
        `I'd like to book ${service.label} at the listed $${price}.${penthouseHint}`,
        "A couple of quick questions before I confirm —",
      ]);
    }
    case "needs_line": {
      const { service } = resolution;
      return joinSentences([
        greeting,
        where ? `${where}.` : "",
        `I'm looking at ${service.label} but couldn't pick my line on the link — could you help me confirm?`,
      ]);
    }
    case "discuss": {
      const { service } = resolution;
      return joinSentences([
        greeting,
        where ? `${where}.` : "",
        `I'm interested in ${service.label} — when can we walk through the scope?`,
      ]);
    }
    case "custom_quote": {
      return joinSentences([
        greeting,
        where ? `${where}.` : "",
        customQuoteAsk(resolution.reason, resolution.service?.label ?? null),
      ]);
    }
  }
}

function formatLocation({
  buildingDisplayName,
  address,
  unit,
}: {
  buildingDisplayName: string | null;
  address: string | null;
  unit: string | null;
}): string {
  const place = buildingDisplayName ?? address ?? null;
  if (!place) return unit ? `I'm in unit ${unit}` : "";
  return unit ? `I'm at ${place}, unit ${unit}` : `I'm at ${place}`;
}

function customQuoteAsk(
  reason: CustomQuoteReason,
  serviceLabel: string | null,
): string {
  switch (reason) {
    case "unregistered_building":
      return "Could I get a custom quote for my building?";
    case "unresolved_line":
      return "I couldn't confirm my line from the link — could I get a custom quote?";
    case "service_not_listed":
      return serviceLabel
        ? `I'm looking for ${serviceLabel}, which isn't on the standard list — could I get a custom quote?`
        : "I'm looking for a service that isn't on the standard list — could I get a custom quote?";
  }
}

function joinSentences(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => Boolean(p && p.trim())).join(" ");
}

export function buildSmsHref(phone: string, body: string): string {
  const encoded = encodeURIComponent(body);
  return phone ? `sms:${phone}?body=${encoded}` : `sms:?body=${encoded}`;
}
