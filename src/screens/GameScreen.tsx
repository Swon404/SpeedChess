import { Link } from "react-router-dom";
import { Board } from "../components/Board";
import { Clock } from "../components/Clock";
import { Controls } from "../components/Controls";
import { GameOverModal } from "../components/GameOverModal";
import { LookPicker } from "../components/LookPicker";
import { MoveList } from "../components/MoveList";
import { useGame } from "../GameContext";

export function GameScreen() {
  const { mode, state, store, paused, togglePause } = useGame();
  const flipped =
    mode.kind === "two-player" && store.settings.autoFlip && state.turn === "b";

  return (
    <div className="screen game">
      <div className="topbar">
        <Link to="/">← Home</Link>
        <Link to="/new">New game</Link>
      </div>
      <Clock />
      <LookPicker />
      <div className="board-wrap">
        <Board flipped={flipped} />
        {paused && (
          <button className="pause-overlay" onClick={togglePause} title="Tap to resume">
            <div className="pause-card">
              <div className="pause-icon">⏸</div>
              <div>Paused</div>
              <small>Tap to resume</small>
            </div>
          </button>
        )}
      </div>
      <Controls />
      <MoveList />
      <GameOverModal />
    </div>
  );
}
