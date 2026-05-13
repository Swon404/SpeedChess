import { describe, expect, it } from "vitest";
import { initialState, type Move } from "../board";
import { legalMovesFrom } from "../rules";
import { describeMoveGrade, evaluateMoveFeedback, summarizeMoveGrades } from "../performance";

function findMove(fromFile: number, fromRank: number, toFile: number, toRank: number): Move {
  const moves = legalMovesFrom(initialState(), { file: fromFile, rank: fromRank });
  const move = moves.find((candidate) =>
    candidate.to.file === toFile && candidate.to.rank === toRank
  );
  if (!move) throw new Error("Expected legal move not found");
  return move;
}

describe("performance helpers", () => {
  it("maps move grades to the expected kid-friendly labels", () => {
    expect(describeMoveGrade(0).label).toBe("Donkey");
    expect(describeMoveGrade(3).label).toBe("Clever");
    expect(describeMoveGrade(5).sound).toBe("grandmaster");
  });

  it("turns move grades into stars and a normalized score", () => {
    const summary = summarizeMoveGrades([5, 4, 4, 5, 3]);
    expect(summary.stars).toBe(4);
    expect(summary.score).toBeGreaterThanOrEqual(80);
    expect(summary.title).toBe("Sharp game");
  });

  it("penalizes blunders in the game summary", () => {
    const summary = summarizeMoveGrades([0, 1, 0, 2]);
    expect(summary.stars).toBe(1);
    expect(summary.score).toBeLessThan(25);
  });

  it("does not label every opening move as grandmaster", () => {
    const state = initialState();
    const kingPawn = evaluateMoveFeedback(state, findMove(4, 1, 4, 3));
    const fPawn = evaluateMoveFeedback(state, findMove(5, 1, 5, 2));

    expect(kingPawn.grade).toBeGreaterThanOrEqual(fPawn.grade);
    expect(fPawn.grade).toBeLessThan(5);
    expect(kingPawn.loss).toBeLessThanOrEqual(fPawn.loss);
  });
});