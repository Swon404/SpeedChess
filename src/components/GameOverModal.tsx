import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../GameContext";

export function GameOverModal() {
  const { result, mode, players, newGame, state, gamePerformance } = useGame();
  const nav = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Re-show modal whenever a new game starts or the outcome changes.
  useEffect(() => {
    setDismissed(false);
  }, [result.kind, state.history.length === 0]);

  if (result.kind === "ongoing") return null;

  let title = "";
  let subtitle = "";
  let emoji = "";

  if (result.kind === "checkmate") {
    const winnerName = result.winner === "w" ? players.w : players.b;
    const loserName = result.winner === "w" ? players.b : players.w;
    title = `Checkmate!`;
    subtitle = `${winnerName} wins against ${loserName}.`;
    emoji = "🏆";
  } else if (result.kind === "stalemate") {
    title = "Stalemate";
    subtitle = "No legal moves — it's a draw.";
    emoji = "🤝";
  } else if (result.kind === "fifty-move") {
    title = "Draw";
    subtitle = "50 moves without a capture or pawn move.";
    emoji = "🤝";
  } else if (result.kind === "threefold") {
    title = "Draw";
    subtitle = "Same position reached three times.";
    emoji = "🤝";
  } else if (result.kind === "insufficient") {
    title = "Draw";
    subtitle = "Not enough pieces left to checkmate.";
    emoji = "🤝";
  }

  const performanceCards = [gamePerformance.w, gamePerformance.b].filter((entry) => !!entry);

  return (
    <>
      {dismissed ? (
        <button className="review-reopen" onClick={() => setDismissed(false)}>
          {emoji} Show result
        </button>
      ) : (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal game-over">
            <button
              className="modal-close"
              aria-label="Close and review board"
              onClick={() => setDismissed(true)}
            >✕</button>
            <div className="game-over-emoji">{emoji}</div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
            {performanceCards.length > 0 && (
              <div className="game-performance-list">
                {performanceCards.map((entry) => (
                  <div key={entry.color} className="game-performance-card">
                    <div className="game-performance-head">
                      <strong>{entry.playerName}</strong>
                      <span className="game-performance-stars" aria-label={`${entry.stars} stars`}>
                        {"★".repeat(entry.stars)}{"☆".repeat(5 - entry.stars)}
                      </span>
                    </div>
                    <div className="game-performance-title">{entry.title} · {entry.score}/100</div>
                    <div className="game-performance-summary">{entry.summary}</div>
                    <div className="game-performance-meta">
                      <span>+{entry.addedStars} stars</span>
                      <span>{entry.totalStars === null ? "Untracked total" : `${entry.totalStars} total stars`}</span>
                      <span>{entry.mode === "bot" ? "Vs bot" : "Local play"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="game-over-actions">
              <button className="primary" onClick={() => newGame(mode, players)}>
                Rematch
              </button>
              <button onClick={() => newGame(
                mode.kind === "bot" ? { kind: "bot", level: mode.level } : { kind: "two-player" },
                { w: players.b, b: players.w }
              )}>
                Swap sides
              </button>
              <button onClick={() => setDismissed(true)}>
                Review board
              </button>
              <button onClick={() => nav("/")}>
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
