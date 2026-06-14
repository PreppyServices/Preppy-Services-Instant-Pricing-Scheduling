import { ImageResponse } from "next/og";
import { resolveVerifiedBuilding } from "../../../lib/ogBuilding";
import { PreppyOgCard } from "./card";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 630;

function clean(value: string | null, fallback = "") {
  if (!value) return fallback;
  try {
    return decodeURIComponent(value).replace(/\+/g, " ").trim();
  } catch {
    return value.trim();
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // No fabricated personalization: an absent name stays empty rather than
  // defaulting to a generic placeholder. Only the first name token is shown by
  // the card itself (no surname).
  const name = clean(searchParams.get("name"), "");

  // Building param compatibility: accept both `building` and the `b` alias the
  // share page forwards (`building` wins when both are present). The raw value
  // is resolved against the verified building list. An unknown / unverified
  // building resolves to "" so the card renders neutral Preppy branding — it
  // never echoes arbitrary input and never falls back to a wrong named building.
  const rawBuilding = clean(
    searchParams.get("building") ?? searchParams.get("b"),
    ""
  );
  const building = resolveVerifiedBuilding(rawBuilding) ?? "";

  // A unit is only carried through when its building actually matched.
  const unit = building ? clean(searchParams.get("unit"), "") : "";
  const lang = clean(searchParams.get("lang"), "EN").toUpperCase();

  // Self-hosted serif — same origin, no external dep
  const playfairRegular = await fetch(
    new URL("/fonts/PlayfairDisplay-Regular.ttf", request.url)
  ).then((res) => res.arrayBuffer());

  const playfairMedium = await fetch(
    new URL("/fonts/PlayfairDisplay-Medium.ttf", request.url)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    <PreppyOgCard name={name} building={building} unit={unit} lang={lang} />,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: "Playfair",
          data: playfairRegular,
          style: "normal",
          weight: 400,
        },
        {
          name: "Playfair",
          data: playfairMedium,
          style: "normal",
          weight: 500,
        },
      ],
    }
  );
}
