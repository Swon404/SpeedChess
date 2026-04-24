import type { ReactElement } from "react";
import type { Color, PieceType } from "../engine/board";

// Each icon is a pixel-art grid. Keys map to CSS colors.
// Grids are 12 cells wide for a consistent canvas.

type Palette = Record<string, string>;

const STEVE: string[] = [
  "............",
  "...hhhhhh...",
  "..hhhhhhhh..",
  "..hhhhhhhh..",
  "..ssssssss..",
  "..swwsswws..",
  "..sBwssBws..",
  "..ssssssss..",
  "..smmmmmms..",
  "..ssssssss..",
  "...ssssss...",
  "............"
];
const STEVE_PAL: Palette = {
  h: "#6a3f1a",
  s: "#f0b98a",
  w: "#ffffff",
  B: "#2e5bff",
  m: "#a85b3a"
};

const ALEX: string[] = [
  "............",
  "...oooooo...",
  "..oooooooo..",
  "..oossssoo..",
  "..ssssssss..",
  "..swwsswws..",
  "..sGwssGws..",
  "..ssssssss..",
  "..smmmmmms..",
  "..ssssssso..",
  "...ssssso...",
  "............"
];
const ALEX_PAL: Palette = {
  o: "#c75a0f",   // orange hair
  s: "#f0b98a",
  w: "#ffffff",
  G: "#2ea84b",   // green eyes
  m: "#a85b3a"
};

const CREEPER: string[] = [
  "............",
  ".gggggggggg.",
  ".gGgggggGgg.",
  ".ggggggggog.",
  ".ggbbggbbgg.",
  ".ggbbggbbgg.",
  ".gggggggggg.",
  ".ggggbbgggg.",
  ".gggbbbbggg.",
  ".ggbbgggbgg.",
  ".gggggggggg.",
  "............"
];
const CREEPER_PAL: Palette = {
  g: "#6bba4a",
  G: "#55a13a",
  o: "#4f8f33",
  b: "#1a1a1a"
};

const ENDERMAN: string[] = [
  "............",
  "...kkkkkk...",
  "..kkkkkkkk..",
  ".kkkkkkkkkk.",
  ".kppkkkkppk.",
  ".kppkkkkppk.",
  ".kkkkkkkkkk.",
  ".kkkkkkkkkk.",
  ".kkkkkkkkkk.",
  "..kkkkkkkk..",
  "...kkkkkk...",
  "............"
];
const ENDERMAN_PAL: Palette = {
  k: "#171421",
  p: "#c471ff"
};

const SKELETON: string[] = [
  "............",
  "...wwwwww...",
  "..wwwwwwww..",
  ".wwwwwwwwww.",
  ".wwkkwwkkww.",
  ".wwkkwwkkww.",
  ".wwwwwwwwww.",
  ".wwkkkkkkww.",
  ".wwwkkkkwww.",
  "..wwwwwwww..",
  "...wwwwww...",
  "............"
];
const SKELETON_PAL: Palette = {
  w: "#dddcd2",
  k: "#1a1a1a"
};

const ZOMBIE: string[] = [
  "............",
  "...gggggg...",
  "..gggggggg..",
  ".gggggggggg.",
  ".ggkkggkkgg.",
  ".ggkkggkkgg.",
  ".gggggggggg.",
  ".gggkkkkggg.",
  ".ggggkkgggg.",
  "..gggggggg..",
  "...gggggg...",
  "............"
];
const ZOMBIE_PAL: Palette = {
  g: "#4c8a4a",
  k: "#0d0d0d"
};

interface IconDef {
  grid: string[];
  palette: Palette;
  label: string;
}

const ICONS: Record<PieceType, IconDef> = {
  K: { grid: STEVE, palette: STEVE_PAL, label: "Steve" },
  Q: { grid: ALEX, palette: ALEX_PAL, label: "Alex" },
  R: { grid: CREEPER, palette: CREEPER_PAL, label: "Creeper" },
  B: { grid: ENDERMAN, palette: ENDERMAN_PAL, label: "Enderman" },
  N: { grid: SKELETON, palette: SKELETON_PAL, label: "Skeleton" },
  P: { grid: ZOMBIE, palette: ZOMBIE_PAL, label: "Zombie" }
};

function renderGrid(def: IconDef) {
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
  const rim = color === "w" ? "#ffffff" : "#334155";
  return (
    <svg
      className={`mc-piece mc-piece-${color}`}
      viewBox="0 0 12 12"
      role="img"
      aria-label={`${color === "w" ? "White" : "Black"} ${def.label}`}
      shapeRendering="crispEdges"
    >
      <circle cx={6} cy={6} r={5.8} fill={plateFill} stroke={plateStroke} strokeWidth={0.35} />
      <circle cx={6} cy={6} r={5.8} fill="none" stroke={rim} strokeWidth={0.15} opacity={0.7} />
      {renderGrid(def)}
    </svg>
  );
}
