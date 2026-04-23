import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const WIDTH = 1200;
const HEIGHT = 630;

// Gold system — three tiers for metallic depth
const GOLD_HERO = "#D4B57E";      // building name — the champagne-brass
const GOLD_LABEL = "#B89968";     // kicker, footer, brand marks
const GOLD_DEEP = "#8A7244";      // borders, deepest accents
const IVORY = "#F2EBDD";          // name — warm ivory, not white

function clean(value: string | null, fallback = "") {
  if (!value) return fallback;
  try {
    return decodeURIComponent(value).replace(/\+/g, " ").trim();
  } catch {
    return value.trim();
  }
}

function humanizeBuilding(value: string) {
  if (!value) return "";
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeUnit(value: string) {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^unit\s/i.test(trimmed)) return trimmed;
  return `Unit ${trimmed}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const name = clean(searchParams.get("name"), "Prepared Client");
  const rawBuilding = clean(searchParams.get("building"), "One Paraiso");
  const building = humanizeBuilding(rawBuilding);
  const unit = normalizeUnit(clean(searchParams.get("unit"), ""));
  const lang = clean(searchParams.get("lang"), "EN").toUpperCase();

  // Self-hosted serif — same origin, no external dep
  const playfairRegular = await fetch(
    new URL("/fonts/PlayfairDisplay-Regular.ttf", request.url)
  ).then((res) => res.arrayBuffer());

  const playfairMedium = await fetch(
    new URL("/fonts/PlayfairDisplay-Medium.ttf", request.url)
  ).then((res) => res.arrayBuffer());

  const SERIF = 'Playfair, "Times New Roman", serif';

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          // Deeper, more cinematic base — single considered gradient
          background:
            "linear-gradient(110deg, #030b18 0%, #05101f 30%, #061426 55%, #04182c 78%, #030d1c 100%)",
          color: IVORY,
          fontFamily:
            'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Left bloom — soft, diffuse, behind the name */}
        <div
          style={{
            position: "absolute",
            left: -120,
            top: 60,
            width: 820,
            height: 620,
            background:
              "radial-gradient(ellipse at center, rgba(176,148,92,0.14) 0%, rgba(176,148,92,0.07) 28%, rgba(176,148,92,0.02) 52%, rgba(0,0,0,0) 72%)",
            filter: "blur(2px)",
          }}
        />

        {/* Right ambient glow — quieter, cooler, more atmospheric */}
        <div
          style={{
            position: "absolute",
            right: -80,
            bottom: -60,
            width: 680,
            height: 540,
            background:
              "radial-gradient(ellipse at center, rgba(36,82,128,0.26) 0%, rgba(36,82,128,0.12) 32%, rgba(36,82,128,0.04) 58%, rgba(0,0,0,0) 78%)",
          }}
        />

        {/* Subtle architectural guide lines — whisper soft */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "space-between",
            padding: "0 188px",
            opacity: 0.06,
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                width: 1,
                height: "100%",
                background: "rgba(212,181,126,0.5)",
              }}
            />
          ))}
        </div>

        {/* Dark accent voids — soft radial falloff, not flat discs */}
        <div
          style={{
            position: "absolute",
            left: 195,
            top: 112,
            width: 110,
            height: 110,
            background:
              "radial-gradient(circle at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.38) 35%, rgba(0,0,0,0.15) 68%, rgba(0,0,0,0) 85%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 135,
            bottom: 95,
            width: 130,
            height: 130,
            background:
              "radial-gradient(circle at center, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.40) 38%, rgba(0,0,0,0.16) 70%, rgba(0,0,0,0) 88%)",
          }}
        />

        {/* Cinematic inner vignette — four edges softly darkened */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 100%)",
          }}
        />

        {/* Brand lockup — top right */}
        <div
          style={{
            position: "absolute",
            top: 46,
            right: 54,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: "999px",
              border: `1.5px solid ${GOLD_DEEP}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: GOLD_HERO,
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1,
              fontFamily: SERIF,
            }}
          >
            P
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1,
            }}
          >
            <div
              style={{
                fontSize: 30,
                fontWeight: 400,
                color: "#EDE5D4",
                letterSpacing: "-0.015em",
              }}
            >
              Preppy Services
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: GOLD_LABEL,
                fontWeight: 500,
              }}
            >
              Luxury Home Services
            </div>
          </div>

          <div
            style={{
              marginLeft: 12,
              minWidth: 50,
              height: 32,
              borderRadius: 999,
              border: `1.5px solid ${GOLD_DEEP}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 16px",
              color: GOLD_LABEL,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.22em",
            }}
          >
            {lang}
          </div>
        </div>

        {/* Main content block */}
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 188,
            width: 780,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.38em",
              textTransform: "uppercase",
              color: GOLD_LABEL,
              fontWeight: 500,
            }}
          >
            Prepared For
          </div>

          <div
            style={{
              marginTop: 30,
              fontSize: 84,
              lineHeight: 0.96,
              color: IVORY,
              fontWeight: 400,
              letterSpacing: "-0.035em",
              maxWidth: 780,
              whiteSpace: "pre-wrap",
              fontFamily: SERIF,
            }}
          >
            {name}
          </div>

          <div
            style={{
              marginTop: 24,
              fontSize: 50,
              lineHeight: 1.02,
              color: GOLD_HERO,
              fontWeight: 500,
              letterSpacing: "-0.025em",
              maxWidth: 720,
              fontFamily: SERIF,
            }}
          >
            {building}
          </div>

          {unit ? (
            <div
              style={{
                marginTop: 14,
                marginLeft: 4,
                fontSize: 30,
                lineHeight: 1.1,
                color: GOLD_LABEL,
                fontWeight: 400,
                letterSpacing: "-0.015em",
                fontFamily: SERIF,
              }}
            >
              {unit}
            </div>
          ) : null}
        </div>

        {/* Services line */}
        <div
          style={{
            position: "absolute",
            left: 70,
            right: 170,
            bottom: 112,
            display: "flex",
            alignItems: "center",
            fontSize: 15,
            lineHeight: 1.25,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(237,229,212,0.78)",
            fontWeight: 500,
          }}
        >
          Balcony Glass Cleaning · Interior Paint · Custom Home Maintenance Plans
        </div>

        {/* Divider — center-weighted gradient line for editorial finish */}
        <div
          style={{
            position: "absolute",
            left: 70,
            right: 70,
            bottom: 62,
            height: 1,
            background:
              "linear-gradient(90deg, rgba(184,153,104,0) 0%, rgba(184,153,104,0.38) 22%, rgba(212,181,126,0.55) 50%, rgba(184,153,104,0.38) 78%, rgba(184,153,104,0) 100%)",
          }}
        />

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            left: 70,
            bottom: 20,
            fontSize: 13,
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            color: GOLD_LABEL,
            fontWeight: 600,
          }}
        >
          Miami · Miami Beach
        </div>

        <div
          style={{
            position: "absolute",
            right: 70,
            bottom: 20,
            fontSize: 13,
            letterSpacing: "0.30em",
            textTransform: "uppercase",
            color: "rgba(184,153,104,0.72)",
            fontWeight: 600,
          }}
        >
          Fully Insured · $2M Coverage
        </div>
      </div>
    ),
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