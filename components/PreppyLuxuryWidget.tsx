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
 *   ?unit=3204             Unit number — if ?line= omitted, widget attempts
 *                          a CONSERVATIVE derivation (last-two-digits rule
 *                          for standard floorplans only; PH / UPH / LPH / TH
 *                          and irregular units never auto-map).
 *   ?lead=A1042            Lead ID for conversion tracking (stored locally + forwarded)
 *   ?name=Alex             Customer first name for personalization
 *   ?interior=1            Pre-toggle interior add-on (requires a valid line)
 *   ?service=painting      Land on painting consultation mode instead of glass
 *   ?service=custom        Land on custom job mode
 *   ?lang=en|es|fr         Override display language. Falls back to navigator.language.
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
type Lang = "en" | "es" | "fr";

const I18N: Record<Lang, Record<string, string>> = {
  en: {
    "brand.title": "Preppy Services",
    "brand.subtitle": "Luxury Home Services",
    "brand.insured": "Fully Insured",
    "preparedFor": "Prepared for",
    "service.label": "Service",
    "service.glass.title": "Balcony Glass",
    "service.glass.sub": "Detailing",
    "service.painting.title": "Interior Paint",
    "service.painting.sub": "Quote",
    "service.custom.title": "Custom Job",
    "service.custom.sub": "Pics | Chat",
    "badge.glass": "Balcony Glass Detailing",
    "badge.painting": "Interior Painting Consultation",
    "badge.custom": "Custom Job — Direct Quote",
    "selectResidence": "Select Residence",
    "search.placeholder": "Search by building name…",
    "search.footer": "{count} residences · Type to filter",
    "status.verified": "Verified · Pricing confirmed",
    "status.priced": "Pricing available",
    "status.raw": "Floor plan research in progress",
    "unit.labelWithUnit": "Unit {unit} — Line",
    "unit.label": "Select Unit / Line",
    "unit.chooseLine": "Choose line",
    "unit.pending": "Research in progress",
    "unit.autoDetectedLast2": "Line {line} detected from unit {unit} — tap to change",
    "unit.autoDetectedExact": "Matched unit {unit} · Line {line}",
    "services.header": "Services",
    "glass.complete": "Complete Balcony Glass & Frame Detailing",
    "glass.exterior": "Exterior",
    "glass.included": "Included",
    "glass.interior": "Full Interior Glass Detailing",
    "glass.addon": "Add-on",
    "glass.selectUnitFirst": "Select unit first",
    "paint.header": "Consultation",
    "paint.title": "Interior Paint Consultation",
    "paint.walkthrough": "15-minute walkthrough",
    "paint.schedule": "Schedule",
    "custom.header": "Tell us what you need",
    "custom.placeholder":
      "Describe your job — install window treatments, change light fixtures, change out all light bulbs to a warmer color, sync smart home automations, pressure washing, floor polishing, specialty cleaning, post-construction detailing, maintenance scheduling while traveling, and more. Send pics and schedule an on-site walkthrough.",
    "custom.tappingSend": "Tapping send opens Messages with your building & unit already filled in.",
    "price.directQuote": "Direct quote",
    "price.directHeadline": "Send your details — we'll reply with a tailored quote.",
    "price.directSub": "Photos, floor plan, scope — whatever you have.",
    "price.private": "Private consultation",
    "price.reserveHeadline": "Discuss your project on-site.",
    "price.reserveSub": "Finalize details, get quote and coordinate scheduling.",
    "price.residenceFinalizing": "This residence is being finalized for line-specific pricing.",
    "price.textPrivate": "Text us for a private quote.",
    "price.selectResidenceFirst": "Select your residence and unit line to view pricing",
    "price.exterior": "Exterior detailing",
    "price.interiorAddon": "Interior add-on",
    "price.estimated": "Estimated total",
    "cta.sendImessage": "Send via iMessage",
    "cta.checkAvailability": "Check Availability",
    "cta.reserveConsultation": "Reserve On-Site Walkthrough",
    "cta.textSendPhoto": "Text us · Send a photo",
    "trust.whiteGlove": "White Glove",
    "trust.whiteGlove.sub": "Service",
    "trust.coverage": "$2M Coverage",
    "trust.coverage.sub": "Liability",
    "trust.sameWeek": "Same Week",
    "trust.sameWeek.sub": "Booking",
    "footer.region": "Miami · Miami Beach",
    "support.title": "Text us a photo",
    "support.sub": "For penthouses, custom layouts, or buildings still being mapped. Send photos for a faster quote.",
    "support.copy": "Copy Number",
    "support.close": "Close",
  },
  es: {
    "brand.title": "Preppy Services",
    "brand.subtitle": "Servicios de Lujo para el Hogar",
    "brand.insured": "Totalmente Asegurado",
    "preparedFor": "Preparado para",
    "service.label": "Servicio",
    "service.glass.title": "Cristal de Balcón",
    "service.glass.sub": "Detallado",
    "service.painting.title": "Pintura Interior",
    "service.painting.sub": "Cotizar",
    "service.custom.title": "Trabajo a Medida",
    "service.custom.sub": "Fotos | Chat",
    "badge.glass": "Detallado de Cristal de Balcón",
    "badge.painting": "Consulta de Pintura Interior",
    "badge.custom": "Trabajo a Medida — Cotización Directa",
    "selectResidence": "Seleccione Residencia",
    "search.placeholder": "Buscar por nombre del edificio…",
    "search.footer": "{count} residencias · Escriba para filtrar",
    "status.verified": "Verificado · Precios confirmados",
    "status.priced": "Precios disponibles",
    "status.raw": "Investigación de planos en curso",
    "unit.labelWithUnit": "Unidad {unit} — Línea",
    "unit.label": "Seleccionar Unidad / Línea",
    "unit.chooseLine": "Elegir línea",
    "unit.pending": "Investigación en curso",
    "unit.autoDetectedLast2": "Línea {line} detectada de la unidad {unit} — toque para cambiar",
    "unit.autoDetectedExact": "Unidad {unit} coincidente · Línea {line}",
    "services.header": "Servicios",
    "glass.complete": "Detallado Completo de Cristal y Marco del Balcón",
    "glass.exterior": "Exterior",
    "glass.included": "Incluido",
    "glass.interior": "Detallado Completo de Cristal Interior",
    "glass.addon": "Complemento",
    "glass.selectUnitFirst": "Seleccione unidad primero",
    "paint.header": "Consulta",
    "paint.title": "Consulta de Pintura Interior",
    "paint.walkthrough": "Recorrido de 15 minutos",
    "paint.schedule": "Agendar",
    "custom.header": "Cuéntenos qué necesita",
    "custom.placeholder": "Describa el trabajo — habitaciones, superficies, estado, fechas. Fotos bienvenidas por mensaje.",
    "custom.tappingSend": "Al enviar se abre Mensajes con su edificio y unidad ya completados.",
    "price.directQuote": "Cotización directa",
    "price.directHeadline": "Envíenos los detalles — responderemos con una cotización personalizada.",
    "price.directSub": "Fotos, plano, alcance — lo que tenga.",
    "price.private": "Consulta privada",
    "price.reserveHeadline": "Converse sobre su proyecto en sitio.",
    "price.reserveSub": "Finalize detalles, reciba una cotización y coordine la programación.",
    "price.residenceFinalizing": "Esta residencia está siendo finalizada para precios por línea.",
    "price.textPrivate": "Escríbanos para una cotización privada.",
    "price.selectResidenceFirst": "Seleccione residencia y línea de unidad para ver precios",
    "price.exterior": "Detallado exterior",
    "price.interiorAddon": "Complemento interior",
    "price.estimated": "Total estimado",
    "cta.sendImessage": "Enviar por iMessage",
    "cta.checkAvailability": "Ver Disponibilidad",
    "cta.reserveConsultation": "Reservar Visita en Sitio",
    "cta.textSendPhoto": "Escríbanos · Envíe una foto",
    "trust.whiteGlove": "Guante Blanco",
    "trust.whiteGlove.sub": "Servicio",
    "trust.coverage": "Cobertura $2M",
    "trust.coverage.sub": "Responsabilidad",
    "trust.sameWeek": "Misma Semana",
    "trust.sameWeek.sub": "Reserva",
    "footer.region": "Miami · Miami Beach",
    "support.title": "Envíenos una foto",
    "support.sub": "Para penthouses, diseños a medida o edificios en mapeo. Envíe fotos para una cotización más rápida.",
    "support.copy": "Copiar Número",
    "support.close": "Cerrar",
  },
  fr: {
    "brand.title": "Preppy Services",
    "brand.subtitle": "Services de Luxe pour la Maison",
    "brand.insured": "Entièrement Assuré",
    "preparedFor": "Préparé pour",
    "service.label": "Service",
    "service.glass.title": "Verre de Balcon",
    "service.glass.sub": "Détaillage",
    "service.painting.title": "Peinture Intérieure",
    "service.painting.sub": "Devis",
    "service.custom.title": "Travail Sur Mesure",
    "service.custom.sub": "Photos | Chat",
    "badge.glass": "Détaillage du Verre de Balcon",
    "badge.painting": "Consultation de Peinture Intérieure",
    "badge.custom": "Travail Sur Mesure — Devis Direct",
    "selectResidence": "Sélectionner la Résidence",
    "search.placeholder": "Rechercher par nom de bâtiment…",
    "search.footer": "{count} résidences · Tapez pour filtrer",
    "status.verified": "Vérifié · Tarifs confirmés",
    "status.priced": "Tarifs disponibles",
    "status.raw": "Recherche de plan en cours",
    "unit.labelWithUnit": "Unité {unit} — Ligne",
    "unit.label": "Sélectionner Unité / Ligne",
    "unit.chooseLine": "Choisir la ligne",
    "unit.pending": "Recherche en cours",
    "unit.autoDetectedLast2": "Ligne {line} détectée de l'unité {unit} — touchez pour changer",
    "unit.autoDetectedExact": "Unité {unit} correspondante · Ligne {line}",
    "services.header": "Services",
    "glass.complete": "Détaillage Complet du Verre et Cadre de Balcon",
    "glass.exterior": "Extérieur",
    "glass.included": "Inclus",
    "glass.interior": "Détaillage Complet du Verre Intérieur",
    "glass.addon": "Option",
    "glass.selectUnitFirst": "Sélectionnez l'unité d'abord",
    "paint.header": "Consultation",
    "paint.title": "Consultation de Peinture Intérieure",
    "paint.walkthrough": "Visite de 15 minutes",
    "paint.schedule": "Planifier",
    "custom.header": "Dites-nous ce dont vous avez besoin",
    "custom.placeholder": "Décrivez le travail — pièces, surfaces, état, délais. Photos bienvenues par message.",
    "custom.tappingSend": "En appuyant sur envoyer, Messages s'ouvre avec votre bâtiment et unité déjà remplis.",
    "price.directQuote": "Devis direct",
    "price.directHeadline": "Envoyez vos détails — nous répondrons avec un devis sur mesure.",
    "price.directSub": "Photos, plan, portée — tout ce que vous avez.",
    "price.private": "Consultation privée",
    "price.reserveHeadline": "Discutez de votre projet sur place.",
    "price.reserveSub": "Finalisez les détails, obtenez un devis et coordonnez la planification.",
    "price.residenceFinalizing": "Cette résidence est en cours de finalisation pour les tarifs par ligne.",
    "price.textPrivate": "Écrivez-nous pour un devis privé.",
    "price.selectResidenceFirst": "Sélectionnez votre résidence et ligne d'unité pour voir les tarifs",
    "price.exterior": "Détaillage extérieur",
    "price.interiorAddon": "Option intérieure",
    "price.estimated": "Total estimé",
    "cta.sendImessage": "Envoyer via iMessage",
    "cta.checkAvailability": "Vérifier la Disponibilité",
    "cta.reserveConsultation": "Réserver la Visite sur Place",
    "cta.textSendPhoto": "Écrivez-nous · Envoyez une photo",
    "trust.whiteGlove": "Gant Blanc",
    "trust.whiteGlove.sub": "Service",
    "trust.coverage": "Couverture 2M$",
    "trust.coverage.sub": "Responsabilité",
    "trust.sameWeek": "Même Semaine",
    "trust.sameWeek.sub": "Réservation",
    "footer.region": "Miami · Miami Beach",
    "support.title": "Envoyez-nous une photo",
    "support.sub": "Pour les penthouses, agencements sur mesure ou bâtiments en cours de cartographie. Envoyez des photos pour un devis plus rapide.",
    "support.copy": "Copier le Numéro",
    "support.close": "Fermer",
  },
};

function translate(key: string, lang: Lang, vars?: Record<string, string | number>): string {
  const tmpl = I18N[lang]?.[key] ?? I18N.en[key] ?? key;
  if (!vars) return tmpl;
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    tmpl
  );
}

function resolveUnitToLine(
  unit: string | null | undefined,
  buildingName: string
): { line: string; source: "exact" | "last2" | "none" } {
  if (!unit || !buildingName) return { line: "", source: "none" };
  const lines = pricing[buildingName]?.lines;
  if (!lines) return { line: "", source: "none" };
  const u = unit.trim().toUpperCase();
  if (!u) return { line: "", source: "none" };

  if (lines[u] !== undefined) return { line: u, source: "exact" };

  if (/^(PH|UPH|LPH|TH|TS|TOWNHOUSE|TOWNHOME|PENTHOUSE)/i.test(u)) {
    return { line: "", source: "none" };
  }

  if (!/^\d+$/.test(u)) return { line: "", source: "none" };

  if (/^\d{3,5}$/.test(u)) {
    const last2 = u.slice(-2);
    if (/^\d{2}$/.test(last2) && lines[last2] !== undefined) {
      return { line: last2, source: "last2" };
    }
  }

  if (/^\d{1,2}$/.test(u)) {
    const padded = u.padStart(2, "0");
    if (lines[padded] !== undefined) return { line: padded, source: "exact" };
  }

  return { line: "", source: "none" };
}

export default function PreppyLuxuryWidget() {
  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  const heroReveal = {
    hidden: { opacity: 0, filter: "blur(8px)", color: "#F5F1EA" },
    visible: (delay = 0) => ({
      opacity: 1,
      filter: "blur(0px)",
      color: "#0D1B24",
      transition: { duration: 1.35, delay, ease: [0.19, 1, 0.22, 1] },
    }),
  };

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("preppy-cormorant")) return;
    const link = document.createElement("link");
    link.id = "preppy-cormorant";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap";
    document.head.appendChild(link);
  }, []);

  const BOOKING_URL = "https://calendar.app.google/97k4hgLwC48JXJJn8";
  const PAINTING_URL = "https://calendar.app.google/J4uMHEH2VTtuw8Xh8";
  const LIVE_AGENT_NUMBER = "+13054140305";

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
      const A = parseLabel(a);
      const B = parseLabel(b);
      if (A.g !== B.g) return A.g - B.g;
      if (A.n !== B.n) return A.n - B.n;
      return A.s.localeCompare(B.s);
    });
  };

  const buildings = Object.keys(pricing).sort((a, b) => a.localeCompare(b));

  const initialParams = React.useMemo(() => {
    if (typeof window === "undefined") {
      return {
        building: null as string | null,
        line: "",
        lineSource: "none" as "none" | "url" | "exact" | "last2",
        unit: null as string | null,
        lead: null as string | null,
        name: null as string | null,
        interior: false,
        service: null as string | null,
        lang: "en" as Lang,
      };
    }

    const p = new URLSearchParams(window.location.search);
    const rawB = p.get("b") || p.get("building");
    let matchedB: string | null = null;

    if (rawB) {
      const norm = rawB.trim().toLowerCase();
      matchedB = buildings.find((n) => n.toLowerCase() === norm) || null;
    }

    const rawLine = p.get("line") || p.get("l") || "";
    let resolvedLine =
      matchedB && rawLine && pricing[matchedB]?.lines[rawLine] !== undefined ? rawLine : "";
    let lineSource: "none" | "url" | "exact" | "last2" = resolvedLine ? "url" : "none";

    const rawUnit = p.get("unit") || p.get("u");
    if (!resolvedLine && matchedB && rawUnit) {
      const attempt = resolveUnitToLine(rawUnit, matchedB);
      if (attempt.line) {
        resolvedLine = attempt.line;
        lineSource = attempt.source;
      }
    }

    const intP = p.get("interior");
    const rawLang = (p.get("lang") || "").toLowerCase().slice(0, 2);
    const navLang =
      typeof navigator !== "undefined" ? navigator.language.slice(0, 2).toLowerCase() : "en";

    const pickedLang: Lang = (
      ["en", "es", "fr"].includes(rawLang)
        ? rawLang
        : ["en", "es", "fr"].includes(navLang)
          ? navLang
          : "en"
    ) as Lang;

    return {
      building: matchedB,
      line: resolvedLine,
      lineSource,
      unit: rawUnit,
      lead: p.get("lead"),
      name: p.get("name"),
      interior: (intP === "1" || intP === "true") && !!resolvedLine,
      service: p.get("service"),
      lang: pickedLang,
    };
  }, [buildings]);

  const resolvedService: ServiceType =
    initialParams.service === "painting"
      ? "painting"
      : initialParams.service === "custom"
        ? "custom"
        : "glass";

  const [serviceType, setServiceType] = React.useState<ServiceType>(resolvedService);
  const [building, setBuilding] = React.useState<string>(initialParams.building || buildings[0] || "");
  const [unitLine, setUnitLine] = React.useState<string>(initialParams.line);
  const [lineSource, setLineSource] = React.useState<"none" | "url" | "exact" | "last2">(
    initialParams.lineSource
  );
  const [lang, setLang] = React.useState<Lang>(initialParams.lang);
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

  const currentBuilding = pricing[building];
  const hasLines = currentBuilding ? Object.keys(currentBuilding.lines).length > 0 : false;
  const lineOptions = hasLines ? sortLineLabels(Object.keys(currentBuilding.lines)) : [];

  const t = React.useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(key, lang, vars),
    [lang]
  );

  React.useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    }
  }, []);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        buildingDropdownRef.current &&
        !buildingDropdownRef.current.contains(e.target as Node) &&
        buildingInputRef.current &&
        !buildingInputRef.current.contains(e.target as Node)
      ) {
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
    setIncludeInterior(false);

    if (unitNumber) {
      const attempt = resolveUnitToLine(unitNumber, building);
      if (attempt.line) {
        setUnitLine(attempt.line);
        setLineSource(attempt.source);
        return;
      }
    }

    setUnitLine("");
    setLineSource("none");
  }, [building, unitNumber]);

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

  const buildIMessageURL = React.useCallback(
    (mode: "question" | "photo" | "custom") => {
      const parts: string[] = ["Hi Preppy —"];
      const ctx: string[] = [];
      if (customerName) ctx.push(`this is ${customerName}`);
      if (building && building !== buildings[0]) ctx.push(`at ${building}`);
      if (unitNumber) ctx.push(`unit ${unitNumber}`);
      else if (unitLine) ctx.push(`line ${unitLine}`);
      if (ctx.length) parts.push(ctx.join(", ") + ".");
      if (mode === "custom") {
        parts.push(customDescription.trim() || "I'd like a custom quote — details to follow.");
      } else if (mode === "photo") {
        parts.push("Sending photos for a quote.");
      } else {
        parts.push("Quick question:");
      }
      return `sms:${LIVE_AGENT_NUMBER}?&body=${encodeURIComponent(parts.join(" "))}`;
    },
    [customerName, building, buildings, unitNumber, unitLine, customDescription]
  );

  const handleBookingClick = React.useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const record = {
        t: Date.now(),
        lead: leadId,
        name: customerName,
        building,
        line: unitLine,
        unit: unitNumber,
        service: serviceType,
        quote: total,
        interior: includeInterior,
        lang,
      };
      const existing = JSON.parse(window.localStorage.getItem("preppy_clicks") || "[]");
      existing.push(record);
      window.localStorage.setItem("preppy_clicks", JSON.stringify(existing.slice(-200)));
    } catch {
      // safe to ignore
    }
  }, [leadId, customerName, building, unitLine, unitNumber, serviceType, total, includeInterior, lang]);

  const hasPersonalization = !!(customerName || unitNumber);
  const personalizationLabel = [customerName, unitNumber ? `Unit ${unitNumber}` : null]
    .filter(Boolean)
    .join(" · ");
  const statusKey =
    researchStatus[building] === "verified"
      ? "status.verified"
      : researchStatus[building] === "priced"
        ? "status.priced"
        : "status.raw";

  const showAutoDetectedHint = unitLine && (lineSource === "exact" || lineSource === "last2");

  return (
    <div className="relative min-h-screen bg-[#F5F1EA] text-[#0D1B24] px-4 py-7 md:py-9">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px]"
        style={{
          background:
            "radial-gradient(60% 70% at 50% 0%, rgba(197,165,114,0.14) 0%, rgba(197,165,114,0) 72%)",
        }}
      />

      <div className="relative mx-auto max-w-[460px]">
        <div className="mb-4 flex items-center justify-center gap-1.5">
          {(["en", "es", "fr"] as Lang[]).map((l) => {
            const active = lang === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-label={`Language ${l.toUpperCase()}`}
                aria-pressed={active}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] transition ${
                  active
                    ? "border-[#C5A572] bg-white text-[#0D1B24] shadow-[0_2px_10px_rgba(197,165,114,0.2)]"
                    : "border-[#EAE1D7] bg-white/60 text-[#8B9399] hover:border-[#D8CEBF] hover:text-[#5A6972]"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>

        <div className="mb-6 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0.45}
            variants={heroReveal}
            className="text-5xl md:text-6xl leading-none"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 300,
              letterSpacing: "-0.02em",
            }}
          >
            {t("brand.title")}
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={1.05}
            variants={heroReveal}
            className="mt-2.5 text-[22px] md:text-2xl font-medium tracking-tight text-[#243740]"
          >
            {t("brand.subtitle")}
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={1.45}
            variants={fadeUp}
            className="mt-2.5 text-[12px] md:text-sm uppercase tracking-[0.24em] text-[#5B6870]"
          >
            {t("brand.insured")}
          </motion.div>
        </div>

        {hasPersonalization && (
          <motion.div
            initial="hidden"
            animate="visible"
            custom={1.6}
            variants={fadeUp}
            className="mb-5 rounded-2xl border border-[#EAE1D7] bg-white/90 px-4 py-3 text-center shadow-[0_4px_18px_rgba(13,27,36,0.05)]"
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#5A6972]">
              {t("preparedFor")}
            </div>
            <div className="mt-1 text-[16px] font-medium tracking-tight text-[#0D1B24]">
              {personalizationLabel}
            </div>
          </motion.div>
        )}

        <div className="overflow-hidden rounded-[28px] border border-[#E8E0D6] bg-white shadow-[0_12px_40px_rgba(13,27,36,0.08)]">
          <div className="relative h-2 overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, #A77C3B 0%, #C8A76A 16%, #F2E5BE 32%, #C5A572 50%, #8F6A34 68%, #D8BC85 84%, #A77C3B 100%)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-px bg-white/40" />
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-[#E7D6AE] to-transparent opacity-90" />

          <div className="p-5 md:p-6">
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#EAE1D7] bg-[#FCFAF7] px-4 py-3 text-center">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#5A6972]">
                  {serviceType === "painting"
                    ? t("badge.painting")
                    : serviceType === "custom"
                      ? t("badge.custom")
                      : t("badge.glass")}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[12px] uppercase tracking-[0.22em] text-[#5A6972]">
                  {t("service.label")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "glass" as const, label: t("service.glass.title"), sub: t("service.glass.sub") },
                    { id: "painting" as const, label: t("service.painting.title"), sub: t("service.painting.sub") },
                    { id: "custom" as const, label: t("service.custom.title"), sub: t("service.custom.sub") },
                  ]).map((s) => {
                    const active = serviceType === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setServiceType(s.id)}
                        className={`rounded-2xl border px-3 py-3 text-center transition ${
                          active
                            ? "border-[#0F7C82] bg-white shadow-[0_6px_20px_rgba(15,124,130,0.12)]"
                            : "border-[#E6DED4] bg-[#FBFAF8] hover:border-[#D8CEBF]"
                        }`}
                      >
                        <div
                          className={`text-[14px] font-semibold tracking-tight ${
                            active ? "text-[#0D1B24]" : "text-[#4A5A64]"
                          }`}
                        >
                          {s.label}
                        </div>
                        <div
                          className={`mt-0.5 text-[10px] uppercase tracking-[0.18em] ${
                            active ? "text-[#0F7C82]" : "text-[#8B9399]"
                          }`}
                        >
                          {s.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative">
                <label className="mb-2 block text-[12px] uppercase tracking-[0.22em] text-[#5A6972]">
                  {t("selectResidence")}
                </label>
                <input
                  ref={buildingInputRef}
                  type="text"
                  value={showBuildingDropdown ? buildingQuery : building}
                  onChange={(e) => {
                    setBuildingQuery(e.target.value);
                    setShowBuildingDropdown(true);
                  }}
                  onFocus={() => {
                    setBuildingQuery("");
                    setShowBuildingDropdown(true);
                  }}
                  placeholder={t("search.placeholder")}
                  className="w-full rounded-2xl border border-[#E6DED4] bg-[#FBFAF8] px-4 py-3 text-[16px] font-medium outline-none transition focus:border-[#0F7C82] focus:bg-white"
                />
                <AnimatePresence>
                  {showBuildingDropdown && filteredBuildings.length > 0 && (
                    <motion.div
                      ref={buildingDropdownRef}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-[#E8E0D6] bg-white shadow-[0_16px_40px_rgba(13,27,36,0.14)]"
                    >
                      <div className="max-h-[240px] overflow-y-auto overscroll-contain py-1.5">
                        {filteredBuildings.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setBuilding(name);
                              setBuildingQuery("");
                              setShowBuildingDropdown(false);
                            }}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-[#F7F3EE]"
                          >
                            <span className="text-[15px] font-medium text-[#0D1B24]">{name}</span>
                            <span
                              className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] font-semibold ${
                                researchStatus[name] === "verified"
                                  ? "bg-[#E6F5F5] text-[#0F7C82]"
                                  : researchStatus[name] === "priced"
                                    ? "bg-[#EEF3F5] text-[#4A7080]"
                                    : "bg-[#F3EFE9] text-[#8B7355]"
                              }`}
                            >
                              {researchStatus[name]}
                            </span>
                          </button>
                        ))}
                      </div>
                      {!buildingQuery && (
                        <div className="border-t border-[#F0EBE4] px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-[#9BA6AF]">
                          {t("search.footer", { count: buildings.length })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="mt-2 flex items-center justify-between text-[12px] text-[#66747C]">
                  <span>{t(statusKey)}</span>
                  <span className="rounded-full border border-[#E4DACE] bg-white px-2.5 py-1 uppercase tracking-[0.14em] text-[10px] font-semibold text-[#0F7C82]">
                    {researchStatus[building]}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[12px] uppercase tracking-[0.22em] text-[#5A6972]">
                  {unitNumber ? t("unit.labelWithUnit", { unit: unitNumber }) : t("unit.label")}
                </label>
                <select
                  className="w-full rounded-2xl border border-[#E6DED4] bg-[#FBFAF8] px-4 py-3 text-[18px] font-medium outline-none focus:border-[#0F7C82]"
                  value={unitLine}
                  onChange={(e) => {
                    setUnitLine(e.target.value);
                    setLineSource(e.target.value ? "url" : "none");
                  }}
                  disabled={!hasLines}
                >
                  <option value="">{hasLines ? t("unit.chooseLine") : t("unit.pending")}</option>
                  {lineOptions.map((line) => (
                    <option key={line} value={line}>
                      {line}
                    </option>
                  ))}
                </select>
                {showAutoDetectedHint && (
                  <div className="mt-2 text-[11px] tracking-[0.02em] text-[#8B9399]">
                    {lineSource === "last2"
                      ? t("unit.autoDetectedLast2", { line: unitLine, unit: unitNumber || "" })
                      : t("unit.autoDetectedExact", { line: unitLine, unit: unitNumber || "" })}
                  </div>
                )}
              </div>

              {serviceType === "glass" ? (
                <div>
                  <div className="mb-2 block text-[12px] uppercase tracking-[0.22em] text-[#5A6972]">
                    {t("services.header")}
                  </div>
                  <div className="rounded-2xl border border-[#ECE5DB] bg-[#FFFEFC] px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[18px] font-semibold">{t("glass.complete")}</div>
                        <div className="mt-1 text-[12px] uppercase tracking-[0.2em] text-[#6B7880]">
                          {t("glass.exterior")}
                        </div>
                      </div>
                      <div className="pt-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0F7C82]">
                        {t("glass.included")}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => unitLine && setIncludeInterior((v) => !v)}
                    className={`mt-3 w-full rounded-2xl border px-4 py-4 text-left transition ${
                      !unitLine
                        ? "border-[#F0E9E0] bg-[#FBFAF8] opacity-60"
                        : includeInterior
                          ? "border-[#B6D9D8] bg-[#F3FBFB]"
                          : "border-[#ECE5DB] bg-[#FFFEFC]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[18px] font-semibold">{t("glass.interior")}</div>
                        <div className="mt-1 text-[12px] uppercase tracking-[0.2em] text-[#6B7880]">
                          {t("glass.addon")}
                        </div>
                      </div>
                      <div className="pt-1 text-sm font-medium text-[#0F7C82]">
                        {basePrice ? `+ $${interiorAddOn}` : t("glass.selectUnitFirst")}
                      </div>
                    </div>
                  </button>
                </div>
              ) : serviceType === "painting" ? (
                <div>
                  <div className="mb-2 block text-[12px] uppercase tracking-[0.22em] text-[#5A6972]">
                    {t("paint.header")}
                  </div>
                  <div className="rounded-2xl border border-[#ECE5DB] bg-[#FFFEFC] px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[18px] font-semibold">{t("paint.title")}</div>
                        <div className="mt-1 text-[12px] uppercase tracking-[0.2em] text-[#6B7880]">
                          {t("paint.walkthrough")}
                        </div>
                      </div>
                      <div className="pt-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0F7C82]">
                        {t("paint.schedule")}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-2 block text-[12px] uppercase tracking-[0.22em] text-[#5A6972]">
                    {t("custom.header")}
                  </div>
                  <textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder={t("custom.placeholder")}
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-[#E6DED4] bg-[#FBFAF8] px-4 py-3 text-[15px] leading-relaxed outline-none transition focus:border-[#0F7C82] focus:bg-white"
                  />
                  <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#8B9399]">
                    {t("custom.tappingSend")}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[#EFE7DD] bg-[#FCFAF7] px-5 py-5 md:px-6">
            {serviceType === "custom" ? (
              <div className="rounded-2xl border border-[#ECE3D8] bg-white px-4 py-5 text-center shadow-sm">
                <div className="text-[13px] uppercase tracking-[0.22em] text-[#6B7880]">
                  {t("price.directQuote")}
                </div>
                <div className="mt-2 text-[22px] font-semibold tracking-tight leading-snug">
                  {t("price.directHeadline")}
                </div>
                <div className="mt-2 text-[13px] text-[#5E6C75]">{t("price.directSub")}</div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#ECE3D8] bg-white px-4 py-4 shadow-sm">
                {serviceType === "painting" ? (
                  <div className="text-center">
                    <div className="text-[13px] uppercase tracking-[0.22em] text-[#6B7880]">
                      {t("price.private")}
                    </div>
                    <div className="mt-2 text-[24px] font-semibold tracking-tight leading-tight">
                      {t("price.reserveHeadline")}
                    </div>
                    <div className="mt-2 text-[14px] leading-relaxed text-[#5E6C75]">
                      {t("price.reserveSub")}
                    </div>
                  </div>
                ) : !hasLines ? (
                  <div className="text-center">
                    <div className="text-[16px] text-[#5E6C75]">{t("price.residenceFinalizing")}</div>
                    <div className="mt-2 text-[14px] text-[#0F7C82]">{t("price.textPrivate")}</div>
                  </div>
                ) : !unitLine ? (
                  <div className="text-center text-[16px] text-[#5E6C75]">
                    {t("price.selectResidenceFirst")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2 text-[15px]">
                      <span className="text-[#5A6972]">{t("price.exterior")}</span>
                      <span className="flex-1 translate-y-[-3px] border-b border-dotted border-[#D7CEC2]" />
                      <span className="font-semibold text-[#0D1B24]">${basePrice}</span>
                    </div>
                    {includeInterior && (
                      <div className="flex items-baseline gap-2 text-[15px]">
                        <span className="text-[#5A6972]">{t("price.interiorAddon")}</span>
                        <span className="flex-1 translate-y-[-3px] border-b border-dotted border-[#D7CEC2]" />
                        <span className="font-semibold text-[#0D1B24]">+ ${interiorAddOn}</span>
                      </div>
                    )}
                    <div className="h-px bg-[#EFE7DD]" />
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] uppercase tracking-[0.22em] text-[#6B7880]">
                        {t("price.estimated")}
                      </span>
                      <motion.span
                        key={total ?? "empty"}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="text-[30px] font-semibold tracking-tight text-[#0D1B24]"
                      >
                        ${total}
                      </motion.span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {serviceType === "custom" ? (
              <a
                href={buildIMessageURL("custom")}
                onClick={handleBookingClick}
                className="group relative mt-4 flex w-full items-center justify-center overflow-hidden rounded-2xl bg-[#103845] px-5 py-4 text-[18px] font-semibold tracking-tight text-white shadow-[0_12px_28px_rgba(16,56,69,0.18)] transition duration-200 hover:bg-[#123F4D]"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3 top-0 h-px opacity-70"
                  style={{ background: "linear-gradient(90deg, transparent, #C5A572, transparent)" }}
                />
                {t("cta.sendImessage")}
              </a>
            ) : (
              <a
                href={scheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleBookingClick}
                className="group relative mt-4 flex w-full items-center justify-center overflow-hidden rounded-2xl bg-[#103845] px-5 py-4 text-[18px] font-semibold tracking-tight text-white shadow-[0_12px_28px_rgba(16,56,69,0.18)] transition duration-200 hover:bg-[#123F4D]"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3 top-0 h-px opacity-70"
                  style={{ background: "linear-gradient(90deg, transparent, #C5A572, transparent)" }}
                />
                {serviceType === "painting" ? t("cta.reserveConsultation") : t("cta.checkAvailability")}
              </a>
            )}

            {isMobile ? (
              <a
                href={buildIMessageURL(serviceType === "custom" ? "custom" : "photo")}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D8CEBF] bg-white px-5 py-3.5 text-[15px] font-medium tracking-tight text-[#0D1B24] transition hover:border-[#C5A572] hover:bg-[#FDFCF9]"
              >
                <span className="text-[#0F7C82]">✉</span>
                {t("cta.textSendPhoto")}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setShowSupport(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D8CEBF] bg-white px-5 py-3.5 text-[15px] font-medium tracking-tight text-[#0D1B24] transition hover:border-[#C5A572] hover:bg-[#FDFCF9]"
              >
                <span className="text-[#0F7C82]">✉</span>
                {t("cta.textSendPhoto")}
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-[#E8E0D6] bg-white/80">
          <div className="h-px bg-gradient-to-r from-transparent via-[#C5A572] to-transparent opacity-70" />
          <div className="grid grid-cols-3 divide-x divide-[#EEE7DD] py-4">
            {[
              { key: "whiteGlove", label: t("trust.whiteGlove"), sub: t("trust.whiteGlove.sub") },
              { key: "coverage", label: t("trust.coverage"), sub: t("trust.coverage.sub") },
              { key: "sameWeek", label: t("trust.sameWeek"), sub: t("trust.sameWeek.sub") },
            ].map((item) => (
              <div key={item.key} className="px-3 py-1 text-center">
                <div
                  className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    background: "linear-gradient(135deg, #C5A572 0%, #A8884E 50%, #C5A572 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {item.label}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[#8B9399]">
                  {item.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-5 text-center text-[11px] uppercase tracking-[0.28em] text-[#9BA6AF]">
          {t("footer.region")}
        </div>
      </div>

      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl">
            <div
              className="text-3xl tracking-tight text-[#0D1B24]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400 }}
            >
              {t("support.title")}
            </div>
            <div className="mt-3 text-[#4E5C64]">{t("support.sub")}</div>
            <div className="mt-5 rounded-2xl border border-[#E7DED3] bg-[#FAF8F4] px-4 py-3 text-lg font-medium">
              {LIVE_AGENT_NUMBER}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                className="flex-1 rounded-2xl border border-[#E7DED3] px-4 py-3 font-medium"
                onClick={() => navigator.clipboard.writeText(LIVE_AGENT_NUMBER)}
              >
                {t("support.copy")}
              </button>
              <button
                className="flex-1 rounded-2xl bg-[#103845] px-4 py-3 font-medium text-white"
                onClick={() => setShowSupport(false)}
              >
                {t("support.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}