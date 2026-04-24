import { useGame } from "../GameContext";

export function Clock() {
  const { timeLeft, state, isBotThinking, store, players, updateSetting } = useGame();
  const off = store.settings.timerSeconds === 0;
  const secs = off || !isFinite(timeLeft) ? null : Math.max(0, timeLeft);
  const low = secs !== null && secs <= 5;

  const renderBadge = (isMyTurn: boolean) => {
    if (off) {
      return (
        <button
          className="timer-badge off"
          title="Tap to enable 30-second timer"
          onClick={() => updateSetting("timerSeconds", 30)}
        >⏱ off</button>
      );
    }
    if (secs === null) return <span className="timer-badge">∞</span>;
    if (!isMyTurn) return <span className="timer-badge idle">{store.settings.timerSeconds}s</span>;
    return <strong className={`timer-badge active ${low ? "low" : ""}`}>{secs}s</strong>;
  };

  return (
    <div className="clock">
      <div className={`clock-side ${state.turn === "w" ? "active" : ""}`}>
        <span>♙ {players.w}</span>
        {renderBadge(state.turn === "w")}
      </div>
      <div className={`clock-side ${state.turn === "b" ? "active" : ""}`}>
        <span>♟ {players.b} {isBotThinking ? "(thinking…)" : ""}</span>
        {renderBadge(state.turn === "b")}
      </div>
    </div>
  );
}
