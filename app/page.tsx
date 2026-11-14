// Home page. Renders the quote widget and emits the link-preview tags phones
// read from the raw HTML. A bare link uses the static building-picker card.
// Links that carry a verified building or a name keep their personalized title
// and image.

import type { Metadata } from "next";
import WidgetShell from "./WidgetShell";
import { resolveVerifiedBuilding } from "../lib/ogBuilding";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const QUOTE_ORIGIN = "https://quote.preppyservices.com";
const DEFAULT_TITLE = "Preppy Services | Balcony Glass Cleaning Price by Building";
const DEFAULT_DESCRIPTION =
  "Pick your building and see your price in seconds. Miami balcony glass cleaning.";
const DEFAULT_IMAGE = `${QUOTE_ORIGIN}/og/building-picker.png`;
const DEFAULT_IMAGE_ALT =
  "Preppy Services building picker. Pick your building, see your price.";

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
  const rawBuilding = asString(sp.b || sp.building).trim().slice(0, 48);
  const building = resolveVerifiedBuilding(rawBuilding) ?? "";
  const unit = building ? asString(sp.unit).trim().slice(0, 8) : "";
  const lang = normLang(asString(sp.lang));
  return { name, building, unit, lang };
}

function buildPersonalizedImageUrl(p: ReturnType<typeof extractOgParams>): string {
  const qs = new URLSearchParams();
  if (p.name) qs.set("name", p.name);
  if (p.building) qs.set("building", p.building);
  if (p.unit) qs.set("unit", p.unit);
  if (p.lang !== "en") qs.set("lang", p.lang);
  const q = qs.toString();
  return `${QUOTE_ORIGIN}/og/preppy${q ? `?${q}` : ""}`;
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
  const personalized = Boolean(p.name || p.building);

  let title = DEFAULT_TITLE;
  if (p.name && p.building) {
    title = `${PREPARED_FOR[p.lang]} ${p.name} · ${p.building} · Preppy Services`;
  } else if (p.name) {
    title = `${PREPARED_FOR[p.lang]} ${p.name} · Preppy Services`;
  } else if (p.building) {
    title = `${RESIDENT_PREVIEW[p.lang]} · ${p.building} · Preppy Services`;
  }

  const description = personalized ? TAGLINE[p.lang] : DEFAULT_DESCRIPTION;
  const imageUrl = personalized ? buildPersonalizedImageUrl(p) : DEFAULT_IMAGE;
  const alt = p.name
    ? `${PREPARED_FOR[p.lang]} ${p.name}. Preppy Services`
    : p.building
      ? `${RESIDENT_PREVIEW[p.lang]}. ${p.building}. Preppy Services`
      : DEFAULT_IMAGE_ALT;

  return {
    metadataBase: new URL(QUOTE_ORIGIN),
    title: { absolute: title },
    description,
    openGraph: {
      type: "website",
      siteName: "Preppy Services",
      title,
      description,
      url: QUOTE_ORIGIN,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function HomePage() {
  return <WidgetShell />;
}
