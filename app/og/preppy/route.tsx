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
    services: "BALCONY GLASS CLEANING  ·  INTERIOR PAINT  ·  CUSTOM PROJECT REQUESTS",
    preparedFor: "PREPARED FOR",
    residentPreview: "RESIDENT PREVIEW",
    unitLabel: "Unit",
    insured: "FULLY INSURED  ·  $2M COVERAGE",
    region: "MIAMI  ·  MIAMI BEACH",
  },
  es: {
    brandSub: "Servicios de Lujo para el Hogar",
    tagline: "Su balcón, restaurado.",
    services: "LIMPIEZA DE CRISTAL DE BALCÓN  ·  PINTURA INTERIOR  ·  SOLICITUDES DE PROYECTOS ESPECIALES",
    preparedFor: "PREPARADO PARA",
    residentPreview: "VISTA PARA RESIDENTES",
    unitLabel: "Unidad",
    insured: "TOTALMENTE ASEGURADO  ·  COBERTURA $2M",
    region: "MIAMI  ·  MIAMI BEACH",
  },
  fr: {
    brandSub: "Services de Luxe pour la Maison",
    tagline: "Votre balcon, restauré.",
    services: "NETTOYAGE DE VITRAGE DE BALCON  ·  PEINTURE INTÉRIEURE  ·  DEMANDES DE PROJETS PERSONNALISÉS",
    preparedFor: "PRÉPARÉ POUR",
    residentPreview: "APERÇU RÉSIDENT",
    unitLabel: "Unité",
    insured: "ENTIÈREMENT ASSURÉ  ·  COUVERTURE 2M$",
    region: "MIAMI  ·  MIAMI BEACH",
  },
};

const C = {
  bgBase: "#03101B",
  bgDeep: "#041727",
  bgNight: "#020B14",
  navyGlow: "rgba(15, 56, 86, 0.58)",
  navyGlowSoft: "rgba(19, 71, 104, 0.26)",
  orbDark: "rgba(0,0,0,0.34)",
  ivory: "#F6F1E8",
  ivorySoft: "rgba(246,241,232,0.76)",
  ivoryFaint: "rgba(246,241,232,0.48)",
  gold: "#D7B77A",
  goldBright: "#E3C88F",
  goldSoft: "rgba(215,183,122,0.82)",
  goldLine: "rgba(215,183,122,0.24)",
  goldLineStrong: "rgba(215,183,122,0.44)",
};

function getNameSize(name: string) {
  if (name.length <= 16) return 82;
  if (name.length <= 24) return 74;
  if (name.length <= 32) return 68;
  return 62;
}

function getBuildingSize(building: string) {
  if (building.length <= 16) return 56;
  if (building.length <= 26) return 50;
  return 44;
}

function getUnitSize(unitLine: string) {
  if (unitLine.length <= 14) return 38;
  return 34;
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
  const copy = COPY[lang];

  const hasName = Boolean(name);
  const hasBuilding = Boolean(building);
  const hasUnit = Boolean(unit);
  const hasPersonalized = hasName || hasBuilding || hasUnit;

  const eyebrow =
    hasName || hasBuilding || hasUnit
      ? hasName
        ? copy.preparedFor
        : copy.residentPreview
      : "";

  const unitLine = hasUnit ? `${copy.unitLabel} ${unit}` : "";

  const heroName = hasName ? name : copy.tagline;
  const heroBuilding = hasBuilding ? building : "";
  const heroUnit = unitLine;

  const heroNameSize = hasName ? getNameSize(heroName) : 96;
  const heroBuildingSize = getBuildingSize(heroBuilding);
  const heroUnitSize = getUnitSize(heroUnit);

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
          padding: "44px 56px 40px 56px",
          overflow: "hidden",
          color: C.ivory,
          background: `radial-gradient(120% 110% at 20% 0%, ${C.bgDeep} 0%, ${C.bgBase} 42%, ${C.bgNight} 100%)`,
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        {/* background glow left */}
        <div
          style={{
            position: "absolute",
            top: -90,
            left: -120,
            width: 620,
            height: 620,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(215,183,122,0.15) 0%, rgba(215,183,122,0.10) 18%, rgba(24,43,60,0.20) 45%, rgba(0,0,0,0) 72%)`,
            display: "flex",
          }}
        />

        {/* dark left orb */}
        <div
          style={{
            position: "absolute",
            top: 118,
            left: 206,
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: C.orbDark,
            display: "flex",
          }}
        />

        {/* right glow */}
        <div
          style={{
            position: "absolute",
            right: -120,
            bottom: -120,
            width: 620,
            height: 620,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${C.navyGlow} 0%, ${C.navyGlowSoft} 24%, rgba(7,30,48,0.12) 42%, rgba(0,0,0,0) 70%)`,
            display: "flex",
          }}
        />

        {/* dark right orb */}
        <div
          style={{
            position: "absolute",
            right: 188,
            bottom: 122,
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.30)",
            display: "flex",
          }}
        />

        {/* vertical grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "space-between",
            paddingLeft: 210,
            paddingRight: 210,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 1,
                background: `linear-gradient(180deg, rgba(215,183,122,0) 0%, ${C.goldLine} 22%, ${C.goldLine} 78%, rgba(215,183,122,0) 100%)`,
                display: "flex",
              }}
            />
          ))}
        </div>

        {/* top right brand */}
        <div
          style={{
            position: "absolute",
            top: 34,
            right: 54,
            display: "flex",
            alignItems: "center",
            gap: 18,
            zIndex: 3,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 999,
                border: `1px solid ${C.goldLineStrong}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(4,18,30,0.36)",
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  lineHeight: 1,
                  color: C.goldBright,
                  fontWeight: 400,
                  display: "flex",
                  marginTop: -3,
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
                  fontSize: 28,
                  lineHeight: 1.05,
                  fontWeight: 500,
                  color: C.ivory,
                  display: "flex",
                }}
              >
                Preppy Services
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  letterSpacing: 4.2,
                  textTransform: "uppercase",
                  color: C.gold,
                  display: "flex",
                }}
              >
                {copy.brandSub}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "7px 16px",
              borderRadius: 999,
              border: `1px solid ${C.goldLineStrong}`,
              color: C.goldBright,
              fontSize: 12,
              letterSpacing: 4,
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(4,18,30,0.30)",
            }}
          >
            {lang.toUpperCase()}
          </div>
        </div>

        {/* main content */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            maxWidth: 860,
            paddingTop: 102,
            paddingBottom: 22,
          }}
        >
          {hasPersonalized && eyebrow ? (
            <div
              style={{
                fontSize: 18,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: C.goldBright,
                display: "flex",
                marginBottom: 20,
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
              maxWidth: 860,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: heroNameSize,
                lineHeight: 0.96,
                letterSpacing: -2.5,
                fontWeight: 400,
                color: C.ivory,
                maxWidth: 860,
              }}
            >
              {heroName}
            </div>

            {heroBuilding ? (
              <div
                style={{
                  display: "flex",
                  marginTop: 16,
                  fontSize: heroBuildingSize,
                  lineHeight: 1,
                  letterSpacing: -0.8,
                  color: C.goldBright,
                  fontWeight: 400,
                  maxWidth: 760,
                }}
              >
                {heroBuilding}
              </div>
            ) : null}

            {heroUnit ? (
              <div
                style={{
                  display: "flex",
                  marginTop: 12,
                  marginLeft: 10,
                  fontSize: heroUnitSize,
                  lineHeight: 1,
                  letterSpacing: -0.4,
                  color: C.gold,
                  fontWeight: 400,
                }}
              >
                {heroUnit}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 54,
              maxWidth: 980,
              fontSize: 16,
              lineHeight: 1.35,
              letterSpacing: 2.2,
              textTransform: "uppercase",
              color: C.ivorySoft,
            }}
          >
            {copy.services}
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 18,
            borderTop: `1px solid ${C.goldLine}`,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 12,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: C.goldBright,
            }}
          >
            {copy.region}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 12,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: C.ivoryFaint,
            }}
          >
            {copy.insured}
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