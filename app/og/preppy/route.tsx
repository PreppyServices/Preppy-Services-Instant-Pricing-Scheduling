import { ImageResponse } from "next/og";
import {
  campaignFirstName,
  isNovemberOgRequest,
  novemberKicker,
  novemberSubline,
} from "../../../lib/campaignCopy";
import { resolveVerifiedBuilding } from "../../../lib/ogBuilding";
import { PreppyOgCard } from "./card";
import { NovemberCampaignCard } from "./november-card";

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

async function publicDataUrl(request: Request, path: string, mime: string): Promise<string> {
  const res = await fetch(new URL(path, request.url));
  if (!res.ok) throw new Error(`missing ${path}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const step = 8192;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return `data:${mime};base64,${btoa(binary)}`;
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
  const november = isNovemberOgRequest(
    clean(searchParams.get("mode"), ""),
    clean(searchParams.get("campaign"), "")
  );

  // Self-hosted serif, same origin. `v` only busts the iMessage image cache.
  const [playfairRegular, playfairMedium, photoSrc, iconSrc] = await Promise.all([
    fetch(new URL("/fonts/PlayfairDisplay-Regular.ttf", request.url)).then((res) =>
      res.arrayBuffer()
    ),
    fetch(new URL("/fonts/PlayfairDisplay-Medium.ttf", request.url)).then((res) =>
      res.arrayBuffer()
    ),
    november
      ? publicDataUrl(request, "/preppy-holiday-flyer-v3.jpg", "image/jpeg")
      : Promise.resolve(""),
    november
      ? publicDataUrl(request, "/preppy-icon-512.png", "image/png")
      : Promise.resolve(""),
  ]);

  const fonts = [
    {
      name: "Playfair",
      data: playfairRegular,
      style: "normal" as const,
      weight: 400 as const,
    },
    {
      name: "Playfair",
      data: playfairMedium,
      style: "normal" as const,
      weight: 500 as const,
    },
  ];

  if (november) {
    const firstName = campaignFirstName(name);
    return new ImageResponse(
      (
        <NovemberCampaignCard
          kicker={novemberKicker(firstName)}
          subline={novemberSubline(building)}
          photoSrc={photoSrc}
          iconSrc={iconSrc}
        />
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts,
      }
    );
  }

  return new ImageResponse(
    <PreppyOgCard name={name} building={building} unit={unit} lang={lang} />,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts,
    }
  );
}
