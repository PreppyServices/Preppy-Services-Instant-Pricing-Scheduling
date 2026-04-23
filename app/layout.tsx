// app/layout.tsx

import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://preppyservices.com";
const SITE_TITLE = "Preppy Services — Luxury Home Services";
const SITE_DESC = "Balcony glass, paint, and custom work for Miami's finest residences.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Preppy Services",
  },
  description: SITE_DESC,
  applicationName: "Preppy Services",
  keywords: [
    "Miami luxury cleaning",
    "balcony glass",
    "high-rise window cleaning",
    "interior painting",
    "condominium concierge",
  ],
  openGraph: {
    type: "website",
    siteName: "Preppy Services",
    title: SITE_TITLE,
    description: "Your balcony, restored.",
    url: SITE_URL,
    images: [
      {
        url: "/og/preppy",
        width: 1200,
        height: 630,
        alt: "Preppy Services — Luxury Home Services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: "Your balcony, restored.",
    images: ["/og/preppy"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.ico",
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