import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Board } from "../components/Board";
import { useGame } from "../GameContext";
import { PUZZLES, type Puzzle } from "../puzzles/puzzles";
import { recordPuzzleSolved } from "../engine/storage";

type Status = "solving" | "solved" | "wrong";

export function PuzzlesScreen() {
  const { loadPosition, state, undo, store, activeProfile } = useGame();
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("solving");
  const baselineHistoryRef = useRef(0);

  const puzzle: Puzzle = PUZZLES[index];
  const totalSolved = activeProfile?.stats.puzzlesSolved ?? 0;

  // Load the puzzle position whenever the index changes.
  useEffect(() => {
    const fresh = puzzle.setup();
    loadPosition(fresh, { w: "You", b: puzzle.title });
    baselineHistoryRef.current = 0;
    setStatus("solving");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Watch for the user's move.
  useEffect(() => {
    if (status !== "solving") return;
    if (state.history.length <= baselineHistoryRef.current) return;
    const move = state.history[state.history.length - 1];
    const fromOk = move.from.file === fileOf(puzzle.solution.from) &&
                   move.from.rank === rankOf(puzzle.solution.from);
    const toOk = move.to.file === fileOf(puzzle.solution.to) &&
                 move.to.rank === rankOf(puzzle.solution.to);
    const promoOk = !puzzle.solution.promotion ||
                    move.promotion === puzzle.solution.promotion;
    if (fromOk && toOk && promoOk) {
      setStatus("solved");
      // Credit only on first solve of this session per puzzle.
      recordPuzzleSolved(store, activeProfile?.id ?? null);
    } else {
      setStatus("wrong");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.history.length]);

  const retry = () => {
    undo();
    setStatus("solving");
  };

  const next = () => setIndex((i) => (i + 1) % PUZZLES.length);
  const prev = () => setIndex((i) => (i - 1 + PUZZLES.length) % PUZZLES.length);

  const banner = useMemo(() => {
    if (status === "solved") return <div className="puzzle-banner good">✅ Solved! Great job.</div>;
    if (status === "wrong") return <div className="puzzle-banner bad">❌ Not quite — try again!</div>;
    return <div className="puzzle-banner">{puzzle.description}</div>;
  }, [status, puzzle]);

  return (
    <div className="screen">
      <div className="topbar">
        <Link to="/">← Home</Link>
        <span className="muted">Solved: {totalSolved}</span>
      </div>
      <h2>🧩 Puzzles</h2>
      <div className="puzzle-meta">
        <strong>{puzzle.title}</strong>
        <span className="pill">{puzzle.theme}</span>
        <span className="pill">{"★".repeat(puzzle.difficulty)}</span>
      </div>
      {banner}
      <Board flipped={false} />
      <div className="buttons puzzle-controls">
        <button onClick={prev}>← Previous</button>
        {status === "wrong" && <button className="primary" onClick={retry}>Retry</button>}
        {status === "solved"
          ? <button className="primary" onClick={next}>Next puzzle →</button>
          : <button onClick={next}>Skip →</button>}
      </div>
      <p className="hint">
        Puzzle {index + 1} of {PUZZLES.length}. All puzzles are mate-in-one —
        find the move that ends the game immediately.
      </p>
    </div>
  );
}

function fileOf(name: string): number { return name.charCodeAt(0) - 97; }
function rankOf(name: string): number { return parseInt(name[1], 10) - 1; }
