import type { Color, PieceType } from "../engine/board";
import type { PieceSet } from "../engine/storage";
import { PieceSVG } from "./PieceSVG";

const GLYPH: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟"
};

interface Props {
  color: Color;
  type: PieceType;
  set: PieceSet;
}

export function Piece({ color, type, set }: Props) {
  if (set === "classic") {
    return (
      <span className={`piece-glyph piece-${color}`}>
        {GLYPH[color + type]}
      </span>
    );
  }
  // modern + neon both use SVG; neon gets a filter via CSS on the parent.
  return (
    <span className={`piece-svg piece-${color}`}>
      <PieceSVG color={color} type={type} />
    </span>
  );
}
