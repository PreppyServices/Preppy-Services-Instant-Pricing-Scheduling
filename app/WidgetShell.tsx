"use client";

import dynamic from "next/dynamic";
import { QuoteTracking } from "../components/QuoteTracking";

const PreppyLuxuryWidget = dynamic(
  () => import("../components/PreppyLuxuryWidget"),
  { ssr: false }
);

export default function WidgetShell() {
  return (
    <>
      <QuoteTracking />
      <PreppyLuxuryWidget />
    </>
  );
}