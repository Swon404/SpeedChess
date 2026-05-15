import { allLegalMoves, inCheck, makeMove } from "./rules";
import { FILES, GameState, Move, squareName } from "./board";

const PIECE_LETTER: Record<string, string> = { N: "N", B: "B", R: "R", Q: "Q", K: "K", X1: "Y" };

export function toSAN(state: GameState, move: Move): string {
  if (move.isCastle === "K") return withSuffix(state, move, "O-O");
  if (move.isCastle === "Q") return withSuffix(state, move, "O-O-O");

  const piece = move.piece;
  let core = "";

  if (piece === "P") {
    if (move.captured) core += FILES[move.from.file] + "x";
    core += squareName(move.to);
    if (move.promotion) core += "=" + move.promotion;
  } else {
    core += PIECE_LETTER[piece];
    const candidates = allLegalMoves(state).filter(
      (m) =>
        m.piece === piece &&
        m.color === move.color &&
        m.to.file === move.to.file &&
        m.to.rank === move.to.rank &&
        !(m.from.file === move.from.file && m.from.rank === move.from.rank)
    );
    if (candidates.length) {
      const sameFile = candidates.some((c) => c.from.file === move.from.file);
      const sameRank = candidates.some((c) => c.from.rank === move.from.rank);
      if (!sameFile) core += FILES[move.from.file];
      else if (!sameRank) core += String(move.from.rank + 1);
      else core += squareName(move.from);
    }
    if (move.captured) core += "x";
    core += squareName(move.to);
  }

  return withSuffix(state, move, core);
}

function withSuffix(state: GameState, move: Move, core: string): string {
  const next = makeMove(state, move);
  const opponentMoves = allLegalMoves(next);
  const inCk = inCheck(next, next.turn);
  if (inCk && opponentMoves.length === 0) return core + "#";
  if (inCk) return core + "+";
  return core;
}

export function exportPGN(state: GameState): string {
  const lines: string[] = [];
  for (let i = 0; i < state.history.length; i += 2) {
    const num = Math.floor(i / 2) + 1;
    const w = state.history[i]?.san ?? "";
    const b = state.history[i + 1]?.san ?? "";
    lines.push(`${num}. ${w}${b ? " " + b : ""}`);
  }
  return lines.join(" ");
}
