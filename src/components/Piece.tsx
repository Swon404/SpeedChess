import type { Color, PieceType } from "../engine/board";
import type { PieceSet } from "../engine/storage";
import { PieceSVG } from "./PieceSVG";
import { MinecraftPiece } from "./MinecraftPieces";

const GLYPH: Record<string, string> = {
  wK: "\u2654", wQ: "\u2655", wR: "\u2656", wB: "\u2657", wN: "\u2658", wP: "\u2659",
  bK: "\u265A", bQ: "\u265B", bR: "\u265C", bB: "\u265D", bN: "\u265E", bP: "\u265F"
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
  if (set === "emoji") {
    return (
      <span className={`piece-mc piece-${color}`}>
        <MinecraftPiece color={color} type={type} />
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
