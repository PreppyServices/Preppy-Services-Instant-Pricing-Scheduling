"use client";

import {
  pricing,
  verifiedBuildings,
  placeholderBuildings,
  addOnPricing,
  activePlaceholderBuildings,
  verifiedBuildingSet,
  safeMappedPricing,
  provisionalBuildings,
  researchStatus,
} from "../data/buildings";
/**
 * Preppy Services — Luxury Quote Widget
 * =====================================
 *
 * URL PARAMETERS (all optional) — used for personalized SMS deep-links:
 *   ?b=Paraiso+Bay         Building name (case-insensitive, URL-encoded)
 *   ?line=04               Unit line within the building (must exist in pricing)
 *   ?unit=3204             Unit number (displayed to the visitor, not used for pricing)
 *   ?lead=A1042            Lead ID for conversion tracking (stored locally + forwarded)
 *   ?name=Alex             Customer first name for personalization
 *   ?interior=1            Pre-toggle interior add-on (requires a valid line)
 *   ?service=painting      Land on painting consultation mode instead of glass
 *   ?service=custom        Land on custom job mode
 *
 * Example morning-text links:
 *   Glass:   https://preppyservices.com/?b=Paraiso+Bay&line=04&unit=3204&lead=A1042&name=Alex
 *   Paint:   https://preppyservices.com/?service=painting&b=Paraiso+Bay&unit=3204&lead=A1042&name=Alex
 *   Custom:  https://preppyservices.com/?service=custom&b=Paraiso+Bay&unit=3204&lead=A1042&name=Alex
 *
 * DATA NOTES (for ChatGPT and future maintainers):
 *   1. The `pricing` object's keys MUST be unique inside the object literal.
 *      JS/TS silently overwrites duplicate keys — do not introduce duplicates.
 *   2. Buildings with empty `lines: {}` show "pending" state in the widget.
 *      Add lines as floor plans are verified. Status auto-updates.
 *   3. `verifiedBuildings` = floor plans confirmed. These show line selectors.
 *   4. `placeholderBuildings` = full research backlog reference list.
 *      Already-priced buildings are auto-filtered at runtime.
 *   5. FONT: Cormorant Garamond injected via Google Fonts useEffect.
 *      For Next.js App Router: replace useEffect with next/font/google.
 *
 * CHATGPT WORKFLOW — 10 buildings at a time:
 *   Paste this file + the instruction below into a new ChatGPT conversation:
 *   "Here is the Preppy Services widget. Audit the next 10 unverified buildings
 *   from the pricing object (those with empty `lines: {}` or missing from
 *   verifiedBuildings). For each: research the floor plan, add accurate line
 *   pricing, and add the building name to verifiedBuildings. Return ONLY the
 *   updated `pricing` object and `verifiedBuildings` array — nothing else."
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

type BuildingStatus = "raw" | "researched" | "mapped" | "priced" | "verified";
type ServiceType = "glass" | "painting" | "custom";

export default function PreppyLuxuryWidget() {
  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }
    })
  };

  const heroReveal = {
    hidden: { opacity: 0, filter: "blur(8px)", color: "#F5F1EA" },
    visible: (delay = 0) => ({
      opacity: 1,
      filter: "blur(0px)",
      color: "#0D1B24",
      transition: { duration: 1.35, delay, ease: [0.19, 1, 0.22, 1] }
    })
  };

  // ---------------------------------------------------------------------------
  // FONT INJECTION — Cormorant Garamond (luxury editorial serif)
  // Replace with next/font if using Next.js App Router
  // ---------------------------------------------------------------------------
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("preppy-cormorant")) return;
    const link = document.createElement("link");
    link.id = "preppy-cormorant";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap";
    document.head.appendChild(link);
  }, []);

  const BOOKING_URL = "https://calendar.app.google/97k4hgLwC48JXJJn8";
  const PAINTING_URL = "https://calendar.app.google/J4uMHEH2VTtuw8Xh8";
  const LIVE_AGENT_NUMBER = "+13054140305";

  // ---------------------------------------------------------------------------
  // PRICING — source of truth. ChatGPT audits 10 buildings at a time.
  // Empty lines: {} = floor plan not yet verified. Widget shows "pending" state.
  // ---------------------------------------------------------------------------
  

  // ---------------------------------------------------------------------------
  // VERIFIED BUILDINGS — floor plans confirmed, line selectors shown in widget
  // Add a building name here once its lines have been verified against actual
  // floor plan documents. Buildings not listed here show lines as "pending".
  // ---------------------------------------------------------------------------
  
  // ---------------------------------------------------------------------------
  // ADD-ON PRICING — interior glass add-on based on exterior base price
  // ---------------------------------------------------------------------------
 
  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------
  const sortLineLabels = (labels: string[]) => {
    const parseLabel = (label: string) => {
      const numMatch = label.match(/^(\d{2,4})(?:-?([A-Z]))?$/);
      if (numMatch) return { g: 0, n: parseInt(numMatch[1], 10), s: numMatch[2] || "" };
      if (/^TH-(\d{2})$/.test(label)) return { g: 1, n: parseInt(label.slice(3), 10), s: "" };
      if (/^PH(\d+)?$/.test(label)) return { g: 2, n: parseInt(label.slice(2) || "0", 10), s: "" };
      if (/^UPH(\d+)$/.test(label)) return { g: 3, n: parseInt(label.slice(3), 10), s: "" };
      if (/^LPH(\d+)$/.test(label)) return { g: 4, n: parseInt(label.slice(3), 10), s: "" };
      return { g: 9, n: 99999, s: label };
    };
    return [...labels].sort((a, b) => {
      const A = parseLabel(a), B = parseLabel(b);
      if (A.g !== B.g) return A.g - B.g;
      if (A.n !== B.n) return A.n - B.n;
      return A.s.localeCompare(B.s);
    });
  };

  const buildings = Object.keys(pricing).sort((a, b) => a.localeCompare(b));

  // ---------------------------------------------------------------------------
  // URL PARAMETER READING (SSR-safe, runs once on mount)
  // ---------------------------------------------------------------------------
  const initialParams = React.useMemo(() => {
    if (typeof window === "undefined") {
      return { building: null as string | null, line: "", unit: null as string | null, lead: null as string | null, name: null as string | null, interior: false, service: null as string | null };
    }
    const p = new URLSearchParams(window.location.search);
    const rawB = p.get("b") || p.get("building");
    let matchedB: string | null = null;
    if (rawB) {
      const norm = rawB.trim().toLowerCase();
      matchedB = buildings.find((n) => n.toLowerCase() === norm) || null;
    }
    const rawLine = p.get("line") || p.get("l") || "";
    const resolvedLine = matchedB && rawLine && pricing[matchedB]?.lines[rawLine] !== undefined ? rawLine : "";
    const intP = p.get("interior");
    return {
      building: matchedB,
      line: resolvedLine,
      unit: p.get("unit") || p.get("u"),
      lead: p.get("lead"),
      name: p.get("name"),
      interior: (intP === "1" || intP === "true") && !!resolvedLine,
      service: p.get("service"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const resolvedService: ServiceType =
    initialParams.service === "painting" ? "painting"
    : initialParams.service === "custom" ? "custom"
    : "glass";

  const [serviceType, setServiceType] = React.useState<ServiceType>(resolvedService);
  const [building, setBuilding] = React.useState<string>(initialParams.building || buildings[0] || "");
  const [unitLine, setUnitLine] = React.useState<string>(initialParams.line);
  const [includeInterior, setIncludeInterior] = React.useState<boolean>(initialParams.interior);
  const [customDescription, setCustomDescription] = React.useState<string>("");
  const [showSupport, setShowSupport] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [buildingQuery, setBuildingQuery] = React.useState("");
  const [showBuildingDropdown, setShowBuildingDropdown] = React.useState(false);
  const buildingInputRef = React.useRef<HTMLInputElement>(null);
  const buildingDropdownRef = React.useRef<HTMLDivElement>(null);

  const unitNumber = initialParams.unit;
  const leadId = initialParams.lead;
  const customerName = initialParams.name;
  const didMount = React.useRef(false);

  const currentBuilding = pricing[building];
  const hasLines = currentBuilding ? Object.keys(currentBuilding.lines).length > 0 : false;
  const lineOptions = hasLines ? sortLineLabels(Object.keys(currentBuilding.lines)) : [];

  React.useEffect(() => {
    if (typeof navigator !== "undefined") setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (buildingDropdownRef.current && !buildingDropdownRef.current.contains(e.target as Node) &&
          buildingInputRef.current && !buildingInputRef.current.contains(e.target as Node)) {
        setShowBuildingDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredBuildings = React.useMemo(() => {
  const q = buildingQuery.trim().toLowerCase();
  if (!q) return buildings;
  return buildings.filter((n) => n.toLowerCase().includes(q));
}, [buildingQuery, buildings]);

  React.useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    setUnitLine(""); setIncludeInterior(false);
  }, [building]);

  React.useEffect(() => {
    if (serviceType !== "glass") setIncludeInterior(false);
  }, [serviceType]);

  const basePrice = unitLine && currentBuilding ? currentBuilding.lines[unitLine] ?? null : null;
  const interiorAddOn = basePrice ? addOnPricing[basePrice] ?? 0 : 0;
  const total = basePrice ? basePrice + (includeInterior ? interiorAddOn : 0) : null;

  const scheduleUrl = React.useMemo(() => {
    const base = serviceType === "painting" ? PAINTING_URL : BOOKING_URL;
    const p = new URLSearchParams();
    if (leadId) p.set("lead", leadId);
    if (building) p.set("building", building);
    if (unitLine) p.set("line", unitLine);
    if (unitNumber) p.set("unit", unitNumber);
    if (total) p.set("quote", String(total));
    if (customerName) p.set("name", customerName);
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  }, [serviceType, leadId, building, unitLine, unitNumber, total, customerName]);

  const buildIMessageURL = React.useCallback((mode: "question" | "photo" | "custom") => {
    const parts: string[] = ["Hi Preppy —"];
    const ctx: string[] = [];
    if (customerName) ctx.push(`this is ${customerName}`);
    if (building && building !== buildings[0]) ctx.push(`at ${building}`);
    if (unitNumber) ctx.push(`unit ${unitNumber}`);
    else if (unitLine) ctx.push(`line ${unitLine}`);
    if (ctx.length) parts.push(ctx.join(", ") + ".");
    if (mode === "custom") parts.push(customDescription.trim() || "I'd like a custom quote — details to follow.");
    else if (mode === "photo") parts.push("Sending photos for a quote.");
    else parts.push("Quick question:");
    return `sms:${LIVE_AGENT_NUMBER}?&body=${encodeURIComponent(parts.join(" "))}`;
  }, [customerName, building, buildings, unitNumber, unitLine, customDescription]);

  const handleBookingClick = React.useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const record = { t: Date.now(), lead: leadId, name: customerName, building, line: unitLine, unit: unitNumber, service: serviceType, quote: total, interior: includeInterior };
      const existing = JSON.parse(window.localStorage.getItem("preppy_clicks") || "[]");
      existing.push(record);
      window.localStorage.setItem("preppy_clicks", JSON.stringify(existing.slice(-200)));
    } catch { /* localStorage blocked in private/SSR — safe to ignore */ }
  }, [leadId, customerName, building, unitLine, unitNumber, serviceType, total, includeInterior]);

  const hasPersonalization = !!(customerName || unitNumber);
  const personalizationLabel = [customerName, unitNumber ? `Unit ${unitNumber}` : null].filter(Boolean).join(" · ");
  const pricedCount = Object.values(researchStatus).filter(s => s === "verified" || s === "priced").length;
  const pendingCount = Object.values(researchStatus).filter(s => s === "raw").length;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#0D1B24] px-4 py-7 md:py-9">
      <div className="mx-auto max-w-[460px]">
        <div className="mb-6 text-center">
          <motion.div initial="hidden" animate="visible" custom={0.45} variants={heroReveal}
            className="mt-1 text-5xl md:text-6xl leading-none"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, letterSpacing: "-0.02em" }}>
            Preppy Services
          </motion.div>
          <motion.div initial="hidden" animate="visible" custom={1.05} variants={heroReveal}
            className="mt-3 text-[22px] md:text-2xl font-medium tracking-tight text-[#243740]">
            Luxury Home Services
          </motion.div>
          <motion.div initial="hidden" animate="visible" custom={1.45} variants={fadeUp}
            className="mt-3 text-[12px] md:text-sm uppercase tracking-[0.24em] text-[#5B6870]">
            Fully Insured
          </motion.div>
        </div>

        {hasPersonalization && (
          <motion.div initial="hidden" animate="visible" custom={1.6} variants={fadeUp}
            className="mb-5 rounded-2xl border border-[#EAE1D7] bg-white/90 px-4 py-3 text-center shadow-[0_4px_18px_rgba(13,27,36,0.05)]">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#5A6972]">Prepared for</div>
            <div className="mt-1 text-[16px] font-medium tracking-tight text-[#0D1B24]">{personalizationLabel}</div>
          </motion.div>
        )}

        <div className="overflow-hidden rounded-[28px] border border-[#E8E0D6] bg-white shadow-[0_12px_40px_rgba(13,27,36,0.08)]">
          <div className="h-1.5 bg-gradient-to-r from-[#0D1B24] via-[#0F7C82] to-[#123F52]" />
          <div className="h-px bg-gradient-to-r from-transparent via-[#C5A572] to-transparent opacity-60" />

          <div className="p-5 md:p-6">
            <div className="space-y-5">
              {/* Service badge */}
              <div className="rounded-2xl border border-[#EAE1D7] bg-[#FCFAF7] px-4 py-3 text-center">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#5A6972]">
                  {serviceType === "painting" ? "Interior Painting Consultation" : serviceType === "custom" ? "Custom Job — Direct Quote" : "Balcony Glass Detailing"}
                </div>
              </div>

              {/* Service pills */}
              <div>
                <label className="mb-2 block text-[12px] uppercase tracking-[0.22em] text-[#5A6972]">Service</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "glass" as const, label: "Balcony Glass", sub: "Detailing" },
                    { id: "painting" as const, label: "Interior Paint", sub: "Consultation" },
                    { id: "custom" as const, label: "Custom Job", sub: "Text & photos" },
                  ]).map((s) => {
                    const active = serviceType === s.id;
                    return (
                      <button key={s.id} type="button" onClick={() => setServiceType(s.id)}
                        className={`rounded-2xl border px-3 py-3 text-center transition ${active ? "border-[#0F7C82] bg-white shadow-[0_6px_20px_rgba(15,124,130,0.12)]" : "border-[#E6DED4] bg-[#FBFAF8] hover:border-[#D8CEBF]"}`}>
                        <div className={`text-[14px] font-semibold tracking-tight ${active ? "text-[#0D1B24]" : "text-[#4A5A64]"}`}>{s.label}</div>
                        <div className={`mt-0.5 text-[10px] uppercase tracking-[0.18em] ${active ? "text-[#0F7C82]" : "text-[#8B9399]"}`}>{s.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Building typeahead */}
              <div className="relative">
                <label className="mb-2 block text-[12px] uppercase tracking-[0.22em] text-[#5A6972]">Select Residence</label>
                <input
                  ref={buildingInputRef}
                  type="text"
                  value={showBuildingDropdown ? buildingQuery : building}
                  onChange={(e) => { setBuildingQuery(e.target.value); setShowBuildingDropdown(true); }}
                  onFocus={() => { setBuildingQuery(""); setShowBuildingDropdown(true); }}
                  placeholder="Search by building name…"
                  className="w-full rounded-2xl border border-[#E6DED4] bg-[#FBFAF8] px-4 py-3 text-[16px] font-medium outline-none transition focus:border-[#0F7C82] focus:bg-white"
                />
                <AnimatePresence>
                  {showBuildingDropdown && filteredBuildings.length > 0 && (
                    <motion.div ref={buildingDropdownRef}
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-[#E8E0D6] bg-white shadow-[0_16px_40px_rgba(13,27,36,0.14)]">
                      <div className="max-h-[240px] overflow-y-auto overscroll-contain py-1.5">
                        {filteredBuildings.map((name) => (
                          <button key={name} type="button"
                            onMouseDown={(e) => { e.preventDefault(); setBuilding(name); setBuildingQuery(""); setShowBuildingDropdown(false); }}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-[#F7F3EE]">
                            <span className="text-[15px] font-medium text-[#0D1B24]">{name}</span>
                            <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] font-semibold ${
                              researchStatus[name] === "verified" ? "bg-[#E6F5F5] text-[#0F7C82]"
                              : researchStatus[name] === "priced" ? "bg-[#EEF3F5] text-[#4A7080]"
                              : "bg-[#F3EFE9] text-[#8B7355]"
                            }`}>{researchStatus[name]}</span>
                          </button>
                        ))}
                      </div>
                      {!buildingQuery && (
                        <div className="border-t border-[#F0EBE4] px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-[#9BA6AF]">
                          {buildings.length} residences · Type to filter
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="mt-2 flex items-center justify-between text-[12px] text-[#66747C]">
                  <span>{researchStatus[building] === "verified" ? "Verified · Pricing confirmed" : researchStatus[building] === "priced" ? "Pricing available" : "Floor plan research in progress"}</span>
                  <span className="rounded-full border border-[#E4DACE] bg-white px-2.5 py-1 uppercase tracking-[0.14em] text-[10px] font-semibold text-[#0F7C82]">{researchStatus[building]}</span>
                </div>
              </div>

              {/* Unit line selector */}
              <div>
                <label className="mb-2 block text-[12px] uppercase tracking-[0.22em] text-[#5A6972]">
                  {unitNumber ? `Unit ${unitNumber} — Line` : "Select Unit / Line"}
                </label>
                <select
                  className="w-full rounded-2xl border border-[#E6DED4] bg-[#FBFAF8] px-4 py-3 text-[18px] font-medium outline-none focus:border-[#0F7C82]"
                  value={unitLine} onChange={(e) => setUnitLine(e.target.value)} disabled={!hasLines}>
                  <option value="">{hasLines ? "Choose line" : "Research in progress"}</option>
                  {lineOptions.map((line) => <option key={line} value={line}>{line}</option>)}
                </select>
              </div>

              {/* Service-specific content */}
              {serviceType === "glass" ? (
                <div>
                  <div className="mb-2 block text-[12px] uppercase tracking-[0.22em] text-[#5A6972]">Services</div>
                  <div className="rounded-2xl border border-[#ECE5DB] bg-[#FFFEFC] px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[18px] font-semibold">Complete Balcony Glass &amp; Frame Detailing</div>
                        <div className="mt-1 text-[12px] uppercase tracking-[0.2em] text-[#6B7880]">Exterior</div>
                      </div>
                      <div className="pt-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0F7C82]">Included</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => unitLine && setIncludeInterior((v) => !v)}
                    className={`mt-3 w-full rounded-2xl border px-4 py-4 text-left transition ${!unitLine ? "border-[#F0E9E0] bg-[#FBFAF8] opacity-60" : includeInterior ? "border-[#B6D9D8] bg-[#F3FBFB]" : "border-[#ECE5DB] bg-[#FFFEFC]"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[18px] font-semibold">Full Interior Glass Detailing</div>
                        <div className="mt-1 text-[12px] uppercase tracking-[0.2em] text-[#6B7880]">Add-on</div>
                      </div>
                      <div className="pt-1 text-sm font-medium text-[#0F7C82]">{basePrice ? `+ $${interiorAddOn}` : "Select unit first"}</div>
                    </div>
                  </button>
                </div>
              ) : serviceType === "painting" ? (
                <div>
                  <div className="mb-2 block text-[12px] uppercase tracking-[0.22em] text-[#5A6972]">Consultation</div>
                  <div className="rounded-2xl border border-[#ECE5DB] bg-[#FFFEFC] px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[18px] font-semibold">Interior Paint Consultation</div>
                        <div className="mt-1 text-[12px] uppercase tracking-[0.2em] text-[#6B7880]">15-minute walkthrough</div>
                      </div>
                      <div className="pt-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0F7C82]">Schedule</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-2 block text-[12px] uppercase tracking-[0.22em] text-[#5A6972]">Tell us what you need</div>
                  <textarea value={customDescription} onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Describe the job — rooms, surfaces, condition, timing. Photos welcome via text."
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-[#E6DED4] bg-[#FBFAF8] px-4 py-3 text-[15px] leading-relaxed outline-none transition focus:border-[#0F7C82] focus:bg-white" />
                  <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#8B9399]">
                    Tapping send opens Messages with your building &amp; unit already filled in.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Price card + CTAs */}
          <div className="border-t border-[#EFE7DD] bg-[#FCFAF7] px-5 py-5 md:px-6">
            {serviceType === "custom" ? (
              <div className="rounded-2xl border border-[#ECE3D8] bg-white px-4 py-5 text-center shadow-sm">
                <div className="text-[13px] uppercase tracking-[0.22em] text-[#6B7880]">Direct quote</div>
                <div className="mt-2 text-[22px] font-semibold tracking-tight leading-snug">Send your details — we'll reply with a tailored quote.</div>
                <div className="mt-2 text-[13px] text-[#5E6C75]">Photos, floor plan, scope — whatever you have.</div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#ECE3D8] bg-white px-4 py-4 shadow-sm">
                {serviceType === "painting" ? (
                  <div className="text-center">
                    <div className="text-[13px] uppercase tracking-[0.22em] text-[#6B7880]">Private consultation</div>
                    <div className="mt-2 text-[24px] font-semibold tracking-tight">Reserve your 15-minute consultation</div>
                  </div>
                ) : !hasLines ? (
                  <div className="text-center">
                    <div className="text-[16px] text-[#5E6C75]">This residence is being finalized for line-specific pricing.</div>
                    <div className="mt-2 text-[14px] text-[#0F7C82]">Text us for a private quote.</div>
                  </div>
                ) : !unitLine ? (
                  <div className="text-center text-[16px] text-[#5E6C75]">Select your residence and unit line to view pricing</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2 text-[15px]">
                      <span className="text-[#5A6972]">Exterior detailing</span>
                      <span className="flex-1 translate-y-[-3px] border-b border-dotted border-[#D7CEC2]" />
                      <span className="font-semibold text-[#0D1B24]">${basePrice}</span>
                    </div>
                    {includeInterior && (
                      <div className="flex items-baseline gap-2 text-[15px]">
                        <span className="text-[#5A6972]">Interior add-on</span>
                        <span className="flex-1 translate-y-[-3px] border-b border-dotted border-[#D7CEC2]" />
                        <span className="font-semibold text-[#0D1B24]">+ ${interiorAddOn}</span>
                      </div>
                    )}
                    <div className="h-px bg-[#EFE7DD]" />
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] uppercase tracking-[0.22em] text-[#6B7880]">Estimated total</span>
                      <motion.span key={total ?? "empty"}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="text-[30px] font-semibold tracking-tight text-[#0D1B24]">
                        ${total}
                      </motion.span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {serviceType === "custom" ? (
              <a href={buildIMessageURL("custom")} onClick={handleBookingClick}
                className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#103845] px-5 py-4 text-[18px] font-semibold tracking-tight text-white shadow-[0_12px_28px_rgba(16,56,69,0.18)] transition duration-200 hover:bg-[#123F4D]">
                Send via iMessage
              </a>
            ) : (
              <a href={scheduleUrl} target="_blank" rel="noopener noreferrer" onClick={handleBookingClick}
                className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#103845] px-5 py-4 text-[18px] font-semibold tracking-tight text-white shadow-[0_12px_28px_rgba(16,56,69,0.18)] transition duration-200 hover:bg-[#123F4D]">
                {serviceType === "painting" ? "Reserve Consultation" : "Check Availability"}
              </a>
            )}

            {isMobile ? (
              <a href={buildIMessageURL(serviceType === "custom" ? "custom" : "photo")}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D8CEBF] bg-white px-5 py-3.5 text-[15px] font-medium tracking-tight text-[#0D1B24] transition hover:border-[#C5A572] hover:bg-[#FDFCF9]">
                <span className="text-[#0F7C82]">✉</span>
                Text us · Send a photo
              </a>
            ) : (
              <button type="button" onClick={() => setShowSupport(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D8CEBF] bg-white px-5 py-3.5 text-[15px] font-medium tracking-tight text-[#0D1B24] transition hover:border-[#C5A572] hover:bg-[#FDFCF9]">
                <span className="text-[#0F7C82]">✉</span>
                Text us · Send a photo
              </button>
            )}
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-[#E8E0D6] bg-white/80">
          <div className="h-px bg-gradient-to-r from-transparent via-[#C5A572] to-transparent opacity-60" />
          <div className="grid grid-cols-3 divide-x divide-[#EEE7DD] py-4">
            {[
              { label: "White Glove", sub: "Service" },
              { label: "$2M Coverage", sub: "Liability" },
              { label: "Same Week", sub: "Booking" },
            ].map((item) => (
              <div key={item.label} className="px-3 py-1 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ background: "linear-gradient(135deg, #C5A572 0%, #A8884E 50%, #C5A572 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {item.label}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[#8B9399]">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-5 text-center text-[11px] uppercase tracking-[0.28em] text-[#9BA6AF]">
          Miami · Miami Beach
        </div>
      </div>

      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl">
            <div className="text-3xl tracking-tight text-[#0D1B24]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400 }}>
              Text us a photo
            </div>
            <div className="mt-3 text-[#4E5C64]">For penthouses, custom layouts, or buildings still being mapped. Send photos for a faster quote.</div>
            <div className="mt-5 rounded-2xl border border-[#E7DED3] bg-[#FAF8F4] px-4 py-3 text-lg font-medium">{LIVE_AGENT_NUMBER}</div>
            <div className="mt-5 flex gap-3">
              <button className="flex-1 rounded-2xl border border-[#E7DED3] px-4 py-3 font-medium"
                onClick={() => navigator.clipboard.writeText(LIVE_AGENT_NUMBER)}>Copy Number</button>
              <button className="flex-1 rounded-2xl bg-[#103845] px-4 py-3 font-medium text-white"
                onClick={() => setShowSupport(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
