/**
 * A quote link with no building param must not price a default residence.
 * Preselection still wins, and a residential booking cannot submit until a
 * building is chosen.
 */
import {
  SELECT_BUILDING_LABEL,
  initialBuildingName,
  residentialBookingAllowed,
} from "../lib/buildingSelection.ts";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

check(SELECT_BUILDING_LABEL === "Select your building", "empty picker label");
check(!SELECT_BUILDING_LABEL.includes("—"), "label has no em dash");
check(!SELECT_BUILDING_LABEL.includes(" - "), "label has no spaced hyphen");

check(initialBuildingName(null) === "", "missing param stays empty");
check(initialBuildingName(undefined) === "", "undefined match stays empty");
check(initialBuildingName("") === "", "blank match stays empty");
check(initialBuildingName("   ") === "", "whitespace match stays empty");
check(initialBuildingName("Gran Paraiso") === "Gran Paraiso", "building param preselects");
check(initialBuildingName("Paraiso Bayviews") === "Paraiso Bayviews", "b param name is kept");
check(initialBuildingName("Gran Paraiso") !== "1000 Museum", "preselect is not the old default");
check(initialBuildingName(null) !== "1000 Museum", "no param is not 1000 Museum");

const ready = {
  building: "Gran Paraiso",
  hasSlot: true,
  signer: "Alex",
  phoneDigits: 10,
  emailOk: true,
  unit: "101",
};

check(residentialBookingAllowed(ready), "a chosen building can book");
check(!residentialBookingAllowed({ ...ready, building: "" }), "no building cannot book");
check(!residentialBookingAllowed({ ...ready, building: "   " }), "blank building cannot book");
check(!residentialBookingAllowed({ ...ready, hasSlot: false }), "slot is still required");
check(!residentialBookingAllowed({ ...ready, signer: "A" }), "signer rule unchanged");
check(!residentialBookingAllowed({ ...ready, phoneDigits: 9 }), "phone rule unchanged");
check(!residentialBookingAllowed({ ...ready, emailOk: false }), "email rule unchanged");
check(!residentialBookingAllowed({ ...ready, unit: "" }), "unit rule unchanged");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("building selection guard passed");
