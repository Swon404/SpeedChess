import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Board } from "../components/Board";
import { useGame } from "../GameContext";
import {
  PUZZLES, filterPuzzles, puzzleDifficulty,
  type Puzzle, type Difficulty
} from "../puzzles/puzzles";
import {
  PORTAL_PUZZLES, filterPortalPuzzles,
  type PortalPuzzle
} from "../puzzles/portal-puzzles";
import { parseUci, parseSquare, type Square } from "../engine/board";

type Status = "solving" | "wrong" | "solved";
type MateFilter = "all" | 1 | 2 | 3;
type Mode = "standard" | "portal";

/** Parse extended UCI: "e2e4" or "e2e4@d8" (portal teleport). */
function parsePortalUci(uci: string): {
  from: Square; to: Square; portalTo?: Square;
  promotion?: "Q" | "R" | "B" | "N";
} {
  const atIdx = uci.indexOf("@");
  if (atIdx !== -1) {
    const base = uci.slice(0, atIdx);
    const land = uci.slice(atIdx + 1);
    return {
      from: parseSquare(base.slice(0, 2)),
      to: parseSquare(base.slice(2, 4)),
      portalTo: parseSquare(land.slice(0, 2)),
    };
  }
  const u = parseUci(uci);
  return { from: u.from, to: u.to, promotion: u.promotion as "Q" | "R" | "B" | "N" | undefined };
}

const DIFF_LABEL: Record<Difficulty | "all", string> = {
  all: "All",
  beginner: "🔵 Beginner",
  easy: "🟢 Easy",
  medium: "🟡 Medium",
  hard: "🔴 Hard"
};

export function PuzzlesScreen() {
  const { loadPosition, state, tryMove, activeProfile, recordPuzzleSolved, recordPuzzleAttempt } = useGame();
  const [mode, setMode] = useState<Mode>("standard");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("beginner");
  const [mateIn, setMateIn] = useState<MateFilter>("all");
  const [portalMateIn, setPortalMateIn] = useState<1 | 2 | "all">("all");
  const [newOnly, setNewOnly] = useState(true);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("solving");
  const [playedPlies, setPlayedPlies] = useState(0);
  const baselineHistoryRef = useRef(0);
  const attemptedRef = useRef<string | null>(null);

  const progress = activeProfile?.stats.puzzleProgress ?? {};
  const solvedIds = useMemo(
    () => new Set(Object.keys(progress).filter((id) => progress[id]?.solved)),
    [progress]
  );

  const basePool = useMemo(
    () => filterPuzzles({ mateIn, difficulty }),
    [mateIn, difficulty]
  );
  const stdPool = useMemo(() => {
    if (!newOnly) return basePool;
    const unsolved = basePool.filter((p) => !solvedIds.has(p.id));
    return unsolved.length > 0 ? unsolved : basePool;
  }, [basePool, newOnly, solvedIds]);

  const basePortalPool = useMemo(
    () => filterPortalPuzzles({ mateIn: portalMateIn }),
    [portalMateIn]
  );
  const portalPool = useMemo(() => {
    if (!newOnly) return basePortalPool;
    const unsolved = basePortalPool.filter((p) => !solvedIds.has(p.id));
    return unsolved.length > 0 ? unsolved : basePortalPool;
  }, [basePortalPool, newOnly, solvedIds]);

  const pool: (Puzzle | PortalPuzzle)[] = mode === "portal" ? portalPool : stdPool;
  const puzzle = pool[index];
  const totalSolved = activeProfile?.stats.puzzlesSolved ?? 0;

  const diffCounts = useMemo(() => {
    const out: Record<Difficulty | "all", { solved: number; total: number }> = {
      all: { solved: 0, total: PUZZLES.length },
      beginner: { solved: 0, total: 0 },
      easy: { solved: 0, total: 0 },
      medium: { solved: 0, total: 0 },
      hard: { solved: 0, total: 0 }
    };
    for (const p of PUZZLES) {
      const band = puzzleDifficulty(p);
      out[band].total++;
      if (solvedIds.has(p.id)) { out[band].solved++; out.all.solved++; }
    }
    return out;
  }, [solvedIds]);

  const mateCounts = useMemo(() => {
    const out: Record<"all" | 1 | 2 | 3, { solved: number; total: number }> = {
      all: { solved: 0, total: 0 }, 1: { solved: 0, total: 0 },
      2: { solved: 0, total: 0 }, 3: { solved: 0, total: 0 }
    };
    for (const p of PUZZLES) {
      if (difficulty !== "all" && puzzleDifficulty(p) !== difficulty) continue;
      const m = p.mateIn();
      out[m].total++; out.all.total++;
      if (solvedIds.has(p.id)) { out[m].solved++; out.all.solved++; }
    }
    return out;
  }, [solvedIds, difficulty]);

  useEffect(() => { setIndex(0); }, [mateIn, difficulty, newOnly, mode, portalMateIn]);

  useEffect(() => {
    if (!puzzle) return;
    loadPosition(puzzle.setup(), { w: "You", b: "Puzzle" }, { noTimer: true });
    baselineHistoryRef.current = 0;
    setStatus("solving");
    setPlayedPlies(0);
    attemptedRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle?.id]);

  useEffect(() => {
    if (!puzzle) return;
    if (status !== "solving") return;
    const moved = state.history.length - baselineHistoryRef.current;
    if (moved <= playedPlies) return;

    const plyIndex = moved - 1;
    const expected = puzzle.moves[plyIndex];
    const last = state.history[state.history.length - 1];
    const exp = parsePortalUci(expected);
    let ok =
      last.from.file === exp.from.file && last.from.rank === exp.from.rank &&
      last.to.file === exp.to.file && last.to.rank === exp.to.rank &&
      (!exp.promotion || last.promotion === exp.promotion);
    if (ok && exp.portalTo) {
      ok = !!last.isPortalEntry &&
        !!last.portalTo &&
        last.portalTo.file === exp.portalTo.file &&
        last.portalTo.rank === exp.portalTo.rank;
    } else if (ok && !exp.portalTo && last.isPortalEntry) {
      // Expected a non-portal move, but the user made a portal move.
      ok = false;
    }

    if (!ok) {
      setStatus("wrong");
      if (attemptedRef.current !== puzzle.id) {
        recordPuzzleAttempt(puzzle.id);
        attemptedRef.current = puzzle.id;
      }
      return;
    }

    const nextIdx = plyIndex + 1;
    if (nextIdx >= puzzle.moves.length) {
      setStatus("solved");
      recordPuzzleSolved(puzzle.id);
      setPlayedPlies(moved);
      return;
    }

    setPlayedPlies(moved);
    const reply = parsePortalUci(puzzle.moves[nextIdx]);
    const t = setTimeout(() => {
      tryMove(reply.from, reply.to, reply.promotion, reply.portalTo);
      setPlayedPlies((x) => x + 1);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.history.length]);

  const retry = () => {
    if (!puzzle) return;
    loadPosition(puzzle.setup(), { w: "You", b: "Puzzle" }, { noTimer: true });
    baselineHistoryRef.current = 0;
    setStatus("solving");
    setPlayedPlies(0);
  };
  const next = () => setIndex((i) => (i + 1) % Math.max(1, pool.length));
  const prev = () => setIndex((i) => (i - 1 + Math.max(1, pool.length)) % Math.max(1, pool.length));

  const entry = puzzle ? progress[puzzle.id] : undefined;
  const alreadySolved = !!entry?.solved;

  const banner = useMemo(() => {
    if (!puzzle) return null;
    if (status === "solved") return <div className="puzzle-banner good">✅ Solved! Great job.</div>;
    if (status === "wrong") return <div className="puzzle-banner bad">❌ Not quite — tap Retry.</div>;
    const side = puzzle.setup().turn === "w" ? "White" : "Black";
    const done = alreadySolved ? " (already solved ✓)" : "";
    return <div className="puzzle-banner">You play {side}. Mate in {puzzle.mateIn()} — find the forced win.{done}</div>;
  }, [status, puzzle, alreadySolved]);

  const allSolvedHere = mode === "portal"
    ? basePortalPool.length > 0 && basePortalPool.every((p) => solvedIds.has(p.id))
    : basePool.length > 0 && basePool.every((p) => solvedIds.has(p.id));

  const totalCount = mode === "portal" ? PORTAL_PUZZLES.length : PUZZLES.length;

  return (
    <div className="screen">
      <div className="topbar">
        <Link to="/">← Home</Link>
        <span className="muted">Solved: {totalSolved} / {totalCount}</span>
      </div>
      <h2>🧩 Puzzles</h2>

      <div className="puzzle-tabs">
        <span className="tabs-label">Mode</span>
        <button
          className={mode === "standard" ? "pill active" : "pill"}
          onClick={() => setMode("standard")}
        >Standard</button>
        <button
          className={mode === "portal" ? "pill active" : "pill"}
          onClick={() => setMode("portal")}
        >🌀 Portal</button>
      </div>

      {mode === "standard" && (
        <div className="puzzle-tabs">
          <span className="tabs-label">Level</span>
          {(["beginner", "easy", "medium", "hard", "all"] as const).map((d) => {
            const c = diffCounts[d];
            return (
              <button key={d}
                className={difficulty === d ? "pill active" : "pill"}
                onClick={() => setDifficulty(d)}
              >{DIFF_LABEL[d]}<span className="count">{c.solved}/{c.total}</span></button>
            );
          })}
        </div>
      )}

      {mode === "standard" ? (
        <div className="puzzle-tabs">
          <span className="tabs-label">Type</span>
          {([
            { key: "all" as MateFilter, label: "All" },
            { key: 1 as MateFilter, label: "M1" },
            { key: 2 as MateFilter, label: "M2" },
            { key: 3 as MateFilter, label: "M3" }
          ]).map((it) => {
            const c = mateCounts[it.key];
            return (
              <button key={String(it.key)}
                className={mateIn === it.key ? "pill active" : "pill"}
                onClick={() => setMateIn(it.key)}
              >{it.label}<span className="count">{c.solved}/{c.total}</span></button>
            );
          })}
          <label className="pill toggle" style={{ cursor: "pointer", marginLeft: "auto" }}>
            <input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} />
            New only
          </label>
        </div>
      ) : (
        <div className="puzzle-tabs">
          <span className="tabs-label">Type</span>
          {(["all", 1, 2] as const).map((it) => {
            const count = basePortalPool.length === 0 && it !== portalMateIn
              ? PORTAL_PUZZLES.filter((p) => it === "all" || p.mateIn() === it).length
              : 0;
            const total = PORTAL_PUZZLES.filter((p) => it === "all" || p.mateIn() === it).length;
            const solved = PORTAL_PUZZLES.filter((p) =>
              (it === "all" || p.mateIn() === it) && solvedIds.has(p.id)
            ).length;
            return (
              <button key={String(it)}
                className={portalMateIn === it ? "pill active" : "pill"}
                onClick={() => setPortalMateIn(it)}
              >{it === "all" ? "All" : `M${it}`}<span className="count">{solved}/{total || count}</span></button>
            );
          })}
          <label className="pill toggle" style={{ cursor: "pointer", marginLeft: "auto" }}>
            <input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} />
            New only
          </label>
        </div>
      )}

      {allSolvedHere && newOnly && (
        <p className="hint" style={{ margin: "4px 0 8px" }}>
          🎉 All solved at this level — showing review pool.
        </p>
      )}

      {!puzzle ? (
        <p className="hint">No puzzles match this filter yet. Try a different combo.</p>
      ) : (
        <>
          {banner}
          <div className="puzzle-meta">
            <span>Puzzle {index + 1} / {pool.length}</span>
            {"rating" in puzzle && puzzle.rating !== undefined && <span className="pill">⚡ {puzzle.rating}</span>}
            {mode === "portal" && <span className="pill">🌀 Portal</span>}
            {alreadySolved && <span className="pill solved">✓ Solved</span>}
            {entry && entry.attempts > 0 && <span className="pill">Tries: {entry.attempts}</span>}
          </div>
          <Board flipped={puzzle.setup().turn === "b"} />
          <div className="buttons puzzle-controls">
            <button onClick={prev}>← Previous</button>
            {status === "wrong" && <button className="primary" onClick={retry}>Retry</button>}
            {status === "solved"
              ? <button className="primary" onClick={next}>Next →</button>
              : <button onClick={next}>Skip →</button>}
          </div>
        </>
      )}
    </div>
  );
}
