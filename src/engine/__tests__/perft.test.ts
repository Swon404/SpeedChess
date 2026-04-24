import { describe, it, expect } from "vitest";
import { initialState } from "../board";
import { allLegalMoves, makeMove } from "../rules";

function perft(state: ReturnType<typeof initialState>, depth: number): number {
  if (depth === 0) return 1;
  const moves = allLegalMoves(state);
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const m of moves) nodes += perft(makeMove(state, m), depth - 1);
  return nodes;
}

describe("perft from initial position", () => {
  it("depth 1 = 20", () => {
    expect(perft(initialState(), 1)).toBe(20);
  });
  it("depth 2 = 400", () => {
    expect(perft(initialState(), 2)).toBe(400);
  });
  it("depth 3 = 8902", () => {
    expect(perft(initialState(), 3)).toBe(8902);
  });
});
