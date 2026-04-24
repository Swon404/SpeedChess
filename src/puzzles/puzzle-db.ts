// Puzzle data. Seed set works offline.
// Run `npm run import-puzzles -- path/to/lichess_db_puzzle.csv` to replace
// this file with up to 1000 Lichess-sourced mate-in-1/2/3 puzzles (CC0).

export interface PuzzleRow {
  id: string;
  fen: string;
  /**
   * UCI moves for the solution line, alternating:
   * [playerMove1, opponentReply1, playerMove2, opponentReply2, ..., playerMoveN].
   */
  moves: string[];
  themes: string[];
  rating?: number;
}

export const PUZZLE_DB: PuzzleRow[] = [
  // Back-rank rook. White Kg1, Ra1. Black Kg8, pawns f7 g7 h7.
  { id: "seed-m1-001", fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", moves: ["a1a8"], themes: ["mateIn1", "backRankMate"], rating: 600 },
  // Back-rank queen. White Kh1, Qd1. Black Kh8, pawns f7 g7 h7.
  { id: "seed-m1-002", fen: "7k/5ppp/8/8/8/8/8/3Q3K w - - 0 1", moves: ["d1d8"], themes: ["mateIn1", "backRankMate"], rating: 600 },
  // Queen & king corner. White Kb6, Qc2. Black Ka8.
  { id: "seed-m1-003", fen: "k7/8/1K6/8/8/8/2Q5/8 w - - 0 1", moves: ["c2c8"], themes: ["mateIn1", "kingAndQueenMate"], rating: 700 },
  // Rook + king box. White Kg6, Ra1. Black Kh8.
  { id: "seed-m1-004", fen: "7k/8/6K1/8/8/8/8/R7 w - - 0 1", moves: ["a1a8"], themes: ["mateIn1", "kingAndRookMate"], rating: 800 },
  // Two-rook ladder. White Kh1, Ra7, Rb1. Black Kh8.
  { id: "seed-m1-005", fen: "7k/R7/8/8/8/8/8/1R5K w - - 0 1", moves: ["b1b8"], themes: ["mateIn1", "ladderMate"], rating: 800 },
  // Promotion mate. White Kh1, Pa7, Rh7. Black Kc8.
  { id: "seed-m1-006", fen: "2k5/P6R/8/8/8/8/8/7K w - - 0 1", moves: ["a7a8q"], themes: ["mateIn1", "promotion"], rating: 1000 }
];
