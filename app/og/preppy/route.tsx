import { ImageResponse } from "next/og";

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

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 18% 34%, rgba(164,147,103,0.26) 0%, rgba(164,147,103,0.10) 15%, rgba(6,21,40,0.00) 36%), radial-gradient(circle at 84% 76%, rgba(14,66,108,0.36) 0%, rgba(14,66,108,0.14) 13%, rgba(6,18,33,0) 32%), linear-gradient(90deg, #071420 0%, #041425 25%, #021326 53%, #031a30 74%, #041226 100%)",
          color: "#F6F1E8",
          fontFamily:
            'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* soft rings / atmosphere */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 34%, rgba(169,149,109,0.12) 0%, rgba(169,149,109,0.09) 14%, rgba(0,0,0,0) 36%), radial-gradient(circle at 84% 76%, rgba(38,91,136,0.22) 0%, rgba(38,91,136,0.12) 12%, rgba(0,0,0,0) 28%)",
          }}
        />

        {/* vertical guide lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "space-between",
            padding: "0 188px 0 188px",
            opacity: 0.16,
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                width: 1,
                height: "100%",
                background: "rgba(255,255,255,0.22)",
              }}
            />
          ))}
        </div>

        {/* dark accent circles */}
        <div
          style={{
            position: "absolute",
            left: 205,
            top: 126,
            width: 58,
            height: 58,
            borderRadius: "999px",
            background: "rgba(0,0,0,0.28)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 150,
            bottom: 116,
            width: 66,
            height: 66,
            borderRadius: "999px",
            background: "rgba(0,0,0,0.30)",
          }}
        />

        {/* brand block */}
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
              width: 52,
              height: 52,
              borderRadius: "999px",
              border: "2px solid rgba(185,157,101,0.58)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#C9A96A",
              fontSize: 34,
              fontWeight: 300,
              lineHeight: 1,
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
                fontSize: 33,
                fontWeight: 500,
                color: "#F4EEE5",
                letterSpacing: "-0.02em",
              }}
            >
              Preppy Services
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "#B89658",
                fontWeight: 600,
              }}
            >
              Luxury Home Services
            </div>
          </div>

          <div
            style={{
              marginLeft: 10,
              minWidth: 52,
              height: 34,
              borderRadius: 999,
              border: "2px solid rgba(185,157,101,0.50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 16px",
              color: "#D7B978",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.18em",
            }}
          >
            {lang}
          </div>
        </div>

        {/* main content */}
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 188,
            width: 760,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 28,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#D2B173",
              fontWeight: 500,
            }}
          >
            Prepared For
          </div>

          <div
            style={{
              marginTop: 26,
              fontSize: 76,
              lineHeight: 0.98,
              color: "#F8F5EF",
              fontWeight: 400,
              letterSpacing: "-0.045em",
              maxWidth: 760,
              whiteSpace: "pre-wrap",
            }}
          >
            {name}
          </div>

          <div
            style={{
              marginTop: 20,
              fontSize: 46,
              lineHeight: 1.05,
              color: "#C9A96A",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              maxWidth: 700,
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
                color: "#C9A96A",
                fontWeight: 500,
                letterSpacing: "-0.02em",
              }}
            >
              {unit}
            </div>
          ) : null}
        </div>

        {/* services line */}
        <div
          style={{
            position: "absolute",
            left: 70,
            right: 170,
            bottom: 112,
            display: "flex",
            alignItems: "center",
            fontSize: 18,
            lineHeight: 1.25,
            letterSpacing: "0.13em",
            textTransform: "uppercase",
            color: "rgba(245,238,229,0.84)",
            fontWeight: 500,
          }}
        >
          Balcony Glass Cleaning · Interior Paint · Custom Home Maintenance Plans
        </div>

        {/* divider */}
        <div
          style={{
            position: "absolute",
            left: 70,
            right: 70,
            bottom: 62,
            height: 1,
            background: "rgba(187,159,101,0.30)",
          }}
        />

        {/* footer */}
        <div
          style={{
            position: "absolute",
            left: 70,
            bottom: 18,
            fontSize: 16,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#C9A96A",
            fontWeight: 600,
          }}
        >
          Miami · Miami Beach
        </div>

        <div
          style={{
            position: "absolute",
            right: 70,
            bottom: 18,
            fontSize: 16,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(236,232,223,0.56)",
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
    }
  );
}