import type { Metadata } from "next";
import StorefrontBooking from "../../components/StorefrontBooking";
import { readUtmSearch } from "../../lib/batchUtm";
import {
  STOREFRONT_CANONICAL,
  STOREFRONT_DESCRIPTION,
  STOREFRONT_TITLE,
} from "../../lib/storefrontCopy";
import { readStorefrontPrefill, searchParamsFromRecord } from "../../lib/storefrontPrefill";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = { [key: string]: string | string[] | undefined };

const SHARE_IMAGE = "https://quote.preppyservices.com/og/building-picker.png";

export const metadata: Metadata = {
  title: { absolute: STOREFRONT_TITLE },
  description: STOREFRONT_DESCRIPTION,
  alternates: { canonical: STOREFRONT_CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Preppy Services",
    title: STOREFRONT_TITLE,
    description: STOREFRONT_DESCRIPTION,
    url: STOREFRONT_CANONICAL,
    images: [
      {
        url: SHARE_IMAGE,
        width: 1200,
        height: 630,
        alt: "Preppy Services storefront glass plan.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: STOREFRONT_TITLE,
    description: STOREFRONT_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
};

export default async function StorefrontPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const params = searchParamsFromRecord(resolved);
  const prefill = readStorefrontPrefill(params.toString());
  const utm = readUtmSearch(params.toString());
  return <StorefrontBooking prefill={prefill} utm={utm} />;
}
