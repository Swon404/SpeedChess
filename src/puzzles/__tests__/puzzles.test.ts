import { describe, it, expect } from "vitest";
import { PUZZLES } from "../puzzles";
import { legalMovesFrom, makeMove, gameResult } from "../../engine/rules";
import { parseSquare } from "../../engine/board";

describe("puzzle solutions", () => {
  for (const p of PUZZLES) {
    it(`${p.id} — ${p.title} mates in one`, () => {
      const state = p.setup();
      const from = parseSquare(p.solution.from);
      const to = parseSquare(p.solution.to);
      const moves = legalMovesFrom(state, from);
      const match = moves.find(
        (m) =>
          m.to.file === to.file &&
          m.to.rank === to.rank &&
          (!p.solution.promotion || m.promotion === p.solution.promotion)
      );
      expect(match, `solution ${p.solution.from}-${p.solution.to} not legal`).toBeDefined();
      const next = makeMove(state, match!);
      const res = gameResult(next);
      expect(res.kind).toBe("checkmate");
    });
  }
});
