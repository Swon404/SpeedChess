import { describe, it, expect } from "vitest";
import { GameState, initialState, parseFEN, parseSquare, positionKey, sqEq } from "../board";
import { allLegalMoves, legalMovesFrom, makeMove, teleportTargets } from "../rules";

/** Wrap a state into Portal Chess mode with given creator type. */
function asPortal(s: GameState, creator: "Q" | "R" | "B" | "N" | "K" = "Q"): GameState {
  s.portals = { w: null, b: null };
  s.portalCreators = { w: creator, b: creator };
  return s;
}

/** Make a move by from/to (and optional portalTo). Returns the new state. */
function play(s: GameState, fromName: string, toName: string, portalTo?: string): GameState {
  const from = parseSquare(fromName);
  const to = parseSquare(toName);
  const moves = legalMovesFrom(s, from).filter((m) => sqEq(m.to, to));
  if (moves.length === 0) throw new Error(`No legal move ${fromName}-${toName}`);
  let move = moves[0];
  if (portalTo) {
    const pt = parseSquare(portalTo);
    const m2 = moves.find((m) => m.isPortalEntry && m.portalTo && sqEq(m.portalTo, pt));
    if (!m2) throw new Error(`No portal target ${portalTo}`);
    move = m2;
  }
  return makeMove(s, move);
}

describe("Portal Chess: portal creation", () => {
  it("Queen drops a portal under herself on her first move", () => {
    let s = asPortal(initialState());
    s = play(s, "d2", "d3"); // pawn move, no portal
    expect(s.portals?.w).toBeNull();
    s = play(s, "e7", "e6"); // black pawn
    s = play(s, "d1", "d2"); // Qd2 legal
    expect(s.portals?.w).toEqual({ file: 3, rank: 1 });
  });

  it("Queen does NOT drop a second portal while one is active", () => {
    let s = asPortal(initialState());
    s = play(s, "d2", "d3");
    s = play(s, "e7", "e6");
    s = play(s, "d1", "d2"); // first portal at d2
    s = play(s, "e6", "e5"); // black tempo
    s = play(s, "d2", "e3"); // queen moves; no new portal because one is active
    expect(s.portals?.w).toEqual({ file: 3, rank: 1 }); // still at d2
  });

  it("Pawn landing on a portal does not consume it and does not teleport", () => {
    // Custom position: white pawn at e4, black portal at e5, black to move skipped.
    const s = asPortal(parseFEN("8/8/8/4p3/4P3/8/8/8 w - - 0 1"));
    // Manually place a black portal at e5 via state hack (no creator move yet).
    s.portals = { w: null, b: parseSquare("e5") };
    s.turn = "w";
    // White pawn at e4 cannot capture e5 (same file). Switch to a portal at d5
    // so the pawn captures into it.
    s.portals = { w: null, b: parseSquare("d5") };
    s.board[4][3] = { type: "P", color: "b" };
    const moves = legalMovesFrom(s, parseSquare("e4"));
    const cap = moves.filter((m) => m.to.file === 3 && m.to.rank === 4);
    expect(cap.length).toBeGreaterThan(0);
    // None of these should be portal entries (pawn never teleports).
    expect(cap.every((m) => !m.isPortalEntry)).toBe(true);
    // The portal also persists after the pawn move.
    const ns = makeMove(s, cap[0]);
    expect(ns.portals?.b).toEqual(parseSquare("d5"));
  });
});

describe("Portal Chess: teleport entry", () => {
  it("Knight landing on a portal is forced to teleport", () => {
    // Place a black portal at f3, white knight on g1, no other obstructions.
    const s = asPortal(parseFEN("8/8/8/8/8/8/8/6N1 w - - 0 1"));
    s.portals = { w: null, b: parseSquare("f3") };
    const moves = legalMovesFrom(s, parseSquare("g1"));
    const fMoves = moves.filter((m) => m.to.file === 5 && m.to.rank === 2);
    expect(fMoves.length).toBeGreaterThan(0);
    // All these must be portal entries.
    expect(fMoves.every((m) => m.isPortalEntry && m.portalTo)).toBe(true);
  });

  it("Bishop teleport is restricted to same-colour squares as the portal", () => {
    // Place a portal at e4 (light square). Bishop must teleport to a light square only.
    const s = asPortal(parseFEN("8/8/8/8/8/8/8/4B3 w - - 0 1"));
    s.portals = { w: null, b: parseSquare("e4") };
    // First move bishop e1 -> e4? bishops can't move file-only. Use diagonal.
    // Place bishop at h1 and portal at a8 (both light)? Let's pick portal at d3 (dark).
    s.portals = { w: null, b: parseSquare("d3") };
    s.board[0][4] = null;
    s.board[0][5] = { type: "B", color: "w" }; // Bf1
    const moves = legalMovesFrom(s, parseSquare("f1")).filter((m) => sqEq(m.to, parseSquare("d3")));
    expect(moves.length).toBeGreaterThan(0);
    // d3 is a light square ((3+2)%2=1 -> light). All teleport targets must be light.
    for (const m of moves) {
      expect(m.portalTo).toBeDefined();
      const t = m.portalTo!;
      expect((t.file + t.rank) % 2).toBe(1); // light
    }
  });

  it("Teleport adjacency rule rejects targets next to any piece", () => {
    // Build state: a single white knight on g1 (will teleport via portal at f3),
    // a friendly pawn at b3 should block adjacents around itself.
    const s = asPortal(parseFEN("8/8/8/8/8/1P6/8/6N1 w - - 0 1"));
    s.portals = { w: null, b: parseSquare("f3") };
    const targets = teleportTargets(s, parseSquare("g1"), parseSquare("f3"), { type: "N", color: "w" });
    // a2,a3,a4,b2,b4,c2,c3,c4 are all adjacent to b3 -> excluded.
    const banned = ["a2", "a3", "a4", "b2", "b4", "c2", "c3", "c4"].map(parseSquare);
    for (const b of banned) {
      expect(targets.some((t) => sqEq(t, b))).toBe(false);
    }
    // A far square like h8 is allowed.
    expect(targets.some((t) => sqEq(t, parseSquare("h8")))).toBe(true);
  });

  it("Teleport that leaves own king in check is illegal", () => {
    // White king on e1, white knight on g1, black rook on e8 pinning along e-file.
    // Portal at f3 lets the knight teleport, but moving the knight to a non-e-file
    // square is fine — the pin doesn't apply because the knight isn't blocking.
    // Construct a real pin: White K e1, white N e2 (blocks check from black R e8),
    // portal at f3 (offered by enemy). Knight Ne2 -> ... wait, Ne2 cannot reach f3
    // in one move. Use a rook scenario.
    // Easier: White K a1, white R a2 (only piece blocking black R a8). White R
    // moving anywhere off the a-file would expose the king. Add portal at b2.
    // Rook can move a2->b2 (which lands on portal). Teleport must not leave the
    // king exposed -> all teleport targets are illegal because moving the rook
    // off the a-file uncovers check.
    const s = asPortal(parseFEN("r6k/8/8/8/8/8/R7/K7 w - - 0 1"));
    s.portals = { w: null, b: parseSquare("b2") };
    const moves = legalMovesFrom(s, parseSquare("a2"))
      .filter((m) => sqEq(m.to, parseSquare("b2")));
    // Any legal teleport must keep the rook on the a-file (file 0) so the
    // black rook on a8 is still blocked from giving check.
    expect(moves.length).toBeGreaterThan(0);
    for (const m of moves) {
      expect(m.portalTo).toBeDefined();
      expect(m.portalTo!.file).toBe(0);
    }
  });
});

describe("Portal Chess: creator pass-through and capture-then-teleport", () => {
  it("The creator (Queen) does not teleport when she lands on a portal", () => {
    // Place black portal at e4, white queen at e1, clear file.
    const s = asPortal(parseFEN("8/8/8/8/8/8/8/4Q3 w - - 0 1"));
    s.portals = { w: null, b: parseSquare("e4") };
    const moves = legalMovesFrom(s, parseSquare("e1")).filter((m) => sqEq(m.to, parseSquare("e4")));
    expect(moves.length).toBe(1);
    expect(moves[0].isPortalEntry).toBeFalsy();
    // After the move: enemy portal STILL active (queen passed through).
    const ns = makeMove(s, moves[0]);
    expect(ns.portals?.b).toEqual(parseSquare("e4"));
    // No new white portal because there's already a portal at her landing square.
    expect(ns.portals?.w).toBeNull();
  });

  it("Knight captures a piece on a portal then teleports", () => {
    // White N at g1, black portal at f3 with a black pawn sitting on f3.
    const s = asPortal(parseFEN("8/8/8/8/8/5p2/8/6N1 w - - 0 1"));
    s.portals = { w: null, b: parseSquare("f3") };
    const moves = legalMovesFrom(s, parseSquare("g1"))
      .filter((m) => sqEq(m.to, parseSquare("f3")));
    expect(moves.length).toBeGreaterThan(0);
    expect(moves[0].captured).toBe("P");
    expect(moves[0].isPortalEntry).toBe(true);
    const ns = makeMove(s, moves[0]);
    // Portal consumed.
    expect(ns.portals?.b).toBeNull();
    // Knight is at portalTo, NOT at f3.
    expect(ns.board[2][5]).toBeNull();
    expect(ns.board[moves[0].portalTo!.rank][moves[0].portalTo!.file]).toEqual({ type: "N", color: "w" });
    // The captured pawn is gone.
    let pawnCount = 0;
    for (const row of ns.board) for (const p of row) if (p?.type === "P" && p.color === "b") pawnCount++;
    expect(pawnCount).toBe(0);
  });
});

describe("Portal Chess: creator life", () => {
  it("After creator is captured, no new portal can be made until promotion", () => {
    // White Q at d1, black R at d8. Black plays Rxd1 (captures the white Q).
    const s = asPortal(parseFEN("3r4/8/8/8/8/8/8/3Q4 b - - 0 1"));
    const ns = play(s, "d8", "d1");
    expect(ns.portals?.w).toBeNull(); // no white portal placed by capture
    // Confirm white has no Q left, so subsequent white moves don't drop portals.
    let wQ = 0;
    for (const row of ns.board) for (const p of row) if (p?.type === "Q" && p.color === "w") wQ++;
    expect(wQ).toBe(0);
  });

  it("Promotion to creator type re-enables portal placement", () => {
    // White pawn on a7, ready to promote. White has no queen.
    const s = asPortal(parseFEN("8/P6k/8/8/8/8/8/7K w - - 0 1"));
    const moves = legalMovesFrom(s, parseSquare("a7"))
      .filter((m) => sqEq(m.to, parseSquare("a8")) && m.promotion === "Q");
    expect(moves.length).toBe(1);
    const ns = makeMove(s, moves[0]);
    // The promoted Q just moved -> portal drops at a8.
    expect(ns.portals?.w).toEqual(parseSquare("a8"));
  });
});

describe("Portal Chess: legal-move enumeration", () => {
  it("allLegalMoves expands portal entries into per-target moves", () => {
    const s = asPortal(parseFEN("8/8/8/8/8/8/8/6N1 w - - 0 1"));
    s.portals = { w: null, b: parseSquare("f3") };
    const moves = allLegalMoves(s);
    const onPortal = moves.filter((m) => sqEq(m.to, parseSquare("f3")));
    // Multiple teleport targets => multiple legal moves landing on f3.
    expect(onPortal.length).toBeGreaterThan(1);
    expect(onPortal.every((m) => m.isPortalEntry && m.portalTo)).toBe(true);
  });

  it("Pawn landing on a portal is a single regular move (no teleport variants)", () => {
    const s = asPortal(parseFEN("8/8/8/8/3p4/2P5/8/8 w - - 0 1"));
    s.portals = { w: null, b: parseSquare("d4") };
    const moves = legalMovesFrom(s, parseSquare("c3")).filter((m) => sqEq(m.to, parseSquare("d4")));
    expect(moves.length).toBe(1);
    expect(moves[0].isPortalEntry).toBeFalsy();
    expect(moves[0].captured).toBe("P");
  });
});

describe("Portal Chess: position keys differ by portal location", () => {
  it("Same board with different portal positions yields different keys", () => {
    const s1 = asPortal(initialState());
    const s2 = asPortal(initialState());
    s1.portals = { w: parseSquare("d4"), b: null };
    s2.portals = { w: parseSquare("e4"), b: null };
    expect(positionKey(s1)).not.toBe(positionKey(s2));
  });
});
