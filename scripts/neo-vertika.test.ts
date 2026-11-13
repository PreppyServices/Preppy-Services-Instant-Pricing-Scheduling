/**
 * Neo Vertika floor-band quotes, plus the last-two-digit rule for buildings
 * that do not declare floorBands.
 */
import { pricing, verifiedBuildings } from "../data/buildings.ts";
import { firstServicePrice, interiorTier, quoteInteriorAddOn } from "../lib/introPricing.ts";
import { resolveUnitQuote as resolveAgainst } from "../lib/lineResolver.ts";

function resolveUnitQuote(building: string, unit: string) {
  return resolveAgainst(building, unit, pricing);
}

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const quotes: Array<[string, number | null, number | null]> = [
  ["1123", 150, 120],
  ["1934", 150, 120],
  ["1029", 150, 120],
  ["501", 190, 152],
  ["401", 190, 152],
  ["305", 230, 184],
  ["306", 230, 184],
  ["1908", 355, 284],
  ["2008", 355, 284],
  ["2507", 355, 284],
  ["PHI06", 355, 284],
  ["PHII04", 355, 284],
  ["2101", 330, 264],
  ["PHI01", 330, 264],
  ["2520", 330, 264],
  ["2327", 290, 232],
  ["3126", 290, 232],
  ["2131", 290, 232],
  ["2809", 440, 352],
  ["3110", 440, 352],
  ["PHI10", 550, 440],
  ["PHII12", 550, 440],
  ["3610", 550, 440],
  ["PHI26", 550, 440],
  ["101", null, null],
];

for (const [unit, regular, first] of quotes) {
  const resolved = resolveUnitQuote("Neo Vertika", unit);
  const actual = resolved.status === "priced" ? resolved.regular : null;
  check(actual === regular, `${unit}: regular ${actual}, expected ${regular}`);
  if (regular != null && first != null) {
    check(
      resolved.status === "priced",
      `${unit}: expected a priced quote`
    );
    if (resolved.status === "priced") {
      const intro = firstServicePrice(resolved.regular);
      check(intro === first, `${unit}: first service ${intro}, expected ${first}`);
    }
  }
}

const low = resolveUnitQuote("Neo Vertika", "101");
check(low.status === "call", `101 should ask for a call, got ${low.status}`);
check(resolveUnitQuote("Neo Vertika", "201").status === "call", "floor 2 should ask for a call");

const phi10 = resolveUnitQuote("Neo Vertika", "phi10");
check(phi10.status === "priced" && phi10.line === "10", "PHI10 should be line 10");
const phii04 = resolveUnitQuote("Neo Vertika", "PHII04");
check(phii04.status === "priced" && phii04.line === "04" && phii04.source === "also", "PHII04 should match also as line 04");
const unit2809 = resolveUnitQuote("Neo Vertika", "2809");
check(
  unit2809.status === "priced" && unit2809.line === "09" && unit2809.source === "floor-band",
  "2809 should match floor 28 line 09"
);

const neo = pricing["Neo Vertika"];
check(neo?.address === "690 SW 1st Ct, Miami 33130", "Neo Vertika address missing");
check(verifiedBuildings.includes("Neo Vertika"), "Neo Vertika missing from verifiedBuildings");
check(Object.prototype.hasOwnProperty.call(pricing, "Neo Vertika"), "Neo Vertika missing from pricing");

const boundaries: Array<[number, number, number]> = [
  [150, 50, 40],
  [151, 100, 80],
  [250, 100, 80],
  [251, 150, 120],
  [365, 150, 120],
  [366, 225, 180],
  [550, 225, 180],
  [551, 325, 260],
  [850, 325, 260],
  [851, 450, 360],
  [1200, 450, 360],
];
for (const [price, regularAddon, introAddon] of boundaries) {
  check(interiorTier(price) === regularAddon, `tier ${price}: ${interiorTier(price)}, expected ${regularAddon}`);
  check(
    quoteInteriorAddOn(price, false) === regularAddon,
    `regular add-on ${price}: ${quoteInteriorAddOn(price, false)}`
  );
  check(
    quoteInteriorAddOn(price, true) === introAddon,
    `intro add-on ${price}: ${quoteInteriorAddOn(price, true)}, expected ${introAddon}`
  );
  check(introAddon === firstServicePrice(regularAddon), `intro add-on ${price} is not 20% off`);
}

function priced(building: string, unit: string) {
  const resolved = resolveUnitQuote(building, unit);
  if (resolved.status !== "priced") return null;
  return resolved;
}

const granPh = priced("Gran Paraiso", "PH01");
check(granPh?.line === "PH01" && granPh.regular === 550 && granPh.source === "exact", "Gran Paraiso PH01 changed");
check(priced("Gran Paraiso", "PHI10") === null, "Gran Paraiso PHI10 should stay unquoted");
const uph = priced("Paraiso Bay", "UPH01");
check(uph?.line === "UPH01" && uph.regular === 450 && uph.source === "exact", "Paraiso Bay UPH01 changed");
const one = priced("One Paraiso", "1201");
check(one?.line === "01" && one.regular === 340 && one.source === "last2", "One Paraiso 1201 changed");
const aria = priced("Aria Reserve North", "5602");
check(aria?.line === "02" && aria.regular === 220 && aria.source === "last2", "Aria Reserve North 5602 changed");
const missoni = priced("Missoni Baia", "3802");
check(missoni?.line === "3802" && missoni.regular === 330 && missoni.source === "exact", "Missoni Baia 3802 changed");

const chateauQuotes: Array<[string, number | null, number | null]> = [
  ["904", 295, 236],
  ["703", 230, 184],
  ["1201", 365, 292],
  ["1602", 550, 440],
  ["2003", 365, 292],
  ["2302", 550, 440],
  ["2802", 450, 360],
  ["1001", 550, 440],
  ["1203", 850, 680],
  ["2201", 850, 680],
  ["2401", 1200, 960],
  ["3101", 650, 520],
  ["PH3201", 1200, 960],
  ["3201", 1200, 960],
  ["2502", 365, 292],
  ["201", null, null],
];

for (const [unit, regular, first] of chateauQuotes) {
  const resolved = resolveUnitQuote("Chateau Beach", unit);
  const actual = resolved.status === "priced" ? resolved.regular : null;
  check(actual === regular, `Chateau ${unit}: regular ${actual}, expected ${regular}`);
  if (regular != null) {
    check(resolved.status === "priced", `Chateau ${unit}: expected a priced quote`);
    if (resolved.status === "priced") {
      const intro = firstServicePrice(resolved.regular);
      check(intro === first, `Chateau ${unit}: first service ${intro}, expected ${first}`);
    }
  }
}

check(resolveUnitQuote("Chateau Beach", "201").status === "call", "Chateau 201 should ask for a call");
check(resolveUnitQuote("Chateau Beach", "PH 3201").status === "priced", "PH 3201 should price");
check(
  resolveUnitQuote("Chateau Beach", "PH 3201").status === "priced" &&
    resolveUnitQuote("Chateau Beach", "ph 3201").status === "priced" &&
    (resolveUnitQuote("Chateau Beach", "PH 3201") as { regular: number }).regular === 1200,
  "PH 3201 with a space should be 1200"
);
check(priced("Chateau Beach", "1002")?.regular === 365, "1002 should use the override, not the line 02 band");
check(priced("Chateau Beach", "1002")?.source === "override", "1002 should be an override");
check(priced("Chateau Beach", "403")?.regular === 550, "403 should use the override, not the line 03 band");
check(priced("Chateau Beach", "1301") === null, "floor 13 line 01 should be skipped");
check(priced("Chateau Beach", "1302") === null, "floor 13 line 02 should be skipped");
check(priced("Chateau Beach", "1401")?.regular === 365, "1401 should stay on the line 01 band");
check(pricing["Chateau Beach"]?.penthouse === true, "Chateau Beach penthouse flag");
check(quoteInteriorAddOn(1200, false) === 450, "Chateau 1200 interior tier");
check(quoteInteriorAddOn(850, true) === 260, "Chateau 850 intro interior");
const neo2809 = resolveUnitQuote("Neo Vertika", "2809");
check(
  neo2809.status === "priced" && quoteInteriorAddOn(neo2809.regular, false) === 225,
  "2809 interior add-on should be 225"
);
const neoPhi = resolveUnitQuote("Neo Vertika", "PHI10");
check(
  neoPhi.status === "priced" && quoteInteriorAddOn(neoPhi.regular, false) === 225,
  "PHI10 interior add-on should be 225"
);
for (const line of ["01", "02", "03", "04", "05", "06"]) {
  check(
    !Object.prototype.hasOwnProperty.call(pricing["Chateau Beach"]?.lines ?? {}, line),
    `Chateau Beach line ${line} should not keep the old flat price`
  );
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("neo vertika floor bands passed");
