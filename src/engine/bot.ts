import { GameState, Move, Piece } from "./board";
import { allLegalMoves, inCheck, makeMove } from "./rules";

const VALUES: Record<string, number> = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };

function materialScore(state: GameState, color: "w" | "b"): number {
  let s = 0;
  for (const row of state.board) for (const p of row) {
    if (!p) continue;
    s += (p.color === color ? 1 : -1) * VALUES[p.type];
  }
  // Slight mobility bonus
  const moves = allLegalMoves(state).length;
  s += (state.turn === color ? moves : -moves) * 2;
  return s;
}

function randomChoice<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function orderCaptures(_state: GameState, moves: Move[]): Move[] {
  return moves.slice().sort((a, b) => {
    const av = a.captured ? VALUES[a.captured] : 0;
    const bv = b.captured ? VALUES[b.captured] : 0;
    return bv - av;
  });
}

function minimax(state: GameState, depth: number, alpha: number, beta: number, me: "w" | "b"): number {
  if (depth === 0) return materialScore(state, me);
  const moves = allLegalMoves(state);
  if (moves.length === 0) {
    if (inCheck(state, state.turn)) return state.turn === me ? -100000 : 100000;
    return 0;
  }
  const maximizing = state.turn === me;
  if (maximizing) {
    let best = -Infinity;
    for (const m of orderCaptures(state, moves)) {
      const v = minimax(makeMove(state, m), depth - 1, alpha, beta, me);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of orderCaptures(state, moves)) {
      const v = minimax(makeMove(state, m), depth - 1, alpha, beta, me);
      if (v < best) best = v;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

/**
 * Choose a move for the bot at a given difficulty (1-10).
 * Levels 1-5 use the built-in minimax with increasing depth and decreasing randomness.
 * Levels 6-10 delegate to Stockfish WASM (lazy-loaded) — falls back to depth-4 minimax
 * if Stockfish isn't available (e.g. offline first-load).
 */
export async function chooseBotMove(state: GameState, level: number): Promise<Move | null> {
  const moves = allLegalMoves(state);
  if (moves.length === 0) return null;
  const me = state.turn;

  if (level >= 6) {
    try {
      const { stockfishBestMove } = await import("./bot/stockfish");
      const best = await stockfishBestMove(state, level);
      if (best) return best;
    } catch {
      // fall through to local minimax
    }
  }

  const rng = seededRng(Date.now() & 0xffffffff);

  // Level 1: ~80% random, prefer simple captures otherwise.
  // Level 2: ~50% random, depth-1 search the rest.
  // Level 3: depth-2, occasional blunder.
  // Level 4: depth-3 clean.
  // Level 5: depth-3 + capture ordering.
  // Level 6-10 fallback: depth-4.
  const blunderChance = { 1: 0.8, 2: 0.5, 3: 0.15, 4: 0.03, 5: 0 }[level as 1 | 2 | 3 | 4 | 5] ?? 0;
  const depth = level <= 2 ? 1 : level <= 3 ? 2 : level <= 5 ? 3 : 4;

  if (rng() < blunderChance) {
    const captures = moves.filter((m) => m.captured);
    if (level === 1 || captures.length === 0) return randomChoice(moves, rng);
    return randomChoice(captures, rng);
  }

  let best: Move | null = null;
  let bestScore = -Infinity;
  const ordered = orderCaptures(state, moves);
  for (const m of ordered) {
    const score = minimax(makeMove(state, m), depth - 1, -Infinity, Infinity, me);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best ?? moves[0];
}

export { materialScore };
export type { Piece };
