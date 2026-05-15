import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Board } from "../components/Board";
import { Clock } from "../components/Clock";
import { Controls } from "../components/Controls";
import { GameOverModal } from "../components/GameOverModal";
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
  const { mode, state, store, activeCustomGame, paused, togglePause, moveFeedback } = useGame();
  const shouldAutoFlip = mode.kind === "two-player" && store.settings.autoFlip;
  const targetFlipped = shouldAutoFlip && state.turn === "b";
  const [flipped, setFlipped] = useState(targetFlipped);
  const prevHistLenRef = useRef(state.history.length);
  const hasCustomPieces = Boolean(
    state.customPiece || (state.customPieces && Object.keys(state.customPieces).length > 0)
  );
  const coachLabel =
    mode.kind === "portal"
      ? "Portal coach"
      : mode.kind === "custom" || hasCustomPieces
        ? "Custom coach"
        : "Stockfish coach";
  const statusDetail = moveFeedback
    ? `${moveFeedback.playerName}: ${moveFeedback.label} · ${moveFeedback.score}/100`
    : mode.kind === "portal"
      ? "Portal Chess uses the in-house coach for move feedback."
      : mode.kind === "custom" || hasCustomPieces
        ? "Custom games use the in-house coach for move feedback."
      : "Normal chess uses Stockfish to score moves and help you learn.";

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
        <Link to="/new" state={activeCustomGame ? { customGame: activeCustomGame } : undefined}>New game</Link>
        <Link to="/settings">⚙ Settings</Link>
      </div>
      <Clock />
      <div className="game-status-line" role="status" aria-live="polite">
        <strong>{coachLabel}</strong>
        <span>{statusDetail}</span>
      </div>
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
