// app/og/preppy/card.tsx
//
// Single source of truth for the Preppy iMessage / social link-preview card.
// Rendered to a 1200x630 PNG by app/og/preppy/route.tsx (via next/og ImageResponse).
//
// Design intent (mobile-first — must read inside a compressed iMessage bubble):
//   1. Customer FIRST NAME — dominant, near-white, fills the frame.
//   2. Building name directly underneath, in champagne gold.
//   3. Unit number underneath the building ONLY when a real unit is supplied.
//   4. One restrained Preppy service line.
//   5. Clear but compact Preppy branding that never crowds the personalization.
//
// Naming: the complete provided customer name is shown (first + last), with
// extra whitespace normalized and the line auto-fit so long full names stay
// legible at iMessage size.
// Honesty: no fabricated name, no placeholder unit, no invented building. An
// absent name simply leads with the (verified) building; an absent building +
// absent name leads with neutral Preppy branding.

import type { ReactElement } from "react";

// ---- Palette — premium navy / ivory / gold identity ------------------------
const IVORY = "#F7F2E8"; // hero name — warm near-white, max legible contrast
const IVORY_SOFT = "#EBE3D2"; // brand wordmark
const GOLD_HERO = "#E0C485"; // building — brighter champagne for small-size pop
const GOLD_LABEL = "#C8AC72"; // kicker, unit, footer marks
const GOLD_DEEP = "#8A7244"; // rings / deepest accents

export const SERIF = 'Playfair, "Times New Roman", serif';
const SANS = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

// ---- Helpers ---------------------------------------------------------------

// Return the complete customer name (first + last), with any odd or repeated
// whitespace collapsed to single spaces. No token is dropped.
export function fullNameOf(value: string): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeUnit(value: string): string {
  if (!value) return "";
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (/^unit\b/i.test(trimmed)) {
    // Normalize casing of the leading "unit" word, keep the rest verbatim.
    return trimmed.replace(/^unit\b/i, "Unit");
  }
  return `Unit ${trimmed}`;
}

// satori has no text auto-fit, so we size by character count to guarantee a
// single line never overflows the safe content width. Returns an integer px.
function fitFont(
  text: string,
  opts: { max: number; min: number; maxWidthPx: number; perChar: number }
): number {
  const len = Math.max(text.length, 1);
  const widthBased = Math.floor(opts.maxWidthPx / (len * opts.perChar));
  return Math.max(opts.min, Math.min(opts.max, widthBased));
}

// ---- Card model ------------------------------------------------------------

export type CardParams = {
  /** Raw inbound name (may include a surname; only the first token is shown). */
  name: string;
  /** Already-resolved verified building display name, or "" if none/unverified. */
  building: string;
  /** Raw unit string; only rendered when a building matched and unit is present. */
  unit: string;
  /** Language code for the optional badge (e.g. "EN", "ES"). */
  lang: string;
};

const SAFE_LEFT = 76; // left margin
const CONTENT_W = 1200 - SAFE_LEFT * 2; // usable width inside L/R safe margins

export function PreppyOgCard({ name, building, unit, lang }: CardParams): ReactElement {
  const fullName = fullNameOf(name);
  const unitLabel = building ? normalizeUnit(unit) : "";

  // Decide the personalization hierarchy from what we actually have.
  // hero = the dominant line; sub = the gold line beneath it.
  let kicker = "";
  let hero = "";
  let sub = "";
  if (fullName && building) {
    kicker = "PREPARED FOR";
    hero = fullName;
    sub = building;
  } else if (fullName) {
    kicker = "PREPARED FOR";
    hero = fullName;
    sub = "";
  } else if (building) {
    kicker = "RESIDENT PREVIEW";
    hero = building;
    sub = "";
  } else {
    // Neutral fallback — the brand lockup already says "Luxury Home Services",
    // so suppress the kicker here to avoid a duplicated line.
    kicker = "";
    hero = "Preppy Services";
    sub = "";
  }

  // Auto-fit sizes. Hero is the loudest element in the frame; sub is clearly
  // secondary but still large enough to read at iMessage compression.
  // Full names are longer than a first name, so allow the hero to scale down
  // further; the line also wraps as a final safety net for unusually long names.
  const heroSize = fitFont(hero, { max: 156, min: 58, maxWidthPx: CONTENT_W, perChar: 0.6 });
  const subSize = sub
    ? fitFont(sub, { max: 78, min: 42, maxWidthPx: CONTENT_W, perChar: 0.52 })
    : 0;
  const unitSize = unitLabel
    ? fitFont(unitLabel, { max: 36, min: 24, maxWidthPx: CONTENT_W, perChar: 0.42 })
    : 0;

  const showLang = lang && lang.toUpperCase() !== "EN";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(125deg, #02060f 0%, #04101e 40%, #061626 68%, #030c18 100%)",
        color: IVORY,
        fontFamily: SANS,
      }}
    >
      {/* Warm gold bloom behind the name (left), low opacity — premium depth */}
      <div
        style={{
          position: "absolute",
          left: -160,
          top: 90,
          width: 900,
          height: 520,
          background:
            "radial-gradient(ellipse at center, rgba(196,164,110,0.16) 0%, rgba(196,164,110,0.07) 34%, rgba(0,0,0,0) 66%)",
        }}
      />
      {/* Cool atmospheric glow bottom-right */}
      <div
        style={{
          position: "absolute",
          right: -120,
          bottom: -120,
          width: 640,
          height: 560,
          background:
            "radial-gradient(ellipse at center, rgba(36,82,128,0.24) 0%, rgba(36,82,128,0.10) 38%, rgba(0,0,0,0) 70%)",
        }}
      />
      {/* Left-weighted scrim — guarantees text contrast on the busy gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.40) 34%, rgba(0,0,0,0.10) 64%, rgba(0,0,0,0) 100%)",
        }}
      />
      {/* Cinematic edge vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 38% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.34) 100%)",
        }}
      />

      {/* Brand lockup — TOP-LEFT, away from the iMessage close badge (top-right) */}
      <div
        style={{
          position: "absolute",
          top: 52,
          left: SAFE_LEFT,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 999,
            border: `1.5px solid ${GOLD_DEEP}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: GOLD_HERO,
            fontSize: 28,
            lineHeight: 1,
            fontFamily: SERIF,
          }}
        >
          P
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <div
            style={{
              fontSize: 25,
              color: IVORY_SOFT,
              letterSpacing: "0.04em",
              fontWeight: 600,
            }}
          >
            Preppy Services
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              letterSpacing: "0.30em",
              color: GOLD_LABEL,
              fontWeight: 600,
            }}
          >
            LUXURY HOME SERVICES
          </div>
        </div>
      </div>

      {/* Optional language badge — bottom-aligned with brand, still top-left safe */}
      {showLang ? (
        <div
          style={{
            position: "absolute",
            top: 60,
            left: SAFE_LEFT + 360,
            height: 30,
            borderRadius: 999,
            border: `1.5px solid ${GOLD_DEEP}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 16px",
            color: GOLD_LABEL,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.18em",
          }}
        >
          {lang.toUpperCase()}
        </div>
      ) : null}

      {/* Personalization block — vertically centered, dominates the frame */}
      <div
        style={{
          position: "absolute",
          left: SAFE_LEFT,
          top: 150,
          bottom: 150,
          width: CONTENT_W,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {kicker ? (
          <div
            style={{
              fontSize: 24,
              letterSpacing: "0.30em",
              color: GOLD_LABEL,
              fontWeight: 600,
              marginBottom: 18,
            }}
          >
            {kicker}
          </div>
        ) : null}

        <div
          style={{
            fontSize: heroSize,
            lineHeight: 1.0,
            color: IVORY,
            letterSpacing: "-0.02em",
            fontFamily: SERIF,
            // Wrap (rather than overflow) as a safety net for very long names.
            whiteSpace: "normal",
            wordBreak: "break-word",
            // Subtle lift so the name separates from the gradient
            textShadow: "0 2px 18px rgba(0,0,0,0.55)",
          }}
        >
          {hero}
        </div>

        {sub ? (
          <div
            style={{
              marginTop: 20,
              fontSize: subSize,
              lineHeight: 1.0,
              color: GOLD_HERO,
              letterSpacing: "-0.01em",
              fontFamily: SERIF,
              whiteSpace: "nowrap",
              textShadow: "0 2px 14px rgba(0,0,0,0.45)",
            }}
          >
            {sub}
          </div>
        ) : null}

        {unitLabel ? (
          <div
            style={{
              marginTop: 14,
              fontSize: unitSize,
              lineHeight: 1.0,
              color: GOLD_LABEL,
              letterSpacing: "0.01em",
              fontFamily: SERIF,
            }}
          >
            {unitLabel}
          </div>
        ) : null}
      </div>

      {/* Restrained service line */}
      <div
        style={{
          position: "absolute",
          left: SAFE_LEFT,
          right: SAFE_LEFT,
          bottom: 78,
          display: "flex",
          alignItems: "center",
          fontSize: 25,
          letterSpacing: "0.08em",
          color: "rgba(240,233,219,0.80)",
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        Balcony Glass · Interior Paint · Custom Home Care
      </div>

      {/* Editorial divider */}
      <div
        style={{
          position: "absolute",
          left: SAFE_LEFT,
          right: SAFE_LEFT,
          bottom: 58,
          height: 1,
          background:
            "linear-gradient(90deg, rgba(184,153,104,0.55) 0%, rgba(184,153,104,0.30) 46%, rgba(184,153,104,0) 100%)",
        }}
      />

      {/* Footer — locale (left) + trust (right), larger than before so it survives compression */}
      <div
        style={{
          position: "absolute",
          left: SAFE_LEFT,
          bottom: 26,
          fontSize: 17,
          letterSpacing: "0.18em",
          color: GOLD_LABEL,
          fontWeight: 600,
        }}
      >
        MIAMI · MIAMI BEACH
      </div>
      <div
        style={{
          position: "absolute",
          right: SAFE_LEFT,
          bottom: 26,
          fontSize: 17,
          letterSpacing: "0.16em",
          color: "rgba(200,172,114,0.82)",
          fontWeight: 600,
        }}
      >
        FULLY INSURED · $2M COVERAGE
      </div>
    </div>
  );
}
