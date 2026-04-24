import { Move, Piece, Square, squareName } from "../engine/board";
import { useGame } from "../GameContext";

const GLYPH: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟"
};

function isLegalTarget(legal: Move[], sq: Square): Move | undefined {
  return legal.find((m) => m.to.file === sq.file && m.to.rank === sq.rank);
}

interface Props {
  flipped?: boolean;
}

export function Board({ flipped = false }: Props) {
  const { state, selected, legalFromSelected, select, tryMove, result } = useGame();

  const ranks = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const onSquareClick = (sq: Square) => {
    if (result.kind !== "ongoing") return;
    const target = isLegalTarget(legalFromSelected, sq);
    if (selected && target) {
      let promo: "Q" | "R" | "B" | "N" | undefined;
      if (target.promotion) {
        const ans = window.prompt("Promote to (Q/R/B/N)?", "Q");
        const up = (ans ?? "Q").toUpperCase();
        promo = (["Q", "R", "B", "N"].includes(up) ? up : "Q") as "Q" | "R" | "B" | "N";
      }
      tryMove(selected, sq, promo);
      return;
    }
    const piece = state.board[sq.rank][sq.file];
    if (piece && piece.color === state.turn) select(sq);
    else select(null);
  };

  const lastMove = state.history[state.history.length - 1];

  return (
    <div className="board">
      {ranks.map((r) => (
        <div key={r} className="board-row">
          {files.map((f) => {
            const sq: Square = { file: f, rank: r };
            const piece: Piece | null = state.board[r][f];
            const isLight = (r + f) % 2 === 1;
            const isSelected = selected && selected.file === f && selected.rank === r;
            const legal = isLegalTarget(legalFromSelected, sq);
            const isLastFrom = lastMove && lastMove.from.file === f && lastMove.from.rank === r && f >= 0;
            const isLastTo = lastMove && lastMove.to.file === f && lastMove.to.rank === r && f >= 0;
            const classes = [
              "square",
              isLight ? "light" : "dark",
              isSelected ? "selected" : "",
              legal ? (piece ? "legal-capture" : "legal-move") : "",
              isLastFrom || isLastTo ? "last-move" : ""
            ].filter(Boolean).join(" ");
            return (
              <button
                key={f}
                className={classes}
                aria-label={squareName(sq)}
                onClick={() => onSquareClick(sq)}
              >
                {piece && (
                  <span className={`piece piece-${piece.color}`}>
                    {GLYPH[piece.color + piece.type]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
