"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as React from "react";
import { pricing } from "../../data/buildings";
import { captureLandingUtm, type UtmParams } from "../../lib/batchUtm";
import type { OfferedDay, OfferedSlot } from "../../lib/booking/availability";
import { googleCalendarUrl, downloadIcs, icsContent } from "../../lib/booking/calendarFile";
import {
  CONTACT_KEY,
  JOE_PHONE_DISPLAY,
  JOE_PHONE_TEL,
  contactValid,
  emailValid,
  needsUnit,
  phoneDigits,
  preferContact,
  readStoredContact,
} from "../../lib/booking/contact";
import { readFeatureFlags } from "../../lib/booking/flags";
import { durationLabel, featureLines, t, type Lang } from "../../lib/booking/i18n";
import { readLaunch, type Launch } from "../../lib/booking/launch";
import { quoteGlass, type GlassQuote } from "../../lib/booking/quote";
import type { RequestKind } from "../../lib/booking/requestService";
import {
  clockLabel,
  dateKeyParts,
  isSunday,
  monthDates,
  monthLabel,
  partsInZone,
  weekdayLabel,
  weekdayOf,
} from "../../lib/booking/time";
import { resolveUnitToLine } from "../../lib/booking/unitLine";
import { FLYER_ASSETS, setIntroSearch } from "../../lib/introPricing";
import HolidayFlyer from "../HolidayFlyer";

type Screen = "price" | "time" | "day" | "confirm" | "success" | "request" | "sent";

const FLAGS = readFeatureFlags({
  NEXT_PUBLIC_FEATURE_PACKAGES: process.env.NEXT_PUBLIC_FEATURE_PACKAGES,
  NEXT_PUBLIC_FEATURE_GIFT: process.env.NEXT_PUBLIC_FEATURE_GIFT,
  NEXT_PUBLIC_FEATURE_HOLIDAY_PROMO: process.env.NEXT_PUBLIC_FEATURE_HOLIDAY_PROMO,
  NEXT_PUBLIC_FEATURE_DEPOSIT: process.env.NEXT_PUBLIC_FEATURE_DEPOSIT,
});

const COL: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 };

export default function BookingApp() {
  const reduce = useReducedMotion();
  const launch = React.useMemo<Launch>(() => {
    if (typeof window === "undefined") return readLaunch("", "/");
    return readLaunch(window.location.search, window.location.pathname);
  }, []);
  const stored = React.useMemo(() => {
    if (typeof window === "undefined") return { name: "", phone: "", email: "" };
    return readStoredContact(window.localStorage);
  }, []);
  const contact = preferContact(
    { name: launch.name, phone: launch.phone, email: launch.email },
    stored
  );
  const [lang, setLang] = React.useState<Lang>(launch.lang);
  const [building, setBuilding] = React.useState(launch.building);
  const [unmatched, setUnmatched] = React.useState(launch.unmatched);
  const [query, setQuery] = React.useState("");
  const [editingBuilding, setEditingBuilding] = React.useState(!launch.building);
  const [unit, setUnit] = React.useState(launch.unit);
  const [line, setLine] = React.useState(launch.line);
  const [editingUnit, setEditingUnit] = React.useState(!launch.unit);
  const [interior, setInterior] = React.useState(launch.interior);
  const [intro, setIntro] = React.useState(launch.intro);
  const [screen, setScreen] = React.useState<Screen>(launch.request ? "request" : "price");
  const [requestKind, setRequestKind] = React.useState<RequestKind | null>(
    launch.request === "pressure" ? "pressure" : launch.request === "paint" ? "paint" : null
  );
  const [days, setDays] = React.useState<OfferedDay[]>([]);
  const [moreDays, setMoreDays] = React.useState<OfferedDay[]>([]);
  const [showMore, setShowMore] = React.useState(false);
  const [commercialDates, setCommercialDates] = React.useState<string[]>([]);
  const [availState, setAvailState] = React.useState<"idle" | "loading" | "ready" | "error">("idle");
  const [slot, setSlot] = React.useState<OfferedSlot | null>(null);
  const [name, setName] = React.useState(contact.name);
  const [phone, setPhone] = React.useState(contact.phone);
  const [email, setEmail] = React.useState(contact.email);
  const [notes, setNotes] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [address, setAddress] = React.useState(launch.buildingRaw || launch.building);
  const [preferredDate, setPreferredDate] = React.useState("");
  const [photos, setPhotos] = React.useState<File[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [bookError, setBookError] = React.useState<"slot_taken" | "failed" | null>(null);
  const [preview, setPreview] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const [utm] = React.useState<UtmParams>(() => {
    if (typeof window === "undefined") return {};
    try {
      return captureLandingUtm(window.location.search, window.sessionStorage);
    } catch {
      return {};
    }
  });
  const kind = launch.kind;
  const quote = line ? quoteGlass(building, line, interior, intro, FLAGS.holidayPromo) : null;
  const lines = featureLines(FLAGS, lang);
  const names = React.useMemo(() => Object.keys(pricing), []);
  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return names.filter((item) => item.toLowerCase().includes(q)).slice(0, 8);
  }, [names, query]);
  const pricedBuilding = Boolean(building && Object.keys(pricing[building]?.lines ?? {}).length > 0);

  React.useEffect(() => {
    if (kind === "commercial") {
      if (!building) return;
    } else if (!building || !line) {
      return;
    }
    const ctrl = new AbortController();
    setAvailState("loading");
    const params = new URLSearchParams({
      b: building,
      line,
      interior: interior ? "1" : "0",
      intro: intro ? "1" : "0",
      kind,
    });
    fetch(`/api/availability?${params}`, { signal: ctrl.signal })
      .then((response) => response.json())
      .then((data) => {
        if (data.kind === "commercial") {
          setCommercialDates(data.dates ?? []);
          setAvailState("ready");
          return;
        }
        if (data.ok) {
          setDays(data.days ?? []);
          setMoreDays(data.more ?? []);
          setAvailState("ready");
          return;
        }
        setAvailState("error");
      })
      .catch((error: { name?: string }) => {
        if (error?.name === "AbortError") return;
        setAvailState("error");
      });
    return () => ctrl.abort();
  }, [building, line, interior, intro, kind, attempt]);

  function rememberContact() {
    try {
      window.localStorage.setItem(CONTACT_KEY, JSON.stringify({ name, phone, email }));
    } catch {
      // Private mode should not block the booking.
    }
  }

  function pickBuilding(next: string) {
    setBuilding(next);
    setUnmatched(false);
    setQuery("");
    setEditingBuilding(false);
    setAddress(next);
    const mapped = unit ? resolveUnitToLine(unit, next) : { line: "", source: "none" as const };
    setLine(mapped.line);
    setSlot(null);
  }

  function changeUnit(next: string) {
    setUnit(next);
    const mapped = resolveUnitToLine(next, building);
    setLine(mapped.line);
    setSlot(null);
  }

  function toggleIntro(on: boolean) {
    setIntro(on);
    setSlot(null);
    if (typeof window === "undefined") return;
    const next = setIntroSearch(new URLSearchParams(window.location.search), on, launch.flyer.impliesIntro);
    const qs = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  }

  function chooseSlot(next: OfferedSlot) {
    setSlot(next);
    setBookError(null);
    if (reduce) {
      setScreen("confirm");
      return;
    }
    window.setTimeout(() => setScreen("confirm"), 160);
  }

  async function confirmBooking() {
    if (!slot || !quote || submitting) return;
    setSubmitting(true);
    setBookError(null);
    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotToken: slot.token,
          name,
          phone,
          email,
          unit,
          notes,
          lead: launch.lead,
          utm,
          packageId: null,
          gift: null,
          promoCode: null,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        rememberContact();
        setPreview(Boolean(data.preview));
        setScreen("success");
        return;
      }
      if (data.reason === "slot_taken") {
        setDays(data.days ?? []);
        setMoreDays(data.more ?? []);
        setShowMore(true);
        setSlot(null);
        setBookError("slot_taken");
        setScreen("time");
        return;
      }
      setBookError("failed");
    } catch {
      setBookError("failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendRequest() {
    if (!requestKind || submitting) return;
    setSubmitting(true);
    const form = new FormData();
    form.set("kind", requestKind);
    form.set("building", requestKind === "pressure" || requestKind === "paint" || requestKind === "unpriced" ? address : building);
    form.set("unit", unit);
    form.set("name", name);
    form.set("phone", phone);
    form.set("email", email);
    form.set("details", details);
    form.set("notes", notes);
    form.set("preferredDate", preferredDate);
    form.set("lead", launch.lead);
    form.set("utm", JSON.stringify(utm));
    form.set("packageId", "");
    form.set("gift", "false");
    form.set("promoCode", "");
    photos.slice(0, 6).forEach((photo) => form.append("photos", photo));
    try {
      const response = await fetch("/api/request", { method: "POST", body: form });
      const data = await response.json();
      if (data.ok) {
        rememberContact();
        setPreview(Boolean(data.preview));
        setScreen("sent");
        return;
      }
      setBookError("failed");
    } catch {
      setBookError("failed");
    } finally {
      setSubmitting(false);
    }
  }

  function addToCalendar() {
    if (!slot || !quote) return;
    const start = new Date(slot.start);
    const event = {
      title: `${t(lang, "service")}, ${building}, Unit ${unit}`,
      start,
      end: new Date(start.getTime() + quote.durationMin * 60 * 1000),
      details: successSentence(lang, start, building, unit, quote.total),
      location: `${building}, Unit ${unit}, Miami`,
    };
    downloadIcs("preppy balcony glass.ics", icsContent(event));
    window.open(googleCalendarUrl(event), "_blank", "noopener,noreferrer");
  }

  const canBook = Boolean(
    slot &&
      quote &&
      contactValid({ name, phone, email, unit, unitRequired: true }) &&
      !needsUnit(unit)
  );
  const requestReady = requestReadyNow({
    kind: requestKind,
    building: requestKind === "pressure" || requestKind === "paint" || requestKind === "unpriced" ? address : building,
    name,
    phone,
    email,
    details,
    preferredDate,
  });
  const shownDays = showMore ? [...days, ...moreDays] : days;
  const primary = primaryAction({
    screen,
    lang,
    quote,
    kind,
    building,
    canBook,
    submitting,
    requestReady,
    onTime: () => setScreen(kind === "commercial" ? "day" : "time"),
    onConfirm: confirmBooking,
    onRequest: sendRequest,
    onCalendar: addToCalendar,
  });

  return (
    <div className="relative min-h-screen bg-[#F5F1EA] text-[#0D1B24]" data-initial-building={launch.building}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background: "radial-gradient(60% 80% at 15% 0%, rgba(197,165,114,0.2), rgba(197,165,114,0) 70%)",
        }}
      />
      <div className="relative mx-auto min-h-screen w-full max-w-[480px] px-6 pb-32">
        <div className="sticky top-0 z-40 -mx-6 border-b border-[#103845] bg-[#F5F1EA] px-6">
          <header className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <img src="/preppy-icon-512.png" alt="" width={40} height={40} className="h-10 w-10 rounded-lg" />
              <span className="font-wordmark text-[18px] leading-none tracking-[0.14em]">{t(lang, "wordmark")}</span>
            </div>
            <div className="flex gap-1">
              {(["en", "es", "fr"] as Lang[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={lang === item}
                  onClick={() => setLang(item)}
                  className={`px-1.5 text-[12px] font-semibold tracking-[0.14em] ${
                    lang === item ? "text-[#0F7C82]" : "text-[#8B9399]"
                  }`}
                >
                  {t(lang, item === "en" ? "langEn" : item === "es" ? "langEs" : "langFr")}
                </button>
              ))}
            </div>
          </header>
          {(quote || (screen !== "price" && building)) && (
            <div className="flex items-center gap-3 border-t border-[#103845] py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-semibold">
                  {building}
                  {unit ? `, Unit ${unit}` : ""}
                </div>
                <div className="text-[15px] text-[#5A6972]">
                  {slot ? clockLabel(new Date(slot.start), lang) : quote ? durationLabel(lang, quote.durationMin) : ""}
                </div>
                {lines.packages ? <div className="text-[14px] text-[#0F7C82]">{lines.packages}</div> : null}
              </div>
              {quote ? (
                <div className="font-wordmark text-[28px] leading-none lining-nums">${quote.total}</div>
              ) : null}
              <button
                type="button"
                className="text-[16px] font-semibold text-[#0F7C82]"
                onClick={() => {
                  setSlot(null);
                  setScreen("price");
                }}
              >
                {t(lang, "change")}
              </button>
            </div>
          )}
        </div>

        {launch.flyer.showFlyer && (
          <div className="mt-4">
            <HolidayFlyer
              src={FLYER_ASSETS[launch.flyer.flyerId].src}
              alt={FLYER_ASSETS[launch.flyer.flyerId].alt}
              width={FLYER_ASSETS[launch.flyer.flyerId].width}
              height={FLYER_ASSETS[launch.flyer.flyerId].height}
              seePriceLabel={t(lang, "flyerSee")}
              openLabel={t(lang, "flyerOpen")}
              tapLabel={t(lang, "flyerTap")}
              closeLabel={t(lang, "flyerClose")}
              zoomInLabel={t(lang, "flyerIn")}
              zoomOutLabel={t(lang, "flyerOut")}
              resetLabel={t(lang, "flyerFit")}
              hintLabel={t(lang, "flyerHint")}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            data-screen={screen}
            data-preview={preview ? "true" : "false"}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={reduce ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5"
          >
            {screen === "price" && (
              <PriceCard
                lang={lang}
                building={building}
                unit={unit}
                query={query}
                matches={matches}
                editingBuilding={editingBuilding}
                editingUnit={editingUnit}
                unmatched={unmatched}
                pricedBuilding={pricedBuilding}
                quote={quote}
                intro={intro}
                interior={interior}
                lines={lines}
                onQuery={setQuery}
                onPick={pickBuilding}
                onEditBuilding={() => setEditingBuilding(true)}
                onEditUnit={() => setEditingUnit(true)}
                onUnit={(value) => {
                  changeUnit(value);
                  setEditingUnit(true);
                }}
                onUnitDone={() => setEditingUnit(false)}
                onIntro={toggleIntro}
                onInterior={(on) => {
                  setInterior(on);
                  setSlot(null);
                }}
                onUnpriced={() => {
                  setRequestKind("unpriced");
                  setAddress(query.trim() || launch.buildingRaw);
                  setScreen("request");
                }}
              />
            )}
            {screen === "time" && (
              <TimeCard
                lang={lang}
                state={availState}
                days={shownDays}
                selected={slot?.start ?? ""}
                showMore={showMore}
                hasMore={moreDays.length > 0}
                error={bookError}
                onPick={chooseSlot}
                onMore={() => setShowMore(true)}
                onSunday={() => {
                  setRequestKind("sunday");
                  setScreen("request");
                }}
                onRetry={() => setAttempt((value) => value + 1)}
              />
            )}
            {screen === "day" && (
              <DayCard
                lang={lang}
                dates={commercialDates}
                onPick={(date) => {
                  setPreferredDate(date);
                  setRequestKind("commercial");
                  setScreen("request");
                }}
              />
            )}
            {screen === "confirm" && quote && slot && (
              <ConfirmCard
                lang={lang}
                quote={quote}
                building={building}
                unit={unit}
                start={slot.start}
                name={name}
                phone={phone}
                email={email}
                notes={notes}
                lines={lines}
                failed={bookError === "failed"}
                onName={setName}
                onPhone={setPhone}
                onEmail={setEmail}
                onUnit={changeUnit}
                onNotes={setNotes}
                onBack={() => {
                  setSlot(null);
                  setScreen("time");
                }}
              />
            )}
            {screen === "success" && quote && slot && (
              <SuccessCard lang={lang} start={slot.start} building={building} unit={unit} price={quote.total} />
            )}
            {(screen === "request" || screen === "sent") && (
              <RequestCard
                lang={lang}
                sent={screen === "sent"}
                kind={requestKind}
                address={address}
                unit={unit}
                name={name}
                phone={phone}
                email={email}
                details={details}
                notes={notes}
                preferredDate={preferredDate}
                photos={photos}
                failed={bookError === "failed"}
                onKind={setRequestKind}
                onAddress={setAddress}
                onUnit={setUnit}
                onName={setName}
                onPhone={setPhone}
                onEmail={setEmail}
                onDetails={setDetails}
                onNotes={setNotes}
                onPhotos={setPhotos}
                onDone={() => {
                  setScreen("price");
                  setRequestKind(launch.request === "pressure" ? "pressure" : launch.request === "paint" ? "paint" : null);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {screen === "price" && (
          <div className="mt-5 text-center">
            <button
              type="button"
              className="text-[16px] font-semibold text-[#0F7C82]"
              onClick={() => {
                setRequestKind(null);
                setScreen("request");
              }}
            >
              {t(lang, "otherServices")}
            </button>
            {availState === "ready" && kind === "residential" && (
              <p className="mt-4 text-[16px] leading-relaxed text-[#5A6972]">
                <a className="text-[#0F7C82]" href={`tel:${JOE_PHONE_TEL}`}>
                  {t(lang, "urgent")}
                </a>
              </p>
            )}
          </div>
        )}
      </div>
      {primary}
    </div>
  );
}

function PriceCard(props: {
  lang: Lang;
  building: string;
  unit: string;
  query: string;
  matches: string[];
  editingBuilding: boolean;
  editingUnit: boolean;
  unmatched: boolean;
  pricedBuilding: boolean;
  quote: GlassQuote | null;
  intro: boolean;
  interior: boolean;
  lines: ReturnType<typeof featureLines>;
  onQuery: (value: string) => void;
  onPick: (name: string) => void;
  onEditBuilding: () => void;
  onEditUnit: () => void;
  onUnit: (value: string) => void;
  onUnitDone: () => void;
  onIntro: (on: boolean) => void;
  onInterior: (on: boolean) => void;
  onUnpriced: () => void;
}) {
  const showSearch = props.editingBuilding || !props.building;
  const typedMiss = props.query.trim().length >= 2 && props.matches.length === 0;
  const showUnpriced = props.unmatched || typedMiss || (props.building !== "" && !props.pricedBuilding && !showSearch);
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E7D6AE] bg-white shadow-[0_12px_40px_rgba(13,27,36,0.06)]">
      <div className="h-px bg-[#C5A572]" />
      <div className="p-5">
        <h1 className="font-wordmark text-[34px] leading-none">{t(props.lang, "service")}</h1>
        <div className="mt-4">
          {showSearch ? (
            <>
              <input
                value={props.query}
                onChange={(event) => props.onQuery(event.target.value)}
                placeholder={t(props.lang, "search")}
                aria-label={t(props.lang, "search")}
                className={fieldClass}
                autoComplete="organization"
              />
              {props.matches.length > 0 && (
                <ul className="mt-2 overflow-hidden rounded-lg border border-[#E6DED4] bg-white">
                  {props.matches.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        className="h-12 w-full px-4 text-left text-[16px] hover:bg-[#F5F1EA]"
                        onClick={() => props.onPick(name)}
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Chip label={props.building} onEdit={props.onEditBuilding} editLabel={t(props.lang, "editBuilding")} />
              {props.unit ? (
                <Chip label={`Unit ${props.unit}`} onEdit={props.onEditUnit} editLabel={t(props.lang, "editUnit")} />
              ) : null}
            </div>
          )}
        </div>
        {showUnpriced && (
          <div className="mt-4 rounded-lg bg-[#F5F1EA] p-4">
            <p className="text-[16px]">{t(props.lang, "unpriced")}</p>
            <div className="mt-3 flex flex-col gap-2">
              <a className="text-[16px] font-semibold text-[#0F7C82]" href={`sms:${JOE_PHONE_TEL}`}>
                {t(props.lang, "textJoe")} {JOE_PHONE_DISPLAY}
              </a>
              <button type="button" className="text-left text-[16px] font-semibold text-[#0F7C82]" onClick={props.onUnpriced}>
                {t(props.lang, "sendQuote")}
              </button>
            </div>
          </div>
        )}
        {props.pricedBuilding && (props.editingUnit || !props.unit || !props.quote) && (
          <input
            value={props.unit}
            onChange={(event) => props.onUnit(event.target.value)}
            onBlur={props.onUnitDone}
            placeholder={t(props.lang, "unitOrLine")}
            aria-label={t(props.lang, "unitOrLine")}
            className={`${fieldClass} mt-4`}
            autoComplete="address-line2"
          />
        )}
        {props.quote && (
          <>
            <div className="mt-4 grid gap-2">
              <Toggle
                label={t(props.lang, "firstService")}
                sub={t(props.lang, "firstServiceSub")}
                on={props.intro}
                onLabel={t(props.lang, "on")}
                offLabel={t(props.lang, "off")}
                onClick={() => props.onIntro(!props.intro)}
              />
              <Toggle
                label={t(props.lang, "interior")}
                on={props.interior}
                onLabel={t(props.lang, "on")}
                offLabel={t(props.lang, "off")}
                onClick={() => props.onInterior(!props.interior)}
              />
            </div>
            <div className="mt-6" aria-live="polite">
              {props.lines.holiday ? (
                <div className="mb-3 rounded-lg bg-[#C5A572] px-4 py-3 text-center text-[16px] font-semibold">
                  {props.lines.holiday}
                </div>
              ) : null}
              {props.intro ? (
                <p className="text-[16px] text-[#8B9399] line-through">
                  {t(props.lang, "regular")} ${props.quote.regularTotal}
                </p>
              ) : (
                <p className="text-[16px] text-[#5A6972]">{t(props.lang, "regular")}</p>
              )}
              <p className="font-wordmark text-[68px] leading-none lining-nums text-[#0D1B24]" data-price={props.quote.total}>
                ${props.quote.total}
              </p>
              {props.intro ? (
                <p className="mt-1 text-[16px] font-semibold text-[#0F7C82]">
                  {t(props.lang, "firstService")} ${props.quote.total}
                </p>
              ) : null}
              <p className="mt-2 text-[16px] text-[#5A6972]">{durationLabel(props.lang, props.quote.durationMin)}</p>
              {props.lines.packages ? <p className="mt-2 text-[16px] text-[#0F7C82]">{props.lines.packages}</p> : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function TimeCard(props: {
  lang: Lang;
  state: "idle" | "loading" | "ready" | "error";
  days: OfferedDay[];
  selected: string;
  showMore: boolean;
  hasMore: boolean;
  error: "slot_taken" | "failed" | null;
  onPick: (slot: OfferedSlot) => void;
  onMore: () => void;
  onSunday: () => void;
  onRetry: () => void;
}) {
  return (
    <div>
      <h1 className="font-wordmark text-[36px] leading-none">{t(props.lang, "when")}</h1>
      {props.error === "slot_taken" && <p className="mt-3 text-[16px] text-[#0D1B24]">{t(props.lang, "slotTaken")}</p>}
      {props.state !== "ready" && <p className="mt-4 text-[16px] text-[#5A6972]">{t(props.lang, "finding")}</p>}
      {props.state === "error" && (
        <button type="button" className="mt-3 text-[16px] font-semibold text-[#0F7C82]" onClick={props.onRetry}>
          {t(props.lang, "tryAgain")}
        </button>
      )}
      {props.state === "ready" && props.days.length === 0 && (
        <p className="mt-4 text-[16px] text-[#5A6972]">{t(props.lang, "noTimes")}</p>
      )}
      <div className="mt-4 grid gap-3">
        {props.days.map((day) => (
          <article key={day.date} className="rounded-2xl border border-[#E7D6AE] bg-white p-4">
            <h2 className="font-wordmark text-[32px] leading-none">{weekdayLabel(day.date, props.lang)}</h2>
            <p className="mt-1 text-[16px] text-[#5A6972]">
              {monthLabel(day.date, props.lang)} {dateKeyParts(day.date).day}
            </p>
            <div className="mt-3 grid gap-2">
              {day.slots.map((item) => {
                const selected = props.selected === item.start;
                return (
                  <button
                    key={item.start}
                    type="button"
                    onClick={() => props.onPick(item)}
                    className={`min-h-12 rounded-lg border text-[16px] font-semibold ${
                      selected ? "border-[#103845] bg-[#103845] text-white" : "border-[#D9D0C5] bg-white text-[#0D1B24]"
                    }`}
                  >
                    {clockLabel(new Date(item.start), props.lang)}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      <button type="button" className="mt-4 w-full text-left text-[16px] font-semibold text-[#0F7C82]" onClick={props.onSunday}>
        {t(props.lang, "sunday")}
      </button>
      {props.hasMore && !props.showMore && (
        <button
          type="button"
          className="mt-3 h-12 w-full rounded-lg border border-[#103845] text-[16px] font-semibold"
          onClick={props.onMore}
        >
          {t(props.lang, "moreTimes")}
        </button>
      )}
    </div>
  );
}

function DayCard(props: { lang: Lang; dates: string[]; onPick: (date: string) => void }) {
  const now = new Date();
  const parts = partsInZone(now);
  const second = parts.month === 12 ? { year: parts.year + 1, month: 1 } : { year: parts.year, month: parts.month + 1 };
  return (
    <div>
      <h1 className="font-wordmark text-[36px] leading-none">{t(props.lang, "pickDay")}</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-[#5A6972]">{t(props.lang, "overnight")}</p>
      <MonthBoard year={parts.year} month={parts.month} open={props.dates} onPick={props.onPick} lang={props.lang} />
      <MonthBoard year={second.year} month={second.month} open={props.dates} onPick={props.onPick} lang={props.lang} />
    </div>
  );
}

function MonthBoard(props: {
  year: number;
  month: number;
  open: string[];
  onPick: (date: string) => void;
  lang: Lang;
}) {
  const open = new Set(props.open);
  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = [null, null, null, null, null, null];
  for (const key of monthDates(props.year, props.month)) {
    if (isSunday(key)) continue;
    const col = COL[weekdayOf(key)];
    if (open.has(key)) week[col] = key;
    if (col === 5) {
      weeks.push(week);
      week = [null, null, null, null, null, null];
    }
  }
  if (week.some(Boolean)) weeks.push(week);
  const titleKey = `${props.year}-${String(props.month).padStart(2, "0")}-01`;
  return (
    <section className="mt-5">
      <h2 className="font-wordmark text-[28px]">{monthLabel(titleKey, props.lang)}</h2>
      <div className="mt-3 grid gap-2">
        {weeks.map((row, index) => (
          <div key={index} className="grid grid-cols-6 gap-2">
            {row.map((cell, cellIndex) =>
              cell ? (
                <button
                  key={cell}
                  type="button"
                  className="h-12 rounded-lg bg-white text-[16px] font-semibold shadow-[0_1px_0_rgba(16,56,69,0.25)]"
                  onClick={() => props.onPick(cell)}
                >
                  {dateKeyParts(cell).day}
                </button>
              ) : (
                <span key={cellIndex} className="h-12" />
              )
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ConfirmCard(props: {
  lang: Lang;
  quote: GlassQuote;
  building: string;
  unit: string;
  start: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  lines: ReturnType<typeof featureLines>;
  failed: boolean;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  onEmail: (value: string) => void;
  onUnit: (value: string) => void;
  onNotes: (value: string) => void;
  onBack: () => void;
}) {
  const when = new Date(props.start);
  const rows = [
    [t(props.lang, "serviceLabel"), t(props.lang, "service")],
    [t(props.lang, "buildingLabel"), props.building],
    [t(props.lang, "unit"), props.unit],
    [t(props.lang, "interiorLabel"), props.quote.interior ? t(props.lang, "on") : t(props.lang, "off")],
    [t(props.lang, "dayLabel"), weekdayLabel(dateKey(when), props.lang)],
    [t(props.lang, "dateLabel"), `${monthLabel(dateKey(when), props.lang)} ${partsInZone(when).day}`],
    [t(props.lang, "timeLabel"), clockLabel(when, props.lang)],
    [t(props.lang, "durationLabel"), durationLabel(props.lang, props.quote.durationMin)],
    [t(props.lang, "totalLabel"), `$${props.quote.total}`],
  ];
  return (
    <div>
      <section className="rounded-2xl border border-[#E7D6AE] bg-white p-5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 border-b border-[#F0E7DC] py-2 last:border-0">
            <span className="text-[15px] text-[#5A6972]">{label}</span>
            <span className="text-right text-[16px] font-semibold">{value}</span>
          </div>
        ))}
      </section>
      <div className="mt-4 grid gap-3">
        {props.name.trim().length < 2 && (
          <input className={fieldClass} placeholder={t(props.lang, "name")} aria-label={t(props.lang, "name")} autoComplete="name" value={props.name} onChange={(event) => props.onName(event.target.value)} />
        )}
        {phoneDigits(props.phone).length < 10 && (
          <input className={fieldClass} placeholder={t(props.lang, "phone")} aria-label={t(props.lang, "phone")} autoComplete="tel" inputMode="tel" value={props.phone} onChange={(event) => props.onPhone(event.target.value)} />
        )}
        {!emailValid(props.email) && (
          <input className={fieldClass} placeholder={t(props.lang, "email")} aria-label={t(props.lang, "email")} autoComplete="email" inputMode="email" value={props.email} onChange={(event) => props.onEmail(event.target.value)} />
        )}
        {needsUnit(props.unit) && (
          <input className={fieldClass} placeholder={t(props.lang, "unit")} aria-label={t(props.lang, "unit")} autoComplete="address-line2" value={props.unit} onChange={(event) => props.onUnit(event.target.value)} />
        )}
        <textarea
          className={`${fieldClass} h-auto min-h-[52px] py-3`}
          placeholder={t(props.lang, "notes")}
          aria-label={t(props.lang, "notes")}
          value={props.notes}
          onChange={(event) => props.onNotes(event.target.value)}
        />
      </div>
      {props.lines.showNoCharge ? <p className="mt-4 text-[16px] text-[#5A6972]">{t(props.lang, "noCharge")}</p> : null}
      {props.lines.gift ? <p className="mt-2 text-[16px] text-[#0F7C82]">{props.lines.gift}</p> : null}
      {props.failed && <p className="mt-3 text-[16px]">{t(props.lang, "bookFailed")}</p>}
      <button type="button" className="mt-4 text-[16px] font-semibold text-[#0F7C82]" onClick={props.onBack}>
        {t(props.lang, "differentTime")}
      </button>
    </div>
  );
}

function SuccessCard(props: { lang: Lang; start: string; building: string; unit: string; price: number }) {
  const when = new Date(props.start);
  return (
    <div className="text-center">
      <img src="/preppy-icon-512.png" alt="" width={56} height={56} className="mx-auto h-14 w-14 rounded-lg" />
      <div className="mt-4 flex justify-center">
        <GoldCheck />
      </div>
      <p className="mt-4 font-wordmark text-[30px] leading-snug lining-nums">
        {successSentence(props.lang, when, props.building, props.unit, props.price)}
      </p>
      <p className="mt-4 text-[16px] text-[#5A6972]">
        <a className="text-[#0F7C82]" href={`tel:${JOE_PHONE_TEL}`}>
          {t(props.lang, "questions")}
        </a>
      </p>
    </div>
  );
}

function RequestCard(props: {
  lang: Lang;
  sent: boolean;
  kind: RequestKind | null;
  address: string;
  unit: string;
  name: string;
  phone: string;
  email: string;
  details: string;
  notes: string;
  preferredDate: string;
  photos: File[];
  failed: boolean;
  onKind: (kind: RequestKind) => void;
  onAddress: (value: string) => void;
  onUnit: (value: string) => void;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  onEmail: (value: string) => void;
  onDetails: (value: string) => void;
  onNotes: (value: string) => void;
  onPhotos: (files: File[]) => void;
  onDone: () => void;
}) {
  if (props.sent) {
    const message =
      props.kind === "commercial"
        ? t(props.lang, "requestDay")
        : props.kind === "sunday"
          ? t(props.lang, "requestSunday")
          : t(props.lang, "requestQuote");
    return (
      <div className="text-center">
        <img src="/preppy-icon-512.png" alt="" width={56} height={56} className="mx-auto h-14 w-14 rounded-lg" />
        <div className="mt-4 flex justify-center">
          <GoldCheck />
        </div>
        <p className="mt-4 font-wordmark text-[30px] leading-snug">{message}</p>
        <button type="button" className="mt-6 h-14 w-full rounded-lg border border-[#103845] text-[18px] font-bold" onClick={props.onDone}>
          {t(props.lang, "done")}
        </button>
      </div>
    );
  }
  const ask = props.kind === "pressure" || props.kind === "paint" || props.kind === "unpriced" || props.kind === null;
  return (
    <div>
      <h1 className="font-wordmark text-[36px] leading-none">
        {props.kind === "sunday" ? t(props.lang, "sundayTitle") : props.kind === "commercial" ? t(props.lang, "pickDay") : t(props.lang, "sendRequest")}
      </h1>
      {(props.kind === null || props.kind === "pressure" || props.kind === "paint") && (
        <div className="mt-4 grid gap-2">
          <Choice label={t(props.lang, "pressure")} selected={props.kind === "pressure"} onClick={() => props.onKind("pressure")} />
          <Choice label={t(props.lang, "paint")} selected={props.kind === "paint"} onClick={() => props.onKind("paint")} />
        </div>
      )}
      {props.kind === "commercial" && props.preferredDate && (
        <p className="mt-3 text-[16px]">
          {weekdayLabel(props.preferredDate, props.lang)}, {monthLabel(props.preferredDate, props.lang)}{" "}
          {dateKeyParts(props.preferredDate).day}
        </p>
      )}
      <div className="mt-4 grid gap-3">
        {ask && (
          <input className={fieldClass} placeholder={t(props.lang, "buildingOrAddress")} aria-label={t(props.lang, "buildingOrAddress")} value={props.address} onChange={(event) => props.onAddress(event.target.value)} />
        )}
        {ask && (
          <input className={fieldClass} placeholder={t(props.lang, "unitOrArea")} aria-label={t(props.lang, "unitOrArea")} value={props.unit} onChange={(event) => props.onUnit(event.target.value)} />
        )}
        {props.name.trim().length < 2 && (
          <input className={fieldClass} placeholder={t(props.lang, "name")} aria-label={t(props.lang, "name")} autoComplete="name" value={props.name} onChange={(event) => props.onName(event.target.value)} />
        )}
        {phoneDigits(props.phone).length < 10 && (
          <input className={fieldClass} placeholder={t(props.lang, "phone")} aria-label={t(props.lang, "phone")} autoComplete="tel" inputMode="tel" value={props.phone} onChange={(event) => props.onPhone(event.target.value)} />
        )}
        {!emailValid(props.email) && (
          <input className={fieldClass} placeholder={t(props.lang, "email")} aria-label={t(props.lang, "email")} autoComplete="email" inputMode="email" value={props.email} onChange={(event) => props.onEmail(event.target.value)} />
        )}
        {(props.kind === "pressure" || props.kind === "paint") && (
          <textarea className={`${fieldClass} h-auto min-h-[120px] py-3`} placeholder={t(props.lang, "details")} aria-label={t(props.lang, "details")} value={props.details} onChange={(event) => props.onDetails(event.target.value)} />
        )}
        <textarea className={`${fieldClass} h-auto min-h-[52px] py-3`} placeholder={t(props.lang, "notes")} aria-label={t(props.lang, "notes")} value={props.notes} onChange={(event) => props.onNotes(event.target.value)} />
        {(props.kind === "pressure" || props.kind === "paint") && (
          <div>
            <label className="inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-lg border border-[#D9D0C5] bg-white text-[16px] font-semibold">
              {t(props.lang, "photos")}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(event) => {
                  const next = [...props.photos, ...Array.from(event.target.files ?? [])].slice(0, 6);
                  props.onPhotos(next);
                  event.target.value = "";
                }}
              />
            </label>
            {props.photos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {props.photos.map((photo, index) => (
                  <PhotoThumb
                    key={`${photo.name}-${index}`}
                    file={photo}
                    label={t(props.lang, "removePhoto")}
                    onRemove={() => props.onPhotos(props.photos.filter((_, item) => item !== index))}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {props.failed && <p className="mt-3 text-[16px]">{t(props.lang, "bookFailed")}</p>}
    </div>
  );
}

function PhotoThumb(props: { file: File; label: string; onRemove: () => void }) {
  const url = React.useMemo(() => URL.createObjectURL(props.file), [props.file]);
  React.useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <button type="button" className="relative h-16 w-16 overflow-hidden rounded-lg" onClick={props.onRemove} aria-label={props.label}>
      <img src={url} alt="" className="h-full w-full object-cover" />
    </button>
  );
}

function Chip(props: { label: string; onEdit: () => void; editLabel: string }) {
  return (
    <button type="button" onClick={props.onEdit} aria-label={props.editLabel} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#F5F1EA] px-3 text-[16px] font-medium">
      {props.label}
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="text-[#0F7C82]">
        <path d="M11.2 2.2a1.2 1.2 0 0 1 1.7 1.7L5.6 11.2 3 12.2l1-2.6 7.2-7.4Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </button>
  );
}

function Toggle(props: {
  label: string;
  sub?: string;
  on: boolean;
  onLabel: string;
  offLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={props.on}
      onClick={props.onClick}
      className={`flex h-14 w-full items-center justify-between rounded-lg border px-4 text-left ${
        props.on ? "border-[#0F7C82] bg-[#F3FBFB]" : "border-[#E6DED4] bg-white"
      }`}
    >
      <span>
        <span className="block text-[16px] font-semibold">{props.label}</span>
        {props.sub ? <span className="block text-[14px] text-[#0F7C82]">{props.sub}</span> : null}
      </span>
      <span className={`text-[14px] font-bold ${props.on ? "text-[#0F7C82]" : "text-[#8B9399]"}`}>
        {props.on ? props.onLabel : props.offLabel}
      </span>
    </button>
  );
}

function Choice(props: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={props.selected}
      onClick={props.onClick}
      className={`h-14 w-full rounded-lg text-[18px] font-bold ${
        props.selected ? "bg-[#103845] text-white" : "border border-[#103845] bg-white text-[#0D1B24]"
      }`}
    >
      {props.label}
    </button>
  );
}

function GoldCheck() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r="32" fill="none" stroke="#C5A572" strokeWidth="2" />
      <path d="M22 37.5 31.5 47 50 26" fill="none" stroke="#C5A572" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function primaryAction(input: {
  screen: Screen;
  lang: Lang;
  quote: GlassQuote | null;
  kind: "residential" | "commercial";
  building: string;
  canBook: boolean;
  submitting: boolean;
  requestReady: boolean;
  onTime: () => void;
  onConfirm: () => void;
  onRequest: () => void;
  onCalendar: () => void;
}) {
  if (input.screen === "price") {
    const disabled = input.kind === "commercial" ? !input.building : !input.quote;
    return (
      <Bar>
        <button type="button" className={buttonClass} disabled={disabled} onClick={input.onTime}>
          {t(input.lang, input.kind === "commercial" ? "pickDay" : "pickTime")}
        </button>
      </Bar>
    );
  }
  if (input.screen === "confirm") {
    return (
      <Bar>
        <button type="button" className={buttonClass} disabled={!input.canBook || input.submitting} onClick={input.onConfirm}>
          {t(input.lang, "confirm")}
        </button>
      </Bar>
    );
  }
  if (input.screen === "request") {
    return (
      <Bar>
        <button type="button" className={buttonClass} disabled={!input.requestReady || input.submitting} onClick={input.onRequest}>
          {t(input.lang, "sendRequest")}
        </button>
      </Bar>
    );
  }
  if (input.screen === "success") {
    return (
      <Bar>
        <button type="button" className={buttonClass} onClick={input.onCalendar}>
          {t(input.lang, "addCal")}
        </button>
        <DoneButton lang={input.lang} />
      </Bar>
    );
  }
  return null;
}

function DoneButton({ lang }: { lang: Lang }) {
  return (
    <button
      type="button"
      className="mt-2 h-14 w-full rounded-lg border border-[#103845] bg-transparent text-[18px] font-bold text-[#103845]"
      onClick={() => window.location.assign(window.location.pathname + window.location.search)}
    >
      {t(lang, "done")}
    </button>
  );
}

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#103845] bg-[#F5F1EA] px-6 py-3">
      <div className="mx-auto w-full max-w-[480px]">{children}</div>
    </div>
  );
}

function successSentence(lang: Lang, start: Date, building: string, unit: string, price: number) {
  return t(lang, "booked", {
    day: weekdayLabel(dateKey(start), lang),
    month: monthLabel(dateKey(start), lang),
    date: partsInZone(start).day,
    time: clockLabel(start, lang),
    building,
    unit,
    price,
  });
}

function dateKey(date: Date): string {
  const parts = partsInZone(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function requestReadyNow(input: {
  kind: RequestKind | null;
  building: string;
  name: string;
  phone: string;
  email: string;
  details: string;
  preferredDate: string;
}) {
  if (!input.kind) return false;
  if (!input.building.trim()) return false;
  if (!contactValid({ name: input.name, phone: input.phone, email: input.email })) return false;
  if ((input.kind === "pressure" || input.kind === "paint") && input.details.trim().length < 3) return false;
  if (input.kind === "commercial" && !input.preferredDate) return false;
  return true;
}

const fieldClass =
  "h-[52px] w-full rounded-lg border border-[#D9D0C5] bg-white px-4 text-[16px] text-[#0D1B24] outline-none focus:ring-2 focus:ring-[#0F7C82]";

const buttonClass =
  "h-14 w-full rounded-lg bg-[#103845] text-[18px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#C5CED3] disabled:text-[#5A6972]";
