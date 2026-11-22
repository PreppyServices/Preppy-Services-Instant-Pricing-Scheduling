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
  interiorTier,
  INTRO_RATE,
  lineInteriorQuote,
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
  assertPrice("Aria on the Bay", "01", 300);
  assertPrice("One Paraiso", "03", 280);
  assertPrice("One Paraiso", "04", 280);
  assertPrice("Paraiso Bay", "07", 280);
  assertPrice("Aria Reserve South", "01", 280);
  assertPrice("Aria Reserve North", "01", 280);
});

check("higher existing prices preserved", () => {
  assertPrice("Paraiso Bay", "01", 300);
  assertPrice("Paraiso Bayviews", "06", 330);
  assertPrice("Aria on the Bay", "12", 310);
  assertPrice("Aria on the Bay", "15", 310);
});

check("One Paraiso flyer lines are 340 before discount and 272 after 20%", () => {
  for (const line of ["01", "06"]) {
    assertPrice("One Paraiso", line, 340);
    const intro = firstServicePrice(linesOf("One Paraiso")[line]);
    if (intro !== 272) {
      throw new Error(`One Paraiso ${line} first service ${intro}, expected 272`);
    }
    if (interiorQuote("One Paraiso", line, 340, false) !== interiorTier(340)) {
      throw new Error(`One Paraiso ${line} regular interior left the balcony tier`);
    }
    if (interiorQuote("One Paraiso", line, 340, true) !== firstServicePrice(interiorTier(340))) {
      throw new Error(`One Paraiso ${line} intro interior left 20% off the tier`);
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
  assertPrice("Aria Reserve South", "05", 190);
  assertPrice("Paramount Bay", "01", 220);
  assertPrice("Paraiso Bayviews", "01", 260);
  assertPrice("Paraiso Bayviews", "08", 220);
  assertPrice("Paraiso Bayviews", "10", 280);
  assertPrice("Paraiso Bayviews", "07", 180);
});

check("blocked floor band and compass lines", () => {
  assertPrice("Aria Reserve North", "02", 220);
  assertAbsent("Aria Reserve North", "2702");
  assertAbsent("Aria Reserve North", "5602");
  assertUnit("Aria Reserve North", "2602", "02", 220);
  assertUnit("Aria Reserve North", "2702", "02", 220);
  assertUnit("Aria Reserve North", "5602", "02", 220);
  assertUnit("Aria Reserve North", "2701", "01", 280);
  assertPrice("Aria Reserve North", "07", 220);
  assertPrice("Aria Reserve South", "07", 220);
  assertUnit("Aria Reserve South", "1207", "07", 220);
  assertUnit("Aria Reserve North", "2707", "07", 220);

  for (const building of ["Elysee", "Elysee Miami"]) {
    assertAbsent(building, "01");
    assertAbsent(building, "02");
    assertPrice(building, "NE", 450);
    assertPrice(building, "SE", 410);
    assertPrice(building, "NE-SKY", 450);
    assertPrice(building, "SE-SKY", 300);
    assertPrice(building, "NE-GRAND", 450);
    assertPrice(building, "SE-GRAND", 450);
  }
});

check("untouched neighbors and penthouses", () => {
  assertPrice("Aria Reserve South", "02", 220);
  assertPrice("Aria Reserve North", "PH01", 430);
  assertPrice("Aria Reserve North", "PH04", 440);
  assertPrice("Aria Reserve South", "PH02", 410);
  assertPrice("Paraiso Bay", "PH01", 420);
  assertPrice("Paraiso Bay", "08", 200);
  assertPrice("Paraiso Bay", "02", 210);
  assertPrice("One Paraiso", "02", 200);
  assertPrice("One Paraiso", "05", 200);
  assertPrice("One Paraiso", "PH01", 420);
  assertPrice("Aria on the Bay", "00", 220);
  assertPrice("Aria on the Bay", "02", 180);
  assertPrice("Aria on the Bay", "07", 200);
  assertPrice("Gran Paraiso", "01", 450);
  assertPrice("Gran Paraiso", "07", 450);
  assertPrice("Gran Paraiso", "PH01", 550);
  assertPrice("Gran Paraiso", "PH02", 360);
  assertPrice("Gran Paraiso", "PH03", 400);
  assertPrice("Gran Paraiso", "PH04", 550);
  assertPrice("Paramount Bay", "02", 340);
});

check("interior catalog and other services untouched", () => {
  const expected: Record<number, number> = {
    120: 30,
    140: 30,
    150: 30,
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
  if (INTRO_RATE !== 0.8) throw new Error(`intro rate changed to ${INTRO_RATE}`);
  if (interiorTier(150) !== 50 || interiorTier(851) !== 450) {
    throw new Error("interior tier boundaries moved");
  }
});

type MovedLine = {
  building: string;
  line: string;
  oldExterior: number;
  newExterior: number;
  priorInterior: number;
};

function lock(
  building: string,
  line: string,
  oldExterior: number,
  newExterior: number,
  priorInterior: number
): MovedLine {
  return { building, line, oldExterior, newExterior, priorInterior };
}

function locks(building: string, rows: Array<[string, number, number, number]>): MovedLine[] {
  return rows.map(([line, oldExterior, newExterior, priorInterior]) =>
    lock(building, line, oldExterior, newExterior, priorInterior)
  );
}

const iconLocks: Array<[string, number, number, number]> = [
  ["02", 160, 190, 40],
  ["03", 180, 190, 40],
  ["04", 180, 210, 40],
  ["06", 180, 200, 40],
  ["07", 180, 200, 40],
  ["08", 220, 250, 70],
];

const elyseeLocks: Array<[string, number, number, number]> = [
  ["NE", 280, 450, 90],
  ["NE-GRAND", 320, 450, 110],
  ["NE-SKY", 300, 450, 100],
  ["SE", 280, 410, 90],
  ["SE-GRAND", 320, 450, 110],
];

const movedLines: MovedLine[] = [
  ...locks("Aria on the Bay", [
    ["01", 220, 300, 70],
    ["06", 180, 200, 40],
    ["07", 180, 200, 40],
    ["08", 180, 190, 40],
    ["12", 300, 310, 100],
    ["15", 300, 310, 100],
  ]),
  ...locks("One Paraiso", [
    ["01", 300, 340, 100],
    ["02", 180, 200, 40],
    ["03", 260, 280, 80],
    ["04", 260, 280, 80],
    ["05", 180, 200, 40],
    ["06", 300, 340, 100],
  ]),
  ...locks("Paraiso Bay", [
    ["02", 180, 210, 40],
    ["03", 180, 210, 40],
    ["04", 180, 210, 40],
    ["05", 180, 210, 40],
    ["06", 180, 210, 40],
    ["07", 140, 280, 30],
    ["08", 120, 200, 30],
  ]),
  ...locks("Aria Reserve South", [["01", 220, 280, 70]]),
  ...locks("Aria Reserve North", [["01", 220, 280, 70]]),
  ...locks("Gran Paraiso", [
    ["01", 350, 450, 0],
    ["02", 180, 210, 40],
    ["03", 180, 210, 40],
    ["04", 180, 210, 40],
    ["05", 180, 210, 40],
    ["06", 180, 210, 40],
    ["07", 350, 450, 0],
    ["PH01", 420, 550, 150],
    ["PH04", 450, 550, 170],
  ]),
  ...locks("Paraiso Bayviews", [
    ["02", 120, 170, 30],
    ["03", 120, 170, 30],
    ["04", 120, 170, 30],
    ["05", 120, 170, 30],
    ["06", 320, 330, 110],
    ["07", 140, 180, 30],
    ["09", 120, 170, 30],
    ["PH05", 120, 150, 30],
    ["PH06", 120, 150, 30],
  ]),
  ...locks("Missoni Baia", [
    ["02", 320, 330, 110],
    ["03", 260, 340, 80],
    ["04", 120, 150, 30],
    ...Array.from({ length: 19 }, (_, index): [string, number, number, number] => [
      `${38 + index}02`,
      320,
      330,
      110,
    ]),
  ]),
  ...locks("Paramount Bay", [
    ["02", 300, 340, 100],
    ["03", 240, 270, 80],
    ["04", 180, 210, 40],
    ["05", 180, 210, 40],
    ["06", 240, 270, 80],
    ["07", 240, 270, 80],
    ["08", 180, 210, 40],
    ["10", 240, 270, 80],
  ]),
  ...locks("Icon Bay", iconLocks),
  ...locks("Icons on the Bay", iconLocks),
  ...locks("Elysee", elyseeLocks),
  ...locks("Elysee Miami", elyseeLocks),
];

function interiorQuote(building: string, line: string, exterior: number, intro: boolean): number {
  return lineInteriorQuote(pricing[building], line, exterior, intro);
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
    const priorCatalog = addOnPricing[row.oldExterior] ?? 0;
    if (priorCatalog !== row.priorInterior) {
      throw new Error(`${row.oldExterior} catalog tier is not the prior interior ${row.priorInterior}`);
    }
    assertPrice(row.building, row.line, row.newExterior);
    if (row.newExterior < row.oldExterior) {
      throw new Error(`${row.building} ${row.line} decreased`);
    }
    const regularInterior = interiorQuote(row.building, row.line, row.newExterior, false);
    const introInterior = interiorQuote(row.building, row.line, row.newExterior, true);
    const introExterior = firstServicePrice(row.newExterior);
    const expectedInterior = interiorTier(row.newExterior);
    const expectedIntroInterior = firstServicePrice(expectedInterior);
    if (regularInterior !== expectedInterior) {
      throw new Error(
        `${row.building} ${row.line} regular interior ${regularInterior}, expected ${expectedInterior}`
      );
    }
    if (introInterior !== expectedIntroInterior) {
      throw new Error(`${row.building} ${row.line} intro interior ${introInterior}`);
    }
    const regularTotal = row.newExterior + regularInterior;
    const introTotal = introExterior + introInterior;
    const expectedRegular = row.newExterior + expectedInterior;
    const expectedIntro = introExterior + expectedIntroInterior;
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

check("every line uses the balcony-price interior tier", () => {
  let scanned = 0;
  for (const [building, entry] of Object.entries(pricing)) {
    for (const [line, exterior] of Object.entries(entry.lines)) {
      scanned += 1;
      const regular = interiorQuote(building, line, exterior, false);
      const intro = interiorQuote(building, line, exterior, true);
      const expected = entry.interiorOverrides?.[line] ?? interiorTier(exterior);
      if (regular !== expected) {
        throw new Error(`${building} ${line} interior ${regular}, tier ${expected}`);
      }
      if (intro !== firstServicePrice(expected)) {
        throw new Error(`${building} ${line} intro interior ${intro}`);
      }
    }
    for (const band of entry.floorBands ?? []) {
      const regular = quoteInteriorAddOn(band.regular, false);
      const intro = quoteInteriorAddOn(band.regular, true);
      if (regular !== interiorTier(band.regular) || intro !== firstServicePrice(regular)) {
        throw new Error(`${building} band ${band.regular} interior ${regular}/${intro}`);
      }
    }
  }
  if (scanned < 100) throw new Error(`scanned only ${scanned} lines`);
});

check("Aria Reserve South Tower shares the South price entry", () => {
  const names = Object.keys(pricing);
  const south = "Aria Reserve South";
  const tower = "Aria Reserve South Tower";
  if (south === tower) throw new Error("names collapsed");
  if (pricing[south] !== pricing[tower]) {
    throw new Error("South Tower must share the South price entry");
  }
  if (pricing["Aria Reserve North"] === pricing[south]) {
    throw new Error("North must not share the South entry");
  }
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
  const expected: Record<string, number> = {
    "01": 280,
    "02": 220,
    "03": 200,
    "04": 190,
    "05": 190,
    "06": 200,
    "07": 220,
    PH01: 430,
    PH02: 410,
    PH03: 410,
    PH04: 440,
  };
  const southLines = Object.keys(linesOf(south)).sort();
  const expectedLines = Object.keys(expected).sort();
  if (southLines.join() !== expectedLines.join()) {
    throw new Error(`South lines drifted: ${southLines.join(",")}`);
  }
  for (const line of expectedLines) {
    assertPrice(south, line, expected[line]);
    assertPrice(tower, line, expected[line]);
  }
  const first = firstServicePrice(linesOf(tower)["01"]);
  if (first !== 224) {
    throw new Error(`South Tower line 01 first service ${first}, expected 224`);
  }
  if (linesOf(tower)["01"] < 150 || first < 120) {
    throw new Error("South Tower line 01 broke the price floor");
  }
  if (preservedRegularInterior[tower]) throw new Error("South Tower must not have an interior lock");
  if (interiorQuote(tower, "01", 280, false) !== interiorTier(280)) {
    throw new Error("South Tower line 01 interior left the balcony tier");
  }
  if (verifiedBuildings.includes(south) || verifiedBuildings.includes(tower)) {
    throw new Error("OG verified list must not include Aria Reserve South or South Tower");
  }
  assertPrice("Aria Reserve North", "04", 180);
});

check("Nov 13 2026 approved balcony quotes", () => {
  const quotes: Array<[string, string, number, number]> = [
    ["Gran Paraiso", "01", 450, 360],
    ["Gran Paraiso", "PH01", 550, 440],
    ["Paraiso Bay", "08", 200, 160],
    ["Paraiso Bayviews", "02", 170, 136],
    ["Missoni Baia", "04", 150, 120],
    ["Elysee", "NE", 450, 360],
    ["Elysee Miami", "NE", 450, 360],
    ["Paraiso Bay", "07", 280, 224],
    ["One Paraiso", "01", 340, 272],
  ];
  for (const [building, line, regular, intro] of quotes) {
    assertPrice(building, line, regular);
    const first = firstServicePrice(linesOf(building)[line]);
    if (first !== intro) {
      throw new Error(`${building} ${line} first service ${first}, expected ${intro}`);
    }
  }

  assertPrice("Aria Reserve North", "03", 200);
  assertPrice("Aria Reserve North", "04", 180);
  assertPrice("Aria Reserve North", "05", 190);
  assertPrice("Aria Reserve North", "06", 200);
  assertPrice("Aria Reserve South", "03", 200);
  assertPrice("Aria Reserve South", "04", 190);
  assertPrice("Aria Reserve South", "06", 200);
  assertPrice("Missoni Baia", "01", 300);
  assertPrice("Missoni Baia", "05", 220);
  assertPrice("Missoni Baia", "06", 220);
  assertPrice("Missoni Baia", "3801", 300);
  assertPrice("Missoni Baia", "3803", 450);
  assertPrice("Missoni Baia", "5606", 220);
  assertPrice("Aria on the Bay", "03", 180);
  assertPrice("Aria on the Bay", "04", 180);
  assertPrice("Aria on the Bay", "05", 160);
  assertPrice("Icon Bay", "01", 220);
  assertPrice("Icon Bay", "05", 180);
  assertPrice("Icons on the Bay", "05", 180);
  assertPrice("Paramount Bay", "09", 180);
  assertPrice("Paraiso Bayviews", "PH04", 220);
  if (interiorQuote("Gran Paraiso", "PH01", 550, false) !== interiorTier(550)) {
    throw new Error("Gran Paraiso PH01 interior left the balcony tier");
  }
  if (interiorQuote("Gran Paraiso", "PH04", 550, false) !== interiorTier(550)) {
    throw new Error("Gran Paraiso PH04 interior left the balcony tier");
  }
  if (interiorQuote("Gran Paraiso", "01", 450, false) !== interiorTier(450)) {
    throw new Error("Gran Paraiso 01 interior left the balcony tier");
  }
});

check("Nov 19 2026 Harbour House exterior rates", () => {
  const raised = ["01", "02", "03", "04", "05", "06", "07", "08", "09"];
  for (const line of raised) {
    assertPrice("Harbour House", line, 180);
    if (preservedRegularInterior["Harbour House"]?.[line] != null) {
      throw new Error(`Harbour House ${line} must follow interiorTier, not a line lock`);
    }
    const regularInterior = interiorQuote("Harbour House", line, 180, false);
    const introInterior = interiorQuote("Harbour House", line, 180, true);
    if (regularInterior !== 100 || introInterior !== 80) {
      throw new Error(
        `Harbour House ${line} interior ${regularInterior}/${introInterior}, expected 100/80`
      );
    }
    if (firstServicePrice(180) !== 144) {
      throw new Error(`Harbour House ${line} first service left $144`);
    }
  }
  assertPrice("Harbour House", "10", 180);
  assertPrice("Harbour House", "14", 200);
  assertPrice("Harbour House", "15", 220);
  assertPrice("Harbour House", "16", 220);
});

check("Nov 21 2026 Epic Residences Miami exterior rates", () => {
  const unchanged: Record<string, number> = {
    "01": 320,
    "02": 320,
    "03": 280,
    "04": 280,
    "05": 180,
    "06": 180,
    "07": 320,
    "08": 320,
  };
  for (const [line, price] of Object.entries(unchanged)) {
    assertPrice("Epic Residences Miami", line, price);
  }
  const raised = ["09", "10", "11", "12", "13", "14"];
  for (const line of raised) {
    assertPrice("Epic Residences Miami", line, 180);
    if (preservedRegularInterior["Epic Residences Miami"]?.[line] != null) {
      throw new Error(`Epic Residences Miami ${line} must follow interiorTier, not a line lock`);
    }
    const regularInterior = interiorQuote("Epic Residences Miami", line, 180, false);
    const introInterior = interiorQuote("Epic Residences Miami", line, 180, true);
    if (regularInterior !== 100 || introInterior !== 80) {
      throw new Error(
        `Epic Residences Miami ${line} interior ${regularInterior}/${introInterior}, expected 100/80`
      );
    }
    if (firstServicePrice(linesOf("Epic Residences Miami")[line]) !== 144) {
      throw new Error(`Epic Residences Miami ${line} first service left $144`);
    }
  }
});

check("Flamingo South Beach towers keep flyer prices and new tower lines", () => {
  const south = "Flamingo South Beach South Tower";
  const center = "Flamingo South Beach Center Tower";
  const north = "Flamingo South Beach North Tower";
  const names = Object.keys(pricing);

  const flyer: Record<string, number> = {
    "Collins A": 320,
    "Drexel A": 180,
    "Drexel B": 180,
    "Drexel D": 180,
    "Drexel F": 180,
    "Lenox A": 180,
    "Lenox B": 180,
    "Lenox C": 180,
    "Lenox D": 180,
    "Lenox G": 220,
    "Lenox H": 200,
    "Sheridan A": 240,
    "Sheridan B": 220,
    "Sheridan C": 220,
    "Sheridan D": 240,
  };
  const centerLines: Record<string, number> = {
    "01-Dunes/Surf EB": 190,
    "02-Dunes/Surf 2J": 250,
    "03+09-Dunes/Surf 1C": 190,
    "04+08+10-Dunes/Surf 2J": 240,
    "05-Dunes 2N": 280,
    "05-Dunes/Surf 1I": 200,
    "06-Dunes/Surf EA": 180,
    "07-Dunes/Surf 2C": 230,
    "11-Dunes/Surf 1G": 200,
    "12-Surf 2A/2B": 230,
    "Dunes 2E": 240,
    "Surf 2L": 260,
    "Surf 3A": 360,
    "City Villas 3B": 380,
    "City Villas 3A": 300,
    "City Villas 2J": 240,
    "City Villas 2I": 240,
    "City Villas 2B": 230,
    "City Villas 2D": 240,
    "City Villas 2K": 260,
    "City Villas 1C": 190,
    "City Villas 1E": 190,
    "City Villas 1F": 200,
    "City Villas 1B": 190,
    "Bay Villas 1D": 190,
    "Bay Villas 1A": 200,
    "Bay Villas 2F": 240,
    "Bay Villas 2G": 250,
    "The Towns 1J": 220,
    "The Towns 2A": 260,
  };
  const northLines: Record<string, number> = {
    "02-Sunset Villas 3A": 260,
    "04-Horizon 1J": 190,
    "04-Sunset Villas 2L": 220,
    "05-Horizon 1F": 190,
    "05-Sunset Villas 2D": 220,
    "06-Sunset Villas 2M": 220,
    "10-Horizon 1E": 180,
    "14-Horizon 1L": 200,
    "17-Gardens 2K": 210,
    "22-Gardens 1O": 180,
    "23-Gardens 1P": 180,
    "27-Park 2F": 210,
    "29-Park 3B": 260,
    "30-Park 1R": 190,
    "Horizon 1B": 180,
    "Horizon 1C": 180,
    "Horizon 1G": 180,
    "Horizon 1I": 190,
    "Horizon 1N": 210,
    "Horizon 1Q": 220,
    "Horizon 2B": 210,
    "Horizon 2E": 240,
    "Horizon 2O": 240,
    "Gardens 1A": 180,
    "Gardens 1K": 180,
    "Gardens 1M": 180,
    "Gardens 1D": 180,
    "Gardens 2A": 200,
    "Park 1M": 180,
    "Park 1S": 190,
    "Park 2G": 210,
    "Park 2J": 210,
    "Park 2N": 200,
    "Sunset Villas 2C": 200,
    "Sunset Villas 2K": 220,
    "City Lofts 2I": 210,
    "City Lofts 3G": 300,
    "City Lofts 3I": 300,
    "Sunset Villas Penthouse 3Q/3R/3S/3T": 320,
    "Bay Lofts 3D": 380,
    "Bay Lofts 5A": 450,
  };

  function assertLines(building: string, expected: Record<string, number>) {
    const actual = linesOf(building);
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    if (actualKeys.join("|") !== expectedKeys.join("|")) {
      throw new Error(`${building} lines drifted: ${actualKeys.join(", ")}`);
    }
    for (const line of expectedKeys) {
      assertPrice(building, line, expected[line]);
      if (preservedRegularInterior[building]?.[line] != null) {
        throw new Error(`${building} ${line} must follow interiorTier, not a line lock`);
      }
      const regularInterior = interiorQuote(building, line, expected[line], false);
      const introInterior = interiorQuote(building, line, expected[line], true);
      if (regularInterior !== interiorTier(expected[line])) {
        throw new Error(`${building} ${line} interior left the balcony tier`);
      }
      if (introInterior !== firstServicePrice(regularInterior)) {
        throw new Error(`${building} ${line} intro interior left 20% off the tier`);
      }
      if (firstServicePrice(expected[line]) !== Math.round(expected[line] * 0.8)) {
        throw new Error(`${building} ${line} first service left the shared 20% rate`);
      }
    }
  }

  assertLines(south, flyer);
  assertLines(center, centerLines);
  assertLines(north, northLines);

  for (const line of Object.keys(flyer)) {
    assertAbsent(center, line);
    assertAbsent(north, line);
  }
  if (pricing[south]?.address !== "Flamingo South Beach I Condominium, 1500 Bay Rd") {
    throw new Error(`South Tower address is ${pricing[south]?.address}`);
  }
  for (const building of [center, north]) {
    if (pricing[building]?.address !== "Flamingo Point, 1508 Bay Rd") {
      throw new Error(`${building} address is ${pricing[building]?.address}`);
    }
  }
  if (matchCatalogBuilding(names, south) !== south) throw new Error("South Tower key did not resolve");
  if (matchCatalogBuilding(names, center) !== center) throw new Error("Center Tower key did not resolve");
  if (matchCatalogBuilding(names, north) !== north) throw new Error("North Tower key did not resolve");
  if (matchCatalogBuilding(names, "  flamingo south beach center tower  ") !== center) {
    throw new Error("old Center Tower link did not resolve");
  }
  if (matchCatalogBuilding(names, "flamingo south beach north tower") !== north) {
    throw new Error("old North Tower link did not resolve");
  }
  if (matchCatalogBuilding(names, "Flamingo South Beach") !== null) {
    throw new Error("Flamingo South Beach must not prefix-match a tower");
  }

  if (interiorTier(260) !== 150 || interiorTier(380) !== 225 || interiorTier(450) !== 225) {
    throw new Error(
      `interiorTier moved: 260→${interiorTier(260)}, 380→${interiorTier(380)}, 450→${interiorTier(450)}`
    );
  }
  assertPrice(center, "Surf 2L", 260);
  assertPrice(center, "City Villas 3B", 380);
  assertPrice(north, "Bay Lofts 5A", 450);
  if (firstServicePrice(260) !== 208 || firstServicePrice(380) !== 304 || firstServicePrice(450) !== 360) {
    throw new Error("first-service math for 260/380/450 changed");
  }
});

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("exterior line rate guard passed");
