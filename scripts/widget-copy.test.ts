/**
 * Production quote widget contact copy.
 * No Fully Insured label, no "Text us", and no sms: links.
 * Contact actions use mailto:info@preppyservices.com.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const widget = readFileSync(join(root, "components/PreppyLuxuryWidget.tsx"), "utf8");

check(!/fully insured/i.test(widget), "production widget still contains the insured label");
check(!widget.includes("Totalmente Asegurado"), "Spanish insured label still in the widget");
check(!widget.includes("Entièrement Assuré"), "French insured label still in the widget");
check(!widget.includes("brand.insured"), "brand.insured is still in the widget");
check(!/text us/i.test(widget), 'production widget still contains "Text us"');
check(!widget.includes("sms:"), "production widget still contains an sms: link");

const photoLabels = [...widget.matchAll(/"cta\.textSendPhoto": "([^"]*)"/g)].map((match) => match[1]);
check(
  photoLabels.length === 3,
  `expected English, Spanish, and French photo CTA copy, found ${photoLabels.length}`
);
for (const label of photoLabels) {
  check(
    label === "Email info@preppyservices.com",
    `photo CTA visible text is ${JSON.stringify(label)}`
  );
  check(!/[·•–—-]/.test(label), "photo CTA visible text has a separator character");
}

const emailLabels = [...widget.matchAll(/"cta\.sendImessage": "([^"]*)"/g)].map((match) => match[1]);
check(emailLabels.length === 3, `expected 3 custom email labels, found ${emailLabels.length}`);
for (const label of emailLabels) {
  check(label === "Email", `custom job label is ${JSON.stringify(label)}`);
  check(!/[·•–—-]/.test(label), "custom job label has a separator character");
}

check(
  widget.includes("mailto:info@preppyservices.com") || widget.includes("mailto:${INFO_EMAIL}"),
  "production widget missing mailto:info@preppyservices.com"
);
check(widget.includes('encodeURIComponent("Custom quote")'), "custom email is missing its subject");
check(widget.includes("buildCustomEmailURL"), "custom job control is missing the email builder");
check(!widget.includes("buildIMessageURL"), "custom job control still builds an sms link");

const newCopy = [
  "Email us for a private quote.",
  "or email us for a manual review.",
  "Email us for a manual review.",
  "Email us a photo.",
  "Email us and we'll place you.",
  "or email us.",
];
for (const line of newCopy) {
  check(widget.includes(line), `production widget missing ${JSON.stringify(line)}`);
  check(!/[·•–—-]/.test(line), `new copy has a separator: ${JSON.stringify(line)}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("widget contact copy guard passed");
