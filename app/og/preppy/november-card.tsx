// 1200x630 November preview, matching the v4 zoomed-back phone layout.
// The bay and the lamp in the mirror stay clear. Type is right-aligned
// on the navy panel.

import type { ReactElement } from "react";
import { SERIF } from "./card";
import { novemberScopeParts } from "../../../lib/campaignCopy";

const NAVY = "#0A101C";
const IVORY = "#FAF8F4";
const WORD = "#F8F6F1";
const GOLD = "#D6B475";
const GOLD_WARM = "#E2C388";
const SCOPE = "#E8ECF2";
const INK = "#0A1624";
const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

export type NovemberCardProps = {
  firstName: string;
  building: string;
  photoSrc: string;
  iconSrc: string;
};

function Dot({ size, margin }: { size: number; margin?: number }): ReactElement {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: GOLD,
        marginLeft: margin ?? 0,
        marginRight: margin ?? 0,
        flexShrink: 0,
      }}
    />
  );
}

export function NovemberCampaignCard({
  firstName,
  building,
  photoSrc,
  iconSrc,
}: NovemberCardProps): ReactElement {
  const scope = novemberScopeParts(building);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: NAVY,
        fontFamily: SANS,
      }}
    >
      <img
        src={photoSrc}
        width={820}
        height={630}
        alt=""
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 820,
          height: 630,
          objectFit: "cover",
          objectPosition: "48% 40%",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 820,
          width: 380,
          height: 630,
          background: NAVY,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 740,
          width: 100,
          height: 630,
          background:
            "linear-gradient(90deg, rgba(10,16,28,0) 0%, rgba(10,16,28,0.22) 30%, rgba(10,16,28,0.7) 68%, rgba(10,16,28,1) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 430,
          height: 630,
          paddingTop: 36,
          paddingRight: 40,
          paddingBottom: 36,
          paddingLeft: 24,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                color: WORD,
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}
            >
              PREPPY SERVICES
            </div>
            <Dot size={5} margin={10} />
            <div
              style={{
                color: WORD,
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}
            >
              MIAMI
            </div>
          </div>
          <img
            src={iconSrc}
            width={54}
            height={54}
            alt=""
            style={{
              width: 54,
              height: 54,
              borderRadius: 12,
              marginLeft: 12,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            width: "100%",
          }}
        >
          <div
            style={{
              color: GOLD,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            NOVEMBER NEWSLETTER PROMO
          </div>
          {firstName ? (
            <div
              style={{
                marginTop: 10,
                color: GOLD_WARM,
                fontSize: 27,
                fontWeight: 600,
                letterSpacing: "0.015em",
              }}
            >
              {`Prepared for ${firstName}`}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              marginTop: 10,
              fontFamily: SERIF,
              fontSize: 62,
              lineHeight: 1.04,
              fontWeight: 500,
              color: IVORY,
              letterSpacing: "-0.015em",
              textShadow: "0 2px 18px rgba(0,0,0,0.4)",
            }}
          >
            <div>Holiday</div>
            <div>Balcony</div>
            <div>Cleaning</div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              marginTop: 10,
            }}
          >
            {scope.map((part, index) => (
              <div key={`${part}-${index}`} style={{ display: "flex", alignItems: "center" }}>
                {index > 0 ? <Dot size={6} margin={11} /> : null}
                <div
                  style={{
                    color: SCOPE,
                    fontSize: 23,
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                  }}
                >
                  {part}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            borderRadius: 999,
            background: "linear-gradient(180deg, #E2C388 0%, #C9A362 100%)",
            color: INK,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "0.005em",
            paddingTop: 16,
            paddingBottom: 16,
            paddingLeft: 22,
            paddingRight: 22,
            whiteSpace: "nowrap",
          }}
        >
          Click Here to Get Your Unit Pricing ›
        </div>
      </div>
    </div>
  );
}
