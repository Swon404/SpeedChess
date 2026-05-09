import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Board } from "../components/Board";
import { Clock } from "../components/Clock";
import { Controls } from "../components/Controls";
import { GameOverModal } from "../components/GameOverModal";
import { LookPicker } from "../components/LookPicker";
import { MoveList } from "../components/MoveList";
import { useGame } from "../GameContext";

function slideDurationMs(speed: "normal" | "slow" | "very-slow", isMobile: boolean): number {
  if (isMobile) {
    if (speed === "very-slow") return 850;
    if (speed === "slow") return 550;
    return 350;
  }
  if (speed === "very-slow") return 650;
  if (speed === "slow") return 400;
  return 250;
}

export function GameScreen() {
  const { mode, state, store, paused, togglePause } = useGame();
  const shouldAutoFlip = mode.kind === "two-player" && store.settings.autoFlip;
  const targetFlipped = shouldAutoFlip && state.turn === "b";
  const [flipped, setFlipped] = useState(targetFlipped);
  const prevHistLenRef = useRef(state.history.length);

  useEffect(() => {
    const prevHistLen = prevHistLenRef.current;
    const historyAdvanced = state.history.length > prevHistLen;
    prevHistLenRef.current = state.history.length;

    if (!shouldAutoFlip) {
      setFlipped(false);
      return;
    }

    if (!historyAdvanced) {
      setFlipped(targetFlipped);
      return;
    }

    const lastMove = state.history[state.history.length - 1];
    const isForfeitMove = !!lastMove && lastMove.from.file < 0;

    if (isForfeitMove) {
      setFlipped(targetFlipped);
      return;
    }

    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches;
    const delayMs = slideDurationMs(store.settings.animationSpeed, isMobile) + 40;
    const id = window.setTimeout(() => setFlipped(targetFlipped), delayMs);
    return () => window.clearTimeout(id);
  }, [shouldAutoFlip, targetFlipped, state.history, state.history.length, store.settings.animationSpeed]);

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
