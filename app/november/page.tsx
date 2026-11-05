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

const OG_TITLE = "20% Deal Applied · Select Your Property & Line for Price";
const OG_DESCRIPTION =
  "Instant building & unit pricing — 20% November discount applied. Pay after service.";
const OG_IMAGE = "https://quote.preppyservices.com/preppy-mirrored-holiday-card.jpg";
const APPLE_ICON = "https://quote.preppyservices.com/preppy-icon-512.png";

const TAGLINE: Record<Lang, string> = {
  en: OG_DESCRIPTION,
  es: "Precio instantáneo por edificio y unidad — 20% de descuento de noviembre aplicado. Pague después del servicio.",
  fr: "Prix instantané par immeuble et ligne — réduction de 20 % de novembre appliquée. Payez après le service.",
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
  // iMessage reads these tags from the raw HTML. Keep the locked title and the
  // real mirrored Edgewater card even when the link also carries ?b= or ?line=.
  const title =
    name && building
      ? `${PREPARED_FOR[lang]} ${name} · ${building} · ${OG_TITLE}`
      : OG_TITLE;

  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: "website",
      siteName: "Preppy Services",
      title: OG_TITLE,
      description: OG_DESCRIPTION,
      url: "https://quote.preppyservices.com/november",
      images: [
        {
          url: OG_IMAGE,
          width: 1080,
          height: 1350,
          alt: "Preppy Services mirrored Edgewater balcony. 20% deal applied. Select your property and line for price.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: OG_TITLE,
      description: OG_DESCRIPTION,
      images: [OG_IMAGE],
    },
    icons: {
      icon: [{ url: APPLE_ICON, type: "image/png", sizes: "512x512" }],
      apple: [{ url: APPLE_ICON, type: "image/png", sizes: "512x512" }],
    },
  };
}

export default function NovemberLandingPage() {
  return <WidgetShell />;
}
