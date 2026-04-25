/**
 * Crop the 6 Minecraft piece tokens out of a reference image and save them
 * as K/Q/R/B/N/P.png in public/pieces/minecraft/.
 *
 * Usage:
 *   1. Save your reference image at:  data/minecraft-reference.png
 *      (or pass a different path: `npm run crop-pieces -- path/to/image.png`)
 *   2. The reference is assumed to be an 8-column grid of square tokens.
 *      Adjust COORDS below if your image has a different layout.
 *   3. Run:  npm run crop-pieces
 *
 * Picks tokens from the dark-team rows of the supplied "Light Team Tokens"
 * style sheet because those rows show one of every piece in order.
 */

import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

interface Pick {
  type: "K" | "Q" | "R" | "B" | "N" | "P";
  /** "w" = white/light team, "b" = black/dark team. */
  side: "w" | "b";
  /** 0-based column on an 8-col grid. */
  col: number;
  /** 0-based row on the source. */
  row: number;
  /** Optional fine-tune in pixels (positive = right / down). */
  dx?: number;
  dy?: number;
}

// Reference layout (1024x1017, 8x8 grid with a tiny title strip):
//   Rows 0-1: light team tokens (back rank, then mixed)
//   Rows 4, 6: dark team back rank + zombies
// White pieces come from rows 0/1, black pieces from rows 4/6.
const PICKS: Pick[] = [
  // White (light team) - row 0 back rank
  { type: "K", side: "w", col: 3, row: 0 },
  { type: "Q", side: "w", col: 4, row: 0 },
  { type: "R", side: "w", col: 0, row: 0, dx: 6 },
  { type: "B", side: "w", col: 5, row: 0 }, // Enderman in row 0
  { type: "N", side: "w", col: 1, row: 0 },
  { type: "P", side: "w", col: 0, row: 1 }, // Zombie in row 1
  // Black (dark team)
  { type: "K", side: "b", col: 3, row: 4 },
  { type: "Q", side: "b", col: 4, row: 4 },
  { type: "R", side: "b", col: 0, row: 4, dx: 6 },
  { type: "B", side: "b", col: 2, row: 4 },
  { type: "N", side: "b", col: 1, row: 4 },
  { type: "P", side: "b", col: 0, row: 6 }
];

async function main() {
  const inputArg = process.argv[2] ?? "data/minecraft-reference.png";
  const inputPath = resolve(inputArg);
  if (!existsSync(inputPath)) {
    console.error(`\u274c Source image not found: ${inputPath}`);
    console.error("   Save your reference image to data/minecraft-reference.png");
    console.error("   then re-run: npm run crop-pieces");
    process.exit(1);
  }

  const outDir = resolve("public/pieces/minecraft");
  mkdirSync(outDir, { recursive: true });

  const meta = await sharp(inputPath).metadata();
  if (!meta.width || !meta.height) {
    console.error("\u274c Could not read image dimensions.");
    process.exit(1);
  }

  // Auto-detect grid: assume 8 columns. The reference image has a small
  // "LIGHT TEAM TOKENS" title strip at the top which shifts plate rows
  // downward, so account for that and recompute cell height from the
  // remaining vertical space.
  const cols = 8;
  const rows = 8;
  // Title strip: small "LIGHT TEAM TOKENS" header at the very top of the
  // reference (~10px on a 1017px-tall image). Tuning this nudges all rows
  // down by that many pixels.
  const titleY = Math.round(meta.height * 0.01);
  const cellW = Math.floor(meta.width / cols);
  const cellH = Math.floor((meta.height - titleY) / rows);

  console.log(`Source: ${inputPath}`);
  console.log(`Size:   ${meta.width}\u00d7${meta.height}`);
  console.log(`Title:  ${titleY}px`);
  console.log(`Grid:   ${cols} cols \u00d7 ${rows} rows  (cell ${cellW}\u00d7${cellH})`);

  for (const pick of PICKS) {
    // Inset slightly to avoid bleed from neighbouring cells.
    const inset = Math.max(2, Math.floor(Math.min(cellW, cellH) * 0.04));
    const left = pick.col * cellW + inset + (pick.dx ?? 0);
    const top = titleY + pick.row * cellH + inset + (pick.dy ?? 0);
    const w = cellW - inset * 2;
    const h = cellH - inset * 2;
    const out = resolve(outDir, `${pick.side}${pick.type}.png`);
    await sharp(inputPath)
      .extract({ left, top, width: w, height: h })
      .resize(256, 256, { kernel: "nearest" })
      .png()
      .toFile(out);
    console.log(`  \u2713 ${pick.side}${pick.type}  (col ${pick.col}, row ${pick.row}) \u2192 ${out}`);
  }

  console.log("\nDone! Refresh the browser \u2014 the Minecraft piece set will use these PNGs.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
