import {
  Color,
  cloneState,
  GameState,
  inBounds,
  Move,
  opposite,
  Piece,
  PieceType,
  pieceAt,
  Square,
  sqEq
} from "./board";

type Dir = [number, number];

const KNIGHT_DIRS: Dir[] = [
  [1, 2], [2, 1], [-1, 2], [-2, 1],
  [1, -2], [2, -1], [-1, -2], [-2, -1]
];
const BISHOP_DIRS: Dir[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK_DIRS: Dir[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const KING_DIRS: Dir[] = [...BISHOP_DIRS, ...ROOK_DIRS];

function add(sq: Square, d: Dir): Square {
  return { file: sq.file + d[0], rank: sq.rank + d[1] };
}

function slidingMoves(state: GameState, from: Square, dirs: Dir[], piece: Piece): Move[] {
  const out: Move[] = [];
  for (const d of dirs) {
    let cur = add(from, d);
    while (inBounds(cur)) {
      const target = pieceAt(state, cur);
      if (!target) {
        out.push({ from, to: cur, piece: piece.type, color: piece.color });
      } else {
        if (target.color !== piece.color) {
          out.push({ from, to: cur, piece: piece.type, color: piece.color, captured: target.type });
        }
        break;
      }
      cur = add(cur, d);
    }
  }
  return out;
}

function stepMoves(state: GameState, from: Square, dirs: Dir[], piece: Piece): Move[] {
  const out: Move[] = [];
  for (const d of dirs) {
    const to = add(from, d);
    if (!inBounds(to)) continue;
    const target = pieceAt(state, to);
    if (!target) out.push({ from, to, piece: piece.type, color: piece.color });
    else if (target.color !== piece.color) {
      out.push({ from, to, piece: piece.type, color: piece.color, captured: target.type });
    }
  }
  return out;
}

function pawnMoves(state: GameState, from: Square, piece: Piece): Move[] {
  const out: Move[] = [];
  const dir = piece.color === "w" ? 1 : -1;
  const startRank = piece.color === "w" ? 1 : 6;
  const promoRank = piece.color === "w" ? 7 : 0;
  const oneStep = { file: from.file, rank: from.rank + dir };
  if (inBounds(oneStep) && !pieceAt(state, oneStep)) {
    pushPawn(out, from, oneStep, piece, promoRank);
    if (from.rank === startRank) {
      const twoStep = { file: from.file, rank: from.rank + 2 * dir };
      if (!pieceAt(state, twoStep)) {
        out.push({ from, to: twoStep, piece: "P", color: piece.color });
      }
    }
  }
  for (const df of [-1, 1]) {
    const cap = { file: from.file + df, rank: from.rank + dir };
    if (!inBounds(cap)) continue;
    const target = pieceAt(state, cap);
    if (target && target.color !== piece.color) {
      pushPawn(out, from, cap, piece, promoRank, target.type);
    } else if (state.enPassant && sqEq(state.enPassant, cap)) {
      out.push({
        from, to: cap, piece: "P", color: piece.color,
        captured: "P", isEnPassant: true
      });
    }
  }
  return out;
}

function pushPawn(
  out: Move[], from: Square, to: Square, piece: Piece, promoRank: number, captured?: PieceType
) {
  if (to.rank === promoRank) {
    for (const promo of ["Q", "R", "B", "N"] as PieceType[]) {
      out.push({ from, to, piece: "P", color: piece.color, promotion: promo, captured });
    }
  } else {
    out.push({ from, to, piece: "P", color: piece.color, captured });
  }
}

export function pseudoMovesFrom(state: GameState, from: Square): Move[] {
  const p = pieceAt(state, from);
  if (!p) return [];
  switch (p.type) {
    case "P": return pawnMoves(state, from, p);
    case "N": return stepMoves(state, from, KNIGHT_DIRS, p);
    case "B": return slidingMoves(state, from, BISHOP_DIRS, p);
    case "R": return slidingMoves(state, from, ROOK_DIRS, p);
    case "Q": return slidingMoves(state, from, KING_DIRS, p);
    case "K": {
      const base = stepMoves(state, from, KING_DIRS, p);
      // Castling
      const rank = p.color === "w" ? 0 : 7;
      if (from.rank === rank && from.file === 4 && !isSquareAttacked(state, from, opposite(p.color))) {
        const kSide = p.color === "w" ? state.castling.wK : state.castling.bK;
        const qSide = p.color === "w" ? state.castling.wQ : state.castling.bQ;
        if (kSide
          && !pieceAt(state, { file: 5, rank })
          && !pieceAt(state, { file: 6, rank })
          && !isSquareAttacked(state, { file: 5, rank }, opposite(p.color))
          && !isSquareAttacked(state, { file: 6, rank }, opposite(p.color))
          && pieceAt(state, { file: 7, rank })?.type === "R") {
          base.push({ from, to: { file: 6, rank }, piece: "K", color: p.color, isCastle: "K" });
        }
        if (qSide
          && !pieceAt(state, { file: 1, rank })
          && !pieceAt(state, { file: 2, rank })
          && !pieceAt(state, { file: 3, rank })
          && !isSquareAttacked(state, { file: 3, rank }, opposite(p.color))
          && !isSquareAttacked(state, { file: 2, rank }, opposite(p.color))
          && pieceAt(state, { file: 0, rank })?.type === "R") {
          base.push({ from, to: { file: 2, rank }, piece: "K", color: p.color, isCastle: "Q" });
        }
      }
      return base;
    }
  }
}

export function isSquareAttacked(state: GameState, sq: Square, by: Color): boolean {
  // Pawns
  const dir = by === "w" ? 1 : -1;
  for (const df of [-1, 1]) {
    const from = { file: sq.file + df, rank: sq.rank - dir };
    const p = pieceAt(state, from);
    if (p && p.color === by && p.type === "P") return true;
  }
  // Knights
  for (const d of KNIGHT_DIRS) {
    const from = add(sq, d);
    const p = pieceAt(state, from);
    if (p && p.color === by && p.type === "N") return true;
  }
  // King
  for (const d of KING_DIRS) {
    const from = add(sq, d);
    const p = pieceAt(state, from);
    if (p && p.color === by && p.type === "K") return true;
  }
  // Sliders
  for (const d of BISHOP_DIRS) {
    let cur = add(sq, d);
    while (inBounds(cur)) {
      const p = pieceAt(state, cur);
      if (p) {
        if (p.color === by && (p.type === "B" || p.type === "Q")) return true;
        break;
      }
      cur = add(cur, d);
    }
  }
  for (const d of ROOK_DIRS) {
    let cur = add(sq, d);
    while (inBounds(cur)) {
      const p = pieceAt(state, cur);
      if (p) {
        if (p.color === by && (p.type === "R" || p.type === "Q")) return true;
        break;
      }
      cur = add(cur, d);
    }
  }
  return false;
}

export function findKing(state: GameState, color: Color): Square | null {
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = state.board[r][f];
    if (p && p.type === "K" && p.color === color) return { file: f, rank: r };
  }
  return null;
}

export function inCheck(state: GameState, color: Color): boolean {
  const k = findKing(state, color);
  if (!k) return false;
  return isSquareAttacked(state, k, opposite(color));
}

/**
 * Apply a move without legality checking (assumes it's a legal pseudo-move and king-safety already filtered).
 * Returns a new state.
 */
export function makeMove(state: GameState, move: Move): GameState {
  const ns = cloneState(state);
  const piece = ns.board[move.from.rank][move.from.file];
  if (!piece) throw new Error("No piece on from-square");
  ns.board[move.from.rank][move.from.file] = null;

  // En passant capture removes the pawn behind the target
  if (move.isEnPassant) {
    const dir = piece.color === "w" ? -1 : 1;
    ns.board[move.to.rank + dir][move.to.file] = null;
  }

  // Castling: move the rook
  if (move.isCastle) {
    const rank = piece.color === "w" ? 0 : 7;
    if (move.isCastle === "K") {
      ns.board[rank][5] = ns.board[rank][7];
      ns.board[rank][7] = null;
    } else {
      ns.board[rank][3] = ns.board[rank][0];
      ns.board[rank][0] = null;
    }
  }

  // Place piece (with promotion)
  const placed: Piece = move.promotion
    ? { type: move.promotion, color: piece.color }
    : piece;
  ns.board[move.to.rank][move.to.file] = placed;

  // Update castling rights
  if (piece.type === "K") {
    if (piece.color === "w") { ns.castling.wK = false; ns.castling.wQ = false; }
    else { ns.castling.bK = false; ns.castling.bQ = false; }
  }
  if (piece.type === "R") {
    if (piece.color === "w" && move.from.rank === 0) {
      if (move.from.file === 0) ns.castling.wQ = false;
      if (move.from.file === 7) ns.castling.wK = false;
    }
    if (piece.color === "b" && move.from.rank === 7) {
      if (move.from.file === 0) ns.castling.bQ = false;
      if (move.from.file === 7) ns.castling.bK = false;
    }
  }
  // Captured rook on its home square removes rights
  if (move.captured === "R") {
    if (move.to.rank === 0 && move.to.file === 0) ns.castling.wQ = false;
    if (move.to.rank === 0 && move.to.file === 7) ns.castling.wK = false;
    if (move.to.rank === 7 && move.to.file === 0) ns.castling.bQ = false;
    if (move.to.rank === 7 && move.to.file === 7) ns.castling.bK = false;
  }

  // En passant target
  ns.enPassant = null;
  if (piece.type === "P" && Math.abs(move.to.rank - move.from.rank) === 2) {
    ns.enPassant = {
      file: move.from.file,
      rank: (move.from.rank + move.to.rank) / 2
    };
  }

  // Halfmove clock
  if (piece.type === "P" || move.captured) ns.halfmove = 0;
  else ns.halfmove++;

  if (piece.color === "b") ns.fullmove++;
  ns.turn = opposite(piece.color);
  ns.history.push(move);
  return ns;
}

/** Forfeit the current side's move due to timeout. Side to move flips, no piece moves. */
export function forfeitMove(state: GameState): GameState {
  const ns = cloneState(state);
  ns.forfeits.push(ns.history.length);
  ns.history.push({
    from: { file: -1, rank: -1 },
    to: { file: -1, rank: -1 },
    piece: "P",
    color: ns.turn,
    san: "—"
  } as Move);
  if (ns.turn === "b") ns.fullmove++;
  ns.turn = opposite(ns.turn);
  ns.halfmove++;
  ns.enPassant = null;
  return ns;
}

export function legalMovesFrom(state: GameState, from: Square): Move[] {
  const p = pieceAt(state, from);
  if (!p || p.color !== state.turn) return [];
  return pseudoMovesFrom(state, from).filter((m) => {
    const ns = makeMove(state, m);
    return !inCheck(ns, p.color);
  });
}

export function allLegalMoves(state: GameState): Move[] {
  const out: Move[] = [];
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = state.board[r][f];
    if (!p || p.color !== state.turn) continue;
    out.push(...legalMovesFrom(state, { file: f, rank: r }));
  }
  return out;
}

export type GameResult =
  | { kind: "ongoing" }
  | { kind: "checkmate"; winner: Color }
  | { kind: "stalemate" }
  | { kind: "fifty-move" }
  | { kind: "insufficient" };

export function gameResult(state: GameState): GameResult {
  const moves = allLegalMoves(state);
  if (moves.length === 0) {
    if (inCheck(state, state.turn)) return { kind: "checkmate", winner: opposite(state.turn) };
    return { kind: "stalemate" };
  }
  if (state.halfmove >= 100) return { kind: "fifty-move" };
  if (isInsufficientMaterial(state)) return { kind: "insufficient" };
  return { kind: "ongoing" };
}

function isInsufficientMaterial(state: GameState): boolean {
  const pieces: Piece[] = [];
  for (const row of state.board) for (const p of row) if (p) pieces.push(p);
  if (pieces.length === 2) return true; // K vs K
  if (pieces.length === 3) {
    return pieces.some((p) => p.type === "B" || p.type === "N");
  }
  return false;
}
