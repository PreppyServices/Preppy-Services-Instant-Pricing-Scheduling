// 1200x630 November campaign preview, in the Flyer A editorial style.
// The balcony photo fills the frame. Type sits on an obsidian scrim so the
// link preview stays readable inside a compressed iMessage bubble.

import type { ReactElement } from "react";
import { SERIF } from "./card";
import { NOVEMBER_CTA, NOVEMBER_HEADLINE } from "../../../lib/campaignCopy";

const IVORY = "#F6F1E8";
const GOLD = "#E0C485";
const INK = "#071018";
const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

function fit(text: string, max: number, min: number, width: number, perChar: number): number {
  const size = Math.floor(width / (Math.max(text.length, 1) * perChar));
  return Math.max(min, Math.min(max, size));
}

export type NovemberCardProps = {
  kicker: string;
  subline: string;
  photoSrc: string;
};

export function NovemberCampaignCard({
  kicker,
  subline,
  photoSrc,
}: NovemberCardProps): ReactElement {
  const headlineSize = fit(NOVEMBER_HEADLINE, 68, 48, 1040, 0.52);
  const subSize = fit(subline, 28, 20, 1080, 0.52);
  const kickerSize = fit(kicker, 26, 18, 900, 0.56);
  const ctaLabel = NOVEMBER_CTA.replace(/\s*›\s*$/, "");
  const ctaSize = fit(ctaLabel, 32, 22, 980, 0.54);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: INK,
        color: IVORY,
        fontFamily: SANS,
      }}
    >
      <img
        src={photoSrc}
        width={1200}
        height={630}
        alt=""
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1200,
          height: 630,
          objectFit: "cover",
          objectPosition: "center top",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 430,
          background:
            "linear-gradient(180deg, rgba(7,16,24,0) 0%, rgba(7,16,24,0.55) 24%, rgba(7,16,24,0.9) 48%, rgba(7,16,24,0.97) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 56,
          right: 56,
          bottom: 34,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: kickerSize,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: GOLD,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: SERIF,
            fontSize: headlineSize,
            lineHeight: 1,
            color: IVORY,
            textShadow: "0 2px 18px rgba(0,0,0,0.45)",
          }}
        >
          {NOVEMBER_HEADLINE}
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: subSize,
            fontWeight: 600,
            color: "rgba(246,241,232,0.92)",
          }}
        >
          {subline}
        </div>
        <div style={{ display: "flex", marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderRadius: 999,
              background: GOLD,
              color: "#1A1408",
              paddingTop: 12,
              paddingBottom: 12,
              paddingLeft: 26,
              paddingRight: 24,
              fontFamily: SERIF,
              fontSize: ctaSize,
            }}
          >
            <div>{ctaLabel}</div>
            <div style={{ marginLeft: 12, fontSize: ctaSize + 6 }}>›</div>
          </div>
        </div>
      </div>
    </div>
  );
}
