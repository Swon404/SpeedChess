import { useGame } from "../GameContext";

export function Controls() {
  const { undo, newGame, mode, result, state } = useGame();
  const statusText =
    result.kind === "ongoing"
      ? `${state.turn === "w" ? "White" : "Black"} to move`
      : result.kind === "checkmate"
      ? `Checkmate — ${result.winner === "w" ? "White" : "Black"} wins`
      : result.kind === "stalemate"
      ? "Stalemate"
      : result.kind === "fifty-move"
      ? "Draw (50-move rule)"
      : result.kind === "threefold"
      ? "Draw (threefold repetition)"
      : "Draw (insufficient material)";

  return (
    <div className="controls">
      <div className="status">{statusText}</div>
      <div className="buttons">
        <button onClick={() => undo()} disabled={state.history.length === 0}>Undo</button>
        <button onClick={() => newGame(mode)}>New Game</button>
      </div>
    </div>
  );
}
