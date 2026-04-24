import type { CSSProperties } from "react";
import { Move, Piece as PieceT, Square, squareName } from "../engine/board";
import { useGame } from "../GameContext";
import { Piece } from "./Piece";

function isLegalTarget(legal: Move[], sq: Square): Move | undefined {
  return legal.find((m) => m.to.file === sq.file && m.to.rank === sq.rank);
}

interface Props {
  flipped?: boolean;
}

export function Board({ flipped = false }: Props) {
  const { state, selected, legalFromSelected, select, tryMove, result, store } = useGame();
  const theme = store.settings.theme;
  const pieceSet = store.settings.pieceSet;

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
  const moveIndex = state.history.length;

  return (
    <div className={`board board-theme-${theme} piece-set-${pieceSet}`}>
      {ranks.map((r) => (
        <div key={r} className="board-row">
          {files.map((f) => {
            const sq: Square = { file: f, rank: r };
            const piece: PieceT | null = state.board[r][f];
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

            // Slide animation: when this square is the destination of the last
            // move, render the piece translated from its origin and animate to
            // 0. Sign is flipped when the board is flipped.
            let slideStyle: CSSProperties | undefined;
            let slideKey: string | undefined;
            if (isLastTo && lastMove && piece) {
              const df = lastMove.from.file - lastMove.to.file;
              const dr = lastMove.to.rank - lastMove.from.rank;
              const sign = flipped ? -1 : 1;
              slideStyle = {
                // CSS vars consumed by .piece-sliding keyframes
                ["--slide-dx" as string]: `${sign * df * 100}%`,
                ["--slide-dy" as string]: `${sign * dr * 100}%`
              };
              slideKey = `slide-${moveIndex}`;
            }

            return (
              <button
                key={f}
                className={classes}
                aria-label={squareName(sq)}
                onClick={() => onSquareClick(sq)}
              >
                {piece && (
                  <span
                    key={slideKey}
                    className={slideKey ? "piece-wrap piece-sliding" : "piece-wrap"}
                    style={slideStyle}
                  >
                    <Piece color={piece.color} type={piece.type} set={pieceSet} />
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
