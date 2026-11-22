"use client";

import { track } from "@vercel/analytics";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { UtmParams } from "../lib/batchUtm";
import { bookFailureReason, preppyJsonp } from "../lib/preppyJsonp";
import { SCHEDULER_EXEC_URL } from "../lib/schedulerExec";
import {
  buildStorefrontBookQuery,
  isStorefrontEmail,
  isStorefrontPhone,
  storefrontMailto,
  type StorefrontBookInput,
} from "../lib/storefrontBooking";
import { STOREFRONT_COPY } from "../lib/storefrontCopy";
import {
  STOREFRONT_BUSINESS_TYPES,
  businessTypeLabel,
  storefrontText,
  type StorefrontBusinessType,
  type StorefrontPrefill,
} from "../lib/storefrontPrefill";
import {
  isStorefrontSlot,
  storefrontSlotsFromAvailability,
  type StorefrontSlot,
} from "../lib/slotRules";

type TrackData = Record<string, string | number | boolean | null>;
type Phase = "form" | "done";

function safeTrack(name: string, data?: TrackData) {
  try {
    const result = track(name, data) as unknown;
    if (result && typeof (result as Promise<unknown>).catch === "function") {
      void (result as Promise<unknown>).catch(() => {});
    }
  } catch {
    // Analytics must never block a booking.
  }
}

function Field({
  label,
  value,
  onChange,
  type,
  autoComplete,
  inputMode,
  maxLength,
  name,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel";
  autoComplete: string;
  inputMode?: "text" | "email" | "tel";
  maxLength?: number;
  name: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] uppercase tracking-[0.18em] text-[#5A6972]">{label}</span>
      <input
        name={name}
        type={type ?? "text"}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full max-w-full rounded-2xl border border-[#E6DED4] bg-[#FBFAF8] px-4 py-3 text-base text-[#0D1B24] outline-none focus:border-[#0F7C82] focus:bg-white"
      />
    </label>
  );
}

export default function StorefrontBooking({
  prefill,
  utm,
}: {
  prefill: StorefrontPrefill;
  utm: UtmParams;
}) {
  const [businessType, setBusinessType] = useState<StorefrontBusinessType | "">(prefill.businessType);
  const [yourName, setYourName] = useState("");
  const [businessName, setBusinessName] = useState(prefill.business);
  const [address, setAddress] = useState(prefill.address);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [slotState, setSlotState] = useState<"loading" | "loaded" | "error">("loading");
  const [slots, setSlots] = useState<StorefrontSlot[]>([]);
  const [chosen, setChosen] = useState<StorefrontSlot | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [sending, setSending] = useState(false);
  const [showError, setShowError] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [failedInput, setFailedInput] = useState<StorefrontBookInput | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("preppy-cormorant")) return;
    const link = document.createElement("link");
    link.id = "preppy-cormorant";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap";
    document.head.appendChild(link);
  }, []);

  const loadSlots = useCallback(async () => {
    setSlotState("loading");
    setSlots([]);
    setChosen(null);
    try {
      const data = await preppyJsonp(SCHEDULER_EXEC_URL + "?mode=availability");
      const read = storefrontSlotsFromAvailability(data, Date.now());
      if (read.state === "error") {
        setSlotState("error");
        return;
      }
      setSlots(read.slots);
      setSlotState("loaded");
    } catch {
      setSlotState("error");
    }
  }, []);

  useEffect(() => {
    safeTrack("storefront_view");
    void loadSlots();
  }, [loadSlots]);

  const groups = useMemo(() => {
    const rows: { day: string; slots: StorefrontSlot[] }[] = [];
    for (const slot of slots) {
      const last = rows[rows.length - 1];
      if (!last || last.day !== slot.day) rows.push({ day: slot.day, slots: [slot] });
      else last.slots.push(slot);
    }
    return rows;
  }, [slots]);

  const draft = (): StorefrontBookInput | null => {
    const name = storefrontText(yourName);
    const business = storefrontText(businessName);
    const street = storefrontText(address);
    const typeLabel = businessTypeLabel(businessType);
    if (!chosen || !businessType || !typeLabel || !name || !business || !street) return null;
    if (!isStorefrontEmail(email) || !isStorefrontPhone(phone)) return null;
    return {
      start: chosen.start,
      slotLabel: chosen.label,
      business,
      businessType: typeLabel,
      address: street,
      name,
      email: email.trim(),
      phone: phone.trim(),
      utm,
    };
  };

  const problems: string[] = [];
  if (attempted) {
    if (!businessType) problems.push(STOREFRONT_COPY.pickType);
    if (!chosen) problems.push(STOREFRONT_COPY.pickSlot);
    if (!storefrontText(yourName)) problems.push(STOREFRONT_COPY.needName);
    if (!storefrontText(businessName)) problems.push(STOREFRONT_COPY.needBusiness);
    if (!storefrontText(address)) problems.push(STOREFRONT_COPY.needAddress);
    if (!isStorefrontEmail(email)) problems.push(STOREFRONT_COPY.needEmail);
    if (!isStorefrontPhone(phone)) problems.push(STOREFRONT_COPY.needPhone);
  }

  const fallback = draft() ?? failedInput;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setShowError(false);
    const input = draft();
    if (!input || !chosen) return;
    if (!isStorefrontSlot(input.start, Date.now())) {
      setFailedInput(input);
      setChosen(null);
      setShowError(true);
      safeTrack("storefront_error", { reason: "not-ok" });
      void loadSlots();
      return;
    }
    setSending(true);
    safeTrack("storefront_submit");
    try {
      const res = (await preppyJsonp(
        `${SCHEDULER_EXEC_URL}?${buildStorefrontBookQuery(input).toString()}`
      )) as { ok?: boolean } | null;
      if (res && res.ok) {
        safeTrack("storefront_success");
        setPhase("done");
      } else {
        setFailedInput(input);
        safeTrack("storefront_error", { reason: "not-ok" });
        setShowError(true);
      }
    } catch (err) {
      const reason = bookFailureReason(err);
      setFailedInput(input);
      safeTrack("storefront_error", { reason });
      setShowError(true);
    } finally {
      setSending(false);
    }
  }

  if (phase === "done" && chosen) {
    return (
      <main className="min-h-screen overflow-x-clip bg-[#F5F1EA] px-4 py-8 text-[#0D1B24]">
        <div className="mx-auto w-full max-w-[460px]">
          <p
            className="text-center text-4xl text-[#0D1B24]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400 }}
          >
            {STOREFRONT_COPY.brand}
          </p>
          <div
            data-storefront-confirmation
            className="mt-6 rounded-[28px] border border-[#E8E0D6] bg-white px-5 py-8 text-center shadow-[0_12px_40px_rgba(13,27,36,0.08)]"
          >
            <p className="text-[22px] leading-snug text-[#0D1B24]">{STOREFRONT_COPY.confirmation}</p>
            <p className="mt-4 text-[18px] font-medium">{chosen.day}</p>
            <p className="mt-1 text-[18px] font-medium">{chosen.time}</p>
            <p className="mt-4 text-[16px] text-[#243740]">{STOREFRONT_COPY.price}</p>
            <p className="mt-1 text-[16px] text-[#243740]">{STOREFRONT_COPY.planLine}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[#F5F1EA] px-4 py-7 text-[#0D1B24]">
      <div className="mx-auto w-full max-w-[460px]">
        <header className="mb-5 text-center">
          <p
            className="text-4xl leading-none"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400 }}
          >
            {STOREFRONT_COPY.brand}
          </p>
          <h1 className="mt-3 text-[28px] font-medium leading-tight tracking-tight text-[#243740]">
            {STOREFRONT_COPY.title}
          </h1>
          <p className="mt-1 text-[15px] text-[#5E6C75]">{STOREFRONT_COPY.subtitle}</p>
        </header>

        <form
          data-storefront-form
          onSubmit={onSubmit}
          className="space-y-5 overflow-hidden rounded-[28px] border border-[#E8E0D6] bg-white p-5 shadow-[0_12px_40px_rgba(13,27,36,0.08)]"
          noValidate
        >
          <fieldset>
            <legend className="mb-2 text-[12px] uppercase tracking-[0.18em] text-[#5A6972]">
              {STOREFRONT_COPY.businessTypeLabel}
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={STOREFRONT_COPY.businessTypeLabel}>
              {STOREFRONT_BUSINESS_TYPES.map((type) => {
                const selected = businessType === type.value;
                return (
                  <label
                    key={type.value}
                    className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-4 text-[15px] font-medium ${
                      selected
                        ? "border-[#0F7C82] bg-white text-[#0D1B24] shadow-[0_6px_20px_rgba(15,124,130,0.12)]"
                        : "border-[#E6DED4] bg-[#FBFAF8] text-[#4A5A64]"
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="businessType"
                      value={type.value}
                      checked={selected}
                      onChange={() => setBusinessType(type.value)}
                    />
                    {type.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <section data-storefront-plan className="rounded-2xl border border-[#EAE1D7] bg-[#FCFAF7] px-4 py-4">
            <p data-storefront-price className="text-[28px] font-medium leading-tight text-[#0D1B24]">
              {STOREFRONT_COPY.price}{" "}
              <span className="text-[16px] font-medium leading-snug text-[#243740]">
                {STOREFRONT_COPY.planLine}
              </span>
            </p>
            <p className="mt-2 text-[15px] leading-snug text-[#243740]">{STOREFRONT_COPY.larger}</p>
            <p className="mt-2 text-[15px] font-medium text-[#0D1B24]">{STOREFRONT_COPY.insured}</p>
          </section>

          <fieldset>
            <legend className="text-[12px] uppercase tracking-[0.18em] text-[#5A6972]">
              {STOREFRONT_COPY.firstVisit}
            </legend>
            <p className="mt-1 text-[14px] text-[#5E6C75]">{STOREFRONT_COPY.slotHint}</p>
            {slotState === "loading" ? (
              <p className="mt-3 text-[15px] text-[#5E6C75]">{STOREFRONT_COPY.loadingSlots}</p>
            ) : slotState === "error" ? (
              <div className="mt-3">
                <p className="text-[14px] leading-relaxed text-[#5E6C75]">{STOREFRONT_COPY.error}</p>
                <button
                  type="button"
                  onClick={() => {
                    void loadSlots();
                  }}
                  className="mt-3 min-h-11 w-full rounded-2xl border border-[#D8CEBF] px-4 py-3 text-[14px] font-medium"
                >
                  {STOREFRONT_COPY.retry}
                </button>
              </div>
            ) : groups.length === 0 ? (
              <p className="mt-3 text-[15px] leading-relaxed text-[#5E6C75]">{STOREFRONT_COPY.noSlots}</p>
            ) : (
              <div className="mt-3 space-y-4">
                {groups.map((group) => (
                  <div key={group.day}>
                    <p className="text-[13px] font-medium text-[#5A6972]">{group.day}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {group.slots.map((slot) => {
                        const selected = chosen?.start === slot.start;
                        return (
                          <button
                            key={slot.start}
                            type="button"
                            data-slot-start={slot.start}
                            aria-pressed={selected}
                            onClick={() => {
                              setChosen(slot);
                              setShowError(false);
                              safeTrack("storefront_slot_selected");
                            }}
                            className={`min-h-11 rounded-xl border px-3 text-[15px] font-medium ${
                              selected
                                ? "border-[#0F7C82] bg-white text-[#0D1B24]"
                                : "border-[#E7DED3] bg-[#FBFAF8] text-[#0D1B24]"
                            }`}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </fieldset>

          <Field
            label={STOREFRONT_COPY.yourName}
            name="name"
            autoComplete="name"
            maxLength={120}
            value={yourName}
            onChange={setYourName}
          />
          <Field
            label={STOREFRONT_COPY.businessName}
            name="business"
            autoComplete="organization"
            maxLength={120}
            value={businessName}
            onChange={setBusinessName}
          />
          <Field
            label={STOREFRONT_COPY.businessAddress}
            name="address"
            autoComplete="street-address"
            maxLength={120}
            value={address}
            onChange={setAddress}
          />
          <Field
            label={STOREFRONT_COPY.email}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={120}
            value={email}
            onChange={setEmail}
          />
          <Field
            label={STOREFRONT_COPY.phone}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            value={phone}
            onChange={setPhone}
          />

          {problems.length > 0 && (
            <div className="rounded-xl bg-[#FBF6EC] px-3 py-3 text-[14px] leading-relaxed text-[#0D1B24]">
              {problems.map((problem) => (
                <p key={problem}>{problem}</p>
              ))}
            </div>
          )}

          {showError && (
            <div className="rounded-xl bg-[#FBE9E9] px-3 py-3 text-[14px] leading-relaxed text-[#9A2E2E]">
              <p>{STOREFRONT_COPY.error}</p>
              {fallback && (
                <a
                  href={storefrontMailto(fallback)}
                  className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-[#E4C8C8] bg-white px-3 text-center font-medium text-[#9A2E2E]"
                >
                  {STOREFRONT_COPY.emailFallback}
                </a>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="min-h-11 w-full rounded-2xl bg-[#103845] px-5 py-3.5 text-[16px] font-semibold text-white disabled:opacity-50"
          >
            {sending ? STOREFRONT_COPY.sending : STOREFRONT_COPY.submit}
          </button>
        </form>
      </div>
    </main>
  );
}
