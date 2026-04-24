import { CSSProperties, useState } from "react";
import { Move, Piece as PieceT, Square, squareName } from "../engine/board";
import { findKing, inCheck } from "../engine/rules";
import { useGame } from "../GameContext";
import { Piece } from "./Piece";

function isLegalTarget(legal: Move[], sq: Square): Move | undefined {
  return legal.find((m) => m.to.file === sq.file && m.to.rank === sq.rank);
}

interface Props {
  flipped?: boolean;
}

interface PendingPromo {
  from: Square;
  to: Square;
  color: "w" | "b";
}

export function Board({ flipped = false }: Props) {
  const { state, selected, legalFromSelected, select, tryMove, result, store, hint } = useGame();
  const theme = store.settings.theme;
  const pieceSet = store.settings.pieceSet;
  const [pending, setPending] = useState<PendingPromo | null>(null);

  const ranks = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const onSquareClick = (sq: Square) => {
    if (result.kind !== "ongoing") return;
    const target = isLegalTarget(legalFromSelected, sq);
    if (selected && target) {
      if (target.promotion) {
        setPending({ from: selected, to: sq, color: state.turn });
        return;
      }
      tryMove(selected, sq);
      return;
    }
    const piece = state.board[sq.rank][sq.file];
    if (piece && piece.color === state.turn) select(sq);
    else select(null);
  };

  const lastMove = state.history[state.history.length - 1];
  const moveIndex = state.history.length;
  const checkedKing = result.kind === "ongoing" && inCheck(state, state.turn)
    ? findKing(state, state.turn)
    : null;

  return (
    <>
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
              const isChecked = checkedKing && checkedKing.file === f && checkedKing.rank === r;
              const isHintFrom = hint && hint.from.file === f && hint.from.rank === r;
              const isHintTo = hint && hint.to.file === f && hint.to.rank === r;
              const classes = [
                "square",
                isLight ? "light" : "dark",
                isSelected ? "selected" : "",
                legal ? (piece ? "legal-capture" : "legal-move") : "",
                isLastFrom || isLastTo ? "last-move" : "",
                isChecked ? "in-check" : "",
                isHintFrom ? "hint-from" : "",
                isHintTo ? "hint-to" : ""
              ].filter(Boolean).join(" ");

              // Slide animation vars on the destination square of the last move.
              let slideStyle: CSSProperties | undefined;
              let slideKey: string | undefined;
              if (isLastTo && lastMove && piece) {
                const df = lastMove.from.file - lastMove.to.file;
                const dr = lastMove.to.rank - lastMove.from.rank;
                const sign = flipped ? -1 : 1;
                slideStyle = {
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
                  {isLastTo && lastMove?.captured && store.settings.explodeOnCapture && (
                    <span key={`boom-${moveIndex}`} className="boom" aria-hidden="true">
                      <span className="boom-core">💥</span>
                      <span className="boom-bit b1">✨</span>
                      <span className="boom-bit b2">⭐</span>
                      <span className="boom-bit b3">💫</span>
                      <span className="boom-bit b4">🔥</span>
                      <span className="boom-bit b5">✨</span>
                      <span className="boom-bit b6">⭐</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {pending && (
        <div className="modal-overlay" onClick={() => setPending(null)}>
          <div className={`modal promo-picker piece-set-${pieceSet}`} onClick={(e) => e.stopPropagation()}>
            <h3>Promote pawn to</h3>
            <div className="promo-buttons">
              {(["Q", "R", "B", "N"] as const).map((p) => (
                <button key={p} className="promo-button" onClick={() => {
                  tryMove(pending.from, pending.to, p);
                  setPending(null);
                }}>
                  <Piece color={pending.color} type={p} set={pieceSet} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
