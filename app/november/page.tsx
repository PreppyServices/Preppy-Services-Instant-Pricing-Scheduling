// Holiday newsletter landing.
// Next.js App Router serves this file at /november on a direct load, including
// on Vercel. Query params (?b=, ?line=, ?name=) stay on the URL and the client
// widget reads them. No SPA rewrite is required — this repo has no vercel.json.

import type { Metadata } from "next";
import WidgetShell from "../WidgetShell";
import { resolveVerifiedBuilding } from "../../lib/ogBuilding";

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

const TAGLINE: Record<Lang, string> = {
  en: "20% off your first balcony cleaning. Instant unit pricing. Pay after service.",
  es: "20% de descuento en su primera limpieza de balcón. Precio al instante. Pague después del servicio.",
  fr: "20 % de réduction sur votre premier nettoyage de balcon. Prix instantané. Payez après le service.",
};

const PREPARED_FOR: Record<Lang, string> = {
  en: "Prepared for",
  es: "Preparado para",
  fr: "Préparé pour",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const name = asString(sp.name).trim().slice(0, 36);
  const rawBuilding = asString(sp.b || sp.building).trim().slice(0, 48);
  const building = resolveVerifiedBuilding(rawBuilding) ?? "";
  const lang = normLang(asString(sp.lang));
  const description = TAGLINE[lang];

  let title = "Holiday Balcony Cleaning — 20% Off First Visit · Preppy Services";
  if (name && building) {
    title = `${PREPARED_FOR[lang]} ${name} · ${building} · 20% Off · Preppy Services`;
  } else if (building) {
    title = `${building} · Holiday Balcony Cleaning · 20% Off · Preppy Services`;
  } else if (name) {
    title = `${PREPARED_FOR[lang]} ${name} · Holiday Balcony Cleaning · Preppy Services`;
  }

  const qs = new URLSearchParams();
  if (name) qs.set("name", name);
  if (building) qs.set("building", building);
  if (lang !== "en") qs.set("lang", lang);
  const q = qs.toString();
  const ogImage = q ? `/og/preppy?${q}` : "/og/preppy";

  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: "website",
      siteName: "Preppy Services",
      title,
      description,
      url: "/november",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function NovemberLandingPage() {
  return <WidgetShell />;
}
