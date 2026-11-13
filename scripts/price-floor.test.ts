/**
 * Quote widget price floor. Regular line price stays at or above $150.
 * First service is the shared 20% rate, so it stays at or above $120.
 * Lines already above the floor are not rewritten by this guard.
 */
import { pricing } from "../data/buildings.ts";
import { firstServicePrice } from "../lib/introPricing.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

let lines = 0;
let buildings = 0;
for (const [building, entry] of Object.entries(pricing)) {
  buildings += 1;
  for (const [line, regular] of Object.entries(entry.lines)) {
    lines += 1;
    const first = firstServicePrice(regular);
    if (regular < 150) {
      failures.push(`${building} ${line} regular $${regular} is below $150`);
    }
    if (first < 120) {
      failures.push(`${building} ${line} first service $${first} is below $120`);
    }
  }
}

check(buildings === 422, `building count changed to ${buildings}`);
check(lines > 3000, `line count looks short: ${lines}`);

const granPh = pricing["Gran Paraiso"]?.lines["PH01"];
check(granPh === 550, `Gran Paraiso PH01 is ${granPh}, expected 550`);
check(firstServicePrice(550) === 440, "Gran Paraiso PH01 first service moved");

const one = pricing["One Paraiso"]?.lines ?? {};
check(one["01"] === 340 && firstServicePrice(340) === 272, "One Paraiso 01 moved");
check(one["06"] === 340 && firstServicePrice(340) === 272, "One Paraiso 06 moved");
check(one["03"] === 280 && firstServicePrice(280) === 224, "One Paraiso 03 moved");
check(one["04"] === 280 && firstServicePrice(280) === 224, "One Paraiso 04 moved");

if (failures.length) {
  console.error(failures.slice(0, 30).join("\n"));
  if (failures.length > 30) console.error(`... ${failures.length - 30} more`);
  process.exit(1);
}

console.log(`price floor guard passed (${lines} lines, ${buildings} buildings)`);
