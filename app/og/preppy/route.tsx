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
  goldSoft: "rgba(217,185,124,0.92)",
  goldBright: "#E8CEA0",
  goldLine: "rgba(217,185,124,0.50)",
  goldLineFaint: "rgba(217,185,124,0.18)",
  goldGlow: "rgba(217,185,124,0.24)",
};

function getNameSize(name: string) {
  if (name.length <= 14) return 90;
  if (name.length <= 20) return 82;
  if (name.length <= 26) return 74;
  if (name.length <= 32) return 68;
  return 62;
}

function getBuildingSize(building: string) {
  if (building.length <= 12) return 48;
  if (building.length <= 18) return 44;
  if (building.length <= 26) return 40;
  return 36;
}

function getTaglineSize(text: string) {
  if (text.length <= 18) return 118;
  if (text.length <= 28) return 106;
  return 96;
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

  const unitLine = hasUnit ? `${c.unitLabel} ${unit}` : "";
  const heroTagline = c.tagline;

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
          color: C.ivory,
          background: `radial-gradient(130% 100% at 18% -8%, ${C.bg1} 0%, ${C.bg0} 48%, ${C.bg2} 100%)`,
          fontFamily: "Georgia, serif",
          padding: "42px 60px 42px 60px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-160px",
            left: "-120px",
            width: "640px",
            height: "640px",
            borderRadius: "999px",
            background: `radial-gradient(circle, ${C.goldGlow} 0%, rgba(217,185,124,0.10) 34%, rgba(217,185,124,0) 72%)`,
            display: "flex",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "-180px",
            bottom: "-220px",
            width: "760px",
            height: "760px",
            borderRadius: "999px",
            background:
              "radial-gradient(circle, rgba(28,101,128,0.22) 0%, rgba(28,101,128,0.08) 30%, rgba(28,101,128,0) 72%)",
            display: "flex",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "190px",
            top: "106px",
            width: "82px",
            height: "82px",
            borderRadius: "999px",
            background: "rgba(0,0,0,0.26)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "142px",
            bottom: "108px",
            width: "82px",
            height: "82px",
            borderRadius: "999px",
            background: "rgba(0,0,0,0.26)",
            display: "flex",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: "0",
            display: "flex",
            justifyContent: "space-between",
            paddingLeft: "180px",
            paddingRight: "180px",
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                width: "1px",
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
            inset: "0",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(0,0,0,0.16) 100%)",
            display: "flex",
          }}
        />

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
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "999px",
                  border: `1px solid ${C.goldLine}`,
                  background: "rgba(6,17,26,0.52)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontStyle: "italic",
                    fontSize: "38px",
                    lineHeight: 1,
                    color: C.goldBright,
                    marginTop: "-4px",
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
                    fontSize: "24px",
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
                    marginTop: "4px",
                    fontSize: "10px",
                    lineHeight: 1,
                    letterSpacing: "3.4px",
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
                minWidth: "48px",
                padding: "8px 12px",
                borderRadius: "999px",
                border: `1px solid ${C.goldLine}`,
                background: "rgba(6,17,26,0.52)",
                fontSize: "11px",
                lineHeight: 1,
                letterSpacing: "2.8px",
                textTransform: "uppercase",
                color: C.goldBright,
                fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
              }}
            >
              {lang.toUpperCase()}
            </div>
          </div>
        </div>

        <div
          style={{
            zIndex: 2,
            flex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "820px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            {hasPersonalized && eyebrow ? (
              <div
                style={{
                  display: "flex",
                  marginBottom: "20px",
                  fontSize: "24px",
                  lineHeight: 1,
                  letterSpacing: "6px",
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
              <div
                style={{
                  width: "820px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                {hasBuilding ? (
                  <div
                    style={{
                      display: "flex",
                      width: "820px",
                      marginBottom: "16px",
                      fontSize: `${getBuildingSize(building)}px`,
                      lineHeight: 1.02,
                      letterSpacing: "1.8px",
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
                      width: "820px",
                      marginBottom: hasUnit ? "14px" : "0px",
                      fontSize: `${getNameSize(name)}px`,
                      lineHeight: 0.96,
                      letterSpacing: "-1.5px",
                      color: C.ivory,
                      fontWeight: 500,
                    }}
                  >
                    {name}
                  </div>
                ) : null}

                {hasUnit ? (
                  <div
                    style={{
                      display: "flex",
                      width: "820px",
                      fontSize: "34px",
                      lineHeight: 1.04,
                      letterSpacing: "-0.4px",
                      color: C.ivorySoft,
                      fontWeight: 400,
                    }}
                  >
                    {unitLine}
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  width: "820px",
                  fontSize: `${getTaglineSize(heroTagline)}px`,
                  fontStyle: "italic",
                  fontWeight: 400,
                  lineHeight: 0.95,
                  letterSpacing: "-2px",
                  color: C.ivory,
                }}
              >
                {heroTagline}
              </div>
            )}

            <div
              style={{
                display: "flex",
                marginTop: "28px",
                width: "300px",
                height: "1px",
                background: `linear-gradient(90deg, rgba(217,185,124,0) 0%, ${C.goldLine} 30%, ${C.goldLine} 70%, rgba(217,185,124,0) 100%)`,
              }}
            />

            <div
              style={{
                display: "flex",
                marginTop: "18px",
                width: "980px",
                fontSize: "16px",
                lineHeight: 1.25,
                letterSpacing: "2.2px",
                textTransform: "uppercase",
                color: C.ivoryMuted,
                fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
              }}
            >
              {c.services}
            </div>
          </div>
        </div>

        <div
          style={{
            zIndex: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "18px",
            borderTop: `1px solid ${C.goldLineFaint}`,
            fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "13px",
              lineHeight: 1,
              letterSpacing: "5px",
              textTransform: "uppercase",
              color: C.goldBright,
            }}
          >
            {c.region}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: "13px",
              lineHeight: 1,
              letterSpacing: "5px",
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