// Building picker when a quote link does not name a residence.
// A matched ?building= or ?b= value is kept. Anything else stays empty so the
// widget does not price the first catalog name.

export const SELECT_BUILDING_LABEL = "Select your building";

export function initialBuildingName(matched: string | null | undefined): string {
  const name = (matched ?? "").trim();
  return name;
}

export function residentialBookingAllowed(input: {
  building: string;
  hasSlot: boolean;
  signer: string;
  phoneDigits: number;
  emailOk: boolean;
  unit: string;
}): boolean {
  return (
    input.building.trim().length > 0 &&
    input.hasSlot &&
    input.signer.trim().length >= 2 &&
    input.phoneDigits >= 10 &&
    input.emailOk &&
    input.unit.trim().length >= 1
  );
}
