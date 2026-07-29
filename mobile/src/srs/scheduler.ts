import {
  createEmptyCard,
  fsrs,
  Rating,
  type Card,
  type Grade,
  type ReviewLog,
} from "ts-fsrs";

export type AppRating = "again" | "hard" | "know";

export type StoredCard = {
  wordId: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
};

export type StoredReviewLog = {
  rating: number;
  state: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reviewedAt: string;
};

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ["1m", "10m"],
  relearning_steps: ["10m"],
});

const ratingMap: Record<AppRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  know: Rating.Good,
};

export function serializeCard(wordId: string, card: Card): StoredCard {
  return {
    wordId,
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review?.toISOString() ?? null,
  };
}

export function deserializeCard(card: StoredCard): Card {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

function serializeLog(log: ReviewLog): StoredReviewLog {
  return {
    rating: log.rating,
    state: log.state,
    due: log.due.toISOString(),
    stability: log.stability,
    difficulty: log.difficulty,
    elapsedDays: log.elapsed_days,
    lastElapsedDays: log.last_elapsed_days,
    scheduledDays: log.scheduled_days,
    learningSteps: log.learning_steps,
    reviewedAt: log.review.toISOString(),
  };
}

export function createStoredCard(wordId: string, now = new Date()): StoredCard {
  return serializeCard(wordId, createEmptyCard(now));
}

export function scheduleReview(
  wordId: string,
  storedCard: StoredCard | null,
  rating: AppRating,
  now = new Date(),
): { card: StoredCard; log: StoredReviewLog } {
  const card = storedCard ? deserializeCard(storedCard) : createEmptyCard(now);
  const result = scheduler.next(card, now, ratingMap[rating]);
  return {
    card: serializeCard(wordId, result.card),
    log: serializeLog(result.log),
  };
}

export function getRetrievability(storedCard: StoredCard, now = new Date()) {
  return scheduler.get_retrievability(deserializeCard(storedCard), now, false);
}
