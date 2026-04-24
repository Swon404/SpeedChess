import { useGame } from "../GameContext";

export function Clock() {
  const { timeLeft, state, isBotThinking, store } = useGame();
  if (store.settings.timerSeconds === 0) return null;
  const display = !isFinite(timeLeft) ? "∞" : `${Math.max(0, timeLeft)}s`;
  return (
    <div className="clock">
      <div className={`clock-side ${state.turn === "w" ? "active" : ""}`}>
        <span>White</span>
        <strong>{state.turn === "w" ? display : ""}</strong>
      </div>
      <div className={`clock-side ${state.turn === "b" ? "active" : ""}`}>
        <span>Black {isBotThinking ? "(thinking…)" : ""}</span>
        <strong>{state.turn === "b" ? display : ""}</strong>
      </div>
    </div>
  );
}
