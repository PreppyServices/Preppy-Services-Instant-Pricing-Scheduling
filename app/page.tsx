"use client";

import dynamic from "next/dynamic";

const PreppyLuxuryWidget = dynamic(
  () => import("../../PreppyLuxuryWidget_FINAL"),
  { ssr: false }
);

export default function Page() {
  return <PreppyLuxuryWidget />;
}
