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
  bg0: "#07131D",
  bg1: "#0B2234",
  bg2: "#030A11",
  ivory: "#F6F1E9",
  ivorySoft: "rgba(246,241,233,0.84)",
  ivoryMuted: "rgba(246,241,233,0.62)",
  ivoryFaint: "rgba(246,241,233,0.42)",
  gold: "#D7B67A",
  goldSoft: "rgba(215,182,122,0.86)",
  goldBright: "#E7CC97",
  goldLine: "rgba(215,182,122,0.52)",
  goldLineFaint: "rgba(215,182,122,0.18)",
  tealGlow: "rgba(29,106,135,0.24)",
  goldGlow: "rgba(215,182,122,0.22)",
};

function getNameSize(name: string) {
  if (name.length <= 14) return 92;
  if (name.length <= 20) return 84;
  if (name.length <= 26) return 76;
  if (name.length <= 32) return 70;
  return 64;
}

function getBuildingSize(building: string) {
  if (building.length <= 12) return 34;
  if (building.length <= 18) return 30;
  return 26;
}

function getUnitSize(unitLine: string) {
  if (unitLine.length <= 12) return 40;
  return 34;
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

  const eyebrow = hasPersonalized
    ? hasName
      ? c.preparedFor
      : c.residentPreview
    : "";

  const unitLine = hasUnit ? `${c.unitLabel} ${unit}` : "";

  const showBuildingKicker = hasName && hasBuilding;
  const showUnitBelowName = hasName && hasUnit;

  const heroPrimary = hasName
    ? name
    : hasBuilding
      ? building
      : hasUnit
        ? unitLine
        : c.tagline;

  const heroPrimaryIsTagline = !hasPersonalized;
  const heroPrimarySize = heroPrimaryIsTagline
    ? 120
    : hasName
      ? getNameSize(heroPrimary)
      : hasBuilding
        ? 72
        : 56;

  const buildingSize = getBuildingSize(building);
  const unitSize = getUnitSize(unitLine);

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
          padding: "40px 56px 42px 56px",
          color: C.ivory,
          background: `radial-gradient(130% 100% at 18% -10%, ${C.bg1} 0%, ${C.bg0} 48%, ${C.bg2} 100%)`,
          overflow: "hidden",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* soft gold glow top-left */}
        <div
          style={{
            position: "absolute",
            top: -220,
            left: -160,
            width: 700,
            height: 700,
            borderRadius: "999px",
            background: `radial-gradient(circle, ${C.goldGlow} 0%, rgba(215,182,122,0.08) 34%, rgba(215,182,122,0) 72%)`,
            display: "flex",
          }}
        />

        {/* teal glow bottom-right */}
        <div
          style={{
            position: "absolute",
            right: -180,
            bottom: -220,
            width: 760,
            height: 760,
            borderRadius: "999px",
            background: `radial-gradient(circle, ${C.tealGlow} 0%, rgba(29,106,135,0.08) 34%, rgba(29,106,135,0) 72%)`,
            display: "flex",
          }}
        />

        {/* dark soft focus spots */}
        <div
          style={{
            position: "absolute",
            left: 170,
            top: 98,
            width: 84,
            height: 84,
            borderRadius: "999px",
            background: "rgba(0,0,0,0.30)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 126,
            bottom: 106,
            width: 82,
            height: 82,
            borderRadius: "999px",
            background: "rgba(0,0,0,0.30)",
            display: "flex",
          }}
        />

        {/* vertical guide lines */}
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
                background: `linear-gradient(180deg, rgba(215,182,122,0) 0%, ${C.goldLineFaint} 10%, ${C.goldLineFaint} 90%, rgba(215,182,122,0) 100%)`,
                display: "flex",
              }}
            />
          ))}
        </div>

        {/* overall overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(0,0,0,0.18) 100%)",
            display: "flex",
          }}
        />

        {/* top brand row */}
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
              gap: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 999,
                  border: `1px solid ${C.goldLine}`,
                  background: "rgba(6,17,26,0.55)",
                  alignItems: "center",
                  justifyContent: "center",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontStyle: "italic",
                    fontSize: 40,
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
                    fontSize: 30,
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
                    fontSize: 12,
                    lineHeight: 1,
                    letterSpacing: 4,
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
                minWidth: 54,
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${C.goldLine}`,
                background: "rgba(6,17,26,0.55)",
                fontSize: 12,
                lineHeight: 1,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: C.goldBright,
                fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
              }}
            >
              {lang.toUpperCase()}
            </div>
          </div>
        </div>

        {/* hero */}
        <div
          style={{
            zIndex: 2,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 880,
            marginTop: 18,
            marginBottom: 18,
          }}
        >
          {eyebrow ? (
            <div
              style={{
                display: "flex",
                marginBottom: 18,
                fontSize: 15,
                lineHeight: 1,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: C.goldSoft,
                fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
              }}
            >
              {eyebrow}
            </div>
          ) : null}

          {showBuildingKicker ? (
            <div
              style={{
                display: "flex",
                marginBottom: 16,
                maxWidth: 760,
                fontSize: buildingSize,
                lineHeight: 1.05,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: C.goldBright,
                fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
                fontWeight: 500,
              }}
            >
              {building}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              maxWidth: 880,
              fontSize: heroPrimarySize,
              lineHeight: heroPrimaryIsTagline ? 0.95 : 1,
              letterSpacing: heroPrimaryIsTagline ? -2 : -1.5,
              color: C.ivory,
              fontStyle: heroPrimaryIsTagline ? "italic" : "normal",
              fontWeight: hasName ? 500 : 400,
            }}
          >
            {heroPrimary}
          </div>

          {showUnitBelowName ? (
            <div
              style={{
                display: "flex",
                marginTop: 10,
                maxWidth: 760,
                fontSize: unitSize,
                lineHeight: 1.04,
                letterSpacing: -0.5,
                color: C.ivorySoft,
                fontWeight: 400,
              }}
            >
              {unitLine}
            </div>
          ) : null}

          {!hasName && hasBuilding && hasUnit ? (
            <div
              style={{
                display: "flex",
                marginTop: 12,
                maxWidth: 760,
                fontSize: unitSize,
                lineHeight: 1.04,
                letterSpacing: -0.5,
                color: C.ivorySoft,
                fontWeight: 400,
              }}
            >
              {unitLine}
            </div>
          ) : null}

          {hasName && !hasBuilding && hasUnit ? (
            <div
              style={{
                display: "flex",
                marginTop: 10,
                maxWidth: 760,
                fontSize: unitSize,
                lineHeight: 1.04,
                letterSpacing: -0.5,
                color: C.ivorySoft,
                fontWeight: 400,
              }}
            >
              {unitLine}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              marginTop: 28,
              width: 260,
              height: 1,
              background: `linear-gradient(90deg, rgba(215,182,122,0) 0%, ${C.goldLine} 30%, ${C.goldLine} 70%, rgba(215,182,122,0) 100%)`,
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