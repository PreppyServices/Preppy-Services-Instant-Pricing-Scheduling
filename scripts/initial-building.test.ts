/**
 * Organic visits start with no building. Deep links still resolve.
 * An unmatched building param stays empty and keeps the unmatched flag.
 */
import { resolveLandingBuilding } from "../lib/catalogBuilding.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const names = ["Gran Paraiso", "1000 Museum", "One Paraiso"];
const lineExists = (building: string, line: string) => building === "Gran Paraiso" && line === "01";

const organic = resolveLandingBuilding(names, "", lineExists);
check(organic.building === "", "organic visit starts with an empty building");
check(organic.buildingUnmatched === false, "organic visit is not unmatched");
check(organic.line === "", "organic visit has no line");

const flyer = resolveLandingBuilding(names, "?flyer=1", lineExists);
check(flyer.building === "", "flyer landing without a building param stays empty");
check(flyer.buildingUnmatched === false, "flyer landing is not an unmatched building");

const deep = resolveLandingBuilding(names, "?b=Gran%20Paraiso&line=01", lineExists);
check(deep.building === "Gran Paraiso", "deep link resolves Gran Paraiso");
check(deep.line === "01", "deep link line 01 still resolves");
check(deep.buildingUnmatched === false, "a matched deep link is not unmatched");

const byBuilding = resolveLandingBuilding(names, "?building=Gran%20Paraiso&line=01", lineExists);
check(byBuilding.building === "Gran Paraiso", "building param still resolves");
check(byBuilding.line === "01", "building param keeps line 01");

const unmatched = resolveLandingBuilding(names, "?b=Not%20A%20Tower", lineExists);
check(unmatched.building === "", "unmatched param stays empty");
check(unmatched.buildingUnmatched === true, "unmatched param sets the unmatched flag");
check(unmatched.buildingParamRaw === "Not A Tower", "unmatched param keeps the raw name");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("initial building guard passed");
