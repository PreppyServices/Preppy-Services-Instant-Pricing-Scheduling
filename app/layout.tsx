// app/layout.tsx

import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

const SITE_URL = "https://quote.preppyservices.com";
const SITE_TITLE = "Preppy Services | Balcony Glass Cleaning Price by Building";
const SITE_DESC =
  "Pick your building and see your price in seconds. Miami balcony glass cleaning.";
const OG_IMAGE = `${SITE_URL}/og/building-picker.png`;
const OG_ALT = "Preppy Services building picker. Pick your building, see your price.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Preppy Services",
  },
  description: SITE_DESC,
  applicationName: "Preppy Services",
  keywords: [
    "Miami balcony glass cleaning",
    "balcony glass",
    "high rise window cleaning",
    "interior painting",
    "condominium concierge",
  ],
  openGraph: {
    type: "website",
    siteName: "Preppy Services",
    title: SITE_TITLE,
    description: SITE_DESC,
    url: SITE_URL,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: OG_ALT,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      {
        url: "https://quote.preppyservices.com/preppy-icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url: "https://quote.preppyservices.com/preppy-icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1A24",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}