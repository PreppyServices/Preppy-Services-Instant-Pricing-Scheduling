// Holiday newsletter landing.
// Next.js App Router serves this file at /november on a direct load, including
// on Vercel. Query params (?b=, ?line=, ?name=) stay on the URL and the client
// widget reads them. Tracking params (?campaign=, ?source=) are ignored.
// No SPA rewrite is required. This repo has no vercel.json.

import type { Metadata } from "next";
import WidgetShell from "../WidgetShell";
import {
  NOVEMBER_DESCRIPTION,
  campaignFirstName,
  novemberOgImageUrl,
  novemberTitle,
  sanitizeCampaignUnit,
} from "../../lib/campaignCopy";
import { resolveVerifiedBuilding } from "../../lib/ogBuilding";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = { [k: string]: string | string[] | undefined };

function asString(v: string | string[] | undefined): string {
  if (!v) return "";
  return (Array.isArray(v) ? v[0] ?? "" : v).toString();
}

const APPLE_ICON = "https://quote.preppyservices.com/preppy-icon-512.png";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const firstName = campaignFirstName(asString(sp.name));
  const rawBuilding = asString(sp.b || sp.building).trim().slice(0, 48);
  const building = resolveVerifiedBuilding(rawBuilding) ?? "";
  const unit = building ? sanitizeCampaignUnit(asString(sp.unit)) : "";
  const title = novemberTitle(firstName);
  const description = NOVEMBER_DESCRIPTION;
  const image = novemberOgImageUrl({
    name: firstName,
    building,
    unit,
  });

  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: "website",
      siteName: "Preppy Services",
      title,
      description,
      url: "https://quote.preppyservices.com/november",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: "Click here to get your unit pricing. Preppy Services holiday balcony cleaning.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
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
