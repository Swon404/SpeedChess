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
  const {
    state,
    selected,
    legalFromSelected,
    select,
    tryMove,
    result,
    store,
    mode,
    hint,
    lastMoveReplayNonce
  } = useGame();
  const theme = store.settings.theme;
  const pieceSet = store.settings.pieceSet;
  const animationSpeed = store.settings.animationSpeed;
  const [pending, setPending] = useState<PendingPromo | null>(null);

  const ranks = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const onSquareClick = (sq: Square) => {
    if (result.kind !== "ongoing") return;
    const target = isLegalTarget(legalFromSelected, sq);
    if (selected && target) {
      if (target.isPortalEntry) {
        // Deferred-warp teleport: destination is unique, no picker needed.
        tryMove(selected, sq, undefined, sq);
        return;
      }
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
  const wPortals = state.portals?.w ?? [];
  const bPortals = state.portals?.b ?? [];
  const isTeleportMove = !!lastMove?.isPortalEntry;
  const rotateBlackForFixedBoard =
    mode.kind === "two-player" &&
    !store.settings.autoFlip &&
    store.settings.rotateBlackPiecesFixedBoard;

  return (
    <>
      <div className={`board board-theme-${theme} piece-set-${pieceSet} anim-speed-${animationSpeed}`}>
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
              const isLastTeleport =
                lastMove && lastMove.portalTo && lastMove.portalTo.file === f && lastMove.portalTo.rank === r;
              const isChecked = checkedKing && checkedKing.file === f && checkedKing.rank === r;
              const isHintFrom = hint && hint.from.file === f && hint.from.rank === r;
              const isHintTo = hint && hint.to.file === f && hint.to.rank === r;
              const isPortalW = wPortals.some((p) => p.file === f && p.rank === r);
              const isPortalB = bPortals.some((p) => p.file === f && p.rank === r);
              const isTeleportTarget =
                !!legal && !!legal.isPortalEntry;
              const classes = [
                "square",
                isLight ? "light" : "dark",
                isSelected ? "selected" : "",
                legal && !isTeleportTarget ? (piece ? "legal-capture" : "legal-move") : "",
                isTeleportTarget ? "legal-teleport" : "",
                (isLastFrom || isLastTo || isLastTeleport) ? "last-move" : "",
                isChecked ? "in-check" : "",
                isHintFrom ? "hint-from" : "",
                isHintTo ? "hint-to" : ""
              ].filter(Boolean).join(" ");

              // Slide animation vars on the destination square of the last move.
              // For a portal teleport, slide from the from-square to the final
              // landing (portalTo). Otherwise slide to `to` as usual.
              let slideStyle: CSSProperties | undefined;
              let slideKey: string | undefined;
              const slideEnd = lastMove?.portalTo ?? lastMove?.to;
              const slideHere =
                slideEnd && slideEnd.file === f && slideEnd.rank === r && lastMove && piece;
              // Suppress the slide animation for teleport moves; we use a
              // dematerialise/rematerialise effect instead.
              if (slideHere && lastMove && slideEnd && !isTeleportMove) {
                const df = lastMove.from.file - slideEnd.file;
                const dr = slideEnd.rank - lastMove.from.rank;
                const sign = flipped ? -1 : 1;
                slideStyle = {
                  ["--slide-dx" as string]: `${sign * df * 100}%`,
                  ["--slide-dy" as string]: `${sign * dr * 100}%`
                };
                slideKey = `slide-${moveIndex}-${lastMoveReplayNonce}`;
              }
              const isRematerializeHere =
                isTeleportMove &&
                lastMove?.portalTo &&
                lastMove.portalTo.file === f &&
                lastMove.portalTo.rank === r &&
                piece;
              const isDematerializeHere =
                isTeleportMove &&
                lastMove &&
                lastMove.from.file === f &&
                lastMove.from.rank === r;

              return (
                <button
                  key={f}
                  className={classes}
                  aria-label={squareName(sq)}
                  onClick={() => onSquareClick(sq)}
                >
                  {(isPortalW || isPortalB) && (
                    <span
                      className={`portal ${isPortalW ? "portal-w" : "portal-b"}`}
                      aria-hidden="true"
                    />
                  )}
                  {piece && (
                    <span
                      key={isRematerializeHere ? `remat-${moveIndex}-${lastMoveReplayNonce}` : slideKey}
                      className={
                        isRematerializeHere
                          ? "piece-wrap piece-rematerialize"
                          : slideKey
                            ? "piece-wrap piece-sliding"
                            : "piece-wrap"
                      }
                      style={slideStyle}
                    >
                      <Piece
                        color={piece.color}
                        type={piece.type}
                        set={pieceSet}
                        rotate={rotateBlackForFixedBoard && piece.color === "b"}
                      />
                    </span>
                  )}
                  {isDematerializeHere && lastMove && (
                    <span
                      key={`demat-${moveIndex}-${lastMoveReplayNonce}`}
                      className="piece-wrap piece-dematerialize"
                      aria-hidden="true"
                    >
                      <Piece
                        color={lastMove.color}
                        type={lastMove.piece}
                        set={pieceSet}
                        rotate={rotateBlackForFixedBoard && lastMove.color === "b"}
                      />
                    </span>
                  )}
                  {isLastTo && lastMove?.captured && store.settings.explodeOnCapture && (
                    <span key={`boom-${moveIndex}-${lastMoveReplayNonce}`} className="boom" aria-hidden="true">
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
