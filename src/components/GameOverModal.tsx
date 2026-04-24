import { useNavigate } from "react-router-dom";
import { useGame } from "../GameContext";

export function GameOverModal() {
  const { result, mode, players, newGame } = useGame();
  const nav = useNavigate();
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

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal game-over">
        <div className="game-over-emoji">{emoji}</div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
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
          <button onClick={() => nav("/")}>
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
