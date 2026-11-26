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

/** TrueType fonts start with 0x00010000. An HTML login page starts with "<!DO". */
function assertTrueType(bytes: ArrayBuffer, label: string) {
  const view = new Uint8Array(bytes);
  const truetype =
    view.length > 4 && view[0] === 0x00 && view[1] === 0x01 && view[2] === 0x00 && view[3] === 0x00;
  if (!truetype) {
    const head = new TextDecoder().decode(view.slice(0, 4));
    throw new Error(`Playfair font ${label} is not a TrueType file (got ${JSON.stringify(head)})`);
  }
}

async function loadBundledFont(fileUrl: URL): Promise<ArrayBuffer> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Font file ${fileUrl.pathname} returned ${response.status}`);
  }
  const bytes = await response.arrayBuffer();
  assertTrueType(bytes, fileUrl.pathname);
  return bytes;
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

  // Bundle the font files. Fetching /fonts from request.url hits Vercel
  // Deployment Protection on previews and returns an HTML page. ImageResponse
  // then throws "Unsupported OpenType signature <!DO" inside its stream and
  // the client receives HTTP 200 image/png with an empty body.
  const playfairRegular = await loadBundledFont(
    new URL("../../../public/fonts/PlayfairDisplay-Regular.ttf", import.meta.url)
  );
  const playfairMedium = await loadBundledFont(
    new URL("../../../public/fonts/PlayfairDisplay-Medium.ttf", import.meta.url)
  );

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
