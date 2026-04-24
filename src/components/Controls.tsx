import { useGame } from "../GameContext";

export function Controls() {
  const { undo, newGame, mode, result, state, requestHint, hint, clearHint, paused, togglePause } = useGame();
  const statusText =
    result.kind === "ongoing"
      ? paused
        ? "⏸ Paused"
        : `${state.turn === "w" ? "White" : "Black"} to move`
      : result.kind === "checkmate"
      ? `Checkmate — ${result.winner === "w" ? "White" : "Black"} wins`
      : result.kind === "stalemate"
      ? "Stalemate"
      : result.kind === "fifty-move"
      ? "Draw (50-move rule)"
      : result.kind === "threefold"
      ? "Draw (threefold repetition)"
      : "Draw (insufficient material)";

  const ongoing = result.kind === "ongoing";

  return (
    <div className="controls">
      <div className="status">{statusText}</div>
      <div className="buttons">
        <button
          onClick={togglePause}
          disabled={!ongoing}
          title={paused ? "Resume the game" : "Pause the clock"}
        >
          {paused ? "▶ Resume" : "⏸ Pause"}
        </button>
        <button
          onClick={() => (hint ? clearHint() : requestHint())}
          disabled={!ongoing || paused}
          title="Show a suggested move"
        >
          {hint ? "Hide hint" : "💡 Hint"}
        </button>
        <button onClick={() => undo()} disabled={state.history.length === 0}>Undo</button>
        <button onClick={() => newGame(mode)}>New Game</button>
      </div>
    </div>
  );
}
