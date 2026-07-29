import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const dataPath = resolve(projectDir, "assets/data/spanish-2000.json");
const reportPath = resolve(projectDir, "assets/data/spanish-2000.report.json");
const dataSource = await readFile(dataPath, "utf8");
const entries = JSON.parse(dataSource);
const report = JSON.parse(await readFile(reportPath, "utf8"));
const errors = [];

if (entries.length !== 2000) errors.push(`Expected 2000 entries, found ${entries.length}.`);
if (new Set(entries.map((entry) => entry.id)).size !== entries.length) errors.push("Duplicate IDs found.");
if (new Set(entries.map((entry) => entry.lemma.toLocaleLowerCase("es"))).size !== entries.length) {
  errors.push("Duplicate Spanish lemmas found.");
}

entries.forEach((entry, index) => {
  if (entry.rank !== index + 1) errors.push(`Non-contiguous rank at ${entry.id}.`);
  for (const field of [
    "id",
    "lemma",
    "partOfSpeech",
    "translation",
    "example",
    "exampleTranslation",
    "attribution",
  ]) {
    if (typeof entry[field] !== "string" || !entry[field].trim()) {
      errors.push(`${entry.id} has an invalid ${field}.`);
    }
  }
  if (/\s/.test(entry.lemma)) errors.push(`${entry.id} is not a single-word lemma.`);
});

const sha256 = createHash("sha256").update(dataSource).digest("hex");
if (sha256 !== report.sha256) errors.push("Dataset checksum does not match its report.");

if (errors.length) {
  console.error(errors.slice(0, 50).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${entries.length} unique Spanish entries (${sha256.slice(0, 12)}…).`);
}
