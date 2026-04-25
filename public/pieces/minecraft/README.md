# Minecraft piece set

The board loads 12 PNGs from this folder, one per side per piece:

- White: `wK.png` `wQ.png` `wR.png` `wB.png` `wN.png` `wP.png`
- Black: `bK.png` `bQ.png` `bR.png` `bB.png` `bN.png` `bP.png`

Each is 256&times;256 px, transparent background, with a circular plate baked into the art (light plate for white, dark plate for black).

## Where they come from

These files are produced by slicing `data/minecraft-reference.png` with `npm run crop-pieces`. To tweak the slicing, edit `PICKS` in [`scripts/crop-pieces.mts`](../../../scripts/crop-pieces.mts).

## Hand-editing

See [`EDITING.md`](EDITING.md) for the GIMP workflow.

## Fallback

If a PNG is missing, the app renders an emoji glyph for that piece type instead (see `MinecraftPiece` in [`src/components/MinecraftPieces.tsx`](../../../src/components/MinecraftPieces.tsx)).
