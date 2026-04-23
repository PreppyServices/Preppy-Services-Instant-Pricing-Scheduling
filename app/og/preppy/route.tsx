import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function normalizeText(value: string | null, fallback = "") {
  if (!value) return fallback;
  return decodeURIComponent(value).replace(/\+/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatName(value: string) {
  return titleCase(value);
}

function formatBuilding(value: string) {
  return titleCase(value).toUpperCase();
}

function formatUnit(value: string) {
  const clean = value.trim();
  if (!clean) return "";
  if (/^unit\s+/i.test(clean)) return clean.replace(/^unit\s+/i, "Unit ");
  return `Unit ${clean}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawName = normalizeText(searchParams.get("name"), "Valued Resident");
  const rawBuilding = normalizeText(searchParams.get("building"), "Private Residence");
  const rawUnit = normalizeText(searchParams.get("unit"), "");
  const lang = normalizeText(searchParams.get("lang"), "EN").toUpperCase();

  const name = formatName(rawName);
  const building = formatBuilding(rawBuilding);
  const unit = formatUnit(rawUnit);

  const gold = "#D4B06A";
  const warmGold = "#E1C487";
  const white = "#F4F1EA";
  const softWhite = "rgba(244, 241, 234, 0.88)";
  const muted = "rgba(244, 241, 234, 0.70)";
  const line = "rgba(212, 176, 106, 0.18)";
  const tealGlow = "rgba(34, 138, 155, 0.18)";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          position: "relative",
          display: "flex",
          overflow: "hidden",
          background:
            "linear-gradient(110deg, #0f2032 0%, #031226 45%, #02101f 100%)",
          color: white,
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Background glows */}
        <div
          style={{
            position: "absolute",
            left: -110,
            top: -40,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(212,176,106,0.24) 0%, rgba(212,176,106,0.10) 34%, rgba(212,176,106,0.04) 54%, rgba(212,176,106,0) 74%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -150,
            bottom: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(54,138,170,0.16) 0%, rgba(54,138,170,0.10) 34%, rgba(54,138,170,0.04) 56%, rgba(54,138,170,0) 76%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 175,
            top: 120,
            width: 74,
            height: 74,
            borderRadius: 9999,
            background: "rgba(0,0,0,0.26)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 175,
            bottom: 118,
            width: 74,
            height: 74,
            borderRadius: 9999,
            background: "rgba(0,0,0,0.28)",
          }}
        />

        {/* Vertical guide lines */}
        {[180, 350, 520, 690, 860, 1030].map((x) => (
          <div
            key={x}
            style={{
              position: "absolute",
              left: x,
              top: 0,
              width: 1,
              height: 630,
              background: "rgba(255,255,255,0.10)",
            }}
          />
        ))}

        {/* Top-right brand lockup */}
        <div
          style={{
            position: "absolute",
            right: 58,
            top: 42,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 9999,
              border: `2px solid rgba(212,176,106,0.55)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: gold,
              fontSize: 28,
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            P
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <div
              style={{
                fontSize: 33,
                lineHeight: 1,
                fontWeight: 500,
                color: white,
                letterSpacing: -0.5,
              }}
            >
              Preppy Services
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1,
                color: gold,
                letterSpacing: 4,
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              Luxury Home Services
            </div>
          </div>

          <div
            style={{
              marginLeft: 6,
              minWidth: 58,
              height: 36,
              borderRadius: 9999,
              border: `2px solid rgba(212,176,106,0.45)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: gold,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: 2,
              paddingLeft: 12,
              paddingRight: 12,
            }}
          >
            {lang}
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            position: "absolute",
            left: 66,
            top: 182,
            width: 760,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 34,
              lineHeight: 1,
              color: warmGold,
              letterSpacing: 7,
              textTransform: "uppercase",
              fontWeight: 500,
              marginBottom: 26,
            }}
          >
            Prepared For
          </div>

          <div
            style={{
              fontSize: 56,
              lineHeight: 1.04,
              color: warmGold,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              fontWeight: 500,
              marginBottom: 24,
              maxWidth: 740,
            }}
          >
            {building}
          </div>

          <div
            style={{
              fontSize: 102,
              lineHeight: 0.98,
              color: white,
              fontWeight: 400,
              letterSpacing: -2.4,
              marginBottom: 18,
              maxWidth: 920,
            }}
          >
            {name}
          </div>

          {unit ? (
            <div
              style={{
                fontSize: 40,
                lineHeight: 1,
                color: softWhite,
                fontWeight: 400,
                letterSpacing: -0.4,
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
            left: 66,
            right: 200,
            bottom: 138,
            display: "flex",
            alignItems: "center",
            color: muted,
            fontSize: 22,
            lineHeight: 1.25,
            fontWeight: 500,
            letterSpacing: 2.4,
            textTransform: "uppercase",
          }}
        >
          Balcony Glass Cleaning • Interior Paint • Custom Project Requests
        </div>

        {/* Bottom divider */}
        <div
          style={{
            position: "absolute",
            left: 66,
            right: 66,
            bottom: 72,
            height: 1,
            background: line,
          }}
        />

        {/* Footer left */}
        <div
          style={{
            position: "absolute",
            left: 66,
            bottom: 28,
            color: gold,
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: 5,
            textTransform: "uppercase",
          }}
        >
          Miami • Miami Beach
        </div>

        {/* Footer right */}
        <div
          style={{
            position: "absolute",
            right: 66,
            bottom: 28,
            color: "rgba(244,241,234,0.52)",
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: 5,
            textTransform: "uppercase",
          }}
        >
          Fully Insured • $2M Coverage
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}