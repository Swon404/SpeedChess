import { parseFEN, type GameState, type PieceType, type Square } from "../engine/board";
import { legalMovesFrom, makeMove, gameResult, isSquareAttacked } from "../engine/rules";

/**
 * Portal puzzle row.
 *
 * Under the deferred-warp rules the mating piece is already standing on its
 * own portal in the FEN; its move teleports it across the board to deliver
 * mate. Move strings use plain UCI ("from-to"); the engine knows whether the
 * move is a slide or a teleport based on whether `from` is a portal square.
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

function sqEq(a: Square, b: Square): boolean {
  return a.file === b.file && a.rank === b.rank;
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
    w: c.wPortal ? [alg(c.wPortal)] : [],
    b: c.bPortal ? [alg(c.bPortal)] : [],
    max: 1,
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
  // Match by from + to. If portalTo supplied, also match teleport target.
  // Otherwise pick any legal move (slide or teleport) that lands on `to`.
  const found = moves.find((x) =>
    sqEq(x.to, m.to) &&
    (m.portalTo
      ? !!x.isPortalEntry && !!x.portalTo && sqEq(x.portalTo, m.portalTo)
      : true)
  );
  if (!found) return null;
  return makeMove(s, found);
}

function findKingOf(s: GameState, color: "w" | "b"): Square | null {
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = s.board[r][f];
    if (p && p.type === "K" && p.color === color) return { file: f, rank: r };
  }
  return null;
}

function validate(c: RawCandidate): boolean {
  let s: GameState | null = setupState(c);
  // Reject puzzles where the side-to-move would be capturing into an opponent
  // already in check (i.e., the position is chess-illegal at the start).
  const turn = s.turn;
  const enemyKingSq = findKingOf(s, turn === "w" ? "b" : "w");
  if (enemyKingSq && isSquareAttacked(s, enemyKingSq, turn)) return false;

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

/** Build a board's piece map → FEN placement. */
function fenPlacement(piecesByAlg: Record<string, string>): string {
  const ranks: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = "";
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const sq = `${String.fromCharCode(97 + f)}${r + 1}`;
      const p = piecesByAlg[sq];
      if (p) {
        if (empty > 0) { row += String(empty); empty = 0; }
        row += p;
      } else {
        empty++;
      }
    }
    if (empty > 0) row += String(empty);
    ranks.push(row);
  }
  return ranks.join("/");
}

/** All squares in the given ranks (0-indexed). */
function squaresInRanks(rankRange: number[]): string[] {
  const out: string[] = [];
  for (const r of rankRange) {
    for (let f = 0; f < 8; f++) {
      out.push(`${String.fromCharCode(97 + f)}${r + 1}`);
    }
  }
  return out;
}

function isLight(s: string): boolean {
  const sq = alg(s);
  return (sq.file + sq.rank) % 2 === 1;
}

// ── pattern generators ──────────────────────────────────────────────────────

/**
 * Pattern A — "Anastasia warp" (kingside).
 *
 * Black: K h8, B g7 (blocks K's escape to g7).
 * White: pawn g6 (defends h7), K c2, queen on her own portal; queen teleports
 *        to h7 → mate. K cannot capture (defended by pawn), cannot move
 *        (g8 attacked diag, g7 own bishop). Black has no piece able to
 *        interpose or capture Q on h7.
 */
function genAnastasiaKingside(): RawCandidate[] {
  const out: RawCandidate[] = [];
  const fixed: Record<string, string> = {
    "h8": "k",
    "g7": "b",
    "g6": "P",
    "c2": "K",
  };
  const exclude = new Set(Object.keys(fixed).concat(["h7"]));
  for (const portal of squaresInRanks([0, 1, 2, 3, 4])) {
    if (exclude.has(portal)) continue;
    const pieces = { ...fixed, [portal]: "Q" };
    const fen = `${fenPlacement(pieces)} w - -`;
    out.push({
      fen,
      wPortal: portal,
      bPortal: null,
      moves: [`${portal}h7`],
      themes: ["portal", "queen", "anastasia", "mateIn1"],
    });
  }
  return out;
}

/** Pattern A' — Anastasia mirror, queenside. K a8, B b7, pawn b6. */
function genAnastasiaQueenside(): RawCandidate[] {
  const out: RawCandidate[] = [];
  const fixed: Record<string, string> = {
    "a8": "k",
    "b7": "b",
    "b6": "P",
    "f2": "K",
  };
  const exclude = new Set(Object.keys(fixed).concat(["a7"]));
  for (const portal of squaresInRanks([0, 1, 2, 3, 4])) {
    if (exclude.has(portal)) continue;
    const pieces = { ...fixed, [portal]: "Q" };
    const fen = `${fenPlacement(pieces)} w - -`;
    out.push({
      fen,
      wPortal: portal,
      bPortal: null,
      moves: [`${portal}a7`],
      themes: ["portal", "queen", "anastasia", "mateIn1"],
    });
  }
  return out;
}

/**
 * Pattern B — "Boden cross-bishop" (queenside king).
 *
 * Black: K c8, Q d8, pawns c7 & d7.
 * White: dark B on f4 (covers b8 and c7 via the a3-f8 diagonal), K h1,
 *        light B on its own portal somewhere; teleports to a6.
 *
 * After Bxa6 (teleport): K c8 in check (a6-b7-c8 diag). No escape: b7 attacked
 * directly; b8 covered by f4 bishop; c7/d7 own pawns; d8 own queen. No black
 * piece reaches a6 to capture.
 */
function genBodenQueenside(): RawCandidate[] {
  const out: RawCandidate[] = [];
  const fixed: Record<string, string> = {
    "c8": "k",
    "d8": "q",
    "c7": "p",
    "d7": "p",
    "f4": "B",
    "h1": "K",
  };
  const exclude = new Set(Object.keys(fixed).concat(["a6"]));
  for (const portal of squaresInRanks([0, 1, 2, 3, 4, 5, 6])) {
    if (!isLight(portal)) continue;
    if (exclude.has(portal)) continue;
    const pieces = { ...fixed, [portal]: "B" };
    const fen = `${fenPlacement(pieces)} w - -`;
    out.push({
      fen,
      wPortal: portal,
      bPortal: null,
      moves: [`${portal}a6`],
      themes: ["portal", "bishop", "boden", "mateIn1"],
    });
  }
  return out;
}

/**
 * Pattern C — "Knight smother on h6".
 *
 * Black: K g8, R f8, R h8, N g7, P f7, P h7. (Six own pieces fully boxing K.)
 * White: K b2, N on its own portal somewhere; teleports to h6.
 *
 * On h6 the knight attacks g8 (h6-g8: dx=-1, dy=2). King is fully smothered.
 * No black piece attacks h6 (pawns f7/h7 attack g6 only; N g7 attacks
 * e6/e8/f5/h5 — not h6).
 */
function genKnightSmotherG(): RawCandidate[] {
  const out: RawCandidate[] = [];
  const fixed: Record<string, string> = {
    "g8": "k",
    "f8": "r",
    "h8": "r",
    "g7": "n",
    "f7": "p",
    "h7": "p",
    "b2": "K",
  };
  const exclude = new Set(Object.keys(fixed).concat(["h6"]));
  for (const portal of squaresInRanks([0, 1, 2, 3, 4])) {
    if (exclude.has(portal)) continue;
    const pieces = { ...fixed, [portal]: "N" };
    const fen = `${fenPlacement(pieces)} w - -`;
    out.push({
      fen,
      wPortal: portal,
      bPortal: null,
      moves: [`${portal}h6`],
      themes: ["portal", "knight", "smothered-h6", "mateIn1"],
    });
  }
  return out;
}

/** Pattern C' — knight smother queenside mirror. K b8, N teleports to a6. */
function genKnightSmotherB(): RawCandidate[] {
  const out: RawCandidate[] = [];
  const fixed: Record<string, string> = {
    "b8": "k",
    "a8": "r",
    "c8": "r",
    "b7": "n",
    "a7": "p",
    "c7": "p",
    "g2": "K",
  };
  const exclude = new Set(Object.keys(fixed).concat(["a6"]));
  for (const portal of squaresInRanks([0, 1, 2, 3, 4])) {
    if (exclude.has(portal)) continue;
    const pieces = { ...fixed, [portal]: "N" };
    const fen = `${fenPlacement(pieces)} w - -`;
    out.push({
      fen,
      wPortal: portal,
      bPortal: null,
      moves: [`${portal}a6`],
      themes: ["portal", "knight", "smothered-a6", "mateIn1"],
    });
  }
  return out;
}

/**
 * Pattern D — "Capture-then-warp" (mate-in-2).
 *
 * Black: K h8, P g7, Q a8 (rank-8 defender), B (dark) on the c5-f8 diagonal.
 * White: K e1, R on the a-file, P g6, Q on portal h1.
 *
 * Solution:
 *   1. R xa8+      Rook captures the rank-8 queen along the a-file.
 *   2. B → f8      Black's only legal response: interpose on f8 along the
 *                  c5-f8 (or b4-f8 / d6-f8 / e7-f8) diagonal.
 *   3. Q h1-h7#    Queen teleports/slides to h7. Defended by pawn g6.
 *                  King has no escape (g8 covered by Q; h7 capture illegal).
 */
function genCaptureThenWarp(): RawCandidate[] {
  const out: RawCandidate[] = [];
  // Black-bishop starting squares on the a3-f8 dark-diagonal (excluding f8).
  const bishopStarts = ["b4", "c5", "d6", "e7"];
  // White-rook starting squares on the a-file (excluding a8 with the queen).
  const rookStarts = ["a1", "a2", "a3", "a4", "a5", "a6", "a7"];
  // Queen-portal squares chosen so that Q does NOT already attack K h8 at
  // start. Avoid h-file (would check K along file), rank 8, and the a1-h8
  // diagonal squares whose path to h8 is clear (the black g7 pawn blocks
  // a1/b2/c3/d4/e5/f6, so those are actually safe — but skip them for
  // visual variety). Also avoid squares occupied by other white pieces.
  const queenPortals = ["c1", "d1", "e2", "f1", "b3", "c3", "d3", "e3", "f3"];
  for (const bSq of bishopStarts) {
    for (const rSq of rookStarts) {
      for (const qSq of queenPortals) {
        const fixed: Record<string, string> = {
          "h8": "k",
          "g7": "p",
          "a8": "q",
          [bSq]: "b",
          "g6": "P",
          "e1": "K",
          [rSq]: "R",
          [qSq]: "Q",
        };
        // Skip combos with collisions (e.g., rSq === qSq is impossible since
        // queenPortals all on rank 1-3 and rookStarts on a-file rank 1-7;
        // collision possible only if qSq is also on a-file, which it isn't).
        const fen = `${fenPlacement(fixed)} w - -`;
        out.push({
          fen,
          wPortal: qSq,
          bPortal: null,
          moves: [`${rSq}a8`, `${bSq}f8`, `${qSq}h7`],
          themes: ["portal", "queen", "captureThenWarp", "mateIn2"],
        });
      }
    }
  }
  return out;
}

// ── build ───────────────────────────────────────────────────────────────────

function build(): PortalPuzzleRow[] {
  const candidates: RawCandidate[] = [
    ...genAnastasiaKingside(),
    ...genAnastasiaQueenside(),
    ...genBodenQueenside(),
    ...genKnightSmotherG(),
    ...genKnightSmotherB(),
    ...genCaptureThenWarp(),
  ];
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
