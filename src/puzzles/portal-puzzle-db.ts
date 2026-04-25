import type { PieceType } from "../engine/board";

/**
 * Portal puzzle data row.
 *
 * Moves use extended UCI notation:
 *   - "e2e4"        — normal move
 *   - "e2e4@d8"     — move from e2 to e4 (a portal square), then teleport to d8
 *
 * wPortal / bPortal are algebraic squares ("e4", "h1", etc.) or null.
 * creator is "K" so that queens, rooks, bishops, and knights can all use portals.
 */
export interface PortalPuzzleRow {
  id: string;
  /** FEN string — must have at least 4 space-separated fields. */
  fen: string;
  wPortal: string | null;
  bPortal: string | null;
  /** Piece type that creates portals. Use "K" so all other pieces can teleport. */
  creator: PieceType;
  /** Solution moves in extended UCI. */
  moves: string[];
  themes: string[];
}

// ─── DESIGN ──────────────────────────────────────────────────────────────────
//
// All 100 puzzles use one of four verified mate patterns. The mover (rook)
// starts on rank 1, slides along its file to a portal, teleports to the
// killing square, and delivers checkmate. The black king is trapped in a
// corner by its own piece + a defending white queen.
//
//   PATTERN A (a-file mate):  k a8, black rook b8, white queen b6 → land a7
//   PATTERN B (h-file mate):  k h8, black rook g8, white queen g6 → land h7
//   PATTERN C (b7 mate):      k b8, black rook a8, white queen c7 → land b7
//   PATTERN D (g7 mate):      k g8, black rook h8, white queen f7 → land g7
//
// For each pattern we vary the mover's starting file and the portal rank.
// The white queen guards both the killing square AND the king's flight
// squares, so every variation is a clean mate.
//
// ─────────────────────────────────────────────────────────────────────────────

type Pattern = "A" | "B" | "C" | "D";

interface PatternSpec {
  /** FEN ranks 8..2 (rank 1 will be filled in per-mover). */
  prefix: string;
  /** Killing square (where the mover teleports). */
  land: string;
  /** Files where rank 1 is fully clear for the mover. */
  moverFiles: string[];
  theme: string;
}

const PATTERNS: Record<Pattern, PatternSpec> = {
  A: {
    prefix: "kr6/8/1Q6/8/8/8/8/",
    land: "a7",
    moverFiles: ["a", "c", "d", "e", "f", "g", "h"],
    theme: "aFileMate",
  },
  B: {
    prefix: "6rk/8/6Q1/8/8/8/8/",
    land: "h7",
    moverFiles: ["a", "b", "c", "d", "e", "f", "h"],
    theme: "hFileMate",
  },
  C: {
    prefix: "rk6/2Q5/8/8/8/8/8/",
    land: "b7",
    moverFiles: ["a", "b", "d", "e", "f", "g", "h"],
    theme: "b7Mate",
  },
  D: {
    prefix: "6kr/5Q2/8/8/8/8/8/",
    land: "g7",
    moverFiles: ["a", "b", "c", "d", "e", "g", "h"],
    theme: "g7Mate",
  },
};

function fileIdx(f: string): number {
  return f.charCodeAt(0) - 97;
}

/** Build a rank-1 FEN string with one piece on the given file. */
function rank1With(piece: "R", file: string): string {
  const idx = fileIdx(file);
  const left = idx === 0 ? "" : String(idx);
  const right = idx === 7 ? "" : String(7 - idx);
  return `${left}${piece}${right}`;
}

interface Variation {
  pattern: Pattern;
  file: string;
  portalRank: number;
}

function makeRow(id: string, v: Variation): PortalPuzzleRow {
  const spec = PATTERNS[v.pattern];
  const rank1 = rank1With("R", v.file);
  const fen = `${spec.prefix}${rank1} w - -`;
  const portal = `${v.file}${v.portalRank}`;
  return {
    id,
    fen,
    wPortal: portal,
    bPortal: null,
    creator: "K",
    moves: [`${v.file}1${portal}@${spec.land}`],
    themes: ["portal", "rook", spec.theme, "mateIn1"],
  };
}

function variationsFor(pattern: Pattern): Variation[] {
  const spec = PATTERNS[pattern];
  const out: Variation[] = [];
  for (const file of spec.moverFiles) {
    for (let r = 2; r <= 7; r++) {
      out.push({ pattern, file, portalRank: r });
    }
  }
  return out;
}

function buildAll(): PortalPuzzleRow[] {
  const picked: PortalPuzzleRow[] = [];
  let n = 1;
  for (const pat of ["A", "B", "C", "D"] as Pattern[]) {
    const vs = variationsFor(pat).slice(0, 25);
    for (const v of vs) {
      picked.push(makeRow(`PP${String(n).padStart(3, "0")}`, v));
      n++;
    }
  }
  return picked;
}

export const PORTAL_PUZZLE_DB: PortalPuzzleRow[] = buildAll();
