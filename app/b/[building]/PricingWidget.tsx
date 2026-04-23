"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import styles from "./page.module.css";
import {
  DEFAULT_SERVICE,
  SERVICES,
  humanizeSlug,
  lookupBuilding,
  resolve,
  type CustomQuoteReason,
  type Resolution,
  type ServiceSlug,
} from "./lib/pricing";
import { buildSmsBody, buildSmsHref } from "./lib/sms";

type Props = {
  initialSlug: string;
  initialService: ServiceSlug;
  initialUnit: string | null;
  initialLine: string | null;
  name: string | null;
  address: string | null;
  registeredBuildings: string[];
};

const PHONE = process.env.NEXT_PUBLIC_PREPPY_SMS_PHONE ?? "";
const BOOKING_URL = process.env.NEXT_PUBLIC_PREPPY_BOOKING_URL ?? "#";

const PRICE_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const SERVICE_ORDER: ServiceSlug[] = ["balcony-glass", "deep-clean", "linens", "turnover"];
const SERVICE_TAB_LABEL: Record<string, string> = {
  "balcony-glass": "Balcony",
  "deep-clean": "Deep",
  linens: "Linens",
  turnover: "Turnover",
};

function normalizeLine(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return digits.slice(-2).padStart(2, "0");
}

function deriveLineFromUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const digits = unit.replace(/\D/g, "");
  if (digits.length < 2) return null;
  return digits.slice(-2).padStart(2, "0");
}

export default function PricingWidget({
  initialSlug,
  initialService,
  initialUnit,
  initialLine,
  name,
  address,
  registeredBuildings,
}: Props) {
  const [buildingSlug, setBuildingSlug] = useState(initialSlug);
  const [serviceSlug, setServiceSlug] = useState<ServiceSlug>(initialService || DEFAULT_SERVICE);
  const [unit, setUnit] = useState<string | null>(initialUnit);
  const [line, setLine] = useState<string | null>(
    normalizeLine(initialLine) ?? deriveLineFromUnit(initialUnit),
  );
  const [lineManuallyChosen, setLineManuallyChosen] = useState(Boolean(normalizeLine(initialLine)));

  const lookup = useMemo(() => lookupBuilding(buildingSlug), [buildingSlug]);

  const resolution = useMemo<Resolution>(
    () =>
      resolve({
        buildingSlug,
        buildingDisplayName: lookup.displayName,
        address,
        unit,
        line,
        serviceSlug,
      }),
    [buildingSlug, lookup.displayName, address, unit, line, serviceSlug],
  );

  const smsBody = useMemo(
    () =>
      buildSmsBody({
        resolution,
        name,
        buildingDisplayName: lookup.displayName,
        address,
        unit,
      }),
    [resolution, name, lookup.displayName, address, unit],
  );

  const smsHref = useMemo(() => buildSmsHref(PHONE, smsBody), [smsBody]);

  const derivedLine = useMemo(() => deriveLineFromUnit(unit), [unit]);

  useEffect(() => {
    if (lineManuallyChosen) return;
    if (!derivedLine) {
      setLine(null);
      return;
    }
    setLine(derivedLine);
  }, [derivedLine, lineManuallyChosen]);

  const handleBuildingChange = useCallback((next: string) => {
    setBuildingSlug(next);
    setLine(null);
    setLineManuallyChosen(false);
  }, []);

  const handleUnitChange = useCallback((next: string) => {
    const trimmed = next.trim();
    const nextUnit = trimmed.length ? trimmed : null;
    setUnit(nextUnit);

    const nextDerivedLine = deriveLineFromUnit(nextUnit);
    if (!lineManuallyChosen) {
      setLine(nextDerivedLine);
    }
  }, [lineManuallyChosen]);

  const handleLineChange = useCallback((next: string) => {
    const normalized = normalizeLine(next);
    setLine(normalized);
    setLineManuallyChosen(Boolean(normalized));
  }, []);

  const buildingLabel = lookup.displayName ?? humanizeSlug(buildingSlug);

  return (
    <>
      <BuildingEyebrow
        label={buildingLabel}
        slug={buildingSlug}
        options={registeredBuildings}
        onChange={handleBuildingChange}
      />

      <ServiceTabs value={serviceSlug} onChange={setServiceSlug} />

      <ResolutionCard
        resolution={resolution}
        unit={unit}
        line={line}
        onUnitChange={handleUnitChange}
        onLineChange={handleLineChange}
        smsHref={smsHref}
      />
    </>
  );
}

function BuildingEyebrow({
  label,
  slug,
  options,
  onChange,
}: {
  label: string;
  slug: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  const listed = options.includes(slug) ? options : [slug, ...options];

  return (
    <div className={styles.eyebrowRow}>
      <span className={styles.eyebrowFixed}>At</span>
      <span className={styles.buildingSelectWrapper}>
        <select
          aria-label="Change building"
          className={styles.buildingSelect}
          value={slug}
          onChange={(e) => onChange(e.target.value)}
        >
          {listed.map((s) => (
            <option key={s} value={s}>
              {humanizeSlug(s)}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className={styles.buildingSelectCaret}>▾</span>
      </span>
    </div>
  );
}

function ServiceTabs({
  value,
  onChange,
}: {
  value: ServiceSlug;
  onChange: (next: ServiceSlug) => void;
}) {
  return (
    <div role="tablist" aria-label="Service" className={styles.serviceTabs}>
      {SERVICE_ORDER.map((s) => {
        const selected = s === value;
        return (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={styles.serviceTab}
            onClick={() => onChange(s)}
          >
            {SERVICE_TAB_LABEL[s] ?? SERVICES[s]?.label ?? s}
          </button>
        );
      })}
    </div>
  );
}

function ResolutionCard({
  resolution,
  unit,
  line,
  onUnitChange,
  onLineChange,
  smsHref,
}: {
  resolution: Resolution;
  unit: string | null;
  line: string | null;
  onUnitChange: (next: string) => void;
  onLineChange: (next: string) => void;
  smsHref: string;
}) {
  if (resolution.kind === "instant_price") {
    return (
      <article className={styles.card} aria-label="Service pricing">
        <p className={styles.cardEyebrow}>{resolution.service.label}</p>

        <div className={styles.priceBlock}>
          <p className={styles.price}>{PRICE_FORMATTER.format(resolution.price)}</p>
          <p className={styles.priceCaption}>
            per visit · taxes and tip included
            {resolution.penthouse ? " · penthouse units confirmed over text" : ""}
          </p>
        </div>

        <LineSelector
          availableLines={resolution.availableLines}
          selected={resolution.line}
          onChange={onLineChange}
          hint={line ? null : "Derived from your unit — tap to override."}
        />

        <UnitField unit={unit} onChange={onUnitChange} />

        <div className={styles.actions}>
          <a className={styles.ctaPrimary} href={BOOKING_URL}>Book this visit</a>
          <a className={styles.ctaSecondary} href={smsHref}>Text a question</a>
        </div>
      </article>
    );
  }

  if (resolution.kind === "needs_line") {
    return (
      <article className={styles.card} aria-label="Pick your line">
        <p className={styles.cardEyebrow}>{resolution.service.label}</p>
        <h2 className={styles.cardHeading}>Select your line to see the price.</h2>
        <p className={styles.cardBody}>
          Pricing varies by stack — tap your line below, or enter your unit and we'll find it.
        </p>

        <LineSelector
          availableLines={resolution.availableLines}
          selected={line}
          onChange={onLineChange}
          hint={line ? "Derived from your unit — tap to override." : null}
        />

        <UnitField unit={unit} onChange={onUnitChange} />

        <div className={styles.actions}>
          <a className={styles.ctaSecondary} href={smsHref}>Text for help</a>
        </div>
      </article>
    );
  }

  if (resolution.kind === "discuss") {
    return (
      <article className={styles.card} aria-label="Service inquiry">
        <p className={styles.cardEyebrow}>{resolution.service.label}</p>
        <h2 className={styles.cardHeading}>Let's tailor this to your residence.</h2>
        <p className={styles.cardBody}>
          {resolution.service.label} is bespoke per home. We'll walk through
          scope and confirm pricing in fifteen minutes.
        </p>

        <UnitField unit={unit} onChange={onUnitChange} />

        <div className={styles.actions}>
          <a className={styles.ctaPrimary} href={BOOKING_URL}>Book a 15-min walkthrough</a>
          <a className={styles.ctaSecondary} href={smsHref}>Text to discuss</a>
        </div>
      </article>
    );
  }

  return (
    <article className={styles.card} aria-label="Custom quote">
      <p className={styles.cardEyebrow}>Custom quote</p>
      <h2 className={styles.cardHeading}>{customQuoteHeading(resolution.reason)}</h2>
      <p className={styles.cardBody}>{customQuoteSub(resolution.reason)}</p>

      <UnitField unit={unit} onChange={onUnitChange} />

      <div className={styles.actions}>
        <a className={styles.ctaPrimary} href={smsHref}>Text for custom quote</a>
      </div>
    </article>
  );
}

function LineSelector({
  availableLines,
  selected,
  onChange,
  hint,
}: {
  availableLines: string[];
  selected: string | null;
  onChange: (next: string) => void;
  hint: string | null;
}) {
  return (
    <section className={styles.lineSection} aria-label="Line selector">
      <div className={styles.lineLabel}>
        <p className={styles.lineLabelText}>Line</p>
        {hint && <p className={styles.lineHint}>{hint}</p>}
      </div>
      <div role="radiogroup" aria-label="Line" className={styles.lineChips}>
        {availableLines.map((l) => {
          const isSelected = l === selected;
          return (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={styles.lineChip}
              onClick={() => onChange(l)}
            >
              {l}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function UnitField({
  unit,
  onChange,
}: {
  unit: string | null;
  onChange: (next: string) => void;
}) {
  const id = useId();

  return (
    <section className={styles.meta}>
      <div className={styles.metaRow}>
        <label htmlFor={id} className={styles.metaLabel}>Unit</label>
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="e.g. 4203"
          className={styles.unitInput}
          value={unit ?? ""}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      </div>
    </section>
  );
}

function customQuoteHeading(reason: CustomQuoteReason): string {
  switch (reason) {
    case "unregistered_building":
      return "We don't have your building on standard pricing yet.";
    case "unresolved_line":
      return "We need one detail to give you an exact price.";
    case "service_not_listed":
      return "We can absolutely help — let's scope it together.";
  }
}

function customQuoteSub(reason: CustomQuoteReason): string {
  switch (reason) {
    case "unregistered_building":
      return "Send a quick text and we'll get you a tailored quote, usually same day.";
    case "unresolved_line":
      return "Text us your unit and we'll confirm pricing in seconds.";
    case "service_not_listed":
      return "Text us a few details about what you need and we'll come back with a quote.";
  }
}