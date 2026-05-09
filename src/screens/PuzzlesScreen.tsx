import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Board } from "../components/Board";
import { useGame } from "../GameContext";
import {
  PUZZLES, filterPuzzles, puzzleDifficulty,
  type Puzzle, type Difficulty
} from "../puzzles/puzzles";
import { parseUci } from "../engine/board";
import { gameResult } from "../engine/rules";

type Status = "solving" | "wrong" | "solved";
type MateFilter = "all" | 1 | 2 | 3;

const DIFF_LABEL: Record<Difficulty | "all", string> = {
  all: "All",
  beginner: "🔵 Beginner",
  easy: "🟢 Easy",
  medium: "🟡 Medium",
  hard: "🔴 Hard"
};

export function PuzzlesScreen() {
  const { loadPosition, state, tryMove, activeProfile, recordPuzzleSolved, recordPuzzleAttempt } = useGame();
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("beginner");
  const [mateIn, setMateIn] = useState<MateFilter>("all");
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

  const pool: Puzzle[] = stdPool;
  const puzzle = pool[index];
  const sideToMate = useMemo(() => (puzzle ? puzzle.setup().turn : "w"), [puzzle?.id]);
  const totalSolved = useMemo(
    () => PUZZLES.reduce((n, p) => n + (solvedIds.has(p.id) ? 1 : 0), 0),
    [solvedIds]
  );

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

  useEffect(() => { setIndex(0); }, [mateIn, difficulty, newOnly]);

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
    const exp = parseUci(expected);
    let ok =
      last.from.file === exp.from.file && last.from.rank === exp.from.rank &&
      last.to.file === exp.to.file && last.to.rank === exp.to.rank &&
      (!exp.promotion || last.promotion === exp.promotion);

    // Accept alternative winning moves: if the user has just checkmated,
    // count the puzzle as solved even when it differs from the scripted line.
    const current = gameResult(state);
    const solvedByMate = current.kind === "checkmate" && current.winner === sideToMate;

    if (!ok && !solvedByMate) {
      setStatus("wrong");
      if (attemptedRef.current !== puzzle.id) {
        recordPuzzleAttempt(puzzle.id);
        attemptedRef.current = puzzle.id;
      }
      return;
    }

    if (solvedByMate) {
      setStatus("solved");
      recordPuzzleSolved(puzzle.id);
      setPlayedPlies(moved);
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
    const reply = parseUci(puzzle.moves[nextIdx]);
    const t = setTimeout(() => {
      tryMove(reply.from, reply.to, reply.promotion as "Q" | "R" | "B" | "N" | undefined);
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
    const side = sideToMate === "w" ? "White" : "Black";
    const done = alreadySolved ? " (already solved ✓)" : "";
    return <div className="puzzle-banner">You play {side}. Mate in {puzzle.mateIn()} — find the forced win.{done}</div>;
  }, [status, puzzle, alreadySolved, sideToMate]);

  const allSolvedHere = basePool.length > 0 && basePool.every((p) => solvedIds.has(p.id));

  const totalCount = PUZZLES.length;

  return (
    <div className="screen">
      <div className="topbar">
        <Link to="/">← Home</Link>
        <span className="muted">Solved: {totalSolved} / {totalCount}</span>
        <Link to="/settings">⚙ Settings</Link>
      </div>
      <h2>🧩 Puzzles</h2>

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
            {puzzle.rating !== undefined && <span className="pill">⚡ {puzzle.rating}</span>}
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
