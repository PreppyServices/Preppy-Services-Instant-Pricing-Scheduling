/**
 * Production quote widget contact copy.
 * The Fully Insured label is gone, and the photo CTA is an email link.
 * Other "Text us" strings (private quote, manual review, scheduler) stay.
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

check(!/fully insured/i.test(widget), 'rendered widget source still contains "Fully Insured"');
check(!widget.includes("Totalmente Asegurado"), "Spanish insured label still in the widget");
check(!widget.includes("Entièrement Assuré"), "French insured label still in the widget");
check(!widget.includes("brand.insured"), "brand.insured is still in the widget");

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
  check(!label.includes("Text us"), 'photo CTA still contains "Text us"');
  check(!/[·•–—]/.test(label), "photo CTA visible text has a separator character");
}

check(
  widget.includes("mailto:info@preppyservices.com"),
  "rendered widget source missing mailto:info@preppyservices.com"
);
check(!widget.includes("Text us · Send a photo"), 'rendered widget source still contains "Text us"');
check(!/send a photo/i.test(widget), 'rendered widget source still contains "Send a photo"');

const labelAt = widget.indexOf('{t("cta.textSendPhoto")}');
check(labelAt !== -1, "photo CTA is not rendered");
const control = widget.slice(Math.max(0, labelAt - 700), labelAt);
check(
  control.includes('href="mailto:info@preppyservices.com"'),
  "photo CTA href is not mailto:info@preppyservices.com"
);
check(!control.includes("sms:"), "photo CTA still has an sms: href");
check(!control.includes("buildIMessageURL"), "photo CTA still builds an sms link");
check(
  widget.indexOf('{t("cta.textSendPhoto")}', labelAt + 1) === -1,
  "photo CTA is rendered more than once"
);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("widget contact copy guard passed");
