import { parseFEN, type GameState, type PieceType, type Square } from "../engine/board";
import { legalMovesFrom, makeMove, gameResult } from "../engine/rules";

/**
 * Portal puzzle row.
 *
 * Moves use extended UCI notation:
 *   - "e2e4"        normal move
 *   - "e2e4@d8"     move from e2 to e4 (a portal square), then teleport to d8
 *
 * All puzzles use creator: "K" so that all non-pawn, non-king pieces
 * (Q, R, B, N) can travel through portals.
 */
export interface PortalPuzzleRow {
  id: string;
  fen: string;
  wPortal: string | null;
  bPortal: string | null;
  creator: PieceType;
  moves: string[];
  themes: string[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function alg(sq: string): Square {
  return { file: sq.charCodeAt(0) - 97, rank: parseInt(sq[1], 10) - 1 };
}

function fileIdx(f: string): number {
  return f.charCodeAt(0) - 97;
}

/** Build a rank string of length 8 with one `piece` on `file` (rest empty). */
function rankWithPiece(piece: string, file: string): string {
  const idx = fileIdx(file);
  const left = idx === 0 ? "" : String(idx);
  const right = idx === 7 ? "" : String(7 - idx);
  return `${left}${piece}${right}`;
}

interface RawCandidate {
  fen: string;
  wPortal: string | null;
  bPortal: string | null;
  moves: string[];
  themes: string[];
}

function setupState(c: RawCandidate): GameState {
  const s = parseFEN(c.fen);
  s.portals = {
    w: c.wPortal ? alg(c.wPortal) : null,
    b: c.bPortal ? alg(c.bPortal) : null,
  };
  s.portalCreators = { w: "K", b: "K" };
  return s;
}

function parsePortalUci(uci: string): {
  from: Square; to: Square; portalTo?: Square;
} {
  const at = uci.indexOf("@");
  if (at !== -1) {
    return {
      from: alg(uci.slice(0, 2)),
      to: alg(uci.slice(2, 4)),
      portalTo: alg(uci.slice(at + 1, at + 3)),
    };
  }
  return { from: alg(uci.slice(0, 2)), to: alg(uci.slice(2, 4)) };
}

function applyMove(s: GameState, uci: string): GameState | null {
  const m = parsePortalUci(uci);
  const moves = legalMovesFrom(s, m.from);
  const found = moves.find((x) =>
    x.to.file === m.to.file && x.to.rank === m.to.rank &&
    (m.portalTo
      ? !!x.isPortalEntry && !!x.portalTo &&
        x.portalTo.file === m.portalTo.file && x.portalTo.rank === m.portalTo.rank
      : !x.isPortalEntry)
  );
  if (!found) return null;
  return makeMove(s, found);
}

/** Validate that a candidate's solution is a legal forced-mate sequence. */
function validate(c: RawCandidate): boolean {
  let s: GameState | null = setupState(c);
  for (let i = 0; i < c.moves.length; i++) {
    s = applyMove(s, c.moves[i]);
    if (!s) return false;
    const r = gameResult(s);
    if (i === c.moves.length - 1) {
      if (r.kind !== "checkmate") return false;
    } else {
      if (r.kind !== "ongoing") return false;
    }
  }
  return true;
}

// ── pattern generators ──────────────────────────────────────────────────────
//
// Each generator returns RawCandidate[] — these are then validated below.
// Invalid ones are filtered out, so we can be a little speculative.
//
// ────────────────────────────────────────────────────────────────────────────

/**
 * Pattern A: rook teleports to a7. King a8, black rook b8, white queen b6.
 * Mover (R) on rank 1, files c..h (excluded a so the rook can't slide
 * directly to a7 without using the portal). Portal anywhere on mover's file
 * between rank 2 and 7.
 */
function genRookA(): RawCandidate[] {
  const out: RawCandidate[] = [];
  for (const file of ["c", "d", "e", "f", "g", "h"]) {
    for (let r = 2; r <= 7; r++) {
      out.push({
        fen: `kr6/8/1Q6/8/8/8/8/${rankWithPiece("R", file)} w - -`,
        wPortal: `${file}${r}`,
        bPortal: null,
        moves: [`${file}1${file}${r}@a7`],
        themes: ["portal", "rook", "aFileMate", "mateIn1"],
      });
    }
  }
  return out;
}

/** Pattern B: rook teleports to h7 (mirror of A). */
function genRookB(): RawCandidate[] {
  const out: RawCandidate[] = [];
  for (const file of ["a", "b", "c", "d", "e", "f"]) {
    for (let r = 2; r <= 7; r++) {
      out.push({
        fen: `6rk/8/6Q1/8/8/8/8/${rankWithPiece("R", file)} w - -`,
        wPortal: `${file}${r}`,
        bPortal: null,
        moves: [`${file}1${file}${r}@h7`],
        themes: ["portal", "rook", "hFileMate", "mateIn1"],
      });
    }
  }
  return out;
}

/**
 * Knight smothered mate, kingside. King h8 boxed in by own rook g8 and
 * pawns g7, h7. White knight teleports to f7 → smothered mate.
 */
function genKnightSmotherK(): RawCandidate[] {
  const out: RawCandidate[] = [];
  for (const knightFile of ["a", "b", "c", "d", "e"]) {
    const f = fileIdx(knightFile);
    const portals: string[] = [];
    for (const [df, dr] of [[-2, 1], [2, 1], [-1, 2], [1, 2]] as [number, number][]) {
      const nf = f + df;
      const nr = dr;
      if (nf < 0 || nf > 7) continue;
      portals.push(`${String.fromCharCode(97 + nf)}${nr + 1}`);
    }
    for (const p of portals) {
      out.push({
        fen: `6rk/6pp/8/8/8/8/8/${rankWithPiece("N", knightFile)} w - -`,
        wPortal: p,
        bPortal: null,
        moves: [`${knightFile}1${p}@f7`],
        themes: ["portal", "knight", "smothered", "mateIn1"],
      });
    }
  }
  return out;
}

/** Knight smothered mate, queenside mirror. Knight teleports to c7. */
function genKnightSmotherQ(): RawCandidate[] {
  const out: RawCandidate[] = [];
  for (const knightFile of ["d", "e", "f", "g", "h"]) {
    const f = fileIdx(knightFile);
    const portals: string[] = [];
    for (const [df, dr] of [[-2, 1], [2, 1], [-1, 2], [1, 2]] as [number, number][]) {
      const nf = f + df;
      const nr = dr;
      if (nf < 0 || nf > 7) continue;
      portals.push(`${String.fromCharCode(97 + nf)}${nr + 1}`);
    }
    for (const p of portals) {
      out.push({
        fen: `kr6/pp6/8/8/8/8/8/${rankWithPiece("N", knightFile)} w - -`,
        wPortal: p,
        bPortal: null,
        moves: [`${knightFile}1${p}@c7`],
        themes: ["portal", "knight", "smothered", "mateIn1"],
      });
    }
  }
  return out;
}

/**
 * Bishop adjacent diagonal mate, kingside. King h8, rook h7-block-… actually:
 * King g8, black rook h8, black pawn h7, white queen h6, white pawn g6.
 * Light-square bishop teleports to f7. Check from f7 along the f7-g8 diagonal.
 * - g7 covered by queen h6 (diagonal)
 * - f8 covered by queen h6 (diagonal h6-g7-f8 — g7 empty)
 * - h7 own pawn, h8 own rook
 * - f7 has bishop, defended by white pawn g6 (g6 captures f7)
 *
 * Black has no piece that can capture the bishop (rook h8 can't, pawn h7
 * can't, king can't because f7 defended).
 */
function genBishopK(): RawCandidate[] {
  // Light squares on rank 1: b1, d1, f1, h1 (h1 conflicts with nothing here).
  const out: RawCandidate[] = [];
  for (const bishopFile of ["b", "d", "f", "h"]) {
    const f = fileIdx(bishopFile);
    const portals: string[] = [];
    for (const [df, dr] of [[-1, 1], [1, 1]] as [number, number][]) {
      let nf = f + df;
      let nr = dr;
      while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
        portals.push(`${String.fromCharCode(97 + nf)}${nr + 1}`);
        nf += df;
        nr += dr;
      }
    }
    for (const p of portals) {
      out.push({
        fen: `6kr/7p/6PQ/8/8/8/8/${rankWithPiece("B", bishopFile)} w - -`,
        wPortal: p,
        bPortal: null,
        moves: [`${bishopFile}1${p}@f7`],
        themes: ["portal", "bishop", "diagonalMate", "mateIn1"],
      });
    }
  }
  return out;
}

/**
 * Bishop adjacent diagonal mate, queenside mirror. King b8, rook a8, pawn a7.
 * White queen a6, white pawn b6, dark-square bishop teleports to c7.
 */
function genBishopQ(): RawCandidate[] {
  const out: RawCandidate[] = [];
  // Dark squares on rank 1: a1, c1, e1, g1.
  for (const bishopFile of ["a", "c", "e", "g"]) {
    const f = fileIdx(bishopFile);
    const portals: string[] = [];
    for (const [df, dr] of [[-1, 1], [1, 1]] as [number, number][]) {
      let nf = f + df;
      let nr = dr;
      while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
        portals.push(`${String.fromCharCode(97 + nf)}${nr + 1}`);
        nf += df;
        nr += dr;
      }
    }
    for (const p of portals) {
      out.push({
        fen: `rk6/p7/QP6/8/8/8/8/${rankWithPiece("B", bishopFile)} w - -`,
        wPortal: p,
        bPortal: null,
        moves: [`${bishopFile}1${p}@c7`],
        themes: ["portal", "bishop", "diagonalMate", "mateIn1"],
      });
    }
  }
  return out;
}

/**
 * Knight smothered mate, king on g8 (one square off the corner). King boxed
 * in by own rooks f8, h8 and pawns f7, g7, h7. Knight teleports to e7 →
 * unblockable knight check.
 */
function genKnightSmotherG(): RawCandidate[] {
  const out: RawCandidate[] = [];
  for (const knightFile of ["a", "b", "c", "d", "e"]) {
    const f = fileIdx(knightFile);
    const portals: string[] = [];
    for (const [df, dr] of [[-2, 1], [2, 1], [-1, 2], [1, 2]] as [number, number][]) {
      const nf = f + df;
      const nr = dr;
      if (nf < 0 || nf > 7) continue;
      portals.push(`${String.fromCharCode(97 + nf)}${nr + 1}`);
    }
    for (const p of portals) {
      out.push({
        fen: `5rkr/5ppp/8/8/8/8/8/${rankWithPiece("N", knightFile)} w - -`,
        wPortal: p,
        bPortal: null,
        moves: [`${knightFile}1${p}@e7`],
        themes: ["portal", "knight", "smothered", "mateIn1"],
      });
    }
  }
  return out;
}

/**
 * Knight smothered mate, king on b8 mirror. Knight teleports to d7.
 */
function genKnightSmotherB(): RawCandidate[] {
  const out: RawCandidate[] = [];
  for (const knightFile of ["d", "e", "f", "g", "h"]) {
    const f = fileIdx(knightFile);
    const portals: string[] = [];
    for (const [df, dr] of [[-2, 1], [2, 1], [-1, 2], [1, 2]] as [number, number][]) {
      const nf = f + df;
      const nr = dr;
      if (nf < 0 || nf > 7) continue;
      portals.push(`${String.fromCharCode(97 + nf)}${nr + 1}`);
    }
    for (const p of portals) {
      out.push({
        fen: `rkr5/ppp5/8/8/8/8/8/${rankWithPiece("N", knightFile)} w - -`,
        wPortal: p,
        bPortal: null,
        moves: [`${knightFile}1${p}@d7`],
        themes: ["portal", "knight", "smothered", "mateIn1"],
      });
    }
  }
  return out;
}

/**
 * Queen teleport, Pattern A. Same as RookA but with queen as mover. Queens
 * on c..h files cannot reach a7 directly (would need to pass through queen
 * b6 or move along non-existent diagonals), so the portal is the only
 * route to a7.
 */
function genQueenA(): RawCandidate[] {
  const out: RawCandidate[] = [];
  for (const file of ["c", "d", "e", "f", "g", "h"]) {
    for (let r = 2; r <= 7; r++) {
      out.push({
        fen: `kr6/8/1Q6/8/8/8/8/${rankWithPiece("Q", file)} w - -`,
        wPortal: `${file}${r}`,
        bPortal: null,
        moves: [`${file}1${file}${r}@a7`],
        themes: ["portal", "queen", "aFileMate", "mateIn1"],
      });
    }
  }
  return out;
}

/** Queen teleport, Pattern B mirror. */
function genQueenB(): RawCandidate[] {
  const out: RawCandidate[] = [];
  for (const file of ["a", "b", "c", "d", "e", "f"]) {
    for (let r = 2; r <= 7; r++) {
      out.push({
        fen: `6rk/8/6Q1/8/8/8/8/${rankWithPiece("Q", file)} w - -`,
        wPortal: `${file}${r}`,
        bPortal: null,
        moves: [`${file}1${file}${r}@h7`],
        themes: ["portal", "queen", "hFileMate", "mateIn1"],
      });
    }
  }
  return out;
}

// ── build ───────────────────────────────────────────────────────────────────

function build(): PortalPuzzleRow[] {
  const candidates: RawCandidate[] = [
    ...genRookA(),
    ...genRookB(),
    ...genQueenA(),
    ...genQueenB(),
    ...genKnightSmotherK(),
    ...genKnightSmotherQ(),
    ...genKnightSmotherG(),
    ...genKnightSmotherB(),
    ...genBishopK(),
    ...genBishopQ(),
  ];
  // Validate via the engine — invalid ones (illegal moves, not actually mate,
  // intermediate moves that already mate, etc.) are silently dropped.
  const valid: PortalPuzzleRow[] = [];
  let n = 1;
  for (const c of candidates) {
    if (!validate(c)) continue;
    valid.push({
      id: `PP${String(n).padStart(3, "0")}`,
      fen: c.fen,
      wPortal: c.wPortal,
      bPortal: c.bPortal,
      creator: "K",
      moves: c.moves,
      themes: c.themes,
    });
    n++;
  }
  return valid;
}

export const PORTAL_PUZZLE_DB: PortalPuzzleRow[] = build();
