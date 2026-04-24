import {
  Color, GameState, Piece, PieceType, parseSquare, positionKey
} from "../engine/board";

export interface PuzzleSolution {
  from: string; // e.g. "a1"
  to: string;   // e.g. "a8"
  promotion?: "Q" | "R" | "B" | "N";
}

export interface Puzzle {
  id: string;
  title: string;
  theme: string;        // "Back rank" | "Ladder mate" | ...
  difficulty: 1 | 2 | 3;
  description: string;  // short hint shown above the board
  setup: () => GameState;
  solution: PuzzleSolution;
}

type PieceSpec = [PieceType, Color, string];

function build(pieces: PieceSpec[], turn: Color): GameState {
  const empty: (Piece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const [type, color, name] of pieces) {
    const sq = parseSquare(name);
    empty[sq.rank][sq.file] = { type, color };
  }
  const state: GameState = {
    board: empty,
    turn,
    castling: { wK: false, wQ: false, bK: false, bQ: false },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
    history: [],
    forfeits: [],
    positionKeys: []
  };
  state.positionKeys.push(positionKey(state));
  return state;
}

export const PUZZLES: Puzzle[] = [
  {
    id: "back-rank-rook",
    title: "Back-rank rook",
    theme: "Back rank",
    difficulty: 1,
    description: "White to move. Checkmate in one — the enemy king is trapped by its own pawns.",
    setup: () => build([
      ["K", "w", "g1"],
      ["R", "w", "a1"],
      ["K", "b", "g8"],
      ["P", "b", "f7"], ["P", "b", "g7"], ["P", "b", "h7"]
    ], "w"),
    solution: { from: "a1", to: "a8" }
  },
  {
    id: "back-rank-queen",
    title: "Back-rank queen",
    theme: "Back rank",
    difficulty: 1,
    description: "White to move. Find the mate in one with your queen.",
    setup: () => build([
      ["K", "w", "h1"],
      ["Q", "w", "d1"],
      ["K", "b", "h8"],
      ["P", "b", "f7"], ["P", "b", "g7"], ["P", "b", "h7"]
    ], "w"),
    solution: { from: "d1", to: "d8" }
  },
  {
    id: "rook-ladder",
    title: "Rook ladder",
    theme: "Ladder mate",
    difficulty: 2,
    description: "White to move. Your king helps trap the black king.",
    setup: () => build([
      ["K", "w", "g6"],
      ["R", "w", "a1"],
      ["K", "b", "h8"]
    ], "w"),
    solution: { from: "a1", to: "a8" }
  },
  {
    id: "two-rooks-ladder",
    title: "Two-rook ladder",
    theme: "Ladder mate",
    difficulty: 2,
    description: "White to move. Use both rooks together.",
    setup: () => build([
      ["K", "w", "h1"],
      ["R", "w", "a7"],
      ["R", "w", "b1"],
      ["K", "b", "h8"]
    ], "w"),
    solution: { from: "b1", to: "b8" }
  },
  {
    id: "queen-supported",
    title: "Queen & king corner",
    theme: "Supported mate",
    difficulty: 2,
    description: "White to move. Your king traps the enemy — find the mating square.",
    setup: () => build([
      ["K", "w", "b6"],
      ["Q", "w", "c2"],
      ["K", "b", "a8"]
    ], "w"),
    solution: { from: "c2", to: "c8" }
  },
  {
    id: "promotion-mate",
    title: "Promote with style",
    theme: "Promotion",
    difficulty: 3,
    description: "White to move. Turn your pawn into a monster and finish the game.",
    setup: () => build([
      ["K", "w", "h1"],
      ["P", "w", "a7"],
      ["R", "w", "h7"],
      ["K", "b", "c8"]
    ], "w"),
    solution: { from: "a7", to: "a8", promotion: "Q" }
  }
];

export function getPuzzle(id: string): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id);
}
