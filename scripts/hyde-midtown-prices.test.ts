/**
 * Hyde Midtown Miami balcony prices from Joe's 11/19 flyer approval.
 * First service is the shared 20% rate. Penthouse interiors are overrides.
 * Three Tequesta Point, One Tequesta Point, and Two Tequesta Point stay put.
 */
import { pricing } from "../data/buildings.ts";
import { resolveUnitQuote } from "../lib/lineResolver.ts";
import {
  firstServicePrice,
  interiorTier,
  lineInteriorQuote,
  quoteInteriorAddOn,
} from "../lib/introPricing.ts";

const HYDE = "Hyde Midtown Miami";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

type Row = {
  line: string;
  regular: number;
  first: number;
  interior: number;
  interiorFirst: number;
};

const hydeRows: Row[] = [
  { line: "01", regular: 220, first: 176, interior: 100, interiorFirst: 80 },
  { line: "02", regular: 260, first: 208, interior: 150, interiorFirst: 120 },
  { line: "03", regular: 180, first: 144, interior: 100, interiorFirst: 80 },
  { line: "04", regular: 280, first: 224, interior: 150, interiorFirst: 120 },
  { line: "05", regular: 180, first: 144, interior: 100, interiorFirst: 80 },
  { line: "06", regular: 180, first: 144, interior: 100, interiorFirst: 80 },
  { line: "06A", regular: 180, first: 144, interior: 100, interiorFirst: 80 },
  { line: "07", regular: 260, first: 208, interior: 150, interiorFirst: 120 },
  { line: "08", regular: 320, first: 256, interior: 150, interiorFirst: 120 },
  { line: "09", regular: 220, first: 176, interior: 100, interiorFirst: 80 },
  { line: "10", regular: 180, first: 144, interior: 100, interiorFirst: 80 },
  { line: "11", regular: 180, first: 144, interior: 100, interiorFirst: 80 },
  { line: "12", regular: 180, first: 144, interior: 100, interiorFirst: 80 },
  { line: "14", regular: 180, first: 144, interior: 100, interiorFirst: 80 },
  { line: "15", regular: 180, first: 144, interior: 100, interiorFirst: 80 },
  { line: "16", regular: 240, first: 192, interior: 100, interiorFirst: 80 },
  { line: "PH04", regular: 1350, first: 1080, interior: 850, interiorFirst: 680 },
];

function sortedLines(lines: Record<string, number>): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(lines).sort(([a], [b]) => a.localeCompare(b)))
  );
}

function assertCatalog(building: string, expected: Record<string, number>) {
  const actual = pricing[building]?.lines;
  check(!!actual, `missing ${building}`);
  if (!actual) return;
  check(
    sortedLines(actual) === sortedLines(expected),
    `${building} lines changed: ${sortedLines(actual)}`
  );
}

const hyde = pricing[HYDE];
check(!!hyde, "Hyde Midtown Miami missing");
check(pricing["Hyde Midtown"] === undefined, "Hyde key must stay Hyde Midtown Miami");
check(hyde?.penthouse === false, "Hyde penthouse flag changed");
check(
  sortedLines(hyde?.interiorOverrides ?? {}) === sortedLines({ PH04: 850 }),
  `Hyde interior overrides changed: ${JSON.stringify(hyde?.interiorOverrides)}`
);
check(
  hyde?.penthouseDefault?.regular === 950 && hyde?.penthouseDefault?.interior === 650,
  `Hyde penthouse default changed: ${JSON.stringify(hyde?.penthouseDefault)}`
);

for (const row of hydeRows) {
  const regular = hyde?.lines[row.line];
  const first = regular == null ? null : firstServicePrice(regular);
  const interior = lineInteriorQuote(hyde, row.line, row.regular, false);
  const interiorFirst = lineInteriorQuote(hyde, row.line, row.regular, true);
  check(regular === row.regular, `${row.line} regular ${regular}, expected ${row.regular}`);
  check(first === row.first, `${row.line} first service ${first}, expected ${row.first}`);
  check(first === Math.round(0.8 * row.regular), `${row.line} left Math.round(0.8 * regular)`);
  check(interior === row.interior, `${row.line} interior ${interior}, expected ${row.interior}`);
  check(
    interiorFirst === row.interiorFirst,
    `${row.line} interior first ${interiorFirst}, expected ${row.interiorFirst}`
  );
  check(
    interiorFirst === firstServicePrice(row.interior),
    `${row.line} interior first left the shared 20% rate`
  );
}

check(
  sortedLines(hyde?.lines ?? {}) === sortedLines(Object.fromEntries(hydeRows.map((row) => [row.line, row.regular]))),
  "Hyde line roster changed"
);
check(hyde?.lines.PH3 === undefined, "PH3 must not be stored as its own line");
check(hyde?.lines.PH4 === undefined, "PH4 must not be stored separately from PH04");
check(interiorTier(1350) === 450, "interiorTier(1350) changed");
check(interiorTier(950) === 450, "interiorTier(950) changed");
check(lineInteriorQuote(hyde, "PH04", 1350, false) !== interiorTier(1350), "PH04 interior used interiorTier");
check(quoteInteriorAddOn(1350, false) === 450, "quoteInteriorAddOn grew a penthouse override");
check(quoteInteriorAddOn(180, false) === 100, "quoteInteriorAddOn left the 180 tier");

const tierBands: Array<[number, number]> = [
  [150, 50],
  [151, 100],
  [250, 100],
  [251, 150],
  [365, 150],
  [366, 225],
  [550, 225],
  [551, 325],
  [850, 325],
  [851, 450],
];
for (const [price, tier] of tierBands) {
  check(interiorTier(price) === tier, `interiorTier(${price}) is ${interiorTier(price)}, expected ${tier}`);
}

function priced(unit: string) {
  const resolved = resolveUnitQuote(HYDE, unit, pricing);
  check(resolved.status === "priced", `${unit} did not price: ${resolved.status}`);
  if (resolved.status !== "priced") return null;
  return resolved;
}

for (const unit of ["PH4", "PH04", "ph 4", "ph 04", "PH 4", "PH 04"]) {
  const resolved = priced(unit);
  check(resolved?.line === "PH04", `${unit} line ${resolved?.line}, expected PH04`);
  check(resolved?.regular === 1350, `${unit} regular ${resolved?.regular}, expected 1350`);
  check(resolved?.line !== "04", `${unit} fell through to line 04`);
  if (resolved) {
    check(
      lineInteriorQuote(hyde, resolved.line, resolved.regular, false) === 850,
      `${unit} interior left the PH04 override`
    );
    check(
      lineInteriorQuote(hyde, resolved.line, resolved.regular, true) === 680,
      `${unit} interior first service left 680`
    );
  }
}

for (const unit of ["4", "04", "1204", "1904"]) {
  const resolved = priced(unit);
  check(resolved?.line === "04", `${unit} line ${resolved?.line}, expected 04`);
  check(resolved?.regular === 280, `${unit} regular ${resolved?.regular}, expected 280`);
  if (resolved) {
    check(
      lineInteriorQuote(hyde, resolved.line, resolved.regular, false) === 150,
      `${unit} interior left the line 04 tier`
    );
  }
}

for (const unit of ["PH3", "ph 3", "PH 3", "PH1", "PH"]) {
  const resolved = priced(unit);
  check(resolved?.line !== "03", `${unit} fell through to line 03`);
  check(resolved?.line !== "01", `${unit} fell through to a numeric line`);
  check(resolved?.regular === 950, `${unit} regular ${resolved?.regular}, expected 950`);
  check(resolved?.source === "ph-default", `${unit} source ${resolved?.source}, expected ph-default`);
  check(!hyde?.lines[resolved?.line ?? ""], `${unit} invented a stored line ${resolved?.line}`);
  if (resolved) {
    check(
      lineInteriorQuote(hyde, resolved.line, resolved.regular, false) === 650,
      `${unit} interior ${lineInteriorQuote(hyde, resolved.line, resolved.regular, false)}, expected 650`
    );
    check(
      lineInteriorQuote(hyde, resolved.line, resolved.regular, true) === 520,
      `${unit} interior first service left 520`
    );
    check(firstServicePrice(resolved.regular) === 760, `${unit} first service left 760`);
  }
}

const line03 = priced("03");
check(line03?.line === "03" && line03.regular === 180, "Hyde 03 left 180");
const unit1203 = priced("1203");
check(unit1203?.line === "03" && unit1203.regular === 180, "Hyde 1203 left line 03 at 180");

function unpriced(building: string, unit: string) {
  const resolved = resolveUnitQuote(building, unit, pricing);
  check(
    resolved.status === "none",
    `${building} ${unit} should not quote, got ${JSON.stringify(resolved)}`
  );
}

unpriced("Three Tequesta Point", "PH3");
unpriced("Three Tequesta Point", "PH4");
unpriced("Three Tequesta Point", "ph 4");
unpriced("Aria Reserve South", "PH4");
unpriced("One Paraiso", "PH1");
unpriced("Gran Paraiso", "PH5");

const ariaPh04 = resolveUnitQuote("Aria Reserve South", "PH04", pricing);
check(
  ariaPh04.status === "priced" && ariaPh04.line === "PH04" && ariaPh04.regular === 440,
  `Aria PH04 changed: ${JSON.stringify(ariaPh04)}`
);
const onePh01 = resolveUnitQuote("One Paraiso", "PH01", pricing);
check(
  onePh01.status === "priced" && onePh01.line === "PH01" && onePh01.regular === 420,
  `One Paraiso PH01 changed: ${JSON.stringify(onePh01)}`
);

const tequesta03 = resolveUnitQuote("Three Tequesta Point", "03", pricing);
const tequesta1203 = resolveUnitQuote("Three Tequesta Point", "1203", pricing);
check(
  tequesta03.status === "priced" && tequesta03.line === "03" && tequesta03.regular === 150,
  `Three Tequesta 03 changed: ${JSON.stringify(tequesta03)}`
);
check(
  tequesta1203.status === "priced" && tequesta1203.line === "03" && tequesta1203.regular === 150,
  `Three Tequesta 1203 changed: ${JSON.stringify(tequesta1203)}`
);

assertCatalog("Three Tequesta Point", {
  "01": 280,
  "02": 180,
  "03": 150,
  "04": 240,
  "05": 220,
  "06": 280,
});
assertCatalog("One Tequesta Point", {
  "00": 180,
  "01": 150,
  "02": 150,
  "03A": 220,
  "03B": 360,
  "04": 360,
  "05": 150,
  "06": 150,
  "07": 150,
  "08": 320,
  "09": 240,
  "10": 220,
  "11": 280,
  "12": 280,
});
assertCatalog("Two Tequesta Point", {
  "01A": 340,
  "01": 360,
  "02": 180,
  "03": 150,
  "04": 320,
  "05": 280,
  "06": 200,
  "07": 150,
  "08": 360,
});

check(Object.keys(pricing).length === 424, `building count changed to ${Object.keys(pricing).length}`);

for (const [name, entry] of Object.entries(pricing)) {
  if (name === HYDE) continue;
  check(!entry.penthouseDefault, `${name} gained a penthouse default`);
  check(!entry.interiorOverrides, `${name} gained an interior override`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Hyde Midtown flyer prices passed");
