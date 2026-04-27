# SpeedChess — Copilot Instructions

Project conventions and gotchas for AI agents working in this repository.

## Stack

- React 19 + TypeScript (strict), Vite 8, `vite-plugin-pwa`
- Vitest 3.2.4 (1400+ tests)
- Deployed to GitHub Pages at `https://swon404.github.io/SpeedChess/` (base `/SpeedChess/`)
- Dev server: `npm run dev` (port 5180)
- `npm install` requires `--legacy-peer-deps`

## Repo Layout

- `src/engine/` — custom chess engine (no external chess library)
  - Board is `[rank][file]` 8×8 array; **rank 0 = white back rank**
  - `rules.ts` exports `legalMovesFrom`, `allLegalMoves`, `makeMove`, `gameResult`, `inCheck`, `teleportTargets`, `portalAt`, `findKing`
  - `bot.ts` — opponent AI; `notation.ts` — SAN/UCI helpers
- `src/puzzles/` — puzzle databases (standard + portal) and React wrappers
- `src/screens/` — top-level screens (`NewGameScreen`, `PuzzlesScreen`, etc.)
- `src/components/` — UI (`Board.tsx`, etc.)
- `src/GameContext.tsx` — global game state context
- `scripts/` — one-off tsx scripts (puzzle import, asset cropping)

## FEN Conventions

- FEN strings must have **at least 4 fields**: `placement turn castling ep` (halfmove/fullmove optional).
- Square color: `(file + rank) % 2 === 0 ? "dark" : "light"` (file/rank are 0-indexed).

## Portal Chess Mechanics

Portal Chess is a custom variant. Key rules when generating/validating puzzles:

- Each side has at most one active portal square (`state.portals[color]`).
- A piece type is designated `creator` per color (`state.portalCreators[color]`). The creator is **exempt** from teleporting through its own portal.
  - With `creator: "K"`, all Q/R/B/N pieces from that side teleport on entering their portal.
- When a non-creator piece moves onto its own portal square, teleport is **forced** (not optional).
- `teleportTargets(state, from, color)` returns the portal square plus all empty squares (excluding `from` and the portal square). Bishops are restricted to squares matching the portal-square color.
- When the **creator** piece moves and `state.portals[color] === null`, a portal **auto-drops** at the landing square.
- Extended UCI for portal moves: `"e2e4@d8"` = move to `e4` (which is the portal), then teleport to `d8`.

## Puzzle Generation Pattern (`portal-puzzle-db.ts`)

Generators emit `RawCandidate[]` and `build()` validates each one by replaying moves through the engine. Invalid candidates (illegal moves, intermediate mate, non-mate at end) are silently dropped — design speculatively, let `validate()` filter.

```ts
function validate(c: RawCandidate): boolean {
  let s: GameState | null = setupState(c);
  for (let i = 0; i < c.moves.length; i++) {
    s = applyMove(s, c.moves[i]);
    if (!s) return false;
    const r = gameResult(s);
    if (i === c.moves.length - 1) {
      if (r.kind !== "checkmate") return false;
    } else {
      if (r.kind !== "ongoing") return false;
    }
  }
  return true;
}
```

Pitfalls observed:
- Direct (non-portal) mates leak: e.g. rook on a-file slides to `a7` without using portal. Exclude conflicting source files when generating.
- Defenders may block: long-diagonal bishop mates fail when a defender rook can interpose. Prefer adjacent diagonal mates with pawn/queen support.
- Creator-king dropping a portal at its own landing square blocks the rook's path (king occupies the portal). Workarounds are non-trivial.

## Testing & Shipping

Standard ship workflow (PowerShell):

```powershell
npm run build 2>&1 | Select-Object -Last 4
git add -A
git commit -m "..."
git push
```

- Run all tests: `npx vitest run 2>&1 | Select-Object -Last 8`
- Run a file: `npx vitest run path/to/file.test.ts 2>&1 | Select-Object -Last 10`
- Tests live under `src/**/__tests__/*.test.ts`
- Don't leave throwaway debug tests committed (`debug-*.test.ts`, `*-stats.test.ts`)

## Coding Conventions

- TypeScript strict mode — no implicit `any`, no unchecked nulls.
- Engine code is pure/functional: state transitions return new objects rather than mutating.
- React components use hooks + context (`GameContext`); no Redux.
- Avoid adding chess libraries; extend the in-house engine.
- Don't add docstrings/comments to code you didn't change.

## Operational

- OS: Windows; shell: PowerShell. Chain commands with `;`, never `&&`.
- Don't `Start-Sleep` after async commands — terminal output notifications arrive automatically.
