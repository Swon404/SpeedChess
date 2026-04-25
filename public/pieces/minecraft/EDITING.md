# Editing the Minecraft pieces in GIMP

The board uses **12 PNGs** in this folder &mdash; one per side per piece type:

| Type    | White    | Black    |
| ------- | -------- | -------- |
| King    | `wK.png` | `bK.png` |
| Queen   | `wQ.png` | `bQ.png` |
| Rook    | `wR.png` | `bR.png` |
| Bishop  | `wB.png` | `bB.png` |
| Knight  | `wN.png` | `bN.png` |
| Pawn    | `wP.png` | `bP.png` |

Each file is **256&times;256 px PNG** with the circular plate baked in.

## Workflow

1. Open the file in GIMP: **File &rarr; Open** &rarr; pick e.g. `wK.png`.
2. Edit. Keep the canvas at **256&times;256** and keep transparent areas around the plate transparent (the app does not draw its own background).
3. Export back over the same filename: **File &rarr; Export As&hellip;** &rarr; `wK.png` &rarr; *Overwrite*. Do **not** use *Save As* (that writes a `.xcf`).
4. Refresh the running app (`Ctrl+Shift+R`) &mdash; PNGs are static assets, no rebuild needed for dev. For the deployed site, run `npm run build` and commit/push.

## Tips

- **Pixel art** &mdash; turn off interpolation: **Tools &rarr; Tool Options &rarr; Interpolation: None** when transforming, so blocks stay crisp. The app renders these with `image-rendering: pixelated`.
- **Plate color = team** &mdash; the only visual cue for which side a piece is on is the plate baked into the PNG. Keep `w*` plates light and `b*` plates dark.
- **Background must stay transparent** &mdash; if you flatten the image you'll get a square box on the board.
- **Aspect** &mdash; keep it square. Non-square images will be letterboxed via `object-fit: contain`.

## If you'd rather start from the reference sheet

The full source artwork is at `data/minecraft-reference.png` (1024&times;1017, 8&times;8 grid).
You can edit it in GIMP, then re-slice it into 12 PNGs with:

```powershell
npm run crop-pieces
```

&#x26A0;&#xFE0F; **The cropper overwrites every `w*.png` / `b*.png` in this folder.** If you have hand-edited PNGs you want to keep, copy them somewhere safe first, or skip the cropper and edit the individual files directly.

Crop coordinates and per-piece pixel nudges live in [`scripts/crop-pieces.mts`](../../../scripts/crop-pieces.mts) (the `PICKS` array). Add `dx` / `dy` to a row to nudge that piece if it sits off-center in the source.

## Fallback

If a PNG fails to load, the app falls back to an emoji per piece type (configured in [`src/components/MinecraftPieces.tsx`](../../../src/components/MinecraftPieces.tsx)). So a missing file won't crash the board.
