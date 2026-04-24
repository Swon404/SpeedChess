export interface Puzzle {
  id: string;
  title: string;
  hint: string;
  // FEN not used; we ship simple position scripts. For the MVP we include
  // a couple of mate-in-1 setups described by starting from a known sequence.
  // Real curated FEN puzzles can replace these later.
  setupMoves: string[]; // SAN moves from the standard starting position to reach the puzzle position
  solution: string[]; // SAN sequence that solves; first move is the player's
  playerColor: "w" | "b";
}

export const PUZZLES: Puzzle[] = [
  {
    id: "m1-backrank",
    title: "Back-rank mate",
    hint: "Your rook is ready — is the king trapped?",
    setupMoves: [],
    solution: [],
    playerColor: "w"
  }
];

export function dailyPuzzleIndex(date = new Date()): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const seed = y * 10000 + (m + 1) * 100 + d;
  return seed % Math.max(1, PUZZLES.length);
}
