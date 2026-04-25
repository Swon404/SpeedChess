import type { GameState, PieceType } from "./board";

const KEY = "speedchess.v1";
const ACTIVE_KEY = "speedchess.v1.active";

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
  stats: ProfileStats;
}

export interface ProfileStats {
  wins: number;
  losses: number;
  draws: number;
  rating: number; // simple Elo-lite, starts at 800
  byBotLevel: Record<number, { wins: number; losses: number; draws: number }>;
  puzzlesSolved: number;
  streak: number;
  badges: string[];
  /** Per-puzzle attempt + completion record, keyed by puzzle id. */
  puzzleProgress?: Record<string, { solved: boolean; attempts: number; solvedAt?: number }>;
}

export type BoardTheme = "wood" | "blue" | "green" | "neon";
export type PieceSet = "classic" | "modern" | "neon" | "emoji";

export interface Settings {
  activeProfileId: string | null;
  timerSeconds: number; // 0 = off
  theme: BoardTheme;
  pieceSet: PieceSet;
  sound: boolean;
  haptics: boolean;
  autoFlip: boolean;
  showThreats: boolean;
  explodeOnCapture: boolean;
}

export interface SavedGame {
  state: GameState;
  mode: "two-player" | "bot";
  botLevel?: number;
  players: { w: string; b: string }; // profile ids or display names
  timerSeconds: number;
  startedAt: number;
}

export interface Store {
  profiles: Profile[];
  settings: Settings;
  savedGames: Record<string, SavedGame>; // keyed by profile id
}

const DEFAULT_SETTINGS: Settings = {
  activeProfileId: null,
  timerSeconds: 30,
  theme: "wood",
  pieceSet: "modern",
  sound: true,
  haptics: true,
  autoFlip: true,
  showThreats: false,
  explodeOnCapture: false
};

function emptyStats(): ProfileStats {
  return {
    wins: 0, losses: 0, draws: 0, rating: 800,
    byBotLevel: {}, puzzlesSolved: 0, streak: 0, badges: [],
    puzzleProgress: {}
  };
}

export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { profiles: [], settings: { ...DEFAULT_SETTINGS }, savedGames: {} };
    const parsed = JSON.parse(raw) as Store;
    parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
    parsed.savedGames = parsed.savedGames ?? {};
    return parsed;
  } catch {
    return { profiles: [], settings: { ...DEFAULT_SETTINGS }, savedGames: {} };
  }
}

export function save(store: Store): void {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function createProfile(store: Store, name: string): Profile {
  const p: Profile = {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 24),
    createdAt: Date.now(),
    stats: emptyStats()
  };
  store.profiles.push(p);
  if (!store.settings.activeProfileId) store.settings.activeProfileId = p.id;
  save(store);
  return p;
}

export function deleteProfile(store: Store, id: string): void {
  store.profiles = store.profiles.filter((p) => p.id !== id);
  delete store.savedGames[id];
  if (store.settings.activeProfileId === id) {
    store.settings.activeProfileId = store.profiles[0]?.id ?? null;
  }
  save(store);
}

export function renameProfile(store: Store, id: string, name: string): void {
  const p = store.profiles.find((x) => x.id === id);
  if (p) {
    p.name = name.trim().slice(0, 24);
    save(store);
  }
}

export function getProfile(store: Store, id: string | null): Profile | null {
  if (!id) return null;
  return store.profiles.find((p) => p.id === id) ?? null;
}

export function updateSettings(store: Store, patch: Partial<Settings>): void {
  store.settings = { ...store.settings, ...patch };
  save(store);
}

/** Apply a game result to the active profile's stats. */
export function recordResult(
  store: Store,
  profileId: string,
  opponent: { kind: "human" } | { kind: "bot"; level: number },
  outcome: "win" | "loss" | "draw"
): void {
  const p = store.profiles.find((x) => x.id === profileId);
  if (!p) return;
  if (outcome === "win") { p.stats.wins++; p.stats.streak++; }
  else if (outcome === "loss") { p.stats.losses++; p.stats.streak = 0; }
  else { p.stats.draws++; }
  if (opponent.kind === "bot") {
    const key = opponent.level;
    const slot = p.stats.byBotLevel[key] ?? { wins: 0, losses: 0, draws: 0 };
    if (outcome === "win") slot.wins++;
    else if (outcome === "loss") slot.losses++;
    else slot.draws++;
    p.stats.byBotLevel[key] = slot;
    // Simple rating tweak vs bot
    const delta = outcome === "win" ? 15 + opponent.level * 3 : outcome === "loss" ? -(10 + (11 - opponent.level)) : 2;
    p.stats.rating = Math.max(100, p.stats.rating + delta);
  }
  awardBadges(p);
  save(store);
}

function awardBadges(p: Profile): void {
  const add = (b: string) => { if (!p.stats.badges.includes(b)) p.stats.badges.push(b); };
  if (p.stats.wins >= 1) add("first-win");
  if (p.stats.wins >= 5) add("five-wins");
  if (p.stats.streak >= 3) add("streak-3");
  if (p.stats.puzzlesSolved >= 1) add("first-puzzle");
  if (p.stats.puzzlesSolved >= 10) add("puzzle-ten");
  for (let lvl = 1; lvl <= 10; lvl++) {
    if ((p.stats.byBotLevel[lvl]?.wins ?? 0) > 0) add(`beat-bot-${lvl}`);
  }
}

export function saveActiveGame(store: Store, profileId: string, game: SavedGame | null): void {
  if (!game) delete store.savedGames[profileId];
  else store.savedGames[profileId] = game;
  save(store);
}

export function recordPuzzleSolved(
  store: Store,
  profileId: string | null,
  puzzleId?: string
): void {
  if (!profileId) return;
  const p = store.profiles.find((x) => x.id === profileId);
  if (!p) return;
  const progress = (p.stats.puzzleProgress ??= {});
  if (puzzleId) {
    const entry = progress[puzzleId] ?? { solved: false, attempts: 0 };
    entry.attempts++;
    const firstTime = !entry.solved;
    entry.solved = true;
    entry.solvedAt = Date.now();
    progress[puzzleId] = entry;
    if (firstTime) p.stats.puzzlesSolved++;
  } else {
    p.stats.puzzlesSolved++;
  }
  awardBadges(p);
  save(store);
}

export function recordPuzzleAttempt(
  store: Store,
  profileId: string | null,
  puzzleId: string
): void {
  if (!profileId) return;
  const p = store.profiles.find((x) => x.id === profileId);
  if (!p) return;
  const progress = (p.stats.puzzleProgress ??= {});
  const entry = progress[puzzleId] ?? { solved: false, attempts: 0 };
  entry.attempts++;
  progress[puzzleId] = entry;
  save(store);
}

export function getLeaderboard(store: Store): Profile[] {
  return store.profiles.slice().sort((a, b) => b.stats.rating - a.stats.rating);
}

// ---------------------------------------------------------------------------
// Active session persistence — survives page refresh / PWA relaunch.
// Stored under a separate key so it's cleared independently of the profile
// store (e.g. when the game ends).
// ---------------------------------------------------------------------------

export interface ActiveSession {
  mode:
    | { kind: "two-player" }
    | { kind: "bot"; level: number }
    | { kind: "portal"; opponent: "two-player" | { kind: "bot"; level: number }; creator: PieceType };
  players: { w: string; b: string };
  stack: GameState[]; // full history stack, so Undo still works
  timeLeft: number | null; // null === Infinity (timer off)
  savedAt: number;
}

export function loadActiveSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSession;
    if (!parsed || !Array.isArray(parsed.stack) || parsed.stack.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveSession(s: ActiveSession): void {
  try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(s)); } catch { /* ignore quota */ }
}

export function clearActiveSession(): void {
  try { localStorage.removeItem(ACTIVE_KEY); } catch { /* ignore */ }
}
