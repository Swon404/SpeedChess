import { type GameState, parseFEN, type PieceType } from "../engine/board";
import { PORTAL_PUZZLE_DB, type PortalPuzzleRow } from "./portal-puzzle-db";

export interface PortalPuzzle {
  id: string;
  fen: string;
  wPortal: string | null;
  bPortal: string | null;
  creator: PieceType;
  moves: string[];
  themes: string[];
  plies(): number;
  mateIn(): 1 | 2;
  setup(): GameState;
}

/** Convert an algebraic square string ("e4") to { file, rank }. */
function alg(sq: string): { file: number; rank: number } {
  const file = sq.charCodeAt(0) - 97; // 'a' = 0
  const rank = parseInt(sq[1], 10) - 1; // '1' = 0
  return { file, rank };
}

function makePortalPuzzle(p: PortalPuzzleRow): PortalPuzzle {
  return {
    id: p.id,
    fen: p.fen,
    wPortal: p.wPortal,
    bPortal: p.bPortal,
    creator: p.creator,
    moves: p.moves,
    themes: p.themes,
    plies: () => p.moves.length,
    mateIn: () => (Math.ceil(p.moves.length / 2) <= 1 ? 1 : 2) as 1 | 2,
    setup(): GameState {
      const state = parseFEN(p.fen);
      state.portals = {
        w: p.wPortal ? [alg(p.wPortal)] : [],
        b: p.bPortal ? [alg(p.bPortal)] : [],
        max: 1,
      };
      state.portalCreators = { w: p.creator, b: p.creator };
      return state;
    },
  };
}

export const PORTAL_PUZZLES: PortalPuzzle[] = PORTAL_PUZZLE_DB.map(makePortalPuzzle);

export function filterPortalPuzzles(opts: {
  mateIn?: 1 | 2 | "all";
}): PortalPuzzle[] {
  return PORTAL_PUZZLES.filter((p) => {
    if (opts.mateIn && opts.mateIn !== "all" && p.mateIn() !== opts.mateIn) return false;
    return true;
  });
}
