// 1200x630 November campaign preview.
// The clean upper crop of the mirrored daylight balcony fills the frame.
// The left half stays the open bay. Type sits on a navy fade over the
// interior wall and mirror on the right.

import type { ReactElement } from "react";
import { SERIF } from "./card";
import { NOVEMBER_CTA, NOVEMBER_HEADLINE, NOVEMBER_WORDMARK } from "../../../lib/campaignCopy";

const IVORY = "#F6F1E8";
const GOLD = "#E0C485";
const INK = "#071018";
const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

const COLUMN_W = 472;

function fit(text: string, max: number, min: number, width: number, perChar: number): number {
  const size = Math.floor(width / (Math.max(text.length, 1) * perChar));
  return Math.max(min, Math.min(max, size));
}

export type NovemberCardProps = {
  kicker: string;
  subline: string;
  photoSrc: string;
  iconSrc: string;
};

export function NovemberCampaignCard({
  kicker,
  subline,
  photoSrc,
  iconSrc,
}: NovemberCardProps): ReactElement {
  const kickerSize = fit(kicker, 22, 16, COLUMN_W, 0.52);
  const headlineSize = fit(NOVEMBER_HEADLINE, 46, 34, COLUMN_W, 0.5);
  const subSize = fit(subline, 22, 16, COLUMN_W, 0.52);
  const ctaLabel = NOVEMBER_CTA.replace(/\s*›\s*$/, "");
  const ctaSize = fit(ctaLabel, 22, 16, COLUMN_W - 70, 0.52);

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
          objectPosition: "center 20%",
        }}
      />
      {/* Right-half scrim only. The left half of the bay stays uncovered. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1200,
          height: 630,
          background:
            "linear-gradient(90deg, rgba(7,16,24,0) 0%, rgba(7,16,24,0) 48%, rgba(7,16,24,0.7) 57%, rgba(7,16,24,0.92) 68%, rgba(7,16,24,0.97) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 692,
          width: COLUMN_W,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src={iconSrc}
            width={46}
            height={46}
            alt=""
            style={{ width: 46, height: 46, borderRadius: 12 }}
          />
          <div
            style={{
              marginLeft: 12,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: IVORY,
            }}
          >
            {NOVEMBER_WORDMARK}
          </div>
        </div>

        <div
          style={{
            marginTop: 22,
            fontSize: kickerSize,
            lineHeight: 1.25,
            fontWeight: 600,
            color: GOLD,
          }}
        >
          {kicker}
        </div>

        <div
          style={{
            marginTop: 10,
            fontFamily: SERIF,
            fontSize: headlineSize,
            lineHeight: 1.02,
            color: IVORY,
          }}
        >
          {NOVEMBER_HEADLINE}
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: subSize,
            lineHeight: 1.25,
            fontWeight: 600,
            color: "rgba(246,241,232,0.92)",
          }}
        >
          {subline}
        </div>

        <div style={{ display: "flex", marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderRadius: 999,
              background: GOLD,
              color: "#1A1408",
              paddingTop: 11,
              paddingBottom: 11,
              paddingLeft: 18,
              paddingRight: 16,
              fontFamily: SERIF,
              fontSize: ctaSize,
            }}
          >
            <div>{ctaLabel}</div>
            <div style={{ marginLeft: 8, fontSize: ctaSize + 4 }}>›</div>
          </div>
        </div>
      </div>
    </div>
  );
}
