import { pricing } from "../../data/buildings";
import { matchCatalogBuilding } from "../catalogBuilding";
import { isIntroRequest, readFlyerLanding, type FlyerLanding } from "../introPricing";
import type { Lang } from "./i18n";
import { normalizeLang } from "./i18n";
import { resolveUnitToLine } from "./unitLine";

export type RequestLaunch = "pressure" | "paint" | "either";

export type Launch = {
  building: string;
  buildingRaw: string;
  unmatched: boolean;
  unit: string;
  line: string;
  lineSource: "none" | "url" | "exact" | "last2";
  name: string;
  phone: string;
  email: string;
  interior: boolean;
  intro: boolean;
  kind: "residential" | "commercial";
  request: RequestLaunch | null;
  lang: Lang;
  lead: string;
  flyer: FlyerLanding;
};

function param(params: URLSearchParams, key: string): string {
  const direct = params.get(key);
  if (direct != null) return direct;
  for (const [name, value] of params.entries()) {
    if (name.toLowerCase() === key) return value;
  }
  return "";
}

export function readLaunch(search: string, pathname: string): Launch {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const names = Object.keys(pricing);
  const buildingRaw = (param(params, "b") || param(params, "building")).trim();
  const matched = matchCatalogBuilding(names, buildingRaw);
  const unit = (param(params, "unit") || param(params, "u")).trim();
  let line = "";
  let lineSource: Launch["lineSource"] = "none";
  const rawLine = param(params, "line") || param(params, "l");
  if (matched && rawLine && pricing[matched]?.lines[rawLine] !== undefined) {
    line = rawLine;
    lineSource = "url";
  } else if (matched && unit) {
    const attempt = resolveUnitToLine(unit, matched);
    if (attempt.line) {
      line = attempt.line;
      lineSource = attempt.source;
    }
  }
  const service = param(params, "service").trim().toLowerCase();
  let request: RequestLaunch | null = null;
  if (service === "pressure") request = "pressure";
  else if (service === "paint" || service === "painting") request = "paint";
  else if (service === "custom") request = "either";
  const kind = param(params, "kind").trim().toLowerCase() === "commercial" ? "commercial" : "residential";
  const interiorFlag = param(params, "interior").trim().toLowerCase();
  const navLang = typeof navigator !== "undefined" ? navigator.language : "en";
  return {
    building: matched ?? "",
    buildingRaw: buildingRaw.slice(0, 80),
    unmatched: buildingRaw.length > 0 && !matched,
    unit,
    line,
    lineSource,
    name: param(params, "name").trim(),
    phone: (param(params, "phone") || param(params, "tel")).trim(),
    email: param(params, "email").trim(),
    interior: (interiorFlag === "1" || interiorFlag === "true") && Boolean(line),
    intro: isIntroRequest(params, pathname),
    kind,
    request,
    lang: normalizeLang(param(params, "lang") || navLang),
    lead: param(params, "lead").trim(),
    flyer: readFlyerLanding(pathname, params),
  };
}

/** Cold visits start with an empty building search. Never a catalog default. */
export function initialBuilding(search: string): string {
  return readLaunch(search, "/").building;
}
