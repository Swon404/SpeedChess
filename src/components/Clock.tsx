import { useGame } from "../GameContext";

export function Clock() {
  const { timeLeft, state, isBotThinking, store, players } = useGame();
  const off = store.settings.timerSeconds === 0;
  const display = off || !isFinite(timeLeft) ? "⏱ off" : `${Math.max(0, timeLeft)}s`;
  const low = !off && isFinite(timeLeft) && timeLeft <= 5;
  return (
    <div className="clock">
      <div className={`clock-side ${state.turn === "w" ? "active" : ""}`}>
        <span>♙ {players.w}</span>
        <strong className={state.turn === "w" && low ? "low" : ""}>
          {state.turn === "w" ? display : ""}
        </strong>
      </div>
      <div className={`clock-side ${state.turn === "b" ? "active" : ""}`}>
        <span>♟ {players.b} {isBotThinking ? "(thinking…)" : ""}</span>
        <strong className={state.turn === "b" && low ? "low" : ""}>
          {state.turn === "b" ? display : ""}
        </strong>
      </div>
    </div>
  );
}
