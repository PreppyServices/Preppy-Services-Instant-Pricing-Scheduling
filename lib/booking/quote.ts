// Price a balcony line from the live widget table. This module does not write
// that table. Floors apply at display and charge time.

import { pricing, addOnPricing, preservedRegularInterior } from "../../data/buildings";
import { quoteInteriorAddOn } from "../introPricing";
import { chargedLinePrice, durationMinFor } from "./rules";

export type GlassQuote = {
  building: string;
  line: string;
  catalogRegular: number;
  regularLine: number;
  chargedLine: number;
  interiorAddOn: number;
  regularTotal: number;
  total: number;
  intro: boolean;
  interior: boolean;
  durationMin: number;
};

export function quoteGlass(
  building: string,
  line: string,
  interior: boolean,
  intro: boolean,
  promoOn = false
): GlassQuote | null {
  const catalogRegular = pricing[building]?.lines?.[line];
  if (catalogRegular == null) return null;
  const chargedLine = chargedLinePrice(catalogRegular, intro, promoOn);
  const regularLine = chargedLinePrice(catalogRegular, false, false);
  const interiorAddOn = interior
    ? quoteInteriorAddOn(
        building,
        line,
        catalogRegular,
        intro,
        addOnPricing,
        preservedRegularInterior
      )
    : 0;
  return {
    building,
    line,
    catalogRegular,
    regularLine,
    chargedLine,
    interiorAddOn,
    regularTotal: regularLine + interiorAddOn,
    total: chargedLine + interiorAddOn,
    intro,
    interior,
    durationMin: durationMinFor(regularLine, building, line, interior),
  };
}
