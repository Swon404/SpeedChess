import type { ReactElement } from "react";
import type { Color, PieceType } from "../engine/board";

// Minecraft-styled pixel-art pieces inspired by the "Light Team Tokens"
// reference: blocky faces with shading, royals wear gold/iron crowns, and
// the rook is a cobblestone block. 14x14 grid gives room for detail while
// staying readable at small board sizes.
//
// Same artwork is rendered for both colors. The plate behind the face
// indicates the side: cream + gold rim for white, dark slate + steel rim
// for black.

type Palette = Record<string, string>;

interface IconDef {
  grid: string[];
  palette: Palette;
  label: string;
}

const STEVE_KING: IconDef = {
  label: "Steve King",
  grid: [
    "..............",
    "....yYyYyY....",   // gold crown spikes
    "...YyYyYyYy...",
    "...YjYjYjYj...",   // crown band w/ jewels
    "...HHHHHHHH...",   // hair line
    "..HHHHHHHHHH..",
    "..HssssssssH..",
    "..sswwBBwwss..",
    "..sswwBBwwss..",
    "..ssssssssss..",
    "..sbbsssbbbs..",
    "..ssbbbbbbss..",
    "...ssssssss...",
    ".............."
  ],
  palette: {
    y: "#ffd84a",
    Y: "#e6b91a",
    j: "#39c4ff",   // sapphire
    H: "#3a2410",
    s: "#f0b88a",
    w: "#ffffff",
    B: "#3a6df0",
    b: "#5a3a1a"
  }
};

const ALEX_QUEEN: IconDef = {
  label: "Alex Queen",
  grid: [
    "..............",
    "....yYyYyY....",
    "...YjYyYjYy...",
    "...YYYYYYYY...",
    "..ooooooooo...",
    ".oooooooooooo.",
    ".oosssssssooo.",
    ".oswwGGwwsoo..",
    ".oswwGGwwsoo..",
    ".oossssssooo..",
    ".ooosmmmmsoo..",
    ".oossssssoo...",
    "..oo......o...",
    ".............."
  ],
  palette: {
    y: "#ffd84a",
    Y: "#e6b91a",
    j: "#ff5fa3",   // pink jewel for queen
    o: "#d27535",
    s: "#f0b88a",
    w: "#ffffff",
    G: "#2da34a",
    m: "#c9655d"
  }
};

const ROOK_BLOCK: IconDef = {
  label: "Cobblestone",
  grid: [
    "..............",
    "..ssSsSssSss..",
    ".sSssSsssSSss.",
    ".SssSsSSsSsSs.",
    ".sSsdsSsSdSsS.",
    ".sSSsSsSdSsSs.",
    ".SsSsSsSsSsSs.",
    ".sSdsSdsSsSsS.",
    ".SsSsSsSsSsSs.",
    ".sSsSsdSsSsSs.",
    ".SsSsSsSsSsSs.",
    ".sSsSdSsSsSsS.",
    "..SsSsSsSsSs..",
    ".............."
  ],
  palette: {
    s: "#9aa0a8",   // light cobble
    S: "#6f7681",   // mid cobble
    d: "#3f444c"    // dark crevices
  }
};

const ENDERMAN: IconDef = {
  label: "Enderman",
  grid: [
    "..............",
    "..kkkkkkkkkk..",
    ".kkkkkkkkkkkk.",
    ".kkkkkkkkkkkk.",
    ".kkkkkkkkkkkk.",
    ".kPPPPkkPPPPk.",
    ".kPpPPkkPPpPk.",
    ".kPPPPkkPPPPk.",
    ".kkkkkkkkkkkk.",
    ".kkkkkkkkkkkk.",
    ".kkkkkkkkkkkk.",
    ".kkkkkkkkkkkk.",
    "..kkkkkkkkkk..",
    ".............."
  ],
  palette: {
    k: "#0e0a18",
    P: "#d57bff",
    p: "#ffe6ff"   // glow highlight
  }
};

const SKELETON: IconDef = {
  label: "Skeleton",
  grid: [
    "..............",
    "...wwwwwwww...",
    "..wwwwwwwwww..",
    ".wwwwwwwwwwww.",
    ".wwwwwwwwwwww.",
    ".wwkkkwwkkkww.",
    ".wwkkkwwkkkww.",
    ".wwwwwwwwwwww.",
    ".wwwkwkwkwwww.",
    ".wwwkwkwkwwww.",
    ".wwwwwwwwwwww.",
    "..wwwwwwwwww..",
    "...wwwwwwww...",
    ".............."
  ],
  palette: {
    w: "#dedccf",
    k: "#101010"
  }
};

const ZOMBIE: IconDef = {
  label: "Zombie",
  grid: [
    "..............",
    "...gggggggg...",
    "..ggggggggGG..",
    ".gggGggggGgGg.",
    ".ggGGggggGggg.",
    ".ggkkggggkkgg.",
    ".ggkkggggkkgg.",
    ".gggggggggggG.",
    ".gggGGggGGggg.",
    ".ggGgkkkkgGgg.",
    ".gggggggggggg.",
    "..ggggggggGg..",
    "...gggggggg...",
    ".............."
  ],
  palette: {
    g: "#4c8a4a",
    G: "#37663a",
    k: "#0a0a0a"
  }
};

const ICONS: Record<PieceType, IconDef> = {
  K: STEVE_KING,
  Q: ALEX_QUEEN,
  R: ROOK_BLOCK,
  B: ENDERMAN,
  N: SKELETON,
  P: ZOMBIE
};

function renderGrid(def: IconDef): ReactElement[] {
  const rects: ReactElement[] = [];
  for (let y = 0; y < def.grid.length; y++) {
    const row = def.grid[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === "." || ch === " ") continue;
      const color = def.palette[ch];
      if (!color) continue;
      rects.push(
        <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={color} />
      );
    }
  }
  return rects;
}

interface Props {
  color: Color;
  type: PieceType;
}

export function MinecraftPiece({ color, type }: Props) {
  const def = ICONS[type];
  const plateFill = color === "w" ? "#f5e7c8" : "#1f2a38";
  const plateStroke = color === "w" ? "#c9a45a" : "#0d131c";
  const rim = color === "w" ? "#ffffff" : "#475569";
  return (
    <svg
      className={`mc-piece mc-piece-${color}`}
      viewBox="0 0 14 14"
      role="img"
      aria-label={`${color === "w" ? "White" : "Black"} ${def.label}`}
      shapeRendering="crispEdges"
    >
      <circle cx={7} cy={7} r={6.85} fill={plateFill} stroke={plateStroke} strokeWidth={0.4} />
      <circle cx={7} cy={7} r={6.85} fill="none" stroke={rim} strokeWidth={0.2} opacity={0.7} />
      {renderGrid(def)}
    </svg>
  );
}
