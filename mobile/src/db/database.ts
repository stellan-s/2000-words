import type { SQLiteDatabase } from "expo-sqlite";
import spanishEntries from "../../assets/data/spanish-2000.json";
import {
  scheduleReview,
  type AppRating,
  type StoredCard,
} from "../srs/scheduler";
import { schema } from "./schema";

export type VocabularyWord = {
  id: string;
  rank: number;
  lemma: string;
  partOfSpeech: string;
  translation: string;
  example: string;
  exampleTranslation: string;
};

export type LearningStats = {
  learned: number;
  due: number;
  reviewsToday: number;
  total: number;
};

type SpanishEntry = {
  id: string;
  rank: number;
  frequencyRank: number;
  lemma: string;
  partOfSpeech: string;
  translation: string;
  example: string;
  exampleTranslation: string;
  attribution: string;
};

type CardRow = {
  word_id: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
};

function rowToStoredCard(row: CardRow): StoredCard {
  return {
    wordId: row.word_id,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    learningSteps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    lastReview: row.last_review,
  };
}

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(schema);
  const version = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM metadata WHERE key = ?",
    ["spanish_dataset_version"],
  );
  if (version?.value === "1") return;

  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `INSERT OR REPLACE INTO languages (id, name, locale, total_words)
       VALUES (?, ?, ?, ?)`,
      ["es", "Spanish", "es-ES", spanishEntries.length],
    );
    await transaction.runAsync("DELETE FROM vocabulary WHERE language_id = ?", ["es"]);

    for (const entry of spanishEntries as SpanishEntry[]) {
      await transaction.runAsync(
        `INSERT INTO vocabulary (
          id, language_id, rank, frequency_rank, lemma, part_of_speech,
          translation, example, example_translation, attribution
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          "es",
          entry.rank,
          entry.frequencyRank,
          entry.lemma,
          entry.partOfSpeech,
          entry.translation,
          entry.example,
          entry.exampleTranslation,
          entry.attribution,
        ],
      );
    }

    await transaction.runAsync(
      "INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)",
      ["spanish_dataset_version", "1"],
    );
  });
}

export async function getLearningStats(db: SQLiteDatabase): Promise<LearningStats> {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const [learned, due, reviewed, total] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM cards WHERE reps > 0",
    ),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM vocabulary v
       LEFT JOIN cards c ON c.word_id = v.id
       WHERE v.language_id = 'es' AND (c.word_id IS NULL OR c.due <= ?)`,
      [now],
    ),
    db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM review_logs WHERE substr(reviewed_at, 1, 10) = ?",
      [today],
    ),
    db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM vocabulary WHERE language_id = 'es'",
    ),
  ]);

  return {
    learned: learned?.count ?? 0,
    due: due?.count ?? 0,
    reviewsToday: reviewed?.count ?? 0,
    total: total?.count ?? 0,
  };
}

export async function getNextDueWord(
  db: SQLiteDatabase,
  now = new Date(),
): Promise<VocabularyWord | null> {
  return db.getFirstAsync<VocabularyWord>(
    `SELECT
      v.id,
      v.rank,
      v.lemma,
      v.part_of_speech AS partOfSpeech,
      v.translation,
      v.example,
      v.example_translation AS exampleTranslation
    FROM vocabulary v
    LEFT JOIN cards c ON c.word_id = v.id
    WHERE v.language_id = 'es' AND (c.word_id IS NULL OR c.due <= ?)
    ORDER BY CASE WHEN c.word_id IS NULL THEN 1 ELSE 0 END, c.due, v.rank
    LIMIT 1`,
    [now.toISOString()],
  );
}

export async function reviewWord(
  db: SQLiteDatabase,
  wordId: string,
  rating: AppRating,
  now = new Date(),
) {
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync<CardRow>(
      "SELECT * FROM cards WHERE word_id = ?",
      [wordId],
    );
    const result = scheduleReview(wordId, row ? rowToStoredCard(row) : null, rating, now);
    const card = result.card;
    const log = result.log;

    await transaction.runAsync(
      `INSERT INTO cards (
        word_id, due, stability, difficulty, elapsed_days, scheduled_days,
        learning_steps, reps, lapses, state, last_review
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(word_id) DO UPDATE SET
        due = excluded.due,
        stability = excluded.stability,
        difficulty = excluded.difficulty,
        elapsed_days = excluded.elapsed_days,
        scheduled_days = excluded.scheduled_days,
        learning_steps = excluded.learning_steps,
        reps = excluded.reps,
        lapses = excluded.lapses,
        state = excluded.state,
        last_review = excluded.last_review`,
      [
        card.wordId,
        card.due,
        card.stability,
        card.difficulty,
        card.elapsedDays,
        card.scheduledDays,
        card.learningSteps,
        card.reps,
        card.lapses,
        card.state,
        card.lastReview,
      ],
    );

    await transaction.runAsync(
      `INSERT INTO review_logs (
        word_id, rating, state, due, stability, difficulty, elapsed_days,
        last_elapsed_days, scheduled_days, learning_steps, reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        wordId,
        log.rating,
        log.state,
        log.due,
        log.stability,
        log.difficulty,
        log.elapsedDays,
        log.lastElapsedDays,
        log.scheduledDays,
        log.learningSteps,
        log.reviewedAt,
      ],
    );
  });
}
