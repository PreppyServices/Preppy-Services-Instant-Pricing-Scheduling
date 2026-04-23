import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Preppy Services personalized invitation";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function clean(value: string | null | undefined, fallback = ""): string {
  if (!value) return fallback;
  return value.replace(/\+/g, " ").trim();
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeBuilding(value: string | null | undefined): string {
  const raw = clean(value, "");
  if (!raw) return "";
  return titleCase(raw);
}

function getNameSize(name: string): number {
  const len = name.length;

  if (len >= 28) return 72;
  if (len >= 22) return 80;
  if (len >= 16) return 90;
  return 98;
}

function getBuildingSize(building: string): number {
  const len = building.length;

  if (len >= 24) return 32;
  if (len >= 18) return 38;
  if (len >= 12) return 44;
  return 48;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const name = clean(searchParams.get("name"), "Preppy Client");
  const building = normalizeBuilding(
    searchParams.get("building") || searchParams.get("residence")
  );
  const unitRaw = clean(searchParams.get("unit"), "");
  const unit = unitRaw ? `Unit ${unitRaw}` : "";

  const nameSize = getNameSize(name);
  const buildingSize = getBuildingSize(building || "Private Residence");

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(110deg, #0e1722 0%, #031326 40%, #01162d 100%)",
          color: "#F6F3EC",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Background glow left */}
        <div
          style={{
            position: "absolute",
            left: "-110px",
            top: "-70px",
            width: "620px",
            height: "620px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(199,165,103,0.28) 0%, rgba(199,165,103,0.18) 22%, rgba(199,165,103,0.08) 40%, rgba(199,165,103,0) 68%)",
          }}
        />

        {/* Background glow right */}
        <div
          style={{
            position: "absolute",
            right: "-110px",
            bottom: "-90px",
            width: "520px",
            height: "520px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(51,111,144,0.22) 0%, rgba(51,111,144,0.12) 24%, rgba(51,111,144,0.05) 42%, rgba(51,111,144,0) 70%)",
          }}
        />

        {/* Soft right wash */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.00) 38%, rgba(56,113,145,0.08) 72%, rgba(56,113,145,0.10) 100%)",
          }}
        />

        {/* Vertical grid lines */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${190 + i * 170}px`,
              width: "1px",
              background: "rgba(211, 191, 150, 0.12)",
            }}
          />
        ))}

        {/* Top-right brand */}
        <div
          style={{
            position: "absolute",
            top: 42,
            right: 52,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "9999px",
              border: "2px solid rgba(198,165,104,0.55)",
              color: "#D7BC84",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              lineHeight: 1,
              fontWeight: 400,
            }}
          >
            P
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 34,
                lineHeight: 1,
                fontWeight: 500,
                color: "#F6F3EC",
                letterSpacing: "-0.02em",
              }}
            >
              Preppy Services
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                lineHeight: 1,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "#C6A56A",
              }}
            >
              Luxury Home Services
            </div>
          </div>

          <div
            style={{
              marginLeft: 8,
              minWidth: 56,
              height: 36,
              padding: "0 14px",
              borderRadius: 9999,
              border: "1.5px solid rgba(198,165,104,0.50)",
              color: "#D7BC84",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            EN
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 165,
            width: 780,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 24,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#D7BC84",
              fontWeight: 500,
            }}
          >
            Prepared For
          </div>

          <div
            style={{
              marginTop: 22,
              fontSize: nameSize,
              lineHeight: 0.98,
              letterSpacing: "-0.045em",
              color: "#F6F3EC",
              fontWeight: 400,
              maxWidth: 760,
            }}
          >
            {name}
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: buildingSize,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              color: "#D7BC84",
              fontWeight: 500,
              maxWidth: 700,
            }}
          >
            {building || "Private Residence"}
          </div>

          {unit ? (
            <div
              style={{
                marginTop: 12,
                fontSize: 30,
                lineHeight: 1.05,
                color: "#F6F3EC",
                fontWeight: 400,
                maxWidth: 500,
              }}
            >
              {unit}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 54,
              fontSize: 22,
              lineHeight: 1.2,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "rgba(246,243,236,0.82)",
              fontWeight: 400,
            }}
          >
            Balcony Glass Cleaning · Interior Paint · Custom Project Requests
          </div>
        </div>

        {/* Bottom rule */}
        <div
          style={{
            position: "absolute",
            left: 70,
            right: 70,
            bottom: 92,
            height: "1px",
            background: "rgba(211, 191, 150, 0.24)",
          }}
        />

        {/* Bottom left */}
        <div
          style={{
            position: "absolute",
            left: 70,
            bottom: 46,
            fontSize: 18,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: "#D7BC84",
          }}
        >
          Miami · Miami Beach
        </div>

        {/* Bottom right */}
        <div
          style={{
            position: "absolute",
            right: 70,
            bottom: 46,
            fontSize: 18,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(246,243,236,0.42)",
          }}
        >
          Fully Insured · $2M Coverage
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}