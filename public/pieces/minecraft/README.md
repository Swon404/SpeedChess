# Minecraft piece set

Drop **6 PNG files** in this folder, named exactly:

- `K.png` &mdash; King (e.g. Steve)
- `Q.png` &mdash; Queen (e.g. Alex)
- `R.png` &mdash; Rook (e.g. cobblestone block)
- `B.png` &mdash; Bishop (e.g. Enderman)
- `N.png` &mdash; Knight (e.g. Skeleton)
- `P.png` &mdash; Pawn (e.g. Zombie)

## Recommendations

- **Square images** (64&times;64 to 256&times;256 px). They're rendered at ~60px on the board so 128&times;128 is plenty.
- **Transparent background** &mdash; the app draws a colored circular plate behind the image (cream for white side, dark slate for black side) so transparent PNGs blend properly.
- **Same artwork for both sides** &mdash; the plate color is what tells the player which side a piece is on.
- PNGs are served as static assets, so no rebuild is needed when you swap them &mdash; just refresh.
