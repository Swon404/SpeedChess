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
  /** 0-based column on an 8-col grid. */
  col: number;
  /** 0-based row on the source. */
  row: number;
}

// Reference image: 8x8 grid. Reading the dark-team rows (bottom half):
//   Row 4 (zero-based): Iron Golem, Skeleton, Enderman, King, Queen, Enderman, Skeleton, Zombie(?)
//   Row 7 (last row):   IronGolem, Skeleton, Enderman, Steve(K), Alex(Q), Enderman, Skeleton, Iron-Golem
// We pick a clean exemplar of each piece type from across the board.
const PICKS: Pick[] = [
  { type: "K", col: 3, row: 7 }, // Steve with crown
  { type: "Q", col: 4, row: 7 }, // Alex with crown
  { type: "R", col: 0, row: 4 }, // Iron Golem head (rook)
  { type: "B", col: 2, row: 4 }, // Enderman
  { type: "N", col: 1, row: 4 }, // Skeleton
  { type: "P", col: 0, row: 6 }  // Zombie row
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

  // Auto-detect grid: assume 8 columns. Rows = round(height / cellSize).
  const cols = 8;
  const cellW = Math.floor(meta.width / cols);
  const rows = Math.round(meta.height / cellW);
  const cellH = Math.floor(meta.height / rows);

  console.log(`Source: ${inputPath}`);
  console.log(`Size:   ${meta.width}\u00d7${meta.height}`);
  console.log(`Grid:   ${cols} cols \u00d7 ${rows} rows  (cell ${cellW}\u00d7${cellH})`);

  for (const pick of PICKS) {
    // Inset slightly to avoid bleed from neighbouring cells.
    const inset = Math.max(2, Math.floor(Math.min(cellW, cellH) * 0.04));
    const left = pick.col * cellW + inset;
    const top = pick.row * cellH + inset;
    const w = cellW - inset * 2;
    const h = cellH - inset * 2;
    const out = resolve(outDir, `${pick.type}.png`);
    await sharp(inputPath)
      .extract({ left, top, width: w, height: h })
      .resize(256, 256, { kernel: "nearest" })
      .png()
      .toFile(out);
    console.log(`  \u2713 ${pick.type}  (col ${pick.col}, row ${pick.row}) \u2192 ${out}`);
  }

  console.log("\nDone! Refresh the browser \u2014 the Minecraft piece set will use these PNGs.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
