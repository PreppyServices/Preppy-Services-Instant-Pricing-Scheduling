import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preppy Services | Instant Pricing & Scheduling",
  description: "Luxury home services scheduling and pricing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
