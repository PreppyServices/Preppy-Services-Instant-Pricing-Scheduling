/**
 * Exterior line rates Joe confirmed for the homepage quote widget.
 *
 * The live calculator reads `pricing[building].lines[line]` from
 * data/buildings.ts. One number per line. A numeric unit uses an exact key
 * when present, otherwise the last two digits. There is no floor-band field.
 *
 * This guard locks the confirmed increases, the higher prices that stay put,
 * and the provisional lines that must not move.
 */
import { addOnPricing, pricing } from "../data/buildings.ts";
import { INTRO_INTERIOR_ADDON, INTRO_RATE } from "../lib/introPricing.ts";

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
  assertPrice("Aria Reserve South", "07", 280);
  assertPrice("Aria Reserve North", "01", 280);
  assertPrice("Aria Reserve North", "07", 280);
});

check("higher existing prices preserved", () => {
  assertPrice("Paraiso Bay", "01", 300);
  assertPrice("Paraiso Bayviews", "06", 320);
  assertPrice("One Paraiso", "01", 300);
  assertPrice("One Paraiso", "06", 300);
  assertPrice("Aria on the Bay", "12", 300);
  assertPrice("Aria on the Bay", "15", 300);
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
  assertUnit("Aria Reserve South", "1207", "07", 280);

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

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("exterior line rate guard passed");
