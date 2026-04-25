import { useState } from "react";
import type { Color, PieceType } from "../engine/board";

// Loads /<base>/pieces/minecraft/<TYPE>.png (e.g. K.png, Q.png, ...)
// Drop your own PNGs into public/pieces/minecraft/.
// The same image is used for both sides; the colored plate behind it
// indicates the side (cream for white, dark slate for black).

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
  const src = `${BASE}pieces/minecraft/${type}.png`;
  // Side hint: a soft outer ring colored per team. The PNG itself already
  // carries a Minecraft-style plate, so we don't overlay our own circle.
  const ringColor = color === "w" ? "rgba(245, 231, 200, 0.85)" : "rgba(31, 42, 56, 0.9)";
  const ringShadow = color === "w"
    ? "0 0 0 2px rgba(201, 164, 90, 0.85), 0 2px 4px rgba(0,0,0,0.45)"
    : "0 0 0 2px rgba(13, 19, 28, 0.9), 0 2px 4px rgba(0,0,0,0.55)";

  return (
    <span className={`mc-piece mc-piece-${color}`}>
      <span
        className="mc-ring"
        style={{ background: ringColor, boxShadow: ringShadow }}
      />
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
