import { ImageResponse } from "next/og";

export const runtime = "edge";

type Lang = "en" | "es" | "fr";

type Copy = {
  brandSub: string;
  tagline: string;
  services: string;
  preparedFor: string;
  residentPreview: string;
  unitLabel: string;
  insured: string;
  region: string;
};

const COPY: Record<Lang, Copy> = {
  en: {
    brandSub: "Luxury Home Services",
    tagline: "Your balcony, restored.",
    services: "Balcony Glass  ·  Interior Paint  ·  Custom Jobs",
    preparedFor: "Prepared for",
    residentPreview: "Resident Preview",
    unitLabel: "Unit",
    insured: "Fully Insured  ·  $2M Coverage",
    region: "Miami  ·  Miami Beach",
  },
  es: {
    brandSub: "Servicios de Lujo para el Hogar",
    tagline: "Su balcón, restaurado.",
    services: "Cristal de Balcón  ·  Pintura Interior  ·  Trabajos a Medida",
    preparedFor: "Preparado para",
    residentPreview: "Vista para Residentes",
    unitLabel: "Unidad",
    insured: "Totalmente Asegurado  ·  Cobertura $2M",
    region: "Miami  ·  Miami Beach",
  },
  fr: {
    brandSub: "Services de Luxe pour la Maison",
    tagline: "Votre balcon, restauré.",
    services: "Vitrage de Balcon  ·  Peinture Intérieure  ·  Travaux sur Mesure",
    preparedFor: "Préparé pour",
    residentPreview: "Aperçu Résident",
    unitLabel: "Unité",
    insured: "Entièrement Assuré  ·  Couverture 2M$",
    region: "Miami  ·  Miami Beach",
  },
};

const C = {
  bg0: "#0B1A24",
  bg1: "#0D2233",
  bg2: "#050E15",
  ivory: "#F5F1EA",
  ivoryMuted: "rgba(245,241,234,0.74)",
  ivoryFaint: "rgba(245,241,234,0.48)",
  gold: "#D9B97C",
  goldBright: "#EBD4A0",
  goldGlow: "rgba(217,185,124,0.32)",
  goldLine: "rgba(217,185,124,0.55)",
  goldLineFaint: "rgba(217,185,124,0.22)",
};

function getNameSize(name: string) {
  if (name.length <= 16) return 102;
  if (name.length <= 24) return 92;
  if (name.length <= 32) return 82;
  return 74;
}

function getDetailSize(text: string) {
  if (text.length <= 18) return 58;
  if (text.length <= 30) return 52;
  return 46;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const name = (searchParams.get("name") || "").trim().slice(0, 36);
  const building = (searchParams.get("b") || searchParams.get("building") || "")
    .trim()
    .slice(0, 48);
  const unit = (searchParams.get("unit") || "").trim().slice(0, 12);
  const rawLang = (searchParams.get("lang") || "").toLowerCase().slice(0, 2);

  const lang: Lang = (["en", "es", "fr"].includes(rawLang) ? rawLang : "en") as Lang;
  const c = COPY[lang];

  const hasName = Boolean(name);
  const hasBuilding = Boolean(building);
  const hasUnit = Boolean(unit);
  const hasPersonalized = hasName || hasBuilding || hasUnit;

  const eyebrow = hasName
    ? c.preparedFor
    : hasBuilding || hasUnit
      ? c.residentPreview
      : "";

  const unitLine = hasUnit ? `${c.unitLabel} ${unit}` : "";

  const heroLines = hasPersonalized
    ? [
        hasName ? { text: name, kind: "name" as const } : null,
        unitLine ? { text: unitLine, kind: "detail" as const } : null,
        hasBuilding ? { text: building, kind: "detail" as const } : null,
      ].filter(Boolean) as { text: string; kind: "name" | "detail" }[]
    : [{ text: c.tagline, kind: "tagline" as const }];

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px 56px 72px",
          color: C.ivory,
          background: `radial-gradient(130% 95% at 18% -10%, ${C.bg1} 0%, ${C.bg0} 48%, ${C.bg2} 100%)`,
          fontFamily: "Georgia, serif",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -220,
            left: -180,
            width: 720,
            height: 720,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, ${C.goldGlow}, rgba(217,185,124,0) 72%)`,
            display: "flex",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: -260,
            right: -220,
            width: 780,
            height: 780,
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(37,96,120,0.35), rgba(37,96,120,0) 70%)",
            display: "flex",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 180,
            right: 180,
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                width: 1,
                background: `linear-gradient(180deg, rgba(217,185,124,0) 0%, ${C.goldLineFaint} 32%, ${C.goldLineFaint} 68%, rgba(217,185,124,0) 100%)`,
                display: "flex",
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(0,0,0,0.22) 100%)",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 999,
                border: `1px solid ${C.goldLine}`,
                background: "rgba(9,22,32,0.55)",
              }}
            >
              <div
                style={{
                  fontStyle: "italic",
                  fontWeight: 400,
                  fontSize: 56,
                  lineHeight: 1,
                  color: C.goldBright,
                  display: "flex",
                  marginTop: -6,
                }}
              >
                P
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 400,
                  letterSpacing: 0.5,
                  color: C.ivory,
                  lineHeight: 1.05,
                  display: "flex",
                }}
              >
                Preppy Services
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 14,
                  letterSpacing: 5,
                  textTransform: "uppercase",
                  color: C.gold,
                  fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
                  display: "flex",
                }}
              >
                {c.brandSub}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 18px",
              borderRadius: 999,
              border: `1px solid ${C.goldLine}`,
              background: "rgba(9,22,32,0.55)",
              fontSize: 14,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: C.goldBright,
              fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
            }}
          >
            {lang.toUpperCase()}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            zIndex: 2,
            flex: 1,
            marginTop: 10,
            marginBottom: 22,
            maxWidth: 900,
          }}
        >
          {hasPersonalized && eyebrow ? (
            <div
              style={{
                fontSize: 16,
                letterSpacing: 5,
                textTransform: "uppercase",
                color: C.gold,
                fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
                display: "flex",
                marginBottom: 18,
              }}
            >
              {eyebrow}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 6,
              maxWidth: 900,
            }}
          >
            {heroLines.map((line, i) => {
              const isTagline = line.kind === "tagline";
              const isName = line.kind === "name";

              const fontSize = isTagline
                ? 126
                : isName
                  ? getNameSize(line.text)
                  : getDetailSize(line.text);

              return (
                <div
                  key={`${line.text}-${i}`}
                  style={{
                    display: "flex",
                    fontSize,
                    fontStyle: isTagline ? "italic" : "normal",
                    fontWeight: isName ? 500 : 400,
                    lineHeight: isTagline ? 0.95 : 1.02,
                    letterSpacing: isTagline ? -2 : -1,
                    color: C.ivory,
                    maxWidth: 900,
                  }}
                >
                  {line.text}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 26,
              height: 1,
              width: 320,
              background: `linear-gradient(90deg, rgba(217,185,124,0) 0%, ${C.gold} 50%, rgba(217,185,124,0) 100%)`,
              display: "flex",
            }}
          />

          <div
            style={{
              marginTop: 20,
              fontSize: 20,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: C.ivoryMuted,
              fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
              display: "flex",
              maxWidth: 920,
            }}
          >
            {c.services}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 2,
            paddingTop: 18,
            borderTop: `1px solid ${C.goldLineFaint}`,
            fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          }}
        >
          <div
            style={{
              fontSize: 14,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: C.goldBright,
              display: "flex",
            }}
          >
            {c.region}
          </div>
          <div
            style={{
              fontSize: 14,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: C.ivoryFaint,
              display: "flex",
            }}
          >
            {c.insured}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}