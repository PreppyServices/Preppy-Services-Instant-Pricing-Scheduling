// app/og/preppy/route.tsx

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
  defaultSubline: string;
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
    defaultSubline: "Luxury Home Services",
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
    defaultSubline: "Servicios de Lujo para el Hogar",
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
    defaultSubline: "Services de Luxe pour la Maison",
  },
};

type Card = { header: string; primary: string; secondary: string } | null;

function buildCard(
  name: string,
  building: string,
  unit: string,
  c: Copy
): Card {
  const hasName = name.length > 0;
  const hasBuilding = building.length > 0;
  const hasUnit = unit.length > 0;

  if (!hasName && !hasBuilding) return null;

  if (hasName) {
    let secondary: string;
    if (hasBuilding && hasUnit) secondary = `${building}  ·  ${c.unitLabel} ${unit}`;
    else if (hasBuilding) secondary = building;
    else if (hasUnit) secondary = `${c.unitLabel} ${unit}`;
    else secondary = c.defaultSubline;

    return {
      header: c.preparedFor,
      primary: name,
      secondary,
    };
  }

  const primary = hasUnit ? `${building}  ·  ${c.unitLabel} ${unit}` : building;
  return {
    header: c.residentPreview,
    primary,
    secondary: c.defaultSubline,
  };
}

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
  cardBg: "rgba(9,22,32,0.62)",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const name = (searchParams.get("name") || "").trim().slice(0, 36);
  const building = (searchParams.get("b") || searchParams.get("building") || "")
    .trim()
    .slice(0, 48);
  const unit = (searchParams.get("unit") || "").trim().slice(0, 8);
  const rawLang = (searchParams.get("lang") || "").toLowerCase().slice(0, 2);
  const lang: Lang = (["en", "es", "fr"].includes(rawLang) ? rawLang : "en") as Lang;
  const c = COPY[lang];

  const card = buildCard(name, building, unit, c);
  const headlineSize = card ? 116 : 152;

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
          padding: "64px 76px",
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
            alignItems: "center",
            justifyContent: "space-between",
            gap: 48,
            zIndex: 2,
            marginTop: -8,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              maxWidth: card ? 680 : 980,
            }}
          >
            <div
              style={{
                fontSize: headlineSize,
                fontStyle: "italic",
                fontWeight: 400,
                lineHeight: 0.98,
                letterSpacing: -2,
                color: C.ivory,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {c.tagline}
            </div>

            <div
              style={{
                marginTop: 28,
                height: 1,
                width: 320,
                background: `linear-gradient(90deg, rgba(217,185,124,0) 0%, ${C.gold} 50%, rgba(217,185,124,0) 100%)`,
                display: "flex",
              }}
            />

            <div
              style={{
                marginTop: 22,
                fontSize: 20,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: C.ivoryMuted,
                fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
                display: "flex",
              }}
            >
              {c.services}
            </div>
          </div>

          {card && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "28px 34px 30px 34px",
                minWidth: 360,
                maxWidth: 420,
                borderRadius: 16,
                border: `1px solid ${C.goldLine}`,
                background: C.cardBg,
                boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
                fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div style={{ width: 22, height: 1, background: C.gold, display: "flex" }} />
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: 4,
                    textTransform: "uppercase",
                    color: C.gold,
                    display: "flex",
                  }}
                >
                  {card.header}
                </div>
              </div>

              <div
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 56,
                  fontWeight: 500,
                  lineHeight: 1.02,
                  letterSpacing: -0.5,
                  color: C.ivory,
                  display: "flex",
                }}
              >
                {card.primary}
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 18,
                  letterSpacing: 1.5,
                  color: C.ivoryMuted,
                  display: "flex",
                }}
              >
                {card.secondary}
              </div>
            </div>
          )}
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