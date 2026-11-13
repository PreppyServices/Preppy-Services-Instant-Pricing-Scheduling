export const CONTACT_KEY = "preppy_contact";
export const JOE_PHONE_DISPLAY = "(305) 414 0305";
export const JOE_PHONE_TEL = "+13054140305";

export type ContactFields = { name: string; phone: string; email: string };

export function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

export function emailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function contactValid(input: ContactFields & { unit?: string; unitRequired?: boolean }): boolean {
  const unitOk = !input.unitRequired || !needsUnit(input.unit ?? "");
  return input.name.trim().length >= 2 && phoneDigits(input.phone).length >= 10 && emailValid(input.email) && unitOk;
}

/** A full unit has at least three digits. A bare line such as 04 still needs the unit. */
export function needsUnit(unit: string): boolean {
  return phoneDigits(unit).length < 3;
}

export function formatPhone(value: string): string {
  const digits = phoneDigits(value);
  if (digits.length !== 10) return value.trim();
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function readStoredContact(storage: { getItem(key: string): string | null } | null): ContactFields {
  const empty = { name: "", phone: "", email: "" };
  if (!storage) return empty;
  try {
    const data = JSON.parse(storage.getItem(CONTACT_KEY) || "{}") as Record<string, unknown>;
    return {
      name: typeof data.name === "string" ? data.name : "",
      phone: typeof data.phone === "string" ? data.phone : "",
      email: typeof data.email === "string" ? data.email : "",
    };
  } catch {
    return empty;
  }
}

export function preferContact(fromLink: ContactFields, stored: ContactFields): ContactFields {
  return {
    name: fromLink.name.trim() || stored.name,
    phone: fromLink.phone.trim() || stored.phone,
    email: fromLink.email.trim() || stored.email,
  };
}

export function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
