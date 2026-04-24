import { GameState, parseFEN } from "../engine/board";
import { PUZZLE_DB, type PuzzleRow } from "./puzzle-db";

export interface Puzzle {
  id: string;
  fen: string;
  /**
   * UCI moves for the solution line, alternating:
   * [playerMove1, opponentReply1, playerMove2, opponentReply2, ..., playerMoveN].
   * Opponent replies are played automatically. Length === 1 for mate-in-1,
   * 3 for mate-in-2 (player, reply, player), 5 for mate-in-3.
   */
  moves: string[];
  themes: string[];
  rating?: number;
  plies(): number;
  mateIn(): 1 | 2 | 3;
  setup(): GameState;
}

function make(p: PuzzleRow): Puzzle {
  return {
    id: p.id,
    fen: p.fen,
    moves: p.moves,
    themes: p.themes,
    rating: p.rating,
    plies: () => p.moves.length,
    mateIn: () => {
      const n = Math.ceil(p.moves.length / 2);
      return (n === 1 || n === 2 || n === 3 ? n : 1) as 1 | 2 | 3;
    },
    setup: () => parseFEN(p.fen)
  };
}

export const PUZZLES: Puzzle[] = PUZZLE_DB.map(make);

export type Difficulty = "beginner" | "easy" | "medium" | "hard";

/** Derive a difficulty band from Lichess rating and mate distance. */
export function puzzleDifficulty(p: Puzzle): Difficulty {
  const r = p.rating ?? (p.mateIn() === 1 ? 800 : p.mateIn() === 2 ? 1400 : 1800);
  // Beginner = very low-rated mate-in-1s only — gentle intro with common mating patterns.
  if (p.mateIn() === 1 && r <= 800) return "beginner";
  if (r < 1200) return "easy";
  if (r < 1600) return "medium";
  return "hard";
}

export function puzzlesByMate(n: 1 | 2 | 3): Puzzle[] {
  return PUZZLES.filter((p) => p.mateIn() === n);
}

export function filterPuzzles(opts: {
  mateIn?: 1 | 2 | 3 | "all";
  difficulty?: Difficulty | "all";
}): Puzzle[] {
  return PUZZLES.filter((p) => {
    if (opts.mateIn && opts.mateIn !== "all" && p.mateIn() !== opts.mateIn) return false;
    if (opts.difficulty && opts.difficulty !== "all" && puzzleDifficulty(p) !== opts.difficulty) return false;
    return true;
  });
}

export function getPuzzle(id: string): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id);
}
