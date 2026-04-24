// Core types for the chess engine.
// Board is an 8x8 array indexed [rank 0..7][file 0..7] where rank 0 is white's back rank.

export type Color = "w" | "b";
export type PieceType = "P" | "N" | "B" | "R" | "Q" | "K";

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Square = { file: number; rank: number };

export interface Move {
  from: Square;
  to: Square;
  piece: PieceType;
  color: Color;
  captured?: PieceType;
  promotion?: PieceType;
  isEnPassant?: boolean;
  isCastle?: "K" | "Q";
  san?: string;
}

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface GameState {
  board: (Piece | null)[][];
  turn: Color;
  castling: CastlingRights;
  enPassant: Square | null;
  halfmove: number;
  fullmove: number;
  history: Move[];
  // Forfeited moves (timeouts) captured as null entries in parallel history.
  forfeits: number[]; // indices in history where a timeout occurred (for display)
  // Rolling list of position keys for threefold-repetition detection.
  positionKeys: string[];
}

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export function sqEq(a: Square, b: Square): boolean {
  return a.file === b.file && a.rank === b.rank;
}

export function inBounds(s: Square): boolean {
  return s.file >= 0 && s.file < 8 && s.rank >= 0 && s.rank < 8;
}

export function squareName(s: Square): string {
  return `${FILES[s.file]}${s.rank + 1}`;
}

export function parseSquare(name: string): Square {
  return { file: name.charCodeAt(0) - 97, rank: parseInt(name[1], 10) - 1 };
}

export function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

export function cloneState(s: GameState): GameState {
  return {
    board: cloneBoard(s.board),
    turn: s.turn,
    castling: { ...s.castling },
    enPassant: s.enPassant ? { ...s.enPassant } : null,
    halfmove: s.halfmove,
    fullmove: s.fullmove,
    history: s.history.slice(),
    forfeits: s.forfeits.slice(),
    positionKeys: (s.positionKeys ?? []).slice()
  };
}

export function initialState(): GameState {
  const empty: (Piece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  const back: PieceType[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  for (let f = 0; f < 8; f++) {
    empty[0][f] = { type: back[f], color: "w" };
    empty[1][f] = { type: "P", color: "w" };
    empty[6][f] = { type: "P", color: "b" };
    empty[7][f] = { type: back[f], color: "b" };
  }
  const state: GameState = {
    board: empty,
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
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

/**
 * Build a compact key representing the repeatable part of a position:
 * piece placement, side to move, castling rights, and en passant target.
 * Two positions with the same key are considered the same for threefold
 * repetition (per FIDE rule).
 */
export function positionKey(s: GameState): string {
  let b = "";
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = s.board[r][f];
      b += p ? (p.color === "w" ? p.type : p.type.toLowerCase()) : ".";
    }
  }
  const c =
    (s.castling.wK ? "K" : "") +
    (s.castling.wQ ? "Q" : "") +
    (s.castling.bK ? "k" : "") +
    (s.castling.bQ ? "q" : "") || "-";
  const ep = s.enPassant ? `${s.enPassant.file}${s.enPassant.rank}` : "-";
  return `${b}|${s.turn}|${c}|${ep}`;
}

export function pieceAt(state: GameState, sq: Square): Piece | null {
  if (!inBounds(sq)) return null;
  return state.board[sq.rank][sq.file];
}

export function opposite(c: Color): Color {
  return c === "w" ? "b" : "w";
}
