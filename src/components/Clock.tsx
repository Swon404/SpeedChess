import { useGame } from "../GameContext";

export function Clock() {
  const { timeLeft, state, isBotThinking, store, players } = useGame();
  if (store.settings.timerSeconds === 0) {
    return (
      <div className="clock">
        <div className={`clock-side ${state.turn === "w" ? "active" : ""}`}>
          <span>♙ {players.w}</span>
        </div>
        <div className={`clock-side ${state.turn === "b" ? "active" : ""}`}>
          <span>♟ {players.b} {isBotThinking ? "(thinking…)" : ""}</span>
        </div>
      </div>
    );
  }
  const display = !isFinite(timeLeft) ? "∞" : `${Math.max(0, timeLeft)}s`;
  return (
    <div className="clock">
      <div className={`clock-side ${state.turn === "w" ? "active" : ""}`}>
        <span>♙ {players.w}</span>
        <strong>{state.turn === "w" ? display : ""}</strong>
      </div>
      <div className={`clock-side ${state.turn === "b" ? "active" : ""}`}>
        <span>♟ {players.b} {isBotThinking ? "(thinking…)" : ""}</span>
        <strong>{state.turn === "b" ? display : ""}</strong>
      </div>
    </div>
  );
}
