import { useGame } from "../GameContext";

const TIMER_OPTIONS = [0, 10, 30, 60, 120] as const;

export function Clock() {
  const { timeLeft, state, store, players, updateSetting } = useGame();
  const current = store.settings.timerSeconds;
  const off = current === 0;
  const secs = off || !isFinite(timeLeft) ? null : Math.max(0, timeLeft);
  const low = secs !== null && secs <= 5;

  const cycleTimer = () => {
    const i = TIMER_OPTIONS.indexOf(current as typeof TIMER_OPTIONS[number]);
    const next = TIMER_OPTIONS[(i + 1) % TIMER_OPTIONS.length];
    updateSetting("timerSeconds", next);
  };

  const label = off ? "⏱ off" : `⏱ ${current}s`;

  const renderBadge = (isMyTurn: boolean) => {
    if (off) return null;
    if (secs === null) return <span className="timer-badge idle">{current}s</span>;
    if (!isMyTurn) return <span className="timer-badge idle">{current}s</span>;
    return <strong className={`timer-badge active ${low ? "low" : ""}`}>{secs}s</strong>;
  };

  return (
    <div className="clock">
      <button className={`timer-control ${off ? "off" : "on"}`} onClick={cycleTimer} title="Tap to change timer per move">
        {label}
      </button>
      <div className={`clock-side ${state.turn === "w" ? "active" : ""}`}>
        <span>♙ {players.w}</span>
        {renderBadge(state.turn === "w")}
      </div>
      <div className={`clock-side ${state.turn === "b" ? "active" : ""}`}>
        <span>♟ {players.b}</span>
        {renderBadge(state.turn === "b")}
      </div>
    </div>
  );
}
