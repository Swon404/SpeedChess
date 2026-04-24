import type { Color, PieceType } from "../engine/board";
import type { PieceSet } from "../engine/storage";
import { PieceSVG } from "./PieceSVG";

const GLYPH: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟"
};

const EMOJI: Record<string, string> = {
  // Minecraft: heroes (white)
  wK: "👦",    // Steve
  wQ: "👧",    // Alex
  wR: "🗿",    // Iron Golem (moai stand-in)
  wB: "🧙",    // Villager / Wizard
  wN: "🐺",    // Wolf
  wP: "🐔",    // Chicken
  // Minecraft: mobs (black)
  bK: "🐉",    // Ender Dragon
  bQ: "�\u200d♀️",  // Witch
  bR: "🧨",    // Creeper -> TNT
  bB: "👻",    // Enderman -> Ghost
  bN: "💀",    // Skeleton
  bP: "🧟"     // Zombie
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
      <span className={`piece-emoji piece-${color}`}>
        {EMOJI[color + type]}
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
