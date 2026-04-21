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
  const pricing: Record<string, { lines: Record<string, number>; penthouse: boolean }> = {
    "Gran Paraiso": { lines: { "01": 300, "02": 180, "03": 180, "04": 180, "05": 180, "06": 180, "07": 280, "PH01": 420, "PH02": 360, "PH03": 400, "PH04": 450 }, penthouse: false },
    "One Paraiso": { lines: { "01": 300, "02": 180, "03": 260, "04": 260, "05": 180, "06": 300, "PH01": 420, "PH02": 450, "PH03": 450 }, penthouse: false },
    "Paraiso Bayviews": { lines: { "01": 260, "02": 120, "03": 120, "04": 120, "05": 120, "06": 320, "07": 140, "08": 220, "09": 120, "10": 280, "PH01": 360, "PH02": 280, "PH03": 340, "PH04": 220, "PH05": 120, "PH06": 120 }, penthouse: false },
    "Paraiso Bay": { lines: { "01": 300, "02": 180, "03": 180, "04": 180, "05": 180, "06": 180, "07": 140, "08": 120, "PH01": 420, "PH02": 360, "PH03": 420, "PH04": 430, "UPH01": 450, "UPH02": 450, "UPH03": 450, "UPH04": 450 }, penthouse: false },
    "Missoni Baia": { lines: { "01": 300, "02": 320, "03": 260, "04": 120, "05": 220, "06": 220, "3801": 300, "3802": 320, "3803": 450, "3806": 220, "3901": 300, "3902": 320, "3903": 450, "3906": 220, "4001": 300, "4002": 320, "4003": 450, "4006": 220, "4101": 300, "4102": 320, "4103": 450, "4106": 220, "4201": 300, "4202": 320, "4203": 450, "4206": 220, "4301": 300, "4302": 320, "4303": 450, "4306": 220, "4401": 300, "4402": 320, "4403": 450, "4406": 220, "4501": 300, "4502": 320, "4503": 450, "4506": 220, "4601": 300, "4602": 320, "4603": 450, "4606": 220, "4701": 300, "4702": 320, "4703": 450, "4706": 220, "4801": 300, "4802": 320, "4803": 450, "4806": 220, "4901": 300, "4902": 320, "4903": 450, "4906": 220, "5001": 300, "5002": 320, "5003": 450, "5006": 220, "5101": 300, "5102": 320, "5103": 450, "5106": 220, "5201": 300, "5202": 320, "5203": 450, "5206": 220, "5301": 300, "5302": 320, "5303": 450, "5306": 220, "5401": 300, "5402": 320, "5403": 450, "5406": 220, "5501": 300, "5502": 320, "5503": 450, "5506": 220, "5601": 300, "5602": 320, "5603": 450, "5606": 220 }, penthouse: false },
    "Hyde Midtown Miami": { lines: { "01": 220, "02": 260, "03": 120, "04": 280, "05": 160, "06": 140, "06A": 140, "07": 260, "08": 320, "09": 220, "10": 120, "11": 140, "12": 160, "14": 160, "15": 160, "16": 240 }, penthouse: false },
    "Four Midtown": { lines: { "F1": 220, "F3": 120, "F4": 160, "F5": 300, "F6": 400, "F7": 180, "F8": 260, "L1": 340, "L2": 360, "L3": 300, "L4": 300, "L5": 280, "L6": 340, "L7": 380, "L8": 380, "L9": 320, "L10": 450, "L11": 420, "L12": 430, "L13": 260, "L14": 360 }, penthouse: false },
    "Midtown Midblock": { lines: { "TB1": 180, "TB2": 140, "TB3": 160, "TB4": 160, "TB5": 140, "TB6": 160, "TC2": 260, "TC3": 420, "TC4": 220, "TC6": 220, "TC7": 240, "TC8": 450, "TC9": 280, "TC10": 280, "TC12": 200 }, penthouse: false },
    "Baltus House": { lines: { "01": 300, "02": 300, "03": 120, "04": 160, "05": 160, "06": 120, "07": 140, "08": 140, "09": 140, "10": 120, "11": 180, "12": 180, "14": 140, "15": 180, "19": 160 }, penthouse: false },
    "The Setai": { lines: { "01": 240, "02": 240, "03": 180, "04": 220, "05": 180, "06": 220, "07": 280, "08": 280 }, penthouse: false },
    "Continuum North Tower": { lines: { "0701": 320, "0702": 320, "0703": 220, "0704": 220, "0705": 260, "0706": 260, "0707": 220, "0708": 220, "0801": 320, "0802": 320, "0803": 220, "0804": 220, "0805": 260, "0806": 260, "0807": 220, "0808": 220, "0901": 340, "0902": 340, "0903": 220, "0904": 220, "0905": 280, "0906": 280, "0907": 220, "0908": 220, "1001": 300, "1002": 300, "1003": 220, "1004": 220, "1005": 260, "1006": 260, "1007": 220, "1008": 220, "2001": 300, "2002": 300, "2003": 220, "2004": 220, "2005": 260, "2006": 260, "2007": 220, "2008": 220, "2101": 430, "2102": 430, "2103": 360, "2104": 220, "2105": 360, "2201": 400, "2202": 400, "2203": 300, "2204": 220, "2205": 300, "2301": 400, "2302": 400, "2303": 300, "2304": 220, "2305": 300, "2401": 400, "2402": 400, "2403": 300, "2404": 220, "2405": 300, "2501": 400, "2502": 400, "2503": 300, "2504": 220, "2505": 300, "2601": 400, "2602": 400, "2603": 300, "2604": 220, "2605": 300, "2701": 400, "2702": 400, "2703": 380, "2704": 380, "2801": 360, "2802": 360, "2803": 340, "2804": 340, "2901": 360, "2902": 360, "2903": 340, "2904": 340, "3001": 360, "3002": 360, "3003": 340, "3004": 340, "3101": 360, "3102": 360, "3103": 340, "3104": 340, "3201": 360, "3202": 360, "3203": 340, "3204": 340, "3301": 430, "3302": 430, "3303": 340, "3403": 340, "3503": 340, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Continuum South Tower": { lines: { "01": 220, "02": 120, "03": 140, "04": 340, "05": 260, "06": 380, "07": 260, "08": 240, "09": 220, "10": 320, "12": 240, "13": 430, "13A": 420, "14": 200, "15": 450, "16": 280, "17": 300, "18": 420, "20": 240, "24": 220, "25": 430, "26": 400 }, penthouse: false },
    "Murano at Portofino": { lines: { "01": 450, "02": 400, "02M": 420, "03": 400, "04": 340, "05": 220, "06": 120, "07": 220, "08": 240, "PH01": 450, "PH04": 420, "TH-01": 180, "TH-02": 180, "TH-03": 180, "TH-04": 180 }, penthouse: false },
    "Murano Grande": { lines: { "01": 300, "01A": 450, "02": 320, "03": 400, "03BM": 420, "04": 220, "04C": 380, "05": 180, "06": 320, "06DM": 340, "07": 260, "08": 240, "09": 180, "10": 220, "11": 260 }, penthouse: false },
    "1800 Club": { lines: { "01": 260, "02": 120, "03": 160, "04": 120, "05": 180, "06": 120, "07": 180, "08": 120, "09": 180, "10": 160, "11": 160, "12": 220, "14": 220, "15": 240 }, penthouse: false },
    "23 Biscayne": { lines: { "01": 120, "02": 160, "03": 180, "04": 140, "05": 180, "06": 160, "07": 120 }, penthouse: false },
    "26 Edgewater": { lines: { "01": 140, "02": 120, "03": 140, "04": 120, "05": 120, "06": 140, "07": 120, "08": 120, "09": 120, "10": 140, "11": 120, "12": 140, "13": 120, "14": 120, "15": 120, "16": 120, "17": 140, "18": 120, "19": 120 }, penthouse: true },
    "Aria on the Bay": { lines: { "00": 220, "01": 220, "02": 160, "03": 160, "04": 160, "05": 160, "06": 180, "07": 180, "08": 180, "09": 220, "10": 260, "11": 220, "12": 300, "15": 300 }, penthouse: true },
    "Bay House": { lines: { "01": 240, "02": 220, "03": 220, "04": 220, "05": 240 }, penthouse: false },
    "Biscayne Beach": { lines: { "01": 220, "02": 260, "03": 220, "04": 220, "05": 220, "06": 220, "07": 280, "08": 220, "09": 220, "PH01": 400, "PH02": 400, "PH03": 400, "PH04": 400, "PH05": 400, "PH06": 400, "PH07": 400 }, penthouse: false },
    "Blue on the Bay": { lines: { "01": 180, "02": 140, "03": 160, "04": 160, "05": 120, "06": 160, "07": 160, "08": 120, "09": 140, "10": 160, "11": 120, "12": 220 }, penthouse: false },
    "Blue": { lines: { "01": 180, "02": 140, "03": 160, "04": 160, "05": 120, "06": 160, "07": 160, "08": 120, "09": 140, "10": 160, "11": 120, "12": 220 }, penthouse: false },
    "Icon Bay": { lines: { "01": 220, "02": 160, "03": 180, "04": 180, "05": 180, "06": 180, "07": 180, "08": 220, "PH01": 300, "PH02": 300, "PH03": 300, "PH04": 320 }, penthouse: false },
    "Icons on the Bay": { lines: { "01": 220, "02": 160, "03": 180, "04": 180, "05": 180, "06": 180, "07": 180, "08": 220, "PH01": 300, "PH02": 300, "PH03": 300, "PH04": 320 }, penthouse: false },
    "Moon Bay": { lines: { "01": 160, "02": 120, "03": 120, "04": 120, "05": 120, "06": 120, "07": 120, "08": 160 }, penthouse: false },
    "Opera Tower": { lines: { "01": 160, "02": 160, "03": 120, "04": 120, "05": 120, "06": 120, "07": 120, "08": 120, "09": 120, "10": 120, "11": 120, "12": 120, "14": 160, "15": 160 }, penthouse: false },
    "Paramount Bay": { lines: { "01": 220, "02": 300, "03": 240, "04": 180, "05": 180, "06": 240, "07": 240, "08": 180, "09": 180, "10": 240 }, penthouse: true },
    "Platinum Condominium": { lines: { "01B": 220, "02": 160, "03": 140, "04": 140, "05": 140, "06": 140, "07": 220 }, penthouse: false },
    "Quantum on the Bay": { lines: { "01-A": 220, "02-K": 200, "03-B": 120, "04-J": 180, "05-C": 120, "06-I": 160, "07-D": 140, "08-H": 140, "09-E": 140, "10-G": 120, "11-F": 180, "12-R": 240, "14-Q": 200, "15-L": 220, "16-P": 160, "17-M": 120, "18-O": 200, "19-N": 140 }, penthouse: true },
    "The Crimson": { lines: { "01": 160, "02": 180, "03": 120, "04": 120, "05": 120, "06": 120, "07": 180, "08": 180 }, penthouse: false },
    "1010 Brickell": { lines: { "01": 260, "02": 220, "03": 200, "04": 220, "05": 260, "06-J": 180, "06-L": 240, "07-G": 180, "07-K": 120, "08": 120, "09": 180, "10": 120, "11": 160 }, penthouse: false },
    "Axis on Brickell North": { lines: { "14": 260, "15": 160, "16": 220, "17": 240, "18": 160, "19": 260, "20": 260, "21": 140, "22": 220, "23": 220, "24": 140, "25": 260, "3719": 380, "3720": 380, "3819": 380, "3820": 380, "3919": 380, "3920": 380, "TH-14": 240, "TH-15": 320, "TH-16": 320, "TH-17": 240, "TH-18": 360, "TH-19": 360, "TH-20": 260, "TH-21": 320, "TH-22": 320, "TH-23": 260 }, penthouse: false },
    "Brickell Flatiron": { lines: { "01": 320, "02": 380, "03": 200, "04": 180, "05": 240, "06": 220, "07": 240, "08": 220, "09": 280, "10": 220, "11": 220, "12": 300, "14": 220, "15": 300, "0608": 340, "1011": 340, "PH01": 400, "PH02": 420, "PH03": 420, "PH04": 450, "PH05": 300, "PH06": 300, "PH07": 360, "PH08": 360, "TH-01": 430, "TH-02": 420, "TH-12": 430, "03-L": 240, "05-L": 240, "07-L": 260 }, penthouse: false },
    "Brickell Heights East": { lines: { "01": 300, "02": 180, "03": 300, "04": 160, "05": 160, "06": 300, "07": 160, "08": 280, "09": 160, "10": 160, "4101": 300, "4103": 340, "4104": 160, "4105": 160, "4106": 300, "4108": 280, "4109": 160, "4110": 160, "4201": 300, "4203": 340, "4204": 160, "4205": 160, "4206": 300, "4208": 280, "4209": 160, "4210": 160, "4301": 300, "4303": 340, "4304": 160, "4305": 160, "4306": 300, "4308": 280, "4309": 160, "4310": 160, "4401": 300, "4403": 340, "4404": 160, "4405": 160, "4406": 300, "4408": 280, "4409": 160, "4410": 160, "4501": 300, "4503": 340, "4504": 160, "4506": 300, "4508": 320, "4509": 280, "4601": 300, "4603": 340, "4604": 160, "4606": 300, "4608": 320, "4609": 280, "4701": 300, "4703": 330, "4704": 160, "4706": 300, "4708": 320, "4709": 280, "4801": 340, "4803": 420, "4806": 340, "4808": 400, "4901": 340, "4903": 420, "4906": 340, "4908": 395 }, penthouse: false },
    "Brickell Heights West": { lines: { "01": 240, "02": 120, "03": 260, "04": 140, "05": 140, "06": 260, "07": 120, "08": 220, "09": 120, "10": 140, "4101": 300, "4103": 340, "4104": 160, "4105": 160, "4106": 300, "4108": 280, "4109": 160, "4110": 160, "4201": 300, "4203": 340, "4204": 160, "4205": 160, "4206": 300, "4208": 280, "4209": 160, "4210": 160, "4301": 300, "4303": 340, "4304": 160, "4305": 160, "4306": 300, "4308": 280, "4309": 160, "4310": 160, "4401": 300, "4403": 340, "4404": 160, "4405": 160, "4406": 300, "4408": 280, "4409": 160, "4410": 160, "4501": 300, "4503": 340, "4504": 160, "4506": 300, "4508": 320, "4509": 280, "4601": 300, "4603": 340, "4604": 160, "4606": 300, "4608": 320, "4609": 280, "4701": 300, "4703": 330, "4704": 160, "4706": 300, "4708": 320, "4709": 280, "4801": 340, "4803": 420, "4806": 340, "4808": 400, "4901": 340, "4903": 420, "4906": 340, "4908": 395 }, penthouse: false },
    "Echo Brickell": { lines: { "01": 320, "02": 280, "03": 260, "04": 240, "05": 240, "06": 280, "07": 320, "2801": 360, "2802": 320, "2803": 320, "2804": 360, "2901": 360, "2902": 320, "2903": 320, "2904": 360, "3001": 360, "3002": 320, "3003": 320, "3004": 360, "3101": 360, "3102": 320, "3103": 320, "3104": 360, "3701": 400, "3702": 360, "3703": 380, "3801": 400, "3802": 360, "3803": 380, "3901": 400, "3902": 360, "3903": 380, "4001": 400, "4002": 360, "4003": 380, "4101": 400, "4102": 360, "4103": 380, "4201": 400, "4202": 360, "4203": 380, "4301": 400, "4302": 360, "4303": 380, "4401": 420, "4402": 410, "4501": 420, "4502": 410, "4601": 420, "4602": 410, "4701": 420, "4702": 410, "4801": 420, "4802": 410, "4901": 420, "4902": 410, "5001": 440, "5002": 430, "PH51": 450, "PH52": 450, "PH53": 450, "PH54": 450, "PH55": 450, "PH56": 450, "PH57": 450 }, penthouse: false },
    "Reach Brickell City Centre": { lines: { "01": 260, "02": 260, "03": 240, "04": 260, "05": 160, "06": 180, "07": 220, "08": 160, "09": 220, "10": 220, "11": 260, "12": 260, "3701": 340, "3702": 340, "3703": 240, "3704": 260, "3705": 160, "3706": 180, "3707": 220, "3708": 160, "3709": 220, "3710": 220, "3801": 340, "3802": 340, "3803": 240, "3804": 260, "3805": 160, "3806": 180, "3807": 220, "3808": 160, "3809": 220, "3810": 220, "3901": 340, "3902": 340, "3903": 240, "3904": 260, "3905": 160, "3906": 180, "3907": 220, "3908": 160, "3909": 220, "3910": 220, "4001": 340, "4002": 340, "4003": 240, "4004": 260, "4005": 160, "4006": 180, "4007": 220, "4008": 160, "4009": 220, "4010": 220, "4101": 340, "4102": 340, "4103": 240, "4104": 260, "4105": 160, "4106": 180, "4107": 220, "4108": 160, "4109": 220, "4110": 220, "PH4201": 430, "PH4202": 340, "PH4203": 440, "PH4204": 450, "PH4301": 430, "PH4302": 340 }, penthouse: false },
    "Rise Brickell City Center": { lines: { "01": 280, "02": 320, "03": 180, "04": 200, "05": 220, "06": 140, "07": 180, "08": 160, "09": 180, "10": 220, "11": 280, "12": 320, "3701": 360, "3702": 360, "3703": 180, "3704": 200, "3705": 220, "3706": 140, "3707": 180, "3708": 160, "3709": 180, "3710": 220, "3801": 360, "3802": 360, "3803": 180, "3804": 200, "3805": 220, "3806": 140, "3807": 180, "3808": 160, "3809": 180, "3810": 220, "3901": 360, "3902": 360, "3903": 180, "3904": 200, "3905": 220, "3906": 140, "3907": 180, "3908": 160, "3909": 180, "3910": 220, "4001": 360, "4002": 360, "4003": 180, "4004": 200, "4005": 220, "4006": 140, "4007": 180, "4008": 160, "4009": 180, "4010": 220, "4101": 360, "4102": 360, "4103": 180, "4104": 200, "4105": 220, "4106": 140, "4107": 180, "4108": 160, "4109": 180, "4110": 220, "PH4201": 440, "PH4202": 340, "PH4203": 450, "PH4204": 450, "PH4301": 430, "PH4302": 340, "PH4303": 420 }, penthouse: false },
    "Aria Reserve North": { lines: { "01": 220, "02": 220, "PH01": 430, "PH02": 410, "PH03": 410, "PH04": 440 }, penthouse: false },
    "Aria Reserve South": { lines: { "01": 220, "02": 220, "PH01": 430, "PH02": 410, "PH03": 410, "PH04": 440 }, penthouse: false },
    "Aria Reserve South Tower": { lines: { "01": 220, "02": 220, "PH01": 430, "PH02": 410, "PH03": 410, "PH04": 440 }, penthouse: false },
    "Carbonell": { lines: { "01": 160, "02": 160, "03": 220, "04": 320, "05": 220, "06": 260, "07": 240, "08": 180, "0809": 360, "09": 180 }, penthouse: false },
    "Three Tequesta Point": { lines: { "01": 280, "02": 180, "03": 120, "04": 240, "05": 220, "06": 280 }, penthouse: false },
    "Charter Club": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "Elysee": { lines: { "NE": 280, "SE": 280, "NE-SKY": 300, "SE-SKY": 300, "NE-GRAND": 320, "SE-GRAND": 320 }, penthouse: true },
    "Elysee Miami": { lines: { "NE": 280, "SE": 280, "NE-SKY": 300, "SE-SKY": 300, "NE-GRAND": 320, "SE-GRAND": 320 }, penthouse: true },
    "Gallery Art Condos": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "New Wave": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "Onyx on the Bay": { lines: { "01": 120, "02": 120 }, penthouse: true },
    "Star Lofts": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "The Yorker": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "Uptown Lofts": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "1050 Brickell": { lines: { "02": 220, "04": 220, "06": 220, "08": 220, "10": 220, "12": 220, "14": 260, "16": 240, "18": 240, "20": 260, "22": 220, "PH3402": 400, "PH3404": 400, "PH3406": 400 }, penthouse: false },
    "1060 Brickell": { lines: { "02": 220, "04": 220, "06": 220, "08": 220, "10": 220, "12": 220, "14": 260, "16": 240, "18": 240, "20": 260, "22": 220, "PH3402": 400, "PH3404": 400, "PH3406": 400 }, penthouse: false },
    "1100 Millecento": { lines: { "01": 220, "02": 180, "03": 180, "04": 220, "05": 120, "06": 120, "07": 220, "08": 160, "09": 140, "10": 220, "11": 240 }, penthouse: false },
    "500 Brickell East": { lines: { "00": 160, "01": 300, "02": 220, "03": 140, "04": 120, "05": 220, "06": 120, "07": 240, "08": 120, "10": 240 }, penthouse: false },
    "500 Brickell West": { lines: { "00": 160, "01": 160, "02": 160, "03": 120, "04": 120, "05": 180, "06": 120, "07": 140, "08": 120, "10": 140 }, penthouse: false },
    "Atlantis on Brickell": { lines: { "01": 160, "02": 180, "03": 220 }, penthouse: false },
    "Axis on Brickell South": { lines: { "01": 280, "02": 120, "03": 180, "04": 180, "05": 120, "06": 280, "07": 280, "08": 120, "09": 220, "10": 180, "11": 120, "12": 280 }, penthouse: false },
    "Brickell Arch": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "Brickell Bay Club": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "Brickell East": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "Brickell Harbor": { lines: { "01": 160, "02": 160, "18": 220, "PH": 260 }, penthouse: true },
    "Brickell House": { lines: { "00": 180, "01": 220, "02": 260, "03": 220, "04": 220, "05": 220, "06": 260, "07": 220, "08": 240, "09": 220, "10": 260, "11": 220, "12": 180, "13": 180, "LOWR": 450, "UPPR": 450 }, penthouse: true },
    "Brickell on The River North": { lines: { "01": 120, "02": 160, "03": 180 }, penthouse: false },
    "Brickell on The River South": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "Brickell Ten": { lines: { "01": 120, "02": 180 }, penthouse: false },
    "Bristol Tower": { lines: { "01": 180, "02": 220, "03": 260, "PH": 300 }, penthouse: true },
    "Cassa Brickell": { lines: { "01": 120, "02": 160, "03": 180 }, penthouse: false },
    "Costa Bella": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "Dua Miami (SLS Brickell)": { lines: { "01": 160, "02": 220, "LPH": 280, "UPH": 320 }, penthouse: true },
    "Emerald at Brickell": { lines: { "01": 120, "02": 160, "03": 180 }, penthouse: false },
    "Fortune House": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "Four Seasons Residences Miami": { lines: { "A": 240, "B": 320, "C": 320, "D": 140, "E": 420, "F": 440, "E/F": 430, "PH4000": 450 }, penthouse: false },
    "Bristol Tower Brickell": { lines: { "01": 340, "02": 320, "03": 340, "04": 240, "05": 240, "06": 220, "3501": 430, "3502": 430, "3601": 430, "3602": 430, "3701": 430, "3702": 430, "3801": 430, "3802": 430, "3901": 430, "3902": 430, "PH4000": 450 }, penthouse: false },
    "Icon Brickell I": { lines: { "01": 120, "02": 160, "03": 180, "04": 220 }, penthouse: false },
    "Icon Brickell II": { lines: { "01": 120, "02": 160, "03": 180, "04": 220 }, penthouse: false },
    "Icon Brickell III (W Miami)": { lines: { "01": 120, "02": 160, "03": 180, "04": 220 }, penthouse: false },
    "Imperial at Brickell": { lines: { "01": 160, "02": 220, "PH": 280 }, penthouse: true },
    "Infinity at Brickell": { lines: { "01": 120, "02": 160, "03": 180, "04": 200 }, penthouse: false },
    "Jade at Brickell Bay": { lines: { "01": 180, "02": 220, "03": 260, "PH": 300 }, penthouse: true },
    "Le Parc at Brickell": { lines: { "01": 160, "02": 180, "03": 220 }, penthouse: false },
    "Lofts on Brickell One": { lines: { "01": 120, "02": 160, "03": 180 }, penthouse: false },
    "Lofts on Brickell Two": { lines: { "01": 120, "02": 160 }, penthouse: false },
    "MyBrickell": { lines: { "01": 120, "02": 160, "03": 180 }, penthouse: false },
    "Nine at Mary Brickell Village": { lines: { "01": 160, "02": 180, "03": 220, "PH": 280 }, penthouse: true },
    "Santa Maria": { lines: { "01": 160, "02": 200, "03": 220, "PH": 280 }, penthouse: true },
    "Skyline on Brickell": { lines: { "01": 120, "02": 160, "03": 180, "04": 220 }, penthouse: false },
    "SLS Lux": { lines: { "01": 160, "02": 220, "PH": 300 }, penthouse: true },
    "Smart Brickell I": { lines: { "01": 160, "02": 160 }, penthouse: false },
    "Solaris at Brickell": { lines: { "01": 160, "02": 180, "03": 220 }, penthouse: false },
    "The Bond on Brickell": { lines: { "01": 180, "02": 220, "03": 240, "PH": 280 }, penthouse: true },
    "The Club at Brickell Bay": { lines: { "01": 120, "02": 160, "03": 180 }, penthouse: false },
    "The Mark on Brickell": { lines: { "01": 200, "02": 240, "03": 180 }, penthouse: false },
    "The Metropolitan": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "The Palace": { lines: { "01": 120, "PH": 220 }, penthouse: true },
    "The Plaza on Brickell East": { lines: { "01": 160, "02": 180, "03": 220, "PH": 280 }, penthouse: true },
    "The Plaza on Brickell West": { lines: { "01": 160, "02": 180, "03": 220, "PH": 280 }, penthouse: true },
    "The Sail": { lines: { "01": 120, "02": 160 }, penthouse: false },
    "Viceroy Brickell Residences": { lines: { "01": 160, "02": 220, "PH": 300 }, penthouse: true },
    "Villa Regina": { lines: { "01": 120, "02": 120 }, penthouse: false },
    "Vue at Brickell": { lines: { "01": 220, "02": 240, "03": 180 }, penthouse: false },
    "Aston Martin Residences": { lines: { "01": 320, "02": 220, "03": 260, "04": 260, "05": 120, "06": 140, "07": 300, "08": 180, "09": 220, "PH56": 450, "PH57": 450, "PH58": 450, "PH59": 450, "PH60": 450, "PH61": 450, "PH62": 450 }, penthouse: false },
    "Five Park Miami Beach": { lines: { "01": 320, "02": 220, "03": 300, "04": 180, "05": 300, "06": 180, "07": 180, "08": 180 }, penthouse: false },
    "Icon South Beach": { lines: { "D": 280, "E": 320, "F": 280, "G": 220, "H": 260, "J": 220, "K": 240, "L": 240, "M": 120 }, penthouse: false },
    "Apogee South Beach": { lines: { "01": 450, "02": 400, "03": 400, "04": 450 }, penthouse: false },
    "Faena House": { lines: { "A": 450, "B": 430, "C": 380, "CD": 420, "D": 260, "PH-A": 450, "PH-B": 450, "DPLX-PH": 450 }, penthouse: false },
    "Marquis Residences": { lines: { "01": 300, "02": 220, "03": 220, "04": 220, "05": 180, "06": 180, "07": 260, "08": 240 }, penthouse: false },
    "Paramount Miami Worldcenter": { lines: { "01": 300, "02": 300, "03": 240, "04": 180, "05": 180, "06": 180, "07": 220, "08": 220, "09": 240, "10": 180, "11": 300, "12": 300, "DPLX-H1": 450, "DPLX-H2": 450, "DPLX-K1": 430, "DPLX-K2": 430, "DPLX-L1": 450, "DPLX-L2": 450, "DPLX-Q": 440, "DPLX-R": 450 }, penthouse: false },
    "Flamingo South Beach Center Tower": { lines: { "Collins A": 320, "Drexel A": 120, "Drexel B": 120, "Drexel D": 140, "Drexel F": 180, "Lenox A": 180, "Lenox B": 140, "Lenox C": 160, "Lenox D": 180, "Lenox G": 220, "Lenox H": 200, "Sheridan A": 240, "Sheridan B": 220, "Sheridan C": 220, "Sheridan D": 240 }, penthouse: false },
    "Flamingo South Beach North Tower": { lines: { "Collins A": 320, "Drexel A": 120, "Drexel B": 120, "Drexel D": 140, "Drexel F": 180, "Lenox A": 180, "Lenox B": 140, "Lenox C": 160, "Lenox D": 180, "Lenox G": 220, "Lenox H": 200, "Sheridan A": 240, "Sheridan B": 220, "Sheridan C": 220, "Sheridan D": 240 }, penthouse: false },
    "1000 Museum": { lines: { "1002": 440, "1201": 440, "1501-2501": 440, "1502-2502": 440, "2601-3301": 440, "2602-3302": 440, "3401-4901": 450, "3402-4902": 450, "5401": 450, "5402": 450, "5403": 450, "5501": 450, "5502": 450, "5503": 450, "PH": 450 }, penthouse: false },
    "50 Biscayne": { lines: { "01": 260, "02": 360, "03": 120, "04": 260, "05": 180, "06": 260, "07": 160, "07+DEN": 180, "08": 260, "09": 120, "10": 360, "11": 260 }, penthouse: false },
    "900 Biscayne Bay": { lines: { "01": 420, "02": 360, "03": 180, "04": 180, "05": 180, "06": 450, "07": 180, "08": 320, "09": 360, "10": 220, "12": 320, "01-FLAT": 240, "03-FLAT": 180, "05-FLAT": 180 }, penthouse: false },
    "Marina Blue": { lines: { "01": 260, "02": 160, "03": 180, "04": 240, "05": 240, "05+DEN": 260, "06": 180, "07": 160, "08": 280, "09": 280, "10": 160, "11": 160, "12": 260, "1A": 220, "1B": 220, "2A": 200, "2B": 200, "3A": 200, "3B": 200, "4A": 220, "4B": 220, "5A": 200, "5B": 200, "6A": 300, "6B": 320, "09+10": 340, "10+11": 280, "02+03": 300, "03+04": 340, "05+06": 340, "05+06+DEN": 360, "06+07": 300 }, penthouse: false },
    "One Miami East": { lines: { "00": 220, "01": 220, "02": 160, "03": 160, "04": 160, "05": 240, "06": 120, "07": 220, "08": 220, "09": 360, "10": 160, "12": 280 }, penthouse: false },
    "One Miami West": { lines: { "14": 220, "15": 220, "16": 160, "17": 160, "18": 160, "19": 240, "20": 120, "21": 240, "22": 220, "23": 360, "24": 160, "26": 280 }, penthouse: false },
    "Epic Residences Miami": { lines: { "01": 320, "02": 320, "03": 280, "04": 280, "05": 180, "06": 180, "07": 320, "08": 320, "09": 140, "10": 140, "11": 160, "12": 160, "13": 140, "14": 140 }, penthouse: false },
    "Met 1": { lines: { "01": 180, "02": 240, "03": 120, "04": 220, "05": 160, "06": 220, "07": 160, "08": 260, "09": 120, "10": 260, "11": 120, "12": 220, "14": 220, "16": 280 }, penthouse: false },
    "Mint": { lines: { "01": 360, "02": 260, "03": 280, "04": 220, "05": 300, "06": 180, "07": 160, "08": 140, "09": 120, "10": 320, "11": 220, "12": 220 }, penthouse: false },
    "Ten Museum Park": { lines: { "01": 420, "02": 430, "03": 430, "04": 420, "05": 160, "06": 260, "07": 260, "08": 160 }, penthouse: false },
    "Vizcayne North": { lines: { "02": 240, "03": 280, "04": 120, "05": 120, "06": 120, "07": 120, "08": 160, "09": 220, "10": 180, "03-28-39": 260, "05-28-39": 120, "07-28-39": 120, "08-28-39": 240, "09-28-39": 260, "03-40-49": 320, "04-40-49": 220, "07-40-49": 220, "08-40-49": 160 }, penthouse: false },
    "Vizcayne South": { lines: { "01": 220, "02": 220, "03": 260, "04": 160, "05": 160, "06": 160, "07": 160, "08": 220, "09": 260, "10": 220, "02-28-39": 240, "03-28-39": 280, "08-28-39": 240, "09-28-39": 280, "02-40-49": 220, "03-40-49": 320, "08-40-49": 220, "09-40-49": 320, "F-1": 120, "F-2": 120, "F-3": 220, "F-4": 220, "F-5": 120, "PH10": 450, "PH11": 450 }, penthouse: false },
    "Asia - Brickell Key": { lines: { "01": 340, "02": 300, "03": 260, "04": 220, "05": 260, "06": 300, "07": 340, "PH3401": 450 }, penthouse: false },
    "One Tequesta Point": { lines: { "00": 180, "01": 120, "02": 120, "03A": 220, "03B": 360, "04": 360, "05": 120, "06": 140, "07": 120, "08": 320, "09": 240, "10": 220, "11": 280, "12": 280 }, penthouse: false },
    "Two Tequesta Point": { lines: { "01A": 340, "01": 360, "02": 180, "03": 120, "04": 320, "05": 280, "06": 200, "07": 120, "08": 360 }, penthouse: false },
    "The Residences at Mandarin Oriental, Miami": { lines: { "01": 380, "02": 380, "03": 320, "04": 220, "05": 280, "4801": 420, "4802": 450, "4803": 260, "4901": 450, "4902": 450, "4903": 260, "6101": 450, "6102": 450 }, penthouse: false },
    "Latitude on The River": { lines: { "00": 120, "01": 260, "02": 220, "03": 260, "04": 160, "05": 140, "06": 120, "07": 180, "08": 140, "09": 220, "10": 140, "11": 300, "12": 220, "14": 140 }, penthouse: false },
    "The Ivy": { lines: { "A": 260, "B": 240, "C": 140, "D": 300, "E": 140, "F1": 120, "F2": 120, "G": 120, "H": 220, "I": 360, "J": 220, "K": 220, "L": 240 }, penthouse: false },
    "SLS Brickell": { lines: { "01": 260, "02": 220, "03": 160, "04": 120, "05": 280, "06": 240, "07": 120, "08": 140, "09": 180, "10": 220, "11": 160, "LPH01": 360, "LPH03": 380, "LPH05": 420, "LPH06": 380, "LPH08": 140, "LPH09": 180, "LPH10": 340, "UPH1": 450, "UPH2": 450, "UPH3": 450, "UPH4": 430, "UPH5": 140, "UPH6": 180, "UPH7": 420 }, penthouse: false },
    "Plaza on Brickell - 950 Tower": { lines: { "00-A": 160, "00-A1": 140, "01-A": 160, "01-A1": 140, "02": 120, "03": 120, "04": 220, "05": 220, "06": 200, "07": 200, "08": 120, "09": 120, "10": 260, "11": 260, "LPH10": 360, "LPH11": 360, "PH00": 280, "PH01": 280, "PH04": 420, "PH05": 420, "PH06": 340, "PH07": 340, "PH08": 280, "PH09": 280, "PH10": 430, "PH11": 430 }, penthouse: false },
    "Plaza on Brickell - 951 Tower": { lines: { "00": 160, "01": 160, "02": 120, "03": 120, "04": 220, "05": 220, "06": 220, "07": 220, "08": 120, "09": 120, "10": 260, "11": 260, "PH04": 420, "PH05": 420, "PH08": 120, "PH09": 120, "PH10": 430, "PH11": 430 }, penthouse: false },
    "Jade Residences": { lines: { "01": 320, "02": 260, "03": 260, "05": 340, "07": 340, "08": 260, "09": 260, "11": 320 }, penthouse: false },
    "ICON Brickell Tower 2": { lines: { "01": 340, "02": 300, "03": 280, "04": 260, "05": 260, "06": 120, "07": 160, "08": 120, "09": 180, "10": 240, "11": 220 }, penthouse: false },
    "ICON Brickell W Miami": { lines: { "01": 320, "02": 220, "03": 240, "04": 120, "05": 240, "06": 160, "07": 220, "08": 120, "09": 220, "10": 120, "11": 160, "12": 160, "13": 200, "14": 160, "15": 220 }, penthouse: false },
    "ICON Brickell Tower 1B": { lines: { "01": 320, "02": 220, "03": 240, "04": 120, "05": 240, "06": 160, "07": 220, "08": 120, "09": 220, "10": 120, "11": 160, "12": 160, "13": 200, "14": 160, "15": 220 }, penthouse: false },
    "ICON Brickell Tower 1A": { lines: { "01": 320, "02": 220, "03": 240, "04": 120, "05": 240, "06": 160, "07": 220, "08": 120, "09": 220, "10": 120, "11": 160, "12": 160, "13": 200, "14": 160, "15": 220 }, penthouse: false },
    "Park Grove - One Park Grove": { lines: { "A": 430, "B": 360, "C": 320, "D": 380, "PH-A": 450, "PH-B": 450 }, penthouse: false },
    "Park Grove - Two Park Grove": { lines: { "A": 430, "B": 360, "C": 320, "D": 380 }, penthouse: false },
    "Park Grove Club Residences": { lines: { "01": 220, "02": 180, "03": 120, "04": 160, "05": 180, "06": 120, "07": 120, "08": 180 }, penthouse: false },
    "St. Regis Bal Harbour North Tower": { lines: { "01": 450, "02": 420, "03": 430, "04": 320, "05": 280 }, penthouse: false },
    "St. Regis Bal Harbour South Tower": { lines: { "01": 450, "02": 420, "03": 430, "03-MOD": 420, "04": 320, "05": 280 }, penthouse: false },
    "St. Regis Bal Harbour Center Tower": { lines: { "00": 430, "01": 340, "02": 340, "03": 360, "04": 360, "05": 280, "06": 280 }, penthouse: false },
    "Acqualina Resort and Spa": { lines: { "01": 400, "02": 340, "03": 320, "04": 320, "05": 340, "06": 400 }, penthouse: false },
    "Rivage Bal Harbour": { lines: { "A": 450, "B": 440, "C": 420, "LPH-A": 450, "Ocean-PH-A": 450, "Bay-PH-C": 450 }, penthouse: false },
    "Muse": { lines: { "01": 440, "02": 400, "LPH": 450, "UPH-L1": 450, "UPH-L2": 450 }, penthouse: false },
    "Marquis Miami": { lines: { "01": 300, "02": 220, "03": 220, "04": 220, "05": 240, "06": 240, "07": 300, "08": 260, "4901": 420, "4902": 340, "4903": 240, "4904": 240, "4905": 300, "4906": 260 }, penthouse: false },
    "The Palace at Bal Harbour": { lines: { "02": 450, "04": 280 }, penthouse: false },
    "Oceana Key Biscayne North": { lines: { "01N": 430, "02N": 430, "PH01N": 450, "PH02N": 450 }, penthouse: false },
    "Oceana Key Biscayne South": { lines: { "01S": 430, "02S": 430, "PH01S": 450, "PH02S": 450 }, penthouse: false },
    "One Bal Harbour": { lines: { "01": 280, "02": 240, "03": 220, "04": 320, "05": 260, "06": 220, "07": 220, "08": 320, "PH2604": 450, "PH2608": 450 }, penthouse: false },
    "Bellini Bal Harbour": { lines: { "01": 420, "02": 340, "03": 360, "04": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Harbour House": { lines: { "01": 120, "02": 120, "03": 120, "04": 140, "05": 140, "06": 120, "07": 120, "08": 140, "09": 140, "10": 180, "11": 180, "12": 180, "14": 200, "15": 220, "16": 220 }, penthouse: false },
    "Kenilworth Bal Harbour": { lines: { "A": 320, "B": 320, "C": 280, "D": 280, "E": 260, "F": 260 }, penthouse: false },
    "Bal Harbour Tower": { lines: { "01": 360, "02": 320, "03": 280, "04": 280, "05": 320, "06": 360 }, penthouse: false },
    "Balmoral Bal Harbour": { lines: { "01": 260, "02": 220, "03": 180, "04": 180, "05": 220, "06": 260 }, penthouse: false },
    "Oceana Bal Harbour North Tower": { lines: { "01N": 430, "02N": 430, "03N": 320, "04N": 280, "PH-N1": 450, "PH-N2": 450 }, penthouse: false },
    "Oceana Bal Harbour South Tower": { lines: { "01S": 430, "02S": 430, "03S": 320, "04S": 280, "PH-S1": 450, "PH-S2": 450 }, penthouse: false },
    "Ritz-Carlton Bal Harbour": { lines: { "01": 320, "02": 280, "03": 260, "04": 360, "05": 300, "06": 260, "07": 360, "08": 320 }, penthouse: false },
    "Solimar North": { lines: { "01": 360, "02": 320, "03": 280, "04": 280, "05": 320, "06": 360 }, penthouse: false },
    "Solimar South": { lines: { "01": 360, "02": 320, "03": 280, "04": 280, "05": 320, "06": 360 }, penthouse: false },
    "Arte Surfside": { lines: { "01": 450, "02": 450, "PH-01": 450, "PH-02": 450 }, penthouse: false },
    "Fendi Chateau Residences": { lines: { "01": 450, "02": 450, "03": 420, "04": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Surf Club Four Seasons North Tower": { lines: { "01": 430, "02": 430, "03": 380, "04": 380, "PH-N": 450 }, penthouse: false },
    "Surf Club Four Seasons South Tower": { lines: { "01": 430, "02": 430, "03": 380, "04": 380, "PH-S": 450 }, penthouse: false },
    "Jade Signature": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Residences by Armani Casa": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Regalia Miami": { lines: { "01": 450, "PH39": 450, "PH43": 450, "PH44": 450 }, penthouse: false },
    "Porsche Design Tower": { lines: { "01": 450, "02": 450, "03": 430, "PH-1": 450, "PH-2": 450 }, penthouse: false },
    "Chateau Beach": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430 }, penthouse: false },
    "Ocean 4": { lines: { "01": 240, "02": 220, "03": 180, "04": 180, "05": 220, "06": 240 }, penthouse: false },
    "Oceania I": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Oceania II": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Turnberry Ocean Club": { lines: { "01": 450, "02": 420, "03": 380, "04": 380, "05": 420, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Trump Palace": { lines: { "01": 320, "02": 280, "03": 240, "04": 240, "05": 280, "06": 320, "PH01": 450, "PH02": 450 }, penthouse: false },
    "1 Hotel & Homes": { lines: { "01": 320, "02": 260, "03": 260, "04": 320, "05": 220, "06": 220, "07": 300, "08": 300, "PH01": 450, "PH02": 450 }, penthouse: false },
    "200 Ocean Drive": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "PH": 360 }, penthouse: false },
    "300 Collins": { lines: { "2B": 450, "2C": 400, "2D": 220, "2E": 260, "3B": 240, "3C": 260, "3D": 320, "3E": 300, "4A": 420, "4B": 440, "4C": 400, "4E": 340, "PH1": 450, "PH2": 450 }, penthouse: false },
    "321 Ocean": { lines: { "01": 430, "02": 380, "03": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Glass Miami Beach": { lines: { "01": 450, "02": 430, "03": 450, "PH": 450 }, penthouse: false },
    "Ocean House South Beach": { lines: { "01": 450, "02": 420, "03": 420, "04": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean Park South Beach": { lines: { "01": 340, "02": 320, "03": 340, "PH": 450 }, penthouse: false },
    "Ocean Place East": { lines: { "01": 220, "02": 260, "03": 260, "04": 220, "PH": 400 }, penthouse: false },
    "Ocean Place West": { lines: { "01": 220, "02": 260, "03": 260, "04": 220, "PH": 400 }, penthouse: false },
    "One Ocean South Beach": { lines: { "01": 450, "02": 420, "03": 380, "04": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Portofino Tower": { lines: { "01": 340, "02": 320, "03": 280, "04": 240, "05": 260, "PH1": 450, "PH3": 450, "PH5": 450 }, penthouse: false },
    "South Pointe Towers": { lines: { "01": 220, "02": 240, "03": 220, "04": 220, "05": 240, "06": 240, "07": 260, "08": 260 }, penthouse: false },
    "Yacht Club": { lines: { "01": 180, "02": 180, "03": 120, "04": 120, "05": 120, "06": 120, "07": 180, "08": 180 }, penthouse: false },
    "Belle Plaza": { lines: { "01": 160, "02": 160, "03": 180, "04": 180, "05": 220, "06": 220 }, penthouse: false },
    "Costa Brava": { lines: { "01": 180, "02": 180, "03": 220, "04": 220, "PH": 320 }, penthouse: false },
    "Grand Venetian": { lines: { "01": 300, "02": 260, "03": 220, "04": 220, "05": 260, "06": 300, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Nine Island": { lines: { "01": 220, "02": 180, "03": 180, "04": 220, "PH": 320 }, penthouse: false },
    "Palau Sunset Harbour": { lines: { "01": 420, "02": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Sunset Harbour North": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220 }, penthouse: false },
    "Sunset Harbour South": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220 }, penthouse: false },
    "Bentley Bay North": { lines: { "01": 260, "02": 220, "03": 220, "04": 260, "PH": 400 }, penthouse: false },
    "Bentley Bay South": { lines: { "01": 260, "02": 220, "03": 220, "04": 260, "PH": 400 }, penthouse: false },
    "Floridian": { lines: { "01": 320, "02": 280, "03": 220, "04": 220, "05": 280, "06": 320, "PH": 420 }, penthouse: false },
    "Monad Terrace": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Waverly": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220, "PH": 340 }, penthouse: false },
    "Centro": { lines: { "01": 220, "02": 180, "03": 160, "04": 120, "05": 140, "06": 120, "07": 120, "08": 140, "09": 160, "10": 160, "11": 180 }, penthouse: false },
    "Gale Miami Residences": { lines: { "01": 220, "02": 180, "03": 180, "04": 220, "PH": 340 }, penthouse: false },
    "Loft Downtown I": { lines: { "01": 220, "02": 220, "03": 140, "04": 160, "05": 140, "06": 140, "07": 240, "08": 140, "09": 120 }, penthouse: false },
    "Loft Downtown II": { lines: { "01": 220, "02": 220, "03": 140, "04": 140, "05": 140, "06": 220, "07": 140, "08": 180, "09": 140, "10": 120, "11": 140, "12": 220, "13": 240, "15": 140, "17": 140, "19": 140 }, penthouse: false },
    "NATIIVO powered by Airbnb": { lines: { "01": 180, "02": 180, "03": 140, "04": 140, "05": 180, "06": 180, "PH01": 360, "PH02": 360 }, penthouse: false },
    "The Elser Hotel & Residences": { lines: { "01": 220, "02": 120, "03": 120, "04": 120, "05": 120, "06": 120, "07": 120, "08": 120, "09-14-19": 220, "09-20-47": 220, "10": 140, "11": 180, "12": 120, "13": 120, "14": 160, "15": 140, "16": 120, "17-14-19": 220, "17-20-47": 220, "18": 220, "19": 160 }, penthouse: false },
    "Axis - North Tower": { lines: { "14": 260, "15": 160, "16": 220, "17": 240, "18": 160, "19": 260, "20": 260, "21": 140, "22": 220, "23": 220, "24": 140, "25": 260, "3719": 380, "3720": 380, "3819": 380, "3820": 380, "3919": 380, "3920": 380, "TH-14": 240, "TH-15": 320, "TH-16": 320, "TH-17": 240, "TH-18": 360, "TH-19": 360, "TH-20": 260, "TH-21": 320, "TH-22": 320, "TH-23": 260 }, penthouse: false },
    "Axis - South Tower": { lines: { "01": 280, "02": 120, "03": 180, "04": 180, "05": 120, "06": 280, "07": 280, "08": 120, "09": 220, "10": 180, "11": 120, "12": 280 }, penthouse: false },
    "Two Midtown": { lines: { "01": 220, "02": 260, "03": 180, "04": 180, "05": 220, "06": 240, "07": 240, "08": 220 }, penthouse: false },
    "Two Midtown Mews": { lines: { "01": 240, "02": 220, "03": 180, "04": 180, "05": 220, "06": 240 }, penthouse: false },
    "Two Midtown Midrise": { lines: { "01": 180, "02": 180, "03": 140, "04": 140, "05": 180, "06": 180 }, penthouse: false },
    "Cosmopolitan Courts": { lines: { "01": 180, "02": 180, "03": 140, "04": 140, "05": 180, "06": 180 }, penthouse: false },
    "Cosmopolitan Towers": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220, "PH": 340 }, penthouse: false },
    "Hilton Bentley Beach": { lines: { "01": 240, "02": 220, "03": 220, "04": 240, "PH": 360 }, penthouse: false },
    "ILONA Lofts": { lines: { "01": 160, "02": 160, "03": 180, "04": 180 }, penthouse: false },
    "Louver House": { lines: { "01": 420, "02": 420, "03": 380, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Marea Miami Beach": { lines: { "01": 450, "02": 420, "03": 420, "04": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Meridian 5 Lofts": { lines: { "01": 180, "02": 180, "03": 220, "04": 220 }, penthouse: false },
    "Meridian Lofts": { lines: { "01": 160, "02": 180, "03": 180, "04": 160 }, penthouse: false },
    "Sundance Lofts": { lines: { "01": 160, "02": 180, "03": 180, "04": 160 }, penthouse: false },
    "Z Ocean Hotel": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220 }, penthouse: false },
    "1000 Venetian Way": { lines: { "01": 260, "02": 220, "03": 180, "04": 180, "05": 220, "06": 260, "PH": 360 }, penthouse: false },
    "Alliance Lofts": { lines: { "01": 160, "02": 180, "03": 180, "04": 160 }, penthouse: false },
    "Capri South Beach - Ana Capri": { lines: { "01": 320, "02": 280, "03": 220, "04": 220, "PH": 400 }, penthouse: false },
    "Capri South Beach - Marina Grande": { lines: { "01": 340, "02": 300, "03": 240, "04": 240, "05": 300, "06": 340, "PH": 420 }, penthouse: false },
    "Capri South Beach - Marina Piccola": { lines: { "01": 320, "02": 280, "03": 220, "04": 220, "PH": 400 }, penthouse: false },
    "Mirador North": { lines: { "01": 180, "02": 180, "03": 140, "04": 140, "05": 180, "06": 180, "PH": 300 }, penthouse: false },
    "Mirador South": { lines: { "01": 180, "02": 180, "03": 140, "04": 140, "05": 180, "06": 180, "PH": 300 }, penthouse: false },
    "Mondrian South Beach": { lines: { "01": 260, "02": 220, "03": 220, "04": 260, "PH": 400 }, penthouse: false },
    "South Bay Club": { lines: { "01": 180, "02": 180, "03": 140, "04": 140, "05": 180, "06": 180 }, penthouse: false },
    "1500 Ocean Drive": { lines: { "01": 320, "02": 280, "03": 240, "04": 240, "05": 280, "06": 320, "PH01": 450, "PH02": 450 }, penthouse: false },
    "ArteCity": { lines: { "01": 180, "02": 180, "03": 140, "04": 140, "05": 180, "06": 180 }, penthouse: false },
    "Boulan South Beach": { lines: { "01": 240, "02": 220, "03": 180, "04": 180, "05": 220, "06": 240, "PH": 360 }, penthouse: false },
    "Casa Grande": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220, "PH": 340 }, penthouse: false },
    "Decoplage": { lines: { "01": 160, "02": 160, "03": 120, "04": 120, "05": 160, "06": 160, "07": 180, "08": 180 }, penthouse: false },
    "Edition Miami Beach Residences": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Faena Hotel Residences": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420 }, penthouse: false },
    "Faena House Miami Beach": { lines: { "A": 450, "B": 430, "C": 380, "CD": 420, "D": 260, "PH-A": 450, "PH-B": 450, "DPLX-PH": 450 }, penthouse: false },
    "Fontainebleau III Sorrento": { lines: { "01": 260, "02": 240, "03": 220, "04": 220, "05": 240, "06": 260 }, penthouse: false },
    "Fontainebleau II Tresor": { lines: { "01": 260, "02": 240, "03": 220, "04": 220, "05": 240, "06": 260 }, penthouse: false },
    "Il Villaggio": { lines: { "01": 430, "02": 380, "03": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Mirasol Ocean Towers": { lines: { "01": 300, "02": 260, "03": 220, "04": 220, "05": 260, "06": 300 }, penthouse: false },
    "Mosaic": { lines: { "01": 420, "02": 380, "03": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Roney Palace": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220, "07": 240, "08": 240 }, penthouse: false },
    "Shore Club Private Collection": { lines: { "01": 450, "02": 430, "03": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "W Hotel and Residences South Beach": { lines: { "01": 320, "02": 260, "03": 260, "04": 320, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Club Atlantis": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220 }, penthouse: false },
    "Twenty-Nine Indian Creek": { lines: { "01": 260, "02": 240, "03": 220, "04": 220, "05": 240, "06": 260 }, penthouse: false },
    "5600 Collins": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220, "PH01": 340, "PH02": 340 }, penthouse: false },
    "57 Ocean": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Akoya": { lines: { "01": 260, "02": 220, "03": 180, "04": 180, "05": 220, "06": 260, "PH01": 400, "PH02": 400 }, penthouse: false },
    "Aqua Allison Island - Chatham Building": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Aqua Allison Island - Gorlin Building": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Aqua Allison Island - Spear Building": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Atelier": { lines: { "01": 430, "02": 380, "03": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Bath Club": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Bel Aire on the Ocean": { lines: { "01": 260, "02": 220, "03": 180, "04": 180, "05": 220, "06": 260, "PH01": 360, "PH02": 360 }, penthouse: false },
    "Blue Diamond": { lines: { "01": 320, "02": 280, "03": 240, "04": 240, "05": 280, "06": 320, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Caribbean": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Carillon Hotel Residences": { lines: { "01": 260, "02": 240, "03": 220, "04": 220, "05": 240, "06": 260, "PH01": 360, "PH02": 360 }, penthouse: false },
    "Carillon Residences North Tower": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Carillon Residences South Tower": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Eden House": { lines: { "01": 260, "02": 220, "03": 180, "04": 180, "05": 220, "06": 260, "PH01": 360, "PH02": 360 }, penthouse: false },
    "Green Diamond": { lines: { "01": 320, "02": 280, "03": 240, "04": 240, "05": 280, "06": 320, "PH01": 420, "PH02": 420 }, penthouse: false },
    "IRIS on The Bay": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220, "TH01": 300, "TH02": 300 }, penthouse: false },
    "La Gorce Palace": { lines: { "01": 260, "02": 220, "03": 180, "04": 180, "05": 220, "06": 260, "PH01": 360, "PH02": 360 }, penthouse: false },
    "L'Excellence": { lines: { "01": 300, "02": 260, "03": 220, "04": 220, "05": 260, "06": 300, "PH01": 400, "PH02": 400 }, penthouse: false },
    "MEi Condominium": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Nautica": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220 }, penthouse: false },
    "Ritz-Carlton Residences": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Terra Beachside Villas": { lines: { "01": 280, "02": 240, "03": 220, "04": 220, "05": 240, "06": 280, "TH01": 340, "TH02": 340 }, penthouse: false },
    "The Collins": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220 }, penthouse: false },
    "The Perigon": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Villa Di Mare": { lines: { "01": 430, "02": 380, "03": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "72 Park": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220, "PH01": 340, "PH02": 340 }, penthouse: false },
    "Eighty Seven Park": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "360 Condo East": { lines: { "01": 220, "02": 180, "03": 180, "04": 220, "05": 220, "06": 180, "07": 180, "08": 220 }, penthouse: false },
    "360 Condo Marina Residences East": { lines: { "01": 240, "02": 220, "03": 180, "04": 180, "05": 220, "06": 240, "PH01": 340, "PH02": 340 }, penthouse: false },
    "360 Condo Marina Residences West": { lines: { "01": 240, "02": 220, "03": 180, "04": 180, "05": 220, "06": 240, "PH01": 340, "PH02": 340 }, penthouse: false },
    "360 Condo West": { lines: { "01": 220, "02": 180, "03": 180, "04": 220, "05": 220, "06": 180, "07": 180, "08": 220 }, penthouse: false },
    "Continuum Club at North Bay Village": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220, "PH01": 320, "PH02": 320 }, penthouse: false },
    "The Lexi": { lines: { "01": 220, "02": 180, "03": 180, "04": 220, "05": 240, "06": 240, "PH01": 340, "PH02": 340 }, penthouse: false },
    "Parque Towers East": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Parque Towers West": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "St. Tropez Center - Tower 2": { lines: { "01": 260, "02": 220, "03": 180, "04": 180, "05": 220, "06": 260, "PH01": 360, "PH02": 360 }, penthouse: false },
    "St. Tropez East - Tower 1": { lines: { "01": 260, "02": 220, "03": 180, "04": 180, "05": 220, "06": 260, "PH01": 360, "PH02": 360 }, penthouse: false },
    "St. Tropez West - Tower 3": { lines: { "01": 260, "02": 220, "03": 180, "04": 180, "05": 220, "06": 260, "PH01": 360, "PH02": 360 }, penthouse: false },
    "Jade Beach": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Jade Ocean": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "La Perla": { lines: { "01": 260, "02": 220, "03": 180, "04": 180, "05": 220, "06": 260, "PH01": 360, "PH02": 360 }, penthouse: false },
    "Mansions at Acqualina": { lines: { "01": 450, "02": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean 7": { lines: { "01": 300, "02": 260, "03": 220, "04": 220, "05": 260, "06": 300, "PH01": 400, "PH02": 400 }, penthouse: false },
    "Oceania III": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Oceania IV": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Oceania V": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean III": { lines: { "01": 320, "02": 280, "03": 240, "04": 240, "05": 280, "06": 320, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Pinnacle": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ritz-Carlton Sunny Isles Beach": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Sayan Sunny Isles": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "St Regis Residences Sunny Isles Beach North Tower": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "St Regis Residences Sunny Isles Beach South Tower": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "The Estates at Acqualina North": { lines: { "01": 450, "02": 440, "03": 430, "04": 430, "05": 440, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "The Estates at Acqualina South": { lines: { "01": 450, "02": 440, "03": 430, "04": 430, "05": 440, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Trump Royale": { lines: { "01": 320, "02": 280, "03": 240, "04": 240, "05": 280, "06": 320, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Trump Tower I": { lines: { "01": 320, "02": 280, "03": 240, "04": 240, "05": 280, "06": 320, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Trump Tower II": { lines: { "01": 320, "02": 280, "03": 240, "04": 240, "05": 280, "06": 320, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Trump Tower III": { lines: { "01": 320, "02": 280, "03": 240, "04": 240, "05": 280, "06": 320, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Turnberry Ocean Colony North": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Turnberry Ocean Colony South": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Echo Aventura East": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Echo Aventura West": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Hamptons South": { lines: { "01": 320, "02": 280, "03": 240, "04": 240, "05": 280, "06": 320, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Porto Vita North": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Porto Vita South": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "The Landmark": { lines: { "01": 280, "02": 240, "03": 220, "04": 220, "05": 240, "06": 280, "PH01": 380, "PH02": 380 }, penthouse: false },
    "Prive North Tower": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Prive South Tower": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Atlantic One at The Point": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Bella Mare Williams Island": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Bellini Williams Island": { lines: { "01": 420, "02": 380, "03": 320, "04": 320, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Apogee Beach": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Diplomat Ocean Residences": { lines: { "01": 420, "02": 380, "03": 320, "04": 320, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean Palms": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Trump Hollywood": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Casa del Mar": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Grand Bay Residences": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Grand Bay Ritz Carlton": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Grand Bay Tower": { lines: { "01": 420, "02": 360, "03": 300, "04": 300, "05": 360, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Key Colony I Tidemark": { lines: { "01": 280, "02": 240, "03": 220, "04": 220, "05": 240, "06": 280, "PH01": 380, "PH02": 380 }, penthouse: false },
    "Key Colony II Oceansound": { lines: { "01": 280, "02": 240, "03": 220, "04": 220, "05": 240, "06": 280, "PH01": 380, "PH02": 380 }, penthouse: false },
    "Key Colony III Emerald Bay": { lines: { "01": 300, "02": 260, "03": 220, "04": 220, "05": 260, "06": 300, "PH01": 400, "PH02": 400 }, penthouse: false },
    "Key Colony IV Botanica": { lines: { "01": 260, "02": 220, "03": 180, "04": 180, "05": 220, "06": 260, "PH01": 360, "PH02": 360 }, penthouse: false },
    "Towers of Key Biscayne Tower 1": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Towers of Key Biscayne Tower 2": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Ocean Club Lake Tower": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean Club Lake Villa 1": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean Club Lake Villa 2": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean Club Lake Villa 3": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean Club Ocean Tower 1": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean Club Ocean Tower 2": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean Club Resort Villa 1": { lines: { "01": 380, "02": 340, "03": 300, "04": 300, "05": 340, "06": 380, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean Club Resort Villa 2": { lines: { "01": 380, "02": 340, "03": 300, "04": 300, "05": 340, "06": 380, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean Club Tower 1": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean Club Tower 2": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ocean Club Tower 3": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Cloisters on the Bay": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fairfield Coconut Grove": { lines: { "01": 260, "02": 220, "03": 180, "04": 180, "05": 220, "06": 260, "PH01": 360, "PH02": 360 }, penthouse: false },
    "Four Seasons Residences Coconut Grove": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Grove at Grand Bay North": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Grove at Grand Bay South": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Grove Isle 1 - Tower One": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Grove Isle 2 - Tower Two": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Grove Isle 3 - Tower Three": { lines: { "01": 340, "02": 300, "03": 260, "04": 260, "05": 300, "06": 340, "PH01": 420, "PH02": 420 }, penthouse: false },
    "Grovenor House": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Mr. C Residences Bayshore": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Mr. C Residences Tigertail": { lines: { "01": 430, "02": 380, "03": 320, "04": 320, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ritz-Carlton Coconut Grove 1": { lines: { "01": 380, "02": 340, "03": 300, "04": 300, "05": 340, "06": 380, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Ritz-Carlton Coconut Grove 2": { lines: { "01": 380, "02": 340, "03": 300, "04": 300, "05": 340, "06": 380, "PH01": 450, "PH02": 450 }, penthouse: false },
    "The Markers Grove Isle": { lines: { "01": 380, "02": 340, "03": 300, "04": 300, "05": 340, "06": 380, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Villa Alhambra": { lines: { "01": 240, "02": 220, "03": 180, "04": 180, "05": 220, "06": 240, "PH01": 340, "PH02": 340 }, penthouse: false },
    "Gables Club Tower I": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Gables Club Tower II": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Oceanside I": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Oceanside II": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Oceanside III": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Oceanside IV": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Oceanside V": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Oceanside VI": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Seaside Village I": { lines: { "01": 380, "02": 340, "03": 300, "04": 300, "05": 340, "06": 380, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Seaside Village II": { lines: { "01": 380, "02": 340, "03": 300, "04": 300, "05": 340, "06": 380, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Seaside Villas": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Villa del Mare": { lines: { "01": 430, "02": 380, "03": 340, "04": 340, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Palazzo della Luna": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Palazzo del Mare": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Palazzo del Sol": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Six Fisher Island": { lines: { "01": 450, "02": 430, "03": 420, "04": 420, "05": 430, "06": 450, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Bayside Village": { lines: { "01": 380, "02": 340, "03": 300, "04": 300, "05": 340, "06": 380, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Bayview V": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Bayview VI": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Bayview VII": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Bayview VIII": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Bayview IX": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Fisher Island Bayview X": { lines: { "01": 420, "02": 380, "03": 340, "04": 340, "05": 380, "06": 420, "PH01": 450, "PH02": 450 }, penthouse: false },
    // ---- New buildings from ChatGPT audit session ----
    "Gables Estates Club": { lines: { "01": 430, "02": 380, "03": 340, "04": 340, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Journey's End Residences": { lines: { "01": 430, "02": 380, "03": 340, "04": 340, "05": 380, "06": 430, "PH01": 450, "PH02": 450 }, penthouse: false },
    "Courvoisier Courts": { lines: { "01": 220, "02": 180, "03": 220, "04": 220, "05": 160, "06": 160, "07": 220, "08": 220, "09": 180, "10": 220 }, penthouse: false },
    "Isola": { lines: { "01": 220, "02": 180, "03": 180, "04": 220 }, penthouse: false },
    "St Louis Condo": { lines: { "01": 260, "02": 220, "03": 220, "04": 260, "05": 300 }, penthouse: false },
    "Courts Brickell Key": { lines: { "01": 220, "02": 220, "03": 180, "04": 180, "05": 220, "06": 220, "07": 220, "08": 220, "09": 180, "10": 180, "11": 220, "12": 220 }, penthouse: false },
    // ---- Buildings pending floor plan audit (lines to be filled by ChatGPT) ----
    "2020 North Bayshore": { lines: {}, penthouse: false },
    "Brickell Key One": { lines: {}, penthouse: false },
    "Four Seasons Condo Hotel": { lines: {}, penthouse: false },
    "Majestic Tower": { lines: {}, penthouse: false },
    "Turnberry Isle North Tower": { lines: {}, penthouse: false },
    "Turnberry Isle South Tower": { lines: {}, penthouse: false },
    "Peninsula I": { lines: {}, penthouse: false },
    "Peninsula II": { lines: {}, penthouse: false },
    "Residence du Cap": { lines: {}, penthouse: false },
    "Marina Tower Aventura": { lines: {}, penthouse: false },
    "Hidden Bay": { lines: {}, penthouse: false },
    "Hamptons West": { lines: {}, penthouse: false },
    "Williams Island 2600": { lines: {}, penthouse: false },
    "Williams Island 2800": { lines: {}, penthouse: false },
    "Williams Island 1000": { lines: {}, penthouse: false },
    "Williams Island 2000": { lines: {}, penthouse: false },
    "Williams Island 3000": { lines: {}, penthouse: false },
    "Williams Island 4000": { lines: {}, penthouse: false },
    "Williams Island 5000": { lines: {}, penthouse: false },
    "Williams Island 6000": { lines: {}, penthouse: false },
    "Williams Island 7000": { lines: {}, penthouse: false },
    "One Island Place I": { lines: {}, penthouse: false },
    "One Island Place II": { lines: {}, penthouse: false },
    "Mediterranean Village": { lines: {}, penthouse: false },
    "Hamptons North": { lines: {}, penthouse: false },
    "Delvista Towers North": { lines: {}, penthouse: false },
    "Delvista Towers South": { lines: {}, penthouse: false },
    "La Baia": { lines: {}, penthouse: false },
    "Marina Palms North": { lines: {}, penthouse: false },
    "Marina Palms South": { lines: {}, penthouse: false },
    "Aventura Marina 1": { lines: {}, penthouse: false },
    "Aventura Marina 2": { lines: {}, penthouse: false },
    "The Point North Tower": { lines: {}, penthouse: false },
    "The Point South Tower": { lines: {}, penthouse: false },
  };

  // ---------------------------------------------------------------------------
  // VERIFIED BUILDINGS — floor plans confirmed, line selectors shown in widget
  // Add a building name here once its lines have been verified against actual
  // floor plan documents. Buildings not listed here show lines as "pending".
  // ---------------------------------------------------------------------------
  const verifiedBuildings = new Set<string>([
    "Gran Paraiso", "One Paraiso", "Paraiso Bay", "Paraiso Bayviews",
    "Missoni Baia", "Brickell Heights East", "Brickell Heights West",
    "Echo Brickell", "Continuum North Tower", "Continuum South Tower",
    "Murano at Portofino", "Murano Grande", "The Setai", "Biscayne Beach",
    "Brickell Flatiron", "Reach Brickell City Centre", "Rise Brickell City Center",
    "Apogee South Beach", "Faena House", "Aston Martin Residences",
    "1 Hotel & Homes", "Portofino Tower", "Aria on the Bay", "Bay House",
    "Opera Tower", "Blue on the Bay", "Quantum on the Bay", "Paramount Bay",
    "1000 Museum", "Elysee Miami", "2020 North Bayshore", "Courvoisier Courts",
    "Isola", "St Louis Condo", "Courts Brickell Key",
    "The Elser Hotel & Residences", "Vizcayne South", "ICON Brickell Tower 1A",
    "Centro", "Loft Downtown I", "Loft Downtown II", "Mint",
    "50 Biscayne", "900 Biscayne Bay", "Marina Blue", "One Miami East",
    "One Miami West", "Epic Residences Miami", "Met 1", "Ten Museum Park",
    "Vizcayne North", "Brickell House", "Marquis Miami",
    "ICON Brickell Tower 1B", "ICON Brickell Tower 2", "ICON Brickell W Miami",
    "Latitude on The River", "Axis - North Tower", "Axis - South Tower",
    "500 Brickell East", "Three Tequesta Point", "Jade Residences",
    "One Tequesta Point", "Two Tequesta Point", "SLS Brickell",
    "Plaza on Brickell - 950 Tower", "Plaza on Brickell - 951 Tower",
    "The Ivy", "1010 Brickell", "1100 Millecento",
    "Four Seasons Residences Miami", "500 Brickell West",
    "1800 Club", "23 Biscayne", "Hyde Midtown Miami",
    "Icon Bay", "Platinum Condominium", "The Crimson",
  ]);

  // ---------------------------------------------------------------------------
  // ADD-ON PRICING — interior glass add-on based on exterior base price
  // ---------------------------------------------------------------------------
  const addOnPricing: Record<number, number> = {
    120: 30, 140: 30, 160: 40, 180: 40, 200: 60, 220: 70, 240: 80, 260: 80,
    280: 90, 300: 100, 320: 110, 330: 120, 340: 120, 360: 130, 380: 140,
    395: 140, 400: 140, 420: 150, 430: 160, 440: 160, 450: 170,
  };

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

  const researchStatus = Object.fromEntries(
    Object.keys(pricing).map((name) => {
      const hasLines = Object.keys(pricing[name].lines).length > 0;
      if (verifiedBuildings.has(name) && hasLines) return [name, "verified" as BuildingStatus];
      if (hasLines) return [name, "priced" as BuildingStatus];
      return [name, "raw" as BuildingStatus];
    })
  ) as Record<string, BuildingStatus>;

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
    if (!buildingQuery.trim()) return buildings.slice(0, 12);
    const q = buildingQuery.trim().toLowerCase();
    return buildings.filter((n) => n.toLowerCase().includes(q)).slice(0, 10);
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
