import { useState } from "react";
import type { Color, PieceType } from "../engine/board";

// Loads /<base>/pieces/minecraft/<side><TYPE>.png  (e.g. wK.png, bQ.png).
// The source art provides distinct light/dark team plates per side, so we
// load a different PNG per color rather than tinting a shared image.

const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";

interface Props {
  color: Color;
  type: PieceType;
}

const FALLBACK: Record<PieceType, string> = {
  K: "👑", Q: "♕", R: "🟫", B: "🧙", N: "🐺", P: "🟩"
};

export function MinecraftPiece({ color, type }: Props) {
  const [errored, setErrored] = useState(false);
  const src = `${BASE}pieces/minecraft/${color}${type}.png`;

  return (
    <span className={`mc-piece mc-piece-${color}`}>
      {errored ? (
        <span className="mc-fallback" aria-hidden="true">{FALLBACK[type]}</span>
      ) : (
        <img
          className="mc-img"
          src={src}
          alt={`${color === "w" ? "White" : "Black"} ${type}`}
          draggable={false}
          onError={() => setErrored(true)}
        />
      )}
    </span>
  );
}
