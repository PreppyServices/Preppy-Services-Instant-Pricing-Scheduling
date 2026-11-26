/**
 * ?b= that matches a catalog building locks the line picker.
 * Unknown ?b=, ?building=, and a bare visit stay on the landing flow.
 * Intro pricing still turns on only when the link asks for it.
 */
import { resolveDeepLinkLanding } from "../lib/catalogBuilding.ts";
import { firstServicePrice, INTRO_RATE, isIntroRequest } from "../lib/introPricing.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const names = ["Gran Paraiso", "1000 Museum", "One Paraiso"];

const organic = resolveDeepLinkLanding("", names);
check(organic.mode === "landing", "no param stays on the landing flow");

const introOnly = resolveDeepLinkLanding("?intro=1", names);
check(introOnly.mode === "landing", "intro without a building stays on the landing flow");

const locked = resolveDeepLinkLanding("?b=Gran%20Paraiso&intro=1", names);
check(locked.mode === "locked" && locked.building === "Gran Paraiso", "Gran Paraiso intro link locks");

const lockedRegular = resolveDeepLinkLanding("?b=Gran%20Paraiso", names);
check(
  lockedRegular.mode === "locked" && lockedRegular.building === "Gran Paraiso",
  "Gran Paraiso without intro still locks the building"
);

const lower = resolveDeepLinkLanding("?b=gran+paraiso", names);
check(lower.mode === "locked" && lower.building === "Gran Paraiso", "building match stays case insensitive");

const unknown = resolveDeepLinkLanding("?b=Not%20A%20Real%20Building", names);
check(unknown.mode === "landing", "unknown ?b= falls back to the landing flow");

const emptyB = resolveDeepLinkLanding("?b=", names);
check(emptyB.mode === "landing", "empty ?b= falls back to the landing flow");

const alias = resolveDeepLinkLanding("?building=Gran%20Paraiso", names);
check(alias.mode === "landing", "?building= keeps the normal landing flow");

const weird = resolveDeepLinkLanding("?b=%00", names);
check(weird.mode === "landing", "a non-catalog ?b= does not throw");

const introParams = new URLSearchParams("b=Gran Paraiso&intro=1");
check(isIntroRequest(introParams, "/"), "intro=1 still requests the 20% rate");
const regularParams = new URLSearchParams("b=Gran Paraiso");
check(!isIntroRequest(regularParams, "/"), "a building param alone does not request the 20% rate");

check(INTRO_RATE === 0.8, "intro rate stays 20% off");
check(firstServicePrice(450) === 360, "20% of 450 stays 360");
check(firstServicePrice(210) === 168, "20% of 210 stays 168");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("deep link landing guard passed");
