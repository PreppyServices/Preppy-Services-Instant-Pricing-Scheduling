/**
 * Exterior line rates Joe confirmed for the homepage quote widget.
 *
 * The live calculator reads `pricing[building].lines[line]` from
 * data/buildings.ts. One number per line. A numeric unit uses an exact key
 * when present, otherwise the last two digits. There is no floor-band field.
 *
 * This guard locks the confirmed increases, the higher prices that stay put,
 * the original regular interior dollar on each moved line, and the provisional
 * lines that must not move.
 */
import {
  addOnPricing,
  preservedRegularInterior,
  pricing,
  verifiedBuildings,
} from "../data/buildings.ts";
import { matchCatalogBuilding } from "../lib/catalogBuilding.ts";
import {
  firstServicePrice,
  INTRO_INTERIOR_ADDON,
  INTRO_RATE,
  quoteInteriorAddOn,
} from "../lib/introPricing.ts";

type Lines = Record<string, number>;

function linesOf(building: string): Lines {
  const entry = pricing[building];
  if (!entry) throw new Error(`missing building ${building}`);
  return entry.lines;
}

function assertPrice(building: string, line: string, expected: number) {
  const actual = linesOf(building)[line];
  if (actual !== expected) {
    throw new Error(`${building} line ${line}: expected ${expected}, got ${actual}`);
  }
}

function assertAbsent(building: string, line: string) {
  if (Object.prototype.hasOwnProperty.call(linesOf(building), line)) {
    throw new Error(`${building} line ${line} must stay absent, found ${linesOf(building)[line]}`);
  }
}

/** Same last-two-digit rule as PreppyLuxuryWidget.resolveUnitToLine. */
function lineForUnit(building: string, unit: string): string | null {
  const lines = linesOf(building);
  const u = unit.trim().toUpperCase();
  if (!u) return null;
  if (lines[u] !== undefined) return u;
  if (/^(PH|UPH|LPH|TH|TS|TOWNHOUSE|TOWNHOME|PENTHOUSE)/i.test(u)) return null;
  if (!/^\d+$/.test(u)) return null;
  if (/^\d{3,5}$/.test(u)) {
    const last2 = u.slice(-2);
    if (/^\d{2}$/.test(last2) && lines[last2] !== undefined) return last2;
  }
  if (/^\d{1,2}$/.test(u)) {
    const padded = u.padStart(2, "0");
    if (lines[padded] !== undefined) return padded;
  }
  return null;
}

function assertUnit(building: string, unit: string, line: string, price: number) {
  const resolved = lineForUnit(building, unit);
  if (resolved !== line) {
    throw new Error(`${building} unit ${unit}: expected line ${line}, got ${resolved}`);
  }
  assertPrice(building, resolved, price);
}

const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

check("confirmed increases", () => {
  assertPrice("Aria on the Bay", "01", 280);
  assertPrice("One Paraiso", "03", 280);
  assertPrice("One Paraiso", "04", 280);
  assertPrice("Paraiso Bay", "07", 280);
  assertPrice("Aria Reserve South", "01", 280);
  assertPrice("Aria Reserve North", "01", 280);
});

check("higher existing prices preserved", () => {
  assertPrice("Paraiso Bay", "01", 300);
  assertPrice("Paraiso Bayviews", "06", 320);
  assertPrice("Aria on the Bay", "12", 300);
  assertPrice("Aria on the Bay", "15", 300);
});

check("One Paraiso flyer lines are 340 before discount and 272 after 20%", () => {
  for (const line of ["01", "06"]) {
    assertPrice("One Paraiso", line, 340);
    const intro = firstServicePrice(linesOf("One Paraiso")[line]);
    if (intro !== 272) {
      throw new Error(`One Paraiso ${line} first service ${intro}, expected 272`);
    }
    if (interiorQuote("One Paraiso", line, 340, false) !== 100) {
      throw new Error(`One Paraiso ${line} regular interior moved off the prior $100 quote`);
    }
    if (interiorQuote("One Paraiso", line, 340, true) !== 100) {
      throw new Error(`One Paraiso ${line} intro interior moved off the flat $100 add-on`);
    }
  }
  assertUnit("One Paraiso", "1201", "01", 340);
  assertUnit("One Paraiso", "1206", "06", 340);
  assertUnit("One Paraiso", "1203", "03", 280);
  assertPrice("One Paraiso", "03", 280);
  assertPrice("One Paraiso", "04", 280);
  if (firstServicePrice(280) !== 224) {
    throw new Error("One Paraiso 03/04 first-service math changed");
  }
  for (const [line, price] of Object.entries(linesOf("One Paraiso"))) {
    if (price === 300) throw new Error(`One Paraiso ${line} still carries the retired 300 offer`);
  }
  assertPrice("Paraiso Bay", "01", 300);
});

check("provisional exclusions unchanged", () => {
  assertAbsent("Aria Reserve South", "05");
  assertPrice("Paramount Bay", "01", 220);
  assertPrice("Paraiso Bayviews", "01", 260);
  assertPrice("Paraiso Bayviews", "08", 220);
  assertPrice("Paraiso Bayviews", "10", 280);
  assertPrice("Paraiso Bayviews", "07", 140);
});

check("blocked floor band and compass lines", () => {
  assertPrice("Aria Reserve North", "02", 220);
  assertAbsent("Aria Reserve North", "2702");
  assertAbsent("Aria Reserve North", "5602");
  assertUnit("Aria Reserve North", "2602", "02", 220);
  assertUnit("Aria Reserve North", "2702", "02", 220);
  assertUnit("Aria Reserve North", "5602", "02", 220);
  assertUnit("Aria Reserve North", "2701", "01", 280);
  assertAbsent("Aria Reserve North", "07");
  assertAbsent("Aria Reserve South", "07");
  if (lineForUnit("Aria Reserve South", "1207") !== null) {
    throw new Error("South unit 1207 must not resolve; line 07 was not in the catalog");
  }
  if (lineForUnit("Aria Reserve North", "2707") !== null) {
    throw new Error("North unit 2707 must not resolve; line 07 was not in the catalog");
  }

  for (const building of ["Elysee", "Elysee Miami"]) {
    assertAbsent(building, "01");
    assertAbsent(building, "02");
    assertPrice(building, "NE", 280);
    assertPrice(building, "SE", 280);
    assertPrice(building, "NE-SKY", 300);
    assertPrice(building, "SE-SKY", 300);
    assertPrice(building, "NE-GRAND", 320);
    assertPrice(building, "SE-GRAND", 320);
  }
});

check("untouched neighbors and penthouses", () => {
  assertPrice("Aria Reserve South", "02", 220);
  assertPrice("Aria Reserve South Tower", "01", 220);
  assertPrice("Aria Reserve South Tower", "02", 220);
  assertAbsent("Aria Reserve South Tower", "07");
  assertPrice("Aria Reserve North", "PH01", 430);
  assertPrice("Aria Reserve North", "PH04", 440);
  assertPrice("Aria Reserve South", "PH02", 410);
  assertPrice("Paraiso Bay", "PH01", 420);
  assertPrice("Paraiso Bay", "08", 120);
  assertPrice("Paraiso Bay", "02", 180);
  assertPrice("One Paraiso", "02", 180);
  assertPrice("One Paraiso", "05", 180);
  assertPrice("One Paraiso", "PH01", 420);
  assertPrice("Aria on the Bay", "00", 220);
  assertPrice("Aria on the Bay", "02", 160);
  assertPrice("Aria on the Bay", "07", 180);
  assertPrice("Gran Paraiso", "01", 350);
  assertPrice("Gran Paraiso", "07", 350);
  assertPrice("Paramount Bay", "02", 300);
});

check("interior catalog and other services untouched", () => {
  const expected: Record<number, number> = {
    120: 30,
    140: 30,
    160: 40,
    180: 40,
    200: 60,
    220: 70,
    240: 80,
    260: 80,
    280: 90,
    300: 100,
    320: 110,
    330: 120,
    340: 120,
    360: 130,
    380: 140,
    395: 140,
    400: 140,
    420: 150,
    430: 160,
    440: 160,
    450: 170,
  };
  const actualKeys = Object.keys(addOnPricing).map(Number).sort((a, b) => a - b);
  const expectedKeys = Object.keys(expected).map(Number).sort((a, b) => a - b);
  if (actualKeys.join() !== expectedKeys.join()) {
    throw new Error(`addOnPricing keys changed: ${actualKeys.join(",")}`);
  }
  for (const key of expectedKeys) {
    if (addOnPricing[key] !== expected[key]) {
      throw new Error(`addOnPricing ${key}: expected ${expected[key]}, got ${addOnPricing[key]}`);
    }
  }
  if (INTRO_INTERIOR_ADDON !== 100) {
    throw new Error(`intro interior add-on changed to ${INTRO_INTERIOR_ADDON}`);
  }
  if (INTRO_RATE !== 0.8) throw new Error(`intro rate changed to ${INTRO_RATE}`);
});

type MovedLine = {
  building: string;
  line: string;
  oldExterior: number;
  newExterior: number;
  priorInterior: number;
};

const movedLines: MovedLine[] = [
  { building: "Aria on the Bay", line: "01", oldExterior: 220, newExterior: 280, priorInterior: 70 },
  { building: "One Paraiso", line: "01", oldExterior: 300, newExterior: 340, priorInterior: 100 },
  { building: "One Paraiso", line: "03", oldExterior: 260, newExterior: 280, priorInterior: 80 },
  { building: "One Paraiso", line: "04", oldExterior: 260, newExterior: 280, priorInterior: 80 },
  { building: "One Paraiso", line: "06", oldExterior: 300, newExterior: 340, priorInterior: 100 },
  { building: "Paraiso Bay", line: "07", oldExterior: 140, newExterior: 280, priorInterior: 30 },
  { building: "Aria Reserve South", line: "01", oldExterior: 220, newExterior: 280, priorInterior: 70 },
  { building: "Aria Reserve North", line: "01", oldExterior: 220, newExterior: 280, priorInterior: 70 },
];

function interiorQuote(building: string, line: string, exterior: number, intro: boolean): number {
  return quoteInteriorAddOn(building, line, exterior, intro, addOnPricing, preservedRegularInterior);
}

check("moved lines keep the original regular interior quote", () => {
  const lockKeys = Object.keys(preservedRegularInterior).sort();
  const expectedBuildings = [...new Set(movedLines.map((row) => row.building))].sort();
  if (lockKeys.join("|") !== expectedBuildings.join("|")) {
    throw new Error(`preserved buildings: ${lockKeys.join(", ")}`);
  }
  for (const row of movedLines) {
    const locked = preservedRegularInterior[row.building]?.[row.line];
    if (locked !== row.priorInterior) {
      throw new Error(`${row.building} ${row.line} lock is ${locked}, prior quote was ${row.priorInterior}`);
    }
    if (addOnPricing[row.oldExterior] !== row.priorInterior) {
      throw new Error(`${row.oldExterior} catalog tier is not the prior interior ${row.priorInterior}`);
    }
    assertPrice(row.building, row.line, row.newExterior);
    if (row.newExterior < row.oldExterior) {
      throw new Error(`${row.building} ${row.line} decreased`);
    }
    const regularInterior = interiorQuote(row.building, row.line, row.newExterior, false);
    const introInterior = interiorQuote(row.building, row.line, row.newExterior, true);
    const introExterior = firstServicePrice(row.newExterior);
    if (regularInterior !== row.priorInterior) {
      throw new Error(
        `${row.building} ${row.line} regular interior ${regularInterior}, expected ${row.priorInterior}`
      );
    }
    if (regularInterior === addOnPricing[row.newExterior]) {
      throw new Error(`${row.building} ${row.line} followed the new exterior tier`);
    }
    if (introInterior !== 100) {
      throw new Error(`${row.building} ${row.line} intro interior ${introInterior}`);
    }
    const regularTotal = row.newExterior + regularInterior;
    const introTotal = introExterior + introInterior;
    const expectedRegular = row.newExterior + row.priorInterior;
    const expectedIntro = introExterior + 100;
    if (regularTotal !== expectedRegular || introTotal !== expectedIntro) {
      throw new Error(`${row.building} ${row.line} totals ${regularTotal} / ${introTotal}`);
    }
  }
  for (const [building, lines] of Object.entries(preservedRegularInterior)) {
    for (const line of Object.keys(lines)) {
      const known = movedLines.some((row) => row.building === building && row.line === line);
      if (!known) throw new Error(`unexpected interior lock ${building} ${line}`);
    }
  }
});

check("every other line keeps its catalog interior and intro stays 100", () => {
  let scanned = 0;
  for (const [building, entry] of Object.entries(pricing)) {
    for (const [line, exterior] of Object.entries(entry.lines)) {
      scanned += 1;
      const intro = interiorQuote(building, line, exterior, true);
      if (intro !== 100) throw new Error(`${building} ${line} intro interior ${intro}`);
      const moved = movedLines.some((row) => row.building === building && row.line === line);
      if (moved) continue;
      const regular = interiorQuote(building, line, exterior, false);
      const catalog = addOnPricing[exterior] ?? 0;
      if (regular !== catalog) {
        throw new Error(`${building} ${line} interior ${regular}, catalog ${catalog}`);
      }
    }
  }
  if (scanned < 100) throw new Error(`scanned only ${scanned} lines`);
});

check("canonical Aria Reserve South is not South Tower", () => {
  const names = Object.keys(pricing);
  const south = "Aria Reserve South";
  const tower = "Aria Reserve South Tower";
  if (south === tower) throw new Error("names collapsed");
  if (pricing[south] === pricing[tower]) throw new Error("South and South Tower share one entry");
  if (matchCatalogBuilding(names, south) !== south) throw new Error("South did not match itself");
  if (matchCatalogBuilding(names, tower) !== tower) throw new Error("South Tower did not match itself");
  if (matchCatalogBuilding(names, "aria reserve south") !== south) {
    throw new Error("case-insensitive South match failed");
  }
  if (matchCatalogBuilding(names, "  Aria Reserve South Tower  ") !== tower) {
    throw new Error("trimmed South Tower match failed");
  }
  if (matchCatalogBuilding(names, "Aria Reserve") !== null) {
    throw new Error("prefix Aria Reserve must not select a tower");
  }
  if (matchCatalogBuilding(names, "Aria Reserve South T") !== null) {
    throw new Error("partial South Tower name must not match");
  }
  assertPrice(south, "01", 280);
  assertPrice(tower, "01", 220);
  assertPrice(tower, "02", 220);
  assertAbsent(south, "07");
  assertAbsent(tower, "07");
  if (preservedRegularInterior[tower]) throw new Error("South Tower must not have an interior lock");
  if (interiorQuote(tower, "01", 220, false) !== 70) {
    throw new Error("South Tower line 01 interior moved");
  }
  if (verifiedBuildings.includes(south) || verifiedBuildings.includes(tower)) {
    throw new Error("OG verified list must not include Aria Reserve South or South Tower");
  }
});

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("exterior line rate guard passed");
