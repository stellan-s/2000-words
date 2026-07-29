import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const sourceDir = resolve(process.env.SPANISH_DATA_DIR ?? "/tmp/words-spanish-data");
const customDir = resolve(process.env.SPANISH_CUSTOM_DIR ?? "/tmp/words-6001-spanish");
const outputPath = resolve(projectDir, "assets/data/spanish-2000.json");
const reportPath = resolve(projectDir, "assets/data/spanish-2000.report.json");
const targetCount = 2000;

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function cleanText(value) {
  return value
    .replaceAll("&#42;", "*")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/<[^>]+>/g, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, " ")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function shortDefinition(value) {
  const cleaned = cleanText(value)
    .replace(/\s*\([^)]{45,}\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length <= 120 ? cleaned : `${cleaned.slice(0, 117).trim()}…`;
}

function normalizePos(value) {
  const pos = value.trim().toLowerCase();
  const names = {
    adj: "adjective",
    adv: "adverb",
    art: "article",
    conj: "conjunction",
    interj: "interjection",
    n: "noun",
    num: "number",
    prep: "preposition",
    pron: "pronoun",
    v: "verb",
  };
  return names[pos] ?? null;
}

function parseDictionary(source, candidates) {
  const entries = new Map();
  for (const block of source.split(/\n_____\n/)) {
    const lines = block.trim().split("\n");
    const lemma = lines[0]?.trim().normalize("NFC");
    if (!lemma || !candidates.has(lemma.toLocaleLowerCase("es"))) continue;

    let currentPos = "";
    const senses = [];
    for (const line of lines.slice(1)) {
      const posMatch = line.match(/^pos:\s*(.+)$/);
      if (posMatch) {
        currentPos = posMatch[1].trim();
        continue;
      }
      const glossMatch = line.match(/^\s+gloss:\s*(.+)$/);
      if (glossMatch && currentPos !== "prop") {
        const definition = shortDefinition(glossMatch[1]);
        if (
          definition &&
          !/^(alternative|obsolete|archaic) (form|spelling) of\b/i.test(definition)
        ) {
          senses.push({ pos: currentPos, definition });
        }
      }
    }

    if (senses.length) entries.set(lemma.toLocaleLowerCase("es"), senses);
  }
  return entries;
}

function extractSentenceLemmas(tags) {
  const lemmas = new Set();
  for (const match of tags.matchAll(/:[^,\s]+,([^ ]+)/g)) {
    for (const item of match[1].split(",")) {
      const parts = item.split("|");
      for (const part of parts) {
        const lemma = part.trim().toLocaleLowerCase("es");
        if (lemma) lemmas.add(lemma);
      }
    }
  }
  return lemmas;
}

function scoreSentence(english, spanish, englishScore, spanishScore) {
  const lengthPenalty = Math.abs(spanish.length - 42) + Math.abs(english.length - 38);
  return (englishScore + spanishScore) * 100 - lengthPenalty;
}

function parseSentences(source, candidates) {
  const best = new Map();
  for (const line of source.split("\n")) {
    const [english, spanish, license, englishRatingRaw, spanishRatingRaw, tags] = line.split("\t");
    if (!english || !spanish || !license || !tags) continue;
    if (spanish.length < 12 || spanish.length > 100 || english.length < 8 || english.length > 110) continue;
    if (/\b(?:https?:\/\/|www\.|YOLO)\b/i.test(`${english} ${spanish}`)) continue;

    const englishRating = Number(englishRatingRaw) || 0;
    const spanishRating = Number(spanishRatingRaw) || 0;
    const score = scoreSentence(english, spanish, englishRating, spanishRating);

    for (const lemma of extractSentenceLemmas(tags)) {
      if (!candidates.has(lemma)) continue;
      const previous = best.get(lemma);
      if (!previous || score > previous.score) {
        best.set(lemma, {
          english: cleanText(english),
          spanish: cleanText(spanish),
          attribution: license,
          score,
        });
      }
    }
  }
  return best;
}

async function main() {
  const [frequencySource, dictionarySource, sentenceSource, exclusionsSource, shortDefsSource] =
    await Promise.all([
      readFile(resolve(sourceDir, "frequency.csv"), "utf8"),
      readFile(resolve(sourceDir, "es-en.data"), "utf8"),
      readFile(resolve(sourceDir, "sentences.tsv"), "utf8"),
      readFile(resolve(customDir, "excludes.csv"), "utf8"),
      readFile(resolve(customDir, "shortdefs.csv"), "utf8"),
    ]);

  const exclusions = new Set(
    exclusionsSource
      .split("\n")
      .slice(1)
      .map(parseCsvLine)
      .filter(([position]) => position === "-1")
      .map(([, spanish]) => spanish?.toLocaleLowerCase("es"))
      .filter(Boolean),
  );

  const shortDefs = new Map(
    shortDefsSource
      .split("\n")
      .slice(1)
      .map(parseCsvLine)
      .filter((row) => row.length >= 3)
      .map(([spanish, , definition]) => [spanish.toLocaleLowerCase("es"), definition]),
  );

  const frequencyRows = frequencySource
    .split("\n")
    .slice(1)
    .map(parseCsvLine)
    .map(([count, spanish, pos, flags], index) => ({
      count: Number(count),
      spanish: spanish?.normalize("NFC").trim(),
      key: spanish?.normalize("NFC").trim().toLocaleLowerCase("es"),
      pos,
      flags,
      sourceRank: index + 1,
    }))
    .filter((row) => row.spanish && row.count > 0 && row.sourceRank <= 10000);

  const candidateSet = new Set(frequencyRows.map((row) => row.key));
  const dictionary = parseDictionary(dictionarySource, candidateSet);
  const sentences = parseSentences(sentenceSource, candidateSet);
  const rejected = {
    excluded: 0,
    multiword: 0,
    invalidPartOfSpeech: 0,
    missingDefinition: 0,
    missingExample: 0,
    duplicate: 0,
  };
  const selected = [];
  const seen = new Set();

  for (const row of frequencyRows) {
    if (selected.length === targetCount) break;
    if (exclusions.has(row.key)) {
      rejected.excluded += 1;
      continue;
    }
    if (/\s/.test(row.spanish)) {
      rejected.multiword += 1;
      continue;
    }
    const partOfSpeech = normalizePos(row.pos);
    if (!partOfSpeech) {
      rejected.invalidPartOfSpeech += 1;
      continue;
    }
    if (seen.has(row.key)) {
      rejected.duplicate += 1;
      continue;
    }

    const senses = dictionary.get(row.key) ?? [];
    const matchingSense =
      senses.find((sense) => normalizePos(sense.pos) === partOfSpeech) ?? senses[0];
    const definition = shortDefs.get(row.key) ?? matchingSense?.definition;
    if (!definition) {
      rejected.missingDefinition += 1;
      continue;
    }

    const example = sentences.get(row.key);
    if (!example) {
      rejected.missingExample += 1;
      continue;
    }

    seen.add(row.key);
    selected.push({
      id: `es-${String(selected.length + 1).padStart(4, "0")}`,
      rank: selected.length + 1,
      frequencyRank: row.sourceRank,
      lemma: row.spanish,
      partOfSpeech,
      translation: definition,
      example: example.spanish,
      exampleTranslation: example.english,
      attribution: example.attribution,
    });
  }

  if (selected.length !== targetCount) {
    throw new Error(`Expected ${targetCount} entries, generated ${selected.length}.`);
  }

  const serialized = `${JSON.stringify(selected, null, 2)}\n`;
  const partOfSpeechCounts = Object.fromEntries(
    [...new Set(selected.map((entry) => entry.partOfSpeech))]
      .sort()
      .map((pos) => [pos, selected.filter((entry) => entry.partOfSpeech === pos).length]),
  );
  const report = {
    generatedAt: new Date().toISOString(),
    entries: selected.length,
    uniqueLemmas: new Set(selected.map((entry) => entry.lemma.toLocaleLowerCase("es"))).size,
    completeDefinitions: selected.filter((entry) => entry.translation).length,
    completeExamples: selected.filter((entry) => entry.example && entry.exampleTranslation).length,
    maximumSourceRank: Math.max(...selected.map((entry) => entry.frequencyRank)),
    partOfSpeechCounts,
    rejected,
    sha256: createHash("sha256").update(serialized).digest("hex"),
    contentReviewStatus: "machine-validated; human linguistic review required",
    sources: [
      "https://github.com/doozan/spanish_data",
      "https://github.com/doozan/6001_Spanish",
      "https://en.wiktionary.org",
      "https://tatoeba.org",
    ],
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await Promise.all([
    writeFile(outputPath, serialized),
    writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`),
  ]);
  console.log(JSON.stringify(report, null, 2));
}

await main();
