// Stockfish WASM integration stub.
// This module is lazy-imported only when bot level >= 6. Until the Stockfish
// WASM build is added (planned in a follow-up), this resolves to null so the
// caller falls back to the built-in minimax bot.
//
// When adding stockfish.wasm:
//   1. `npm install stockfish`
//   2. Replace the body of stockfishBestMove below with a UCI worker wrapper
//      that sends `position fen ...`, `setoption name Skill Level value N`,
//      and `go movetime ...`, then parses `bestmove e2e4[q]`.

import type { GameState, Move } from "../board";

export async function stockfishBestMove(_state: GameState, _level: number): Promise<Move | null> {
  return null;
}
