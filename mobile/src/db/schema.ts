export const schema = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS languages (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  locale TEXT NOT NULL,
  total_words INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS vocabulary (
  id TEXT PRIMARY KEY NOT NULL,
  language_id TEXT NOT NULL REFERENCES languages(id),
  rank INTEGER NOT NULL,
  frequency_rank INTEGER NOT NULL,
  lemma TEXT NOT NULL,
  part_of_speech TEXT NOT NULL,
  translation TEXT NOT NULL,
  example TEXT NOT NULL,
  example_translation TEXT NOT NULL,
  attribution TEXT NOT NULL,
  UNIQUE(language_id, rank),
  UNIQUE(language_id, lemma)
);

CREATE TABLE IF NOT EXISTS cards (
  word_id TEXT PRIMARY KEY NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  due TEXT NOT NULL,
  stability REAL NOT NULL,
  difficulty REAL NOT NULL,
  elapsed_days INTEGER NOT NULL,
  scheduled_days INTEGER NOT NULL,
  learning_steps INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  lapses INTEGER NOT NULL,
  state INTEGER NOT NULL,
  last_review TEXT
);

CREATE TABLE IF NOT EXISTS review_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  state INTEGER NOT NULL,
  due TEXT NOT NULL,
  stability REAL NOT NULL,
  difficulty REAL NOT NULL,
  elapsed_days INTEGER NOT NULL,
  last_elapsed_days INTEGER NOT NULL,
  scheduled_days INTEGER NOT NULL,
  learning_steps INTEGER NOT NULL,
  reviewed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS vocabulary_language_rank
  ON vocabulary(language_id, rank);
CREATE INDEX IF NOT EXISTS cards_due
  ON cards(due);
CREATE INDEX IF NOT EXISTS review_logs_word_date
  ON review_logs(word_id, reviewed_at);
`;
