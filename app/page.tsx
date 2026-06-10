// app/page.tsx
//
// Home page that (a) renders the existing Preppy Luxury Widget, and (b) emits
// per-link metadata so the OG preview personalizes itself when morning-text
// deep links carry ?name=, ?b=, ?unit=, ?lang= params.

import type { Metadata } from "next";
import WidgetShell from "./WidgetShell";
import { resolveVerifiedBuilding } from "../lib/ogBuilding";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Lang = "en" | "es" | "fr";
type SearchParams = { [k: string]: string | string[] | undefined };

function asString(v: string | string[] | undefined): string {
  if (!v) return "";
  return (Array.isArray(v) ? v[0] ?? "" : v).toString();
}

function normLang(raw: string): Lang {
  const v = raw.toLowerCase().slice(0, 2);
  return v === "es" || v === "fr" ? (v as Lang) : "en";
}

function extractOgParams(sp: SearchParams) {
  const name = asString(sp.name).trim().slice(0, 36);
  // Resolve the inbound building (?b= or ?building=) against the verified
  // building list. Unknown / unverified buildings resolve to "" so the card
  // falls back to neutral Preppy Services branding instead of echoing arbitrary
  // input. A unit is only carried through when its building actually matched.
  const rawBuilding = asString(sp.b || sp.building).trim().slice(0, 48);
  const building = resolveVerifiedBuilding(rawBuilding) ?? "";
  const unit = building ? asString(sp.unit).trim().slice(0, 8) : "";
  const lang = normLang(asString(sp.lang));
  return { name, building, unit, lang };
}

function buildOgImageUrl(p: ReturnType<typeof extractOgParams>): string {
  const qs = new URLSearchParams();
  if (p.name) qs.set("name", p.name);
  if (p.building) qs.set("building", p.building);
  if (p.unit) qs.set("unit", p.unit);
  if (p.lang !== "en") qs.set("lang", p.lang);
  const q = qs.toString();
  return q ? `/og/preppy?${q}` : "/og/preppy";
}

const TAGLINE: Record<Lang, string> = {
  en: "Your balcony, restored.",
  es: "Su balcón, restaurado.",
  fr: "Votre balcon, restauré.",
};

const PREPARED_FOR: Record<Lang, string> = {
  en: "Prepared for",
  es: "Preparado para",
  fr: "Préparé pour",
};

const RESIDENT_PREVIEW: Record<Lang, string> = {
  en: "Resident Preview",
  es: "Vista para Residentes",
  fr: "Aperçu Résident",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const resolved = await searchParams;
  const p = extractOgParams(resolved);
  const ogImage = buildOgImageUrl(p);

  let title: string;
  if (p.name && p.building) {
    title = `${PREPARED_FOR[p.lang]} ${p.name} · ${p.building} · Preppy Services`;
  } else if (p.name) {
    title = `${PREPARED_FOR[p.lang]} ${p.name} · Preppy Services`;
  } else if (p.building) {
    title = `${RESIDENT_PREVIEW[p.lang]} · ${p.building} · Preppy Services`;
  } else {
    title = "Preppy Services — Luxury Home Services";
  }

  const description = TAGLINE[p.lang];

  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "Preppy Services",
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: p.name
            ? `${PREPARED_FOR[p.lang]} ${p.name} — Preppy Services`
            : "Preppy Services — Luxury Home Services",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function HomePage() {
  return <WidgetShell />;
}
