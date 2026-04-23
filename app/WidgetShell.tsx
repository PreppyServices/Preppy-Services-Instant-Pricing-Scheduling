"use client";

import dynamic from "next/dynamic";

const PreppyLuxuryWidget = dynamic(
  () => import("../components/PreppyLuxuryWidget"),
  { ssr: false }
);

export default function WidgetShell() {
  return <PreppyLuxuryWidget />;
}