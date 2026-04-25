import { describe, it, expect } from "vitest";
import { PORTAL_PUZZLES } from "../portal-puzzles";
import { legalMovesFrom, makeMove, gameResult } from "../../engine/rules";
import { parseSquare } from "../../engine/board";
import type { Move } from "../../engine/board";

/**
 * Parse an extended UCI move string used by portal puzzles.
 *
 * Formats:
 *   "e2e4"       — normal move
 *   "e2e4@d8"    — portal entry: move to e4 (the portal), teleport to d8
 *
 * Returns the base UCI parts plus an optional portalTo square.
 */
function parsePortalUci(uci: string): {
  from: { file: number; rank: number };
  to: { file: number; rank: number };
  portalTo?: { file: number; rank: number };
  promotion?: string;
} {
  const atIdx = uci.indexOf("@");
  if (atIdx !== -1) {
    const base = uci.slice(0, atIdx);
    const landStr = uci.slice(atIdx + 1);
    const from = parseSquare(base.slice(0, 2));
    const to = parseSquare(base.slice(2, 4));
    const portalTo = parseSquare(landStr.slice(0, 2));
    return { from, to, portalTo };
  }
  const from = parseSquare(uci.slice(0, 2));
  const to = parseSquare(uci.slice(2, 4));
  const promotion = uci.length === 5 ? uci[4].toUpperCase() : undefined;
  return { from, to, promotion };
}

describe("portal puzzle solutions", () => {
  for (const p of PORTAL_PUZZLES) {
    it(`${p.id} — portal mate in ${p.mateIn()}`, () => {
      let state = p.setup();
      for (let i = 0; i < p.moves.length; i++) {
        const uci = p.moves[i];
        const { from, to, portalTo, promotion } = parsePortalUci(uci);

        const candidates = legalMovesFrom(state, from);

        let legal: Move | undefined;
        if (portalTo) {
          // Teleport move: match on from, to (portal square), and portalTo (landing).
          legal = candidates.find(
            (m) =>
              m.from.file === from.file &&
              m.from.rank === from.rank &&
              m.to.file === to.file &&
              m.to.rank === to.rank &&
              m.isPortalEntry === true &&
              m.portalTo !== undefined &&
              m.portalTo.file === portalTo.file &&
              m.portalTo.rank === portalTo.rank
          );
        } else {
          legal = candidates.find(
            (m) =>
              m.to.file === to.file &&
              m.to.rank === to.rank &&
              (!promotion || m.promotion === promotion)
          );
        }

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
