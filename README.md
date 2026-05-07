# SpeedChess

Kid-friendly chess PWA built with React 19 + TypeScript + Vite + vite-plugin-pwa — mirrors the ElementalQuiz stack.

## Features (v0.1)
- Two-player pass-and-play with auto-flip
- Play the bot with 20 difficulty levels in standard chess (built-in minimax for 1-4, external Stockfish API for 5-20 with fallback)
- Portal Chess bot remains local and supports levels 1-10
- Per-move timer with configurable seconds (10/30/60/120/off). Timeout forfeits **that move only** — game continues.
- Tap a piece to see where it can go — legal squares highlighted, captures ringed in red
- Full undo / takeback stack
- Named player profiles, leaderboard, per-player stats, rating, badges
- Learn mode: piece tutorials with text-to-speech (more lessons coming)
- Saves active game automatically, resumes on reopen
- Installable on iPhone ("Add to Home Screen") and any desktop browser

## Develop

```powershell
npm install --legacy-peer-deps
npm run dev
npm run build
npm run preview
npm test
```

## Deploy

Pushed to `main` → GitHub Pages via `.github/workflows/deploy.yml`. Update `base` in `vite.config.ts` if the repo name changes.

## Roadmap
- Mate-in-1/2 puzzles + daily puzzle
- Mascot coach with contextual commentary
- Board themes & kid-friendly piece sets
- PGN export / share
- Custom-piece framework (planned)
