import {
  pricing,
  safeMappedPricing,
  provisionalBuildings,
  researchStatus,
  type BuildingPricing,
} from "../../../../data/buildings";

export type ServiceSlug =
  | "balcony-glass"
  | "deep-clean"
  | "linens"
  | "turnover"
  | string;

export type Service = {
  slug: ServiceSlug;
  label: string;
  isPriced: boolean;
};

export const SERVICES: Record<string, Service> = {
  "balcony-glass": {
    slug: "balcony-glass",
    label: "Balcony Glass Cleaning",
    isPriced: true,
  },
  "deep-clean": {
    slug: "deep-clean",
    label: "Deep Clean",
    isPriced: false,
  },
  linens: {
    slug: "linens",
    label: "Linen Refresh",
    isPriced: false,
  },
  turnover: {
    slug: "turnover",
    label: "Guest Turnover",
    isPriced: false,
  },
};

export const DEFAULT_SERVICE: ServiceSlug = "balcony-glass";

export type ResolutionContext = {
  buildingSlug: string;
  buildingDisplayName: string | null;
  address: string | null;
  unit: string | null;
  line: string | null;
  serviceSlug: ServiceSlug;
};

export type CustomQuoteReason =
  | "unregistered_building"
  | "unresolved_line"
  | "service_not_listed";

export type Resolution =
  | {
      kind: "instant_price";
      price: number;
      currency: "USD";
      line: string;
      availableLines: string[];
      service: Service;
      penthouse: boolean;
    }
  | {
      kind: "needs_line";
      service: Service;
      availableLines: string[];
      penthouse: boolean;
    }
  | {
      kind: "discuss";
      service: Service;
      penthouse: boolean;
    }
  | {
      kind: "custom_quote";
      reason: CustomQuoteReason;
      service: Service | null;
    };

function defaultDeriveLine(
  unit: string,
  lines: Record<string, number>,
): string | null {
  const u = unit.trim().toUpperCase();
  if (!u) return null;

  if (u.length >= 2) {
    const last2 = u.slice(-2);
    if (last2 in lines) return last2;
  }

  const last1 = u.slice(-1);
  if (last1 in lines) return last1;

  if (u in lines) return u;

  return null;
}

const UNIT_TO_LINE_OVERRIDES: Record<
  string,
  (unit: string, lines: Record<string, number>) => string | null
> = {
  // Add per-building overrides here when needed.
};

function deriveLine(
  slug: string,
  unit: string,
  lines: Record<string, number>,
): string | null {
  const override = UNIT_TO_LINE_OVERRIDES[slug];
  if (override) return override(unit, lines);
  return defaultDeriveLine(unit, lines);
}

export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

type BuildingLookup = {
  entry: BuildingPricing | null;
  isSafeMapped: boolean;
  isProvisional: boolean;
  isRegistered: boolean;
  displayName: string | null;
};

export function lookupBuilding(slug: string): BuildingLookup {
  const isSafeMapped = Object.prototype.hasOwnProperty.call(
    safeMappedPricing,
    slug,
  );
  const isProvisional = provisionalBuildings.includes(slug);
  const isRegistered = isSafeMapped || isProvisional;
  const entry = safeMappedPricing[slug] ?? pricing[slug] ?? null;

  return {
    entry,
    isSafeMapped,
    isProvisional,
    isRegistered,
    displayName: isRegistered ? humanizeSlug(slug) : null,
  };
}

export function registeredBuildingSlugs(): string[] {
  return Object.keys(pricing).sort((a, b) => a.localeCompare(b));
}

export function getResearchStatus(slug: string) {
  return researchStatus[slug] ?? null;
}

export function resolve(ctx: ResolutionContext): Resolution {
  const service = SERVICES[ctx.serviceSlug] ?? null;

  if (!service) {
    return {
      kind: "custom_quote",
      reason: "service_not_listed",
      service: null,
    };
  }

  const lookup = lookupBuilding(ctx.buildingSlug);

  if (!lookup.isRegistered || !lookup.entry) {
    return {
      kind: "custom_quote",
      reason: "unregistered_building",
      service,
    };
  }

  if (!service.isPriced) {
    return { kind: "discuss", service, penthouse: lookup.entry.penthouse };
  }

  if (!lookup.isSafeMapped) {
    return { kind: "custom_quote", reason: "unresolved_line", service };
  }

  const { lines, penthouse } = lookup.entry;
  const availableLines = sortLineKeys(Object.keys(lines));

  let resolvedLine: string | null = null;
  if (ctx.line && Object.prototype.hasOwnProperty.call(lines, ctx.line)) {
    resolvedLine = ctx.line;
  } else if (ctx.unit) {
    resolvedLine = deriveLine(ctx.buildingSlug, ctx.unit, lines);
  }

  if (!resolvedLine || typeof lines[resolvedLine] !== "number") {
    return { kind: "needs_line", service, availableLines, penthouse };
  }

  return {
    kind: "instant_price",
    price: lines[resolvedLine],
    currency: "USD",
    line: resolvedLine,
    availableLines,
    service,
    penthouse,
  };
}

function sortLineKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    const aNum = Number.isFinite(na);
    const bNum = Number.isFinite(nb);
    if (aNum && bNum) return na - nb;
    if (aNum) return -1;
    if (bNum) return 1;
    return a.localeCompare(b);
  });
}
