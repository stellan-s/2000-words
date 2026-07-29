import { Rating, State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import {
  createStoredCard,
  deserializeCard,
  getRetrievability,
  scheduleReview,
  serializeCard,
  type StoredCard,
} from "./scheduler";

const start = new Date("2026-01-01T12:00:00.000Z");

describe("FSRS vocabulary scheduler", () => {
  it("creates a new card due immediately", () => {
    const card = createStoredCard("es-0001", start);

    expect(card.wordId).toBe("es-0001");
    expect(card.state).toBe(State.New);
    expect(card.reps).toBe(0);
    expect(card.due).toBe(start.toISOString());
  });

  it("maps the three-button interface onto FSRS ratings", () => {
    const again = scheduleReview("es-0001", null, "again", start);
    const hard = scheduleReview("es-0001", null, "hard", start);
    const know = scheduleReview("es-0001", null, "know", start);

    expect(again.log.rating).toBe(Rating.Again);
    expect(hard.log.rating).toBe(Rating.Hard);
    expect(know.log.rating).toBe(Rating.Good);
    expect(new Date(again.card.due).getTime()).toBeGreaterThan(start.getTime());
    expect(new Date(hard.card.due).getTime()).toBeGreaterThan(start.getTime());
    expect(new Date(know.card.due).getTime()).toBeGreaterThan(start.getTime());
  });

  it("moves a remembered word into review with a growing interval", () => {
    let card: StoredCard | null = null;
    const intervals: number[] = [];
    let reviewAt = start;

    for (let index = 0; index < 5; index += 1) {
      const result = scheduleReview("es-0001", card, "know", reviewAt);
      card = result.card;
      intervals.push(card.scheduledDays);
      reviewAt = new Date(card.due);
    }

    if (!card) throw new Error("Expected a scheduled card.");
    expect(card.state).toBe(State.Review);
    expect(card.reps).toBe(5);
    expect(intervals.at(-1)).toBeGreaterThan(intervals[2]);
    expect(getRetrievability(card, reviewAt)).toBeGreaterThan(0.89);
  });

  it("records a lapse when a review card is forgotten", () => {
    let card: StoredCard | null = null;
    let reviewAt = start;
    while (!card || card.state !== State.Review) {
      const result = scheduleReview("es-0001", card, "know", reviewAt);
      card = result.card;
      reviewAt = new Date(card.due);
    }

    const forgotten = scheduleReview("es-0001", card, "again", reviewAt);
    expect(forgotten.card.lapses).toBe(1);
    expect(forgotten.card.state).toBe(State.Relearning);
  });

  it("round-trips persisted card dates without changing state", () => {
    const reviewed = scheduleReview("es-0001", null, "know", start).card;
    const roundTripped = serializeCard(reviewed.wordId, deserializeCard(reviewed));

    expect(roundTripped).toEqual(reviewed);
  });
});
