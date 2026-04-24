import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Board } from "../components/Board";
import { useGame } from "../GameContext";
import {
  PUZZLES, filterPuzzles, puzzleDifficulty,
  type Puzzle, type Difficulty
} from "../puzzles/puzzles";
import { recordPuzzleSolved } from "../engine/storage";
import { parseUci } from "../engine/board";

type Status = "solving" | "wrong" | "solved";
type MateFilter = "all" | 1 | 2 | 3;

const DIFF_LABEL: Record<Difficulty | "all", string> = {
  all: "All",
  easy: "🟢 Easy",
  medium: "🟡 Medium",
  hard: "🔴 Hard"
};

export function PuzzlesScreen() {
  const { loadPosition, state, tryMove, store, activeProfile } = useGame();
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("easy");
  const [mateIn, setMateIn] = useState<MateFilter>("all");
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("solving");
  const [playedPlies, setPlayedPlies] = useState(0);
  const baselineHistoryRef = useRef(0);

  const pool = useMemo(
    () => filterPuzzles({ mateIn, difficulty }),
    [mateIn, difficulty]
  );
  const puzzle: Puzzle | undefined = pool[index];
  const totalSolved = activeProfile?.stats.puzzlesSolved ?? 0;

  // Reset index when filter changes.
  useEffect(() => { setIndex(0); }, [mateIn, difficulty]);

  // Load the current puzzle.
  useEffect(() => {
    if (!puzzle) return;
    loadPosition(puzzle.setup(), { w: "You", b: "Puzzle" });
    baselineHistoryRef.current = 0;
    setStatus("solving");
    setPlayedPlies(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle?.id]);

  // Validate each new move and play the scripted opponent reply.
  useEffect(() => {
    if (!puzzle) return;
    if (status !== "solving") return;
    const moved = state.history.length - baselineHistoryRef.current;
    if (moved <= playedPlies) return;

    const plyIndex = moved - 1;
    const expected = puzzle.moves[plyIndex];
    const last = state.history[state.history.length - 1];
    const { from, to, promotion } = parseUci(expected);
    const ok =
      last.from.file === from.file && last.from.rank === from.rank &&
      last.to.file === to.file && last.to.rank === to.rank &&
      (!promotion || last.promotion === promotion);

    if (!ok) { setStatus("wrong"); return; }

    const nextIdx = plyIndex + 1;
    if (nextIdx >= puzzle.moves.length) {
      setStatus("solved");
      recordPuzzleSolved(store, activeProfile?.id ?? null);
      setPlayedPlies(moved);
      return;
    }

    // Play opponent reply after a short beat so user's move animates first.
    setPlayedPlies(moved);
    const reply = parseUci(puzzle.moves[nextIdx]);
    const t = setTimeout(() => {
      tryMove(
        reply.from, reply.to,
        reply.promotion as "Q" | "R" | "B" | "N" | undefined
      );
      setPlayedPlies((x) => x + 1);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.history.length]);

  const retry = () => {
    if (!puzzle) return;
    loadPosition(puzzle.setup(), { w: "You", b: "Puzzle" });
    baselineHistoryRef.current = 0;
    setStatus("solving");
    setPlayedPlies(0);
  };
  const next = () => setIndex((i) => (i + 1) % Math.max(1, pool.length));
  const prev = () => setIndex((i) => (i - 1 + Math.max(1, pool.length)) % Math.max(1, pool.length));

  const banner = useMemo(() => {
    if (!puzzle) return null;
    if (status === "solved") return <div className="puzzle-banner good">✅ Solved! Great job.</div>;
    if (status === "wrong") return <div className="puzzle-banner bad">❌ Not quite — tap Retry.</div>;
    const side = puzzle.setup().turn === "w" ? "White" : "Black";
    return <div className="puzzle-banner">You play {side}. Mate in {puzzle.mateIn()} — find the forced win.</div>;
  }, [status, puzzle]);

  return (
    <div className="screen">
      <div className="topbar">
        <Link to="/">← Home</Link>
        <span className="muted">Solved: {totalSolved}</span>
      </div>
      <h2>🧩 Puzzles</h2>

      <div className="puzzle-tabs">
        <span className="tabs-label">Difficulty</span>
        {(["easy", "medium", "hard", "all"] as const).map((d) => (
          <button key={d}
            className={difficulty === d ? "pill active" : "pill"}
            onClick={() => setDifficulty(d)}
          >{DIFF_LABEL[d]} ({PUZZLES.filter((p) => d === "all" || puzzleDifficulty(p) === d).length})</button>
        ))}
      </div>

      <div className="puzzle-tabs">
        <span className="tabs-label">Type</span>
        {([
          { key: "all" as MateFilter, label: "All" },
          { key: 1 as MateFilter, label: "Mate in 1" },
          { key: 2 as MateFilter, label: "Mate in 2" },
          { key: 3 as MateFilter, label: "Mate in 3" }
        ]).map((it) => (
          <button key={String(it.key)}
            className={mateIn === it.key ? "pill active" : "pill"}
            onClick={() => setMateIn(it.key)}
          >{it.label}</button>
        ))}
      </div>

      {!puzzle ? (
        <p className="hint">No puzzles match this filter yet. Try a different combo.</p>
      ) : (
        <>
          <div className="puzzle-meta">
            <span className="pill">Mate in {puzzle.mateIn()}</span>
            <span className="pill">{DIFF_LABEL[puzzleDifficulty(puzzle)]}</span>
            {puzzle.rating !== undefined && <span className="pill">⚡ {puzzle.rating}</span>}
          </div>
          {banner}
          <Board flipped={puzzle.setup().turn === "b"} />
          <div className="buttons puzzle-controls">
            <button onClick={prev}>← Previous</button>
            {status === "wrong" && <button className="primary" onClick={retry}>Retry</button>}
            {status === "solved"
              ? <button className="primary" onClick={next}>Next →</button>
              : <button onClick={next}>Skip →</button>}
          </div>
          <p className="hint">Puzzle {index + 1} of {pool.length}</p>
        </>
      )}
    </div>
  );
}
