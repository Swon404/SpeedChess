import { describe, it, expect } from "vitest";
import { PUZZLES } from "../puzzles";
import { legalMovesFrom, makeMove, gameResult } from "../../engine/rules";
import { parseUci } from "../../engine/board";

describe("puzzle solutions", () => {
  for (const p of PUZZLES) {
    it(`${p.id} — mate in ${p.mateIn()}`, () => {
      let state = p.setup();
      for (let i = 0; i < p.moves.length; i++) {
        const uci = p.moves[i];
        const { from, to, promotion } = parseUci(uci);
        const legal = legalMovesFrom(state, from).find(
          (m) => m.to.file === to.file && m.to.rank === to.rank &&
                 (!promotion || m.promotion === promotion)
        );
        expect(legal, `ply ${i + 1} (${uci}) not legal in ${p.id}`).toBeDefined();
        state = makeMove(state, legal!);
        const res = gameResult(state);
        if (i === p.moves.length - 1) {
          expect(res.kind, `final move in ${p.id} did not mate`).toBe("checkmate");
        } else {
          expect(res.kind, `intermediate move in ${p.id} unexpectedly ended game`).toBe("ongoing");
        }
      }
    });
  }
});
