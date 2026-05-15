import type { AnimalId, Color, CustomPieceDef, PieceType } from "../engine/board";
import type { PieceSet } from "../engine/storage";
import { PieceSVG } from "./PieceSVG";

const GLYPH: Record<string, string> = {
  wK: "\u2654", wQ: "\u2655", wR: "\u2656", wB: "\u2657", wN: "\u2658", wP: "\u2659",
  bK: "\u265A", bQ: "\u265B", bR: "\u265C", bB: "\u265D", bN: "\u265E", bP: "\u265F"
};

const ANIMAL_EMOJI: Record<string, string> = {
  camel: "🐪", cat: "🐱", trex: "🦖", dog: "🐶",
  dragon: "🐉", lion: "🦁", eagle: "🦅", wolf: "🐺",
  frog: "🐸", unicorn: "🦄"
};

function GDYellowIcon() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
      <rect width="40" height="40" fill="#E8A000" rx="3"/>
      <rect x="2" y="2" width="22" height="22" fill="#FFCC00" opacity="0.45"/>
      <rect x="5" y="10" width="11" height="9" fill="#111"/>
      <rect x="6" y="11" width="9" height="7" fill="#00D8E8"/>
      <rect x="24" y="10" width="11" height="9" fill="#111"/>
      <rect x="25" y="11" width="9" height="7" fill="#00D8E8"/>
      <rect x="5" y="24" width="30" height="9" fill="#111"/>
      <rect x="6" y="25" width="28" height="7" fill="#00D8E8"/>
    </svg>
  );
}

function GDRedIcon() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
      <rect width="40" height="40" fill="#CC1111" rx="3"/>
      <rect x="1" y="1" width="38" height="38" fill="none" stroke="#111" strokeWidth="2"/>
      <circle cx="13" cy="14" r="7" fill="#111"/>
      <circle cx="13" cy="14" r="5" fill="#FFE800"/>
      <circle cx="27" cy="14" r="7" fill="#111"/>
      <circle cx="27" cy="14" r="5" fill="#FFE800"/>
      <rect x="2" y="23" width="36" height="5" fill="#111"/>
      <rect x="3" y="24" width="7" height="3" fill="#FFE800"/>
      <rect x="12" y="24" width="6" height="3" fill="#FFE800"/>
      <rect x="22" y="24" width="6" height="3" fill="#FFE800"/>
      <rect x="30" y="24" width="7" height="3" fill="#FFE800"/>
      <rect x="2" y="28" width="11" height="10" fill="#111" rx="1"/>
      <rect x="3" y="29" width="9" height="8" fill="#CC1111"/>
      <rect x="27" y="28" width="11" height="10" fill="#111" rx="1"/>
      <rect x="28" y="29" width="9" height="8" fill="#CC1111"/>
    </svg>
  );
}

function CreeperIcon() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
      <rect width="40" height="40" fill="#55BB44"/>
      <rect x="6" y="8" width="9" height="10" fill="#111"/>
      <rect x="25" y="8" width="9" height="10" fill="#111"/>
      <rect x="15" y="18" width="10" height="7" fill="#111"/>
      <rect x="9" y="25" width="6" height="10" fill="#111"/>
      <rect x="25" y="25" width="6" height="10" fill="#111"/>
      <rect x="15" y="28" width="10" height="7" fill="#111"/>
    </svg>
  );
}

function CustomPieceIcon({ animal }: { animal?: AnimalId }) {
  if (animal === "gd-yellow") return <GDYellowIcon />;
  if (animal === "gd-red") return <GDRedIcon />;
  if (animal === "creeper") return <CreeperIcon />;
  return <span style={{ fontSize: "0.9em", lineHeight: 1 }}>{ANIMAL_EMOJI[animal ?? ""] ?? "?"}</span>;
}

interface Props {
  color: Color;
  type: PieceType;
  set: PieceSet;
  rotate?: boolean;
  customPieceDef?: CustomPieceDef;
}

export function Piece({ color, type, set, rotate = false, customPieceDef }: Props) {
  const faceClass = rotate ? "piece-face-180" : "";
  if (type === "X1") {
    return (
      <span className={`piece-custom piece-${color} ${faceClass}`}>
        <CustomPieceIcon animal={customPieceDef?.animal} />
      </span>
    );
  }
  if (set === "classic") {
    return (
      <span className={`piece-glyph piece-${color} ${faceClass}`}>
        {GLYPH[color + type]}
      </span>
    );
  }
  // modern + neon both use SVG; neon gets a filter via CSS on the parent.
  return (
    <span className={`piece-svg piece-${color} ${faceClass}`}>
      <PieceSVG color={color} type={type} />
    </span>
  );
}
