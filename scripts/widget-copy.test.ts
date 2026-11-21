/**
 * Production quote widget contact copy.
 * No Fully Insured label, no "Text us", and no sms: links.
 * Contact actions use mailto:info@preppyservices.com.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
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
check(!widget.includes("$2M"), "production widget still contains $2M");
check(!widget.includes("2M$"), "production widget still contains 2M$");
check(!widget.includes("Text or call"), 'production widget still contains "Text or call"');
check(!widget.includes("Escriba o llame"), 'production widget still contains "Escriba o llame"');
check(!widget.includes("Écrivez ou appelez"), 'production widget still contains "Écrivez ou appelez"');
check(widget.includes('href="tel:+13054140305"'), "production widget missing tel:+13054140305");

const callLabels = [...widget.matchAll(/"price\.call": "([^"]*)"/g)].map((match) => match[1]);
check(callLabels.length === 3, `expected English, Spanish, and French call copy, found ${callLabels.length}`);
const expectedCalls = [
  "Call 305-414-0305",
  "Llame al 305-414-0305",
  "Appelez le 305-414-0305",
];
for (const expected of expectedCalls) {
  check(callLabels.includes(expected), `production widget missing call copy ${JSON.stringify(expected)}`);
}

const coverageLabels = [...widget.matchAll(/"trust\.coverage": "([^"]*)"/g)].map((match) => match[1]);
check(
  coverageLabels.length === 3,
  `expected English, Spanish, and French coverage copy, found ${coverageLabels.length}`
);
const expectedCoverage = [
  "Certificate of insurance on request",
  "Certificado de seguro a petición",
  "Attestation d'assurance sur demande",
];
const retiredCoverage = ["Coverage", "Cobertura $2M", "Couverture 2M$", "$2M Coverage"];
for (const expected of expectedCoverage) {
  check(
    coverageLabels.includes(expected),
    `production widget missing coverage copy ${JSON.stringify(expected)}`
  );
}
for (const label of coverageLabels) {
  for (const retired of retiredCoverage) {
    check(label !== retired, `coverage badge still uses retired copy ${JSON.stringify(label)}`);
  }
}

const coverageSubs = [...widget.matchAll(/"trust\.coverage\.sub": "([^"]*)"/g)].map((match) => match[1]);
check(coverageSubs.length === 3, `expected 3 empty coverage subtitles, found ${coverageSubs.length}`);
for (const sub of coverageSubs) {
  check(sub === "", `coverage subtitle is ${JSON.stringify(sub)}`);
}

const phone = "305-414-0305";
for (const line of [...callLabels, ...coverageLabels, ...coverageSubs]) {
  const withoutPhone = line.split(phone).join("");
  check(
    !/[·•–—-]/.test(withoutPhone),
    `new visible copy has a hyphen or dash: ${JSON.stringify(line)}`
  );
}

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

function listFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(full));
      continue;
    }
    if (entry.isFile()) files.push(full);
  }
  return files;
}

const bannedTokens = ["sms:", "$2M", "2M$"] as const;
for (const dirName of ["app", "components"]) {
  for (const file of listFiles(join(root, dirName))) {
    const text = readFileSync(file, "utf8");
    const rel = relative(root, file);
    for (const token of bannedTokens) {
      check(!text.includes(token), `${rel} contains ${JSON.stringify(token)}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("widget contact copy guard passed");
