import type { ReactElement } from "react";
import type { Color, PieceType } from "../engine/board";

// Pixel-art faces of Minecraft characters. 12x12 grid, '.' = transparent.
// Same artwork is shown for both colors; the colored plate behind the face
// indicates the side.

type Palette = Record<string, string>;

interface IconDef {
  grid: string[];
  palette: Palette;
  label: string;
}

const STEVE: IconDef = {
  label: "Steve",
  grid: [
    "............",
    ".HHHHHHHHHH.",
    ".HHHHHHHHHH.",
    ".HssssssssH.",
    ".sswwBBwwss.",
    ".sswwBBwwss.",
    ".ssssssssss.",
    ".sbbbbbbbbs.",
    ".sbbsssbbbs.",
    ".ssbbbbbbss.",
    ".sssssssss..",
    "............"
  ],
  palette: {
    H: "#3a2410",   // dark brown hair
    s: "#f0b88a",   // skin
    w: "#ffffff",   // eye white
    B: "#3a6df0",   // blue iris
    b: "#5a3a1a"    // beard / mustache
  }
};

const ALEX: IconDef = {
  label: "Alex",
  grid: [
    "............",
    "..oooooooo..",
    ".oooooooooo.",
    ".oosssssooo.",
    ".oswwGGwwso.",
    ".oswwGGwwso.",
    ".ossssssss..",
    ".ossssssso..",
    ".ossmmmmsoo.",
    ".oossssoooo.",
    ".oo......oo.",
    "............"
  ],
  palette: {
    o: "#d27535",   // long orange hair
    s: "#f0b88a",
    w: "#ffffff",
    G: "#2da34a",   // green iris
    m: "#c9655d"    // lips
  }
};

const CREEPER: IconDef = {
  label: "Creeper",
  grid: [
    "............",
    ".gGGgggggGg.",
    ".gggggggggg.",
    ".gGggggggGg.",
    ".kkggggggkk.",
    ".kkggggggkk.",
    ".gggggggggg.",
    ".gggkkkkggg.",
    ".gggkkkkggg.",
    ".ggkkggkkgg.",
    ".ggkkggkkgg.",
    "............"
  ],
  palette: {
    g: "#6bba4a",   // light creeper green
    G: "#4f8f33",   // darker green pixels (texture)
    k: "#1a1a1a"    // black eyes/mouth
  }
};

const ENDERMAN: IconDef = {
  label: "Enderman",
  grid: [
    "............",
    ".kkkkkkkkkk.",
    ".kkkkkkkkkk.",
    ".kkkkkkkkkk.",
    ".kPPPkkPPPk.",
    ".kPPPkkPPPk.",
    ".kkkkkkkkkk.",
    ".kkkkkkkkkk.",
    ".kkkkkkkkkk.",
    ".kkkkkkkkkk.",
    ".kkkkkkkkkk.",
    "............"
  ],
  palette: {
    k: "#0e0a18",   // near-black
    P: "#d57bff"    // purple glow eyes
  }
};

const SKELETON: IconDef = {
  label: "Skeleton",
  grid: [
    "............",
    "..wwwwwwww..",
    ".wwwwwwwwww.",
    ".wwwwwwwwww.",
    ".wwkkwwkkww.",
    ".wwkkwwkkww.",
    ".wwwwwwwwww.",
    ".wwkwkwkwww.",
    ".wwwwwwwwww.",
    ".wwwwwwwwww.",
    "..wwwwwwww..",
    "............"
  ],
  palette: {
    w: "#dedccf",   // bone white
    k: "#101010"    // sockets / teeth gaps
  }
};

const ZOMBIE: IconDef = {
  label: "Zombie",
  grid: [
    "............",
    "..gggggggg..",
    ".gggggggggg.",
    ".gGGgggggGg.",
    ".ggkkggkkgg.",
    ".ggkkggkkgg.",
    ".gggggggggg.",
    ".gggGGGGggg.",
    ".ggGgkkgGgg.",
    ".gggggggggg.",
    "..gggggggg..",
    "............"
  ],
  palette: {
    g: "#4c8a4a",   // zombie green
    G: "#37663a",   // shading / scars
    k: "#0a0a0a"    // eyes / mouth
  }
};

const ICONS: Record<PieceType, IconDef> = {
  K: STEVE,
  Q: ALEX,
  R: CREEPER,
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
      viewBox="0 0 12 12"
      role="img"
      aria-label={`${color === "w" ? "White" : "Black"} ${def.label}`}
      shapeRendering="crispEdges"
    >
      <circle cx={6} cy={6} r={5.85} fill={plateFill} stroke={plateStroke} strokeWidth={0.35} />
      <circle cx={6} cy={6} r={5.85} fill="none" stroke={rim} strokeWidth={0.18} opacity={0.7} />
      {renderGrid(def)}
    </svg>
  );
}
