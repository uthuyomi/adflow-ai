import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["app", "components"];
const ignoredSegments = new Set(["api", "ui"]);
const ignoredFiles = new Set(["LocalizedMetadata.tsx"]);
const legacyJa = JSON.parse(fs.readFileSync(path.join(root, "locales/legacy-ui.ja.json"), "utf8"));
const allowedLiteralPatterns = [
  /^AdFlow AI$/,
  /^X$/,
  /^LP$/,
  /^PR$/,
  /^CTR$/,
  /^CVR$/,
  /^CPC$/,
  /^FCP$/,
  /^LCP$/,
  /^EN$/,
  /^日本語$/,
  /^Promise$/,
  /^https?:\/\//,
  /^\d/,
  /\.sql$/,
  /^[A-Z0-9_./:+-]+$/,
];

const files = scanRoots.flatMap((directory) => walk(path.join(root, directory)));
const violations = [];
const mojibakePatterns = [/縺/, /繧/, /譁/, /譛/, /蠎/, /蜿/, /荳/];

for (const file of files) {
  if (!/\.(tsx|ts)$/.test(file) || ignoredFiles.has(path.basename(file))) continue;
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (relative.split("/").some((segment) => ignoredSegments.has(segment))) continue;
  const source = fs.readFileSync(file, "utf8");
  if (mojibakePatterns.some((pattern) => pattern.test(source))) {
    violations.push(`${relative}: contains likely mojibake`);
  }
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes("i18n-audit-ignore")) return;
    for (const literal of visibleLiterals(line)) {
      if (allowedLiteralPatterns.some((pattern) => pattern.test(literal))) continue;
      if (legacyJa[literal]) continue;
      violations.push(`${relative}:${index + 1}: ${literal}`);
    }
  });
}

const enKeys = dictionaryKeys(path.join(root, "locales/en.ts"));
const jaSource = fs.readFileSync(path.join(root, "locales/ja.ts"), "utf8");
if (mojibakePatterns.some((pattern) => pattern.test(jaSource))) {
  violations.push("locales/ja.ts: contains likely mojibake");
}
const jaOverrides = new Set([...jaSource.matchAll(/^\s*"([^"]+)"\s*:/gm)].map((match) => match[1]));
const demandKeys = [...enKeys].filter((key) => key.startsWith("demandDiscovery."));
const missingDemandOverrides = demandKeys.filter((key) => !jaOverrides.has(key));

if (missingDemandOverrides.length) {
  console.error("Missing Japanese Demand Discovery overrides:");
  missingDemandOverrides.forEach((key) => console.error(`- ${key}`));
}
if (violations.length) {
  console.error(`Visible hard-coded UI strings (${violations.length}):`);
  violations.forEach((violation) => console.error(`- ${violation}`));
}
if (missingDemandOverrides.length || violations.length) process.exit(1);
console.log(`i18n audit passed across ${files.length} frontend files.`);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function dictionaryKeys(file) {
  return new Set([...fs.readFileSync(file, "utf8").matchAll(/^\s*"([^"]+)"\s*:/gm)].map((match) => match[1]));
}

function visibleLiterals(line) {
  const values = [];
  for (const match of line.matchAll(/>([^<>{}]+)</g)) values.push(match[1]);
  for (const match of line.matchAll(/\b(?:placeholder|title|aria-label|alt)=["']([^"']+)["']/g)) values.push(match[1]);
  return values
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value) => value.length > 1 && /[A-Za-zぁ-んァ-ヶ一-龯]/.test(value));
}
