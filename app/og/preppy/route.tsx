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
    services:
      "Balcony Glass Cleaning  ·  Interior Paint  ·  Custom Project Requests",
    preparedFor: "Prepared for",
    residentPreview: "Resident Preview",
    unitLabel: "Unit",
    insured: "Fully Insured  ·  $2M Coverage",
    region: "Miami  ·  Miami Beach",
  },
  es: {
    brandSub: "Servicios de Lujo para el Hogar",
    tagline: "Su balcón, restaurado.",
    services:
      "Limpieza de Cristal de Balcón  ·  Pintura Interior  ·  Solicitudes de Proyectos Especiales",
    preparedFor: "Preparado para",
    residentPreview: "Vista para Residentes",
    unitLabel: "Unidad",
    insured: "Totalmente Asegurado  ·  Cobertura $2M",
    region: "Miami  ·  Miami Beach",
  },
  fr: {
    brandSub: "Services de Luxe pour la Maison",
    tagline: "Votre balcon, restauré.",
    services:
      "Nettoyage de Vitrage de Balcon  ·  Peinture Intérieure  ·  Demandes de Projets Personnalisés",
    preparedFor: "Préparé pour",
    residentPreview: "Aperçu Résident",
    unitLabel: "Unité",
    insured: "Entièrement Assuré  ·  Couverture 2M$",
    region: "Miami  ·  Miami Beach",
  },
};

const C = {
  bg0: "#08131D",
  bg1: "#0A2233",
  bg2: "#030A11",
  ivory: "#F5F1EA",
  ivorySoft: "rgba(245,241,234,0.86)",
  ivoryMuted: "rgba(245,241,234,0.70)",
  ivoryFaint: "rgba(245,241,234,0.46)",
  gold: "#D9B97C",
  goldSoft: "rgba(217,185,124,0.90)",
  goldBright: "#E8CEA0",
  goldLine: "rgba(217,185,124,0.50)",
  goldLineFaint: "rgba(217,185,124,0.18)",
  goldGlow: "rgba(217,185,124,0.26)",
};

function getNameSize(name: string) {
  if (name.length <= 14) return 94;
  if (name.length <= 20) return 86;
  if (name.length <= 26) return 78;
  if (name.length <= 32) return 72;
  return 66;
}

function getBuildingSize(building: string) {
  if (building.length <= 12) return 46;
  if (building.length <= 18) return 42;
  if (building.length <= 26) return 38;
  return 34;
}

function getTaglineSize(text: string) {
  if (text.length <= 18) return 122;
  if (text.length <= 28) return 110;
  return 98;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const name = (searchParams.get("name") || "").trim().slice(0, 40);
  const building = (searchParams.get("b") || searchParams.get("building") || "")
    .trim()
    .slice(0, 48);
  const unit = (searchParams.get("unit") || "").trim().slice(0, 16);
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

  const primaryTagline = c.tagline;
  const unitLine = hasUnit ? `${c.unitLabel} ${unit}` : "";

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
          padding: "42px 60px 42px 60px",
          overflow: "hidden",
          color: C.ivory,
          background: `radial-gradient(130% 100% at 18% -8%, ${C.bg1} 0%, ${C.bg0} 48%, ${C.bg2} 100%)`,
          fontFamily: "Georgia, serif",
        }}
      >
        {/* warm glow top left */}
        <div
          style={{
            position: "absolute",
            top: -160,
            left: -120,
            width: 640,
            height: 640,
            borderRadius: 999,
            background: `radial-gradient(circle, ${C.goldGlow} 0%, rgba(217,185,124,0.10) 34%, rgba(217,185,124,0) 72%)`,
            display: "flex",
          }}
        />

        {/* subtle teal-like depth on right, kept dark */}
        <div
          style={{
            position: "absolute",
            right: -180,
            bottom: -220,
            width: 760,
            height: 760,
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(28,101,128,0.22) 0%, rgba(28,101,128,0.08) 30%, rgba(28,101,128,0) 72%)",
            display: "flex",
          }}
        />

        {/* dark focus discs */}
        <div
          style={{
            position: "absolute",
            left: 190,
            top: 106,
            width: 82,
            height: 82,
            borderRadius: 999,
            background: "rgba(0,0,0,0.26)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 142,
            bottom: 108,
            width: 82,
            height: 82,
            borderRadius: 999,
            background: "rgba(0,0,0,0.26)",
            display: "flex",
          }}
        />

        {/* vertical guides */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "space-between",
            paddingLeft: 180,
            paddingRight: 180,
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                width: 1,
                height: "100%",
                background: `linear-gradient(180deg, rgba(217,185,124,0) 0%, ${C.goldLineFaint} 10%, ${C.goldLineFaint} 90%, rgba(217,185,124,0) 100%)`,
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
              "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(0,0,0,0.16) 100%)",
            display: "flex",
          }}
        />

        {/* brand, smaller and quieter */}
        <div
          style={{
            zIndex: 2,
            width: "100%",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 999,
                  border: `1px solid ${C.goldLine}`,
                  background: "rgba(6,17,26,0.52)",
                  alignItems: "center",
                  justifyContent: "center",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontStyle: "italic",
                    fontSize: 38,
                    lineHeight: 1,
                    color: C.goldBright,
                    marginTop: -4,
                  }}
                >
                  P
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    lineHeight: 1.02,
                    color: C.ivory,
                    fontWeight: 400,
                  }}
                >
                  Preppy Services
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 4,
                    fontSize: 11,
                    lineHeight: 1,
                    letterSpacing: 3.6,
                    textTransform: "uppercase",
                    color: C.gold,
                    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
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
                minWidth: 50,
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${C.goldLine}`,
                background: "rgba(6,17,26,0.52)",
                fontSize: 11,
                lineHeight: 1,
                letterSpacing: 2.8,
                textTransform: "uppercase",
                color: C.goldBright,
                fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
              }}
            >
              {lang.toUpperCase()}
            </div>
          </div>
        </div>

        {/* hero block */}
        <div
          style={{
            zIndex: 2,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 900,
            marginTop: 4,
            marginBottom: 18,
          }}
        >
          {hasPersonalized && eyebrow ? (
            <div
              style={{
                display: "flex",
                marginBottom: 18,
                fontSize: 21,
                lineHeight: 1,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: C.goldBright,
                fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
                fontWeight: 500,
              }}
            >
              {eyebrow}
            </div>
          ) : null}

          {hasPersonalized ? (
            <>
              {hasBuilding ? (
                <div
                  style={{
                    display: "flex",
                    marginBottom: 16,
                    maxWidth: 780,
                    fontSize: getBuildingSize(building),
                    lineHeight: 1.02,
                    letterSpacing: 1.8,
                    textTransform: "uppercase",
                    color: C.goldSoft,
                    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
                    fontWeight: 500,
                  }}
                >
                  {building}
                </div>
              ) : null}

              {hasName ? (
                <div
                  style={{
                    display: "flex",
                    maxWidth: 900,
                    fontSize: getNameSize(name),
                    lineHeight: 0.96,
                    letterSpacing: -1.5,
                    color: C.ivory,
                    fontWeight: 500,
                    marginBottom: hasUnit ? 12 : 0,
                  }}
                >
                  {name}
                </div>
              ) : hasBuilding ? null : hasUnit ? (
                <div
                  style={{
                    display: "flex",
                    maxWidth: 760,
                    fontSize: 54,
                    lineHeight: 1,
                    letterSpacing: -0.8,
                    color: C.ivory,
                    fontWeight: 500,
                  }}
                >
                  {unitLine}
                </div>
              ) : null}

              {hasUnit ? (
                <div
                  style={{
                    display: "flex",
                    maxWidth: 760,
                    fontSize: 34,
                    lineHeight: 1.04,
                    letterSpacing: -0.4,
                    color: C.ivorySoft,
                    fontWeight: 400,
                  }}
                >
                  {unitLine}
                </div>
              ) : null}
            </>
          ) : (
            <div
              style={{
                display: "flex",
                maxWidth: 900,
                fontSize: getTaglineSize(primaryTagline),
                fontStyle: "italic",
                fontWeight: 400,
                lineHeight: 0.95,
                letterSpacing: -2,
                color: C.ivory,
              }}
            >
              {primaryTagline}
            </div>
          )}

          <div
            style={{
              display: "flex",
              marginTop: 28,
              width: 300,
              height: 1,
              background: `linear-gradient(90deg, rgba(217,185,124,0) 0%, ${C.goldLine} 30%, ${C.goldLine} 70%, rgba(217,185,124,0) 100%)`,
            }}
          />

          <div
            style={{
              display: "flex",
              marginTop: 18,
              maxWidth: 980,
              fontSize: 16,
              lineHeight: 1.25,
              letterSpacing: 2.2,
              textTransform: "uppercase",
              color: C.ivoryMuted,
              fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
            }}
          >
            {c.services}
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            zIndex: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 18,
            borderTop: `1px solid ${C.goldLineFaint}`,
            fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 13,
              lineHeight: 1,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: C.goldBright,
            }}
          >
            {c.region}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 13,
              lineHeight: 1,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: C.ivoryFaint,
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