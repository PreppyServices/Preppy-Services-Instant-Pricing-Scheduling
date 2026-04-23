import { ImageResponse } from "next/og";

export const runtime = "edge";

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
  if (len >= 34) return 62;
  if (len >= 28) return 68;
  if (len >= 22) return 78;
  if (len >= 16) return 88;
  return 96;
}

function getBuildingSize(building: string): number {
  const len = building.length;
  if (len >= 30) return 26;
  if (len >= 24) return 30;
  if (len >= 18) return 36;
  if (len >= 12) return 42;
  return 46;
}

function getUnitSize(unit: string): number {
  return unit.length >= 14 ? 26 : 30;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const name = clean(searchParams.get("name"), "Preppy Client").slice(0, 44);
  const building = normalizeBuilding(
    searchParams.get("building") || searchParams.get("residence") || searchParams.get("b")
  ).slice(0, 54);
  const unitRaw = clean(searchParams.get("unit"), "").slice(0, 18);
  const unit = unitRaw ? `Unit ${unitRaw}` : "";

  const nameSize = getNameSize(name);
  const buildingSize = getBuildingSize(building || "Private Residence");
  const unitSize = getUnitSize(unit || "Unit 0000");

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
            "linear-gradient(110deg, #0B1722 0%, #041629 42%, #02172F 100%)",
          color: "#F6F3EC",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "-120px",
            top: "-80px",
            width: "650px",
            height: "650px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(199,165,103,0.28) 0%, rgba(199,165,103,0.18) 22%, rgba(199,165,103,0.08) 40%, rgba(199,165,103,0) 70%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "-110px",
            bottom: "-90px",
            width: "520px",
            height: "520px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(51,111,144,0.22) 0%, rgba(51,111,144,0.12) 24%, rgba(51,111,144,0.05) 42%, rgba(51,111,144,0) 72%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.00) 38%, rgba(56,113,145,0.08) 72%, rgba(56,113,145,0.10) 100%)",
          }}
        />

        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${190 + i * 170}px`,
              width: "1px",
              background: "rgba(211, 191, 150, 0.10)",
            }}
          />
        ))}

        <div
          style={{
            position: "absolute",
            left: 200,
            top: 120,
            width: 86,
            height: 86,
            borderRadius: "9999px",
            background: "rgba(0,0,0,0.24)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 155,
            bottom: 118,
            width: 86,
            height: 86,
            borderRadius: "9999px",
            background: "rgba(0,0,0,0.24)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 40,
            right: 48,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "9999px",
              border: "1.5px solid rgba(198,165,104,0.55)",
              color: "#D7BC84",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
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
                fontSize: 30,
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
                fontSize: 12,
                lineHeight: 1,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "#C6A56A",
              }}
            >
              Luxury Home Services
            </div>
          </div>

          <div
            style={{
              marginLeft: 6,
              minWidth: 52,
              height: 34,
              padding: "0 12px",
              borderRadius: 9999,
              border: "1.5px solid rgba(198,165,104,0.50)",
              color: "#D7BC84",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            EN
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 68,
            top: 160,
            width: 790,
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
              lineHeight: 0.97,
              letterSpacing: "-0.045em",
              color: "#F6F3EC",
              fontWeight: 400,
              maxWidth: 780,
            }}
          >
            {name}
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: buildingSize,
              lineHeight: 1.06,
              letterSpacing: "-0.015em",
              color: "#D7BC84",
              fontWeight: 500,
              maxWidth: 720,
            }}
          >
            {building || "Private Residence"}
          </div>

          {unit ? (
            <div
              style={{
                marginTop: 12,
                fontSize: unitSize,
                lineHeight: 1.05,
                color: "#F6F3EC",
                fontWeight: 400,
                maxWidth: 520,
              }}
            >
              {unit}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 54,
              fontSize: 21,
              lineHeight: 1.2,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(246,243,236,0.80)",
              fontWeight: 400,
              maxWidth: 980,
            }}
          >
            Balcony Glass Cleaning · Interior Paint · Custom Project Requests
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 68,
            right: 68,
            bottom: 92,
            height: "1px",
            background: "rgba(211, 191, 150, 0.22)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 68,
            bottom: 46,
            fontSize: 18,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#D7BC84",
          }}
        >
          Miami · Miami Beach
        </div>

        <div
          style={{
            position: "absolute",
            right: 68,
            bottom: 46,
            fontSize: 18,
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color: "rgba(246,243,236,0.42)",
          }}
        >
          Fully Insured · $2M Coverage
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}