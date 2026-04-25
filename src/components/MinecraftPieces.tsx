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
  const plateFill = color === "w" ? "#f5e7c8" : "#1f2a38";
  const plateStroke = color === "w" ? "#c9a45a" : "#0d131c";
  const rim = color === "w" ? "#ffffff" : "#475569";

  return (
    <span className={`mc-piece mc-piece-${color}`}>
      <span
        className="mc-plate"
        style={{
          background: plateFill,
          borderColor: plateStroke,
          boxShadow: `inset 0 0 0 1px ${rim}33`
        }}
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
