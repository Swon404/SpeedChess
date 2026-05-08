import { describe, it, expect } from "vitest";
import { GameState, initialState, parseFEN, parseSquare, positionKey, sqEq } from "../board";
import { allLegalMoves, inCheck, legalMovesFrom, makeMove, teleportTargets } from "../rules";

/** Wrap a state into Portal Chess mode with given creator type. */
function asPortal(s: GameState, creator: "Q" | "R" | "B" | "N" | "K" = "Q"): GameState {
  s.portals = { w: [], b: [], max: 1 };
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
    expect(s.portals?.w).toEqual([]);
    s = play(s, "e7", "e6"); // black pawn
    s = play(s, "d1", "d2"); // Qd2 legal
    expect(s.portals?.w).toEqual([{ file: 3, rank: 1 }]);
  });

  it("Queen does NOT drop a second portal while one is active", () => {
    let s = asPortal(initialState());
    s = play(s, "d2", "d3");
    s = play(s, "e7", "e6");
    s = play(s, "d1", "d2"); // first portal at d2
    s = play(s, "e6", "e5"); // black tempo
    s = play(s, "d2", "e3"); // queen moves; no new portal because one is active
    expect(s.portals?.w).toEqual([{ file: 3, rank: 1 }]); // still at d2
  });

  it("Pawn landing on a portal does not consume it and does not teleport", () => {
    // Custom position: white pawn at e4, black portal at e5, black to move skipped.
    const s = asPortal(parseFEN("8/8/8/4p3/4P3/8/8/8 w - - 0 1"));
    // Manually place a black portal at e5 via state hack (no creator move yet).
    s.portals = { w: [], b: [parseSquare("e5")], max: 1 };
    s.turn = "w";
    // White pawn at e4 cannot capture e5 (same file). Switch to a portal at d5
    // so the pawn captures into it.
    s.portals = { w: [], b: [parseSquare("d5")], max: 1 };
    s.board[4][3] = { type: "P", color: "b" };
    const moves = legalMovesFrom(s, parseSquare("e4"));
    const cap = moves.filter((m) => m.to.file === 3 && m.to.rank === 4);
    expect(cap.length).toBeGreaterThan(0);
    // None of these should be portal entries (pawn never teleports).
    expect(cap.every((m) => !m.isPortalEntry)).toBe(true);
    // The portal also persists after the pawn move.
    const ns = makeMove(s, cap[0]);
    expect(ns.portals?.b).toEqual([parseSquare("d5")]);
  });

  it("Pawn on own portal blocks access and moving off does not consume it", () => {
    const s = asPortal(parseFEN("4k3/8/8/8/8/8/4P3/4K1N1 w - - 0 1"));
    s.portals = { w: [parseSquare("e2")], b: [], max: 1 };

    const pawnMoves = legalMovesFrom(s, parseSquare("e2"));
    expect(pawnMoves.some((m) => m.isPortalEntry)).toBe(false);
    const up = pawnMoves.find((m) => sqEq(m.to, parseSquare("e3")));
    expect(up).toBeDefined();

    let ns = makeMove(s, up!);
    expect(ns.portals?.w).toEqual([parseSquare("e2")]);

    // Skip black's turn in this unit test and continue from white's side.
    ns.turn = "w";
    const ontoPortal = legalMovesFrom(ns, parseSquare("g1"))
      .find((m) => sqEq(m.to, parseSquare("e2")));
    expect(ontoPortal).toBeDefined();

    ns = makeMove(ns, ontoPortal!);
    ns.turn = "w";
    const tele = legalMovesFrom(ns, parseSquare("e2")).filter((m) => m.isPortalEntry);
    expect(tele.length).toBeGreaterThan(0);
  });
});

describe("Portal Chess: teleport entry", () => {
  it("Knight standing on its own portal has teleport options on next move", () => {
    const s = asPortal(parseFEN("8/8/8/8/8/8/8/8 w - - 0 1"));
    s.board[2][5] = { type: "N", color: "w" }; // Nf3
    s.portals = { w: [parseSquare("f3")], b: [], max: 1 };
    const moves = legalMovesFrom(s, parseSquare("f3"));
    const tele = moves.filter((m) => m.isPortalEntry);
    expect(tele.length).toBeGreaterThan(0);
    expect(tele.every((m) => m.portalTo && sqEq(m.portalTo, m.to))).toBe(true);
  });

  it("Bishop on its own portal teleports only to same-colour squares", () => {
    const s = asPortal(parseFEN("8/8/8/8/8/8/8/8 w - - 0 1"));
    s.board[2][3] = { type: "B", color: "w" }; // Bd3
    s.portals = { w: [parseSquare("d3")], b: [], max: 1 };
    const moves = legalMovesFrom(s, parseSquare("d3")).filter((m) => m.isPortalEntry);
    expect(moves.length).toBeGreaterThan(0);
    // d3 is light: (3+2)%2=1.
    for (const m of moves) {
      expect((m.to.file + m.to.rank) % 2).toBe(1);
    }
  });

  it("Teleport adjacency rule rejects targets next to any piece (when enabled)", () => {
    const s = asPortal(parseFEN("7k/8/8/8/8/1P6/8/K7 w - - 0 1"));
    s.board[2][5] = { type: "N", color: "w" }; // Nf3 on its own portal
    s.portals = { w: [parseSquare("f3")], b: [], max: 1 };
    s.portalAdjacencyRule = true;
    const moves = legalMovesFrom(s, parseSquare("f3")).filter((m) => m.isPortalEntry);
    const targets = moves.map((m) => m.to);
    for (const name of ["a2", "a4", "b2", "b4", "c2", "c4"]) {
      expect(targets.some((t) => sqEq(t, parseSquare(name)))).toBe(false);
    }
    expect(targets.some((t) => sqEq(t, parseSquare("e6")))).toBe(true);
  });

  it("Adjacency rule is bypassed when the teleport delivers check", () => {
    const s = asPortal(parseFEN("4k3/4p3/8/8/8/8/8/K7 w - - 0 1"));
    s.board[3][6] = { type: "N", color: "w" }; // Ng4 on its own portal
    s.portals = { w: [parseSquare("g4")], b: [], max: 1 };
    s.portalAdjacencyRule = true;
    const moves = legalMovesFrom(s, parseSquare("g4"))
      .filter((m) => m.isPortalEntry && sqEq(m.to, parseSquare("f6")));
    expect(moves.length).toBe(1);
  });

  it("Teleport move can immediately give check", () => {
    const s = asPortal(parseFEN("4k3/4p3/8/8/8/8/8/K7 w - - 0 1"));
    s.board[3][6] = { type: "N", color: "w" }; // Ng4 on its own portal
    s.portals = { w: [parseSquare("g4")], b: [], max: 1 };
    const move = legalMovesFrom(s, parseSquare("g4"))
      .find((m) => m.isPortalEntry && sqEq(m.to, parseSquare("f6")));
    expect(move).toBeDefined();

    const ns = makeMove(s, move!);
    expect(inCheck(ns, "b")).toBe(true);
  });

  it("With adjacency rule OFF (default), targets next to other pieces are allowed", () => {
    const s = asPortal(parseFEN("8/8/8/8/8/1P6/8/8 w - - 0 1"));
    s.board[2][5] = { type: "N", color: "w" }; // Nf3 on its own portal
    s.portals = { w: [parseSquare("f3")], b: [], max: 1 };
    const targets = teleportTargets(s, parseSquare("f3"), parseSquare("f3"), { type: "N", color: "w" });
    expect(targets.some((t) => sqEq(t, parseSquare("c2")))).toBe(true);
  });

  it("Teleport that leaves own king in check is illegal", () => {
    // Black rook a8 pins the white rook against the king on a1.
    const s = asPortal(parseFEN("r6k/8/8/8/8/8/8/K7 w - - 0 1"));
    s.board[1][0] = { type: "R", color: "w" }; // Ra2 on its own portal
    s.portals = { w: [parseSquare("a2")], b: [], max: 1 };
    const moves = legalMovesFrom(s, parseSquare("a2")).filter((m) => m.isPortalEntry);
    expect(moves.length).toBeGreaterThan(0);
    for (const m of moves) {
      expect(m.to.file).toBe(0); // must stay on the a-file
    }
  });
});

describe("Portal Chess: creator pass-through and capture-then-teleport", () => {
  it("The creator (Queen) does not teleport when she lands on a portal", () => {
    // Place black portal at e4, white queen at e1, clear file.
    const s = asPortal(parseFEN("8/8/8/8/8/8/8/4Q3 w - - 0 1"));
    s.portals = { w: [], b: [parseSquare("e4")], max: 1 };
    const moves = legalMovesFrom(s, parseSquare("e1")).filter((m) => sqEq(m.to, parseSquare("e4")));
    expect(moves.length).toBe(1);
    expect(moves[0].isPortalEntry).toBeFalsy();
    // After the move: enemy portal STILL active (queen passed through).
    const ns = makeMove(s, moves[0]);
    expect(ns.portals?.b).toEqual([parseSquare("e4")]);
    // No new white portal because there's already a portal at her landing square.
    expect(ns.portals?.w).toEqual([]);
  });

  it("Knight capturing a piece on its own portal lands normally and may teleport later", () => {
    const s = asPortal(parseFEN("8/8/8/8/8/5p2/8/6N1 w - - 0 1"));
    s.portals = { w: [parseSquare("f3")], b: [], max: 1 };
    const cap = legalMovesFrom(s, parseSquare("g1")).filter((m) => sqEq(m.to, parseSquare("f3")));
    expect(cap.length).toBe(1);
    expect(cap[0].isPortalEntry).toBeFalsy();
    expect(cap[0].captured).toBe("P");
    const ns = makeMove(s, cap[0]);
    expect(ns.board[2][5]).toEqual({ type: "N", color: "w" });
    expect(ns.portals?.w).toEqual([parseSquare("f3")]);
  });

  it("Piece on portal cannot teleport to its own portal square (must move off)", () => {
    const s = asPortal(parseFEN("8/8/8/8/8/8/8/8 w - - 0 1"));
    s.board[2][5] = { type: "N", color: "w" };
    s.portals = { w: [parseSquare("f3")], b: [], max: 1 };
    const stay = legalMovesFrom(s, parseSquare("f3"))
      .find((m) => m.isPortalEntry && sqEq(m.to, parseSquare("f3")));
    expect(stay).toBeUndefined();
  });
});

describe("Portal Chess: creator life", () => {
  it("After creator is captured, no new portal can be made until promotion", () => {
    // White Q at d1, black R at d8. Black plays Rxd1 (captures the white Q).
    const s = asPortal(parseFEN("3r4/8/8/8/8/8/8/3Q4 b - - 0 1"));
    const ns = play(s, "d8", "d1");
    expect(ns.portals?.w).toEqual([]); // no white portal placed by capture
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
    expect(ns.portals?.w).toEqual([parseSquare("a8")]);
  });
});

describe("Portal Chess: legal-move enumeration", () => {
  it("allLegalMoves includes per-target teleport moves from a piece on its portal", () => {
    const s = asPortal(parseFEN("8/8/8/8/8/8/8/8 w - - 0 1"));
    s.board[2][5] = { type: "N", color: "w" };
    s.portals = { w: [parseSquare("f3")], b: [], max: 1 };
    const moves = allLegalMoves(s);
    const tele = moves.filter((m) => m.isPortalEntry && sqEq(m.from, parseSquare("f3")));
    expect(tele.length).toBeGreaterThan(1);
    expect(tele.every((m) => m.portalTo)).toBe(true);
  });

  it("Pawn landing on a portal is a single regular move (no teleport variants)", () => {
    const s = asPortal(parseFEN("8/8/8/8/3p4/2P5/8/8 w - - 0 1"));
    s.portals = { w: [], b: [parseSquare("d4")], max: 1 };
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
    s1.portals = { w: [parseSquare("d4")], b: [], max: 1 };
    s2.portals = { w: [parseSquare("e4")], b: [], max: 1 };
    expect(positionKey(s1)).not.toBe(positionKey(s2));
  });
});


