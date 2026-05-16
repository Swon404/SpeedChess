import type { CustomPieceDef, GameState, PieceType } from "./board";

const KEY = "speedchess.v1";
const ACTIVE_KEY = "speedchess.v1.active";

export interface SavedCustomPiece {
  id: string;
  name: string;
  def: CustomPieceDef;
}

export interface SavedCustomSquare {
  rank: number;
  file: number;
  type: PieceType;
  customPieceId?: string;
}

export interface SavedBoardLayout {
  id: string;
  name: string;
  /** White's piece placement on ranks 0-3. Black is mirrored automatically. */
  squares: { rank: number; file: number; type: PieceType }[];
  width?: number;
  height?: number;
}

export interface SavedCustomGame {
  id: string;
  name: string;
  /** White's piece placement on ranks 0-3. Black is mirrored automatically. */
  squares: SavedCustomSquare[];
  width?: number;
  height?: number;
  /** Definitions for X1 pieces placed on the board, if any. */
  customPieces?: SavedCustomPiece[];
  /** Legacy single-definition support for older saves. */
  customPieceDef?: CustomPieceDef;
}

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
  totalStars?: number;
  performanceHistory?: PerformanceRecord[];
}

export type PerformanceMode = "bot" | "human";

export interface PerformanceRecord {
  playedAt: number;
  mode: PerformanceMode;
  botLevel?: number;
  outcome: "win" | "loss" | "draw";
  stars: number;
  score: number;
  moveGrades?: number[];
  timerSeconds?: number;
}

export interface PerformanceWindowSummary {
  games: number;
  stars: number;
  rating: number;
}

export interface ProfilePerformanceSummary {
  overall: PerformanceWindowSummary;
  last7Days: PerformanceWindowSummary;
  last30Days: PerformanceWindowSummary;
}

export type BoardTheme = "wood" | "blue" | "green" | "neon";
export type PieceSet = "classic" | "modern" | "neon";
export type AnimationSpeed = "normal" | "slow" | "very-slow";

export interface Settings {
  activeProfileId: string | null;
  timerSeconds: number; // 0 = off
  animationSpeed: AnimationSpeed;
  rotateBlackPiecesFixedBoard: boolean;
  theme: BoardTheme;
  pieceSet: PieceSet;
  sound: boolean;
  haptics: boolean;
  autoFlip: boolean;
  showThreats: boolean;
  showMoveRatingPopup: boolean;
  explodeOnCapture: boolean;
  portalCreatorDefault: PieceType;
  portalOpponentDefault: "two-player" | "bot";
  portalMaxDefault: 1 | 2 | 3;
  savedCustomPieces: SavedCustomPiece[];
  savedBoardLayouts: SavedBoardLayout[];
  savedCustomGames: SavedCustomGame[];
  lastCustomPieceId?: string;
  lastBoardLayoutId?: string;
  lastCustomGameId?: string;
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
  animationSpeed: "slow",
  rotateBlackPiecesFixedBoard: false,
  theme: "neon",
  pieceSet: "neon",
  sound: true,
  haptics: true,
  autoFlip: true,
  showThreats: false,
  showMoveRatingPopup: true,
  explodeOnCapture: false,
  portalCreatorDefault: "N",
  portalOpponentDefault: "bot",
  portalMaxDefault: 2,
  savedCustomPieces: [],
  savedBoardLayouts: [],
  savedCustomGames: []
};

function normalizePieceSet(value: unknown): PieceSet {
  if (value === "classic" || value === "modern" || value === "neon") return value;
  return "neon";
}

function normalizePortalCreator(value: unknown): PieceType {
  if (value === "Q" || value === "R" || value === "B" || value === "N" || value === "K") return value;
  return "N";
}

function normalizePortalOpponent(value: unknown): "two-player" | "bot" {
  if (value === "two-player" || value === "bot") return value;
  return "bot";
}

function normalizePortalMax(value: unknown): 1 | 2 | 3 {
  if (value === 1 || value === 2 || value === 3) return value;
  return 2;
}

function normalizeSavedCustomPiece(value: unknown): SavedCustomPiece | null {
  if (!value || typeof value !== "object") return null;
  const piece = value as Partial<SavedCustomPiece>;
  if (typeof piece.id !== "string" || typeof piece.name !== "string" || !piece.def) return null;
  return piece as SavedCustomPiece;
}

function normalizeSavedCustomGame(value: unknown): SavedCustomGame | null {
  if (!value || typeof value !== "object") return null;
  const game = value as Partial<SavedCustomGame>;
  if (typeof game.id !== "string" || typeof game.name !== "string" || !Array.isArray(game.squares)) return null;
  const squares = game.squares
    .filter((sq): sq is SavedCustomSquare => Boolean(sq && typeof sq === "object"))
    .map((sq) => ({
      rank: sq.rank,
      file: sq.file,
      type: sq.type,
      customPieceId: sq.customPieceId
    }))
    .filter((sq) => typeof sq.rank === "number" && typeof sq.file === "number" && typeof sq.type === "string");
  const customPieces = Array.isArray(game.customPieces)
    ? game.customPieces.map(normalizeSavedCustomPiece).filter((piece): piece is SavedCustomPiece => Boolean(piece))
    : undefined;
  return {
    id: game.id,
    name: game.name,
    squares,
    width: typeof game.width === "number" ? Math.max(4, Math.min(20, Math.round(game.width))) : 8,
    height: typeof game.height === "number" ? Math.max(4, Math.min(20, Math.round(game.height))) : 8,
    customPieces,
    customPieceDef: game.customPieceDef
  };
}

function emptyStats(): ProfileStats {
  return {
    wins: 0, losses: 0, draws: 0, rating: 800,
    byBotLevel: {}, puzzlesSolved: 0, streak: 0, badges: [],
    puzzleProgress: {}, totalStars: 0, performanceHistory: []
  };
}

function clampStars(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
  return Math.max(0, Math.min(5, n));
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeTimerSeconds(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value));
}

function normalizePerformanceMode(value: unknown): PerformanceMode {
  return value === "human" ? "human" : "bot";
}

function normalizePerformanceRecord(value: unknown): PerformanceRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<PerformanceRecord>;
  const playedAt = typeof record.playedAt === "number" && Number.isFinite(record.playedAt)
    ? record.playedAt
    : Date.now();
  const outcome = record.outcome === "win" || record.outcome === "loss" || record.outcome === "draw"
    ? record.outcome
    : "draw";
  return {
    playedAt,
    mode: normalizePerformanceMode(record.mode),
    botLevel:
      typeof record.botLevel === "number" && Number.isFinite(record.botLevel)
        ? Math.max(1, Math.min(20, Math.round(record.botLevel)))
        : undefined,
    outcome,
    stars: clampStars(record.stars),
    score: clampScore(record.score),
    moveGrades: Array.isArray(record.moveGrades)
      ? record.moveGrades
          .map((grade) => clampStars(grade))
      : undefined,
    timerSeconds: normalizeTimerSeconds(record.timerSeconds)
  };
}

function normalizeStats(stats: Partial<ProfileStats> | undefined): ProfileStats {
  const base = emptyStats();
  return {
    wins: typeof stats?.wins === "number" ? stats.wins : base.wins,
    losses: typeof stats?.losses === "number" ? stats.losses : base.losses,
    draws: typeof stats?.draws === "number" ? stats.draws : base.draws,
    rating: typeof stats?.rating === "number" ? stats.rating : base.rating,
    byBotLevel: stats?.byBotLevel ?? base.byBotLevel,
    puzzlesSolved: typeof stats?.puzzlesSolved === "number" ? stats.puzzlesSolved : base.puzzlesSolved,
    streak: typeof stats?.streak === "number" ? stats.streak : base.streak,
    badges: Array.isArray(stats?.badges) ? stats.badges.slice() : base.badges,
    puzzleProgress: { ...(stats?.puzzleProgress ?? base.puzzleProgress) },
    totalStars: typeof stats?.totalStars === "number" ? stats.totalStars : base.totalStars,
    performanceHistory: Array.isArray(stats?.performanceHistory)
      ? stats.performanceHistory.map((record) => normalizePerformanceRecord(record)).filter((record): record is PerformanceRecord => !!record)
      : base.performanceHistory
  };
}

function performanceWeight(record: PerformanceRecord): number {
  if (record.mode !== "bot") return 1;
  const level = record.botLevel ?? 1;
  return 0.75 + (level - 1) * 0.05;
}

function averageScore(records: PerformanceRecord[]): number {
  if (records.length === 0) return 0;
  const weighted = records.reduce(
    (sum, record) => {
      const weight = performanceWeight(record);
      return {
        score: sum.score + clampScore(record.score) * weight,
        weight: sum.weight + weight
      };
    },
    { score: 0, weight: 0 }
  );
  return weighted.weight > 0 ? Math.round(weighted.score / weighted.weight) : 0;
}

function summarizeWindow(records: PerformanceRecord[]): PerformanceWindowSummary {
  return {
    games: records.length,
    stars: records.reduce((sum, record) => sum + clampStars(record.stars), 0),
    rating: averageScore(records)
  };
}

export function getPerformanceRecords(
  stats: ProfileStats,
  mode: PerformanceMode | "all" = "all"
): PerformanceRecord[] {
  const history = stats.performanceHistory ?? [];
  if (mode === "all") return history.slice();
  return history.filter((record) => record.mode === mode);
}

export function getPerformanceSummary(
  stats: ProfileStats,
  mode: PerformanceMode | "all" = "all",
  now = Date.now()
): ProfilePerformanceSummary {
  const records = getPerformanceRecords(stats, mode);
  const last7Cutoff = now - 7 * 24 * 60 * 60 * 1000;
  const last30Cutoff = now - 30 * 24 * 60 * 60 * 1000;
  return {
    overall: summarizeWindow(records),
    last7Days: summarizeWindow(records.filter((record) => record.playedAt >= last7Cutoff)),
    last30Days: summarizeWindow(records.filter((record) => record.playedAt >= last30Cutoff))
  };
}

export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { profiles: [], settings: { ...DEFAULT_SETTINGS }, savedGames: {} };
    const parsed = JSON.parse(raw) as Store;
    const rawSettings = parsed.settings as Partial<Settings> | undefined;
    parsed.settings = {
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      pieceSet: normalizePieceSet(rawSettings?.pieceSet),
      portalCreatorDefault: normalizePortalCreator(rawSettings?.portalCreatorDefault),
      portalOpponentDefault: normalizePortalOpponent(rawSettings?.portalOpponentDefault),
      portalMaxDefault: normalizePortalMax(rawSettings?.portalMaxDefault),
      savedCustomPieces: Array.isArray(rawSettings?.savedCustomPieces)
        ? rawSettings.savedCustomPieces.map(normalizeSavedCustomPiece).filter((piece): piece is SavedCustomPiece => Boolean(piece))
        : [],
      savedBoardLayouts: Array.isArray(rawSettings?.savedBoardLayouts) ? rawSettings.savedBoardLayouts : [],
      savedCustomGames: Array.isArray(rawSettings?.savedCustomGames)
        ? rawSettings.savedCustomGames.map(normalizeSavedCustomGame).filter((game): game is SavedCustomGame => Boolean(game))
        : []
    };
    parsed.savedGames = parsed.savedGames ?? {};
    parsed.profiles = (parsed.profiles ?? []).map((profile) => ({
      ...profile,
      stats: normalizeStats(profile.stats)
    }));
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
  outcome: "win" | "loss" | "draw",
  performance?: { playedAt?: number; stars?: number; score?: number; moveGrades?: number[]; timerSeconds?: number }
): void {
  const p = store.profiles.find((x) => x.id === profileId);
  if (!p) return;
  p.stats = normalizeStats(p.stats);
  if (outcome === "win") { p.stats.wins++; p.stats.streak++; }
  else if (outcome === "loss") { p.stats.losses++; p.stats.streak = 0; }
  else { p.stats.draws++; }
  const record: PerformanceRecord = {
    playedAt: performance?.playedAt ?? Date.now(),
    mode: opponent.kind === "bot" ? "bot" : "human",
    botLevel: opponent.kind === "bot" ? opponent.level : undefined,
    outcome,
    stars: clampStars(performance?.stars),
    score: clampScore(performance?.score),
    moveGrades: performance?.moveGrades?.map((grade) => clampStars(grade)),
    timerSeconds: normalizeTimerSeconds(performance?.timerSeconds)
  };
  p.stats.totalStars = (p.stats.totalStars ?? 0) + record.stars;
  p.stats.performanceHistory = [...(p.stats.performanceHistory ?? []), record];
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
  for (let lvl = 1; lvl <= 20; lvl++) {
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
    | { kind: "portal"; opponent: "two-player" | { kind: "bot"; level: number }; creator: PieceType; adjacencyRule?: boolean; portalMax?: number }
    | { kind: "custom"; customPiece?: CustomPieceDef; opponent: "two-player" | { kind: "bot"; level: number } };
  customGame?: SavedCustomGame | null;
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

// ---------------------------------------------------------------------------
// Custom piece + board layout CRUD
// ---------------------------------------------------------------------------

export function saveCustomPiece(store: Store, piece: SavedCustomPiece): void {
  const existing = store.settings.savedCustomPieces.findIndex((p) => p.id === piece.id);
  if (existing >= 0) {
    store.settings.savedCustomPieces = store.settings.savedCustomPieces.map((p, i) =>
      i === existing ? piece : p
    );
  } else {
    store.settings.savedCustomPieces = [...store.settings.savedCustomPieces, piece];
  }
  store.settings.lastCustomPieceId = piece.id;
  save(store);
}

export function deleteCustomPiece(store: Store, id: string): void {
  store.settings.savedCustomPieces = store.settings.savedCustomPieces.filter((p) => p.id !== id);
  if (store.settings.lastCustomPieceId === id) {
    store.settings.lastCustomPieceId = store.settings.savedCustomPieces[0]?.id;
  }
  save(store);
}

export function saveBoardLayout(store: Store, layout: SavedBoardLayout): void {
  const existing = store.settings.savedBoardLayouts.findIndex((l) => l.id === layout.id);
  if (existing >= 0) {
    store.settings.savedBoardLayouts = store.settings.savedBoardLayouts.map((l, i) =>
      i === existing ? layout : l
    );
  } else {
    store.settings.savedBoardLayouts = [...store.settings.savedBoardLayouts, layout];
  }
  store.settings.lastBoardLayoutId = layout.id;
  save(store);
}

export function deleteBoardLayout(store: Store, id: string): void {
  store.settings.savedBoardLayouts = store.settings.savedBoardLayouts.filter((l) => l.id !== id);
  if (store.settings.lastBoardLayoutId === id) {
    store.settings.lastBoardLayoutId = store.settings.savedBoardLayouts[0]?.id;
  }
  save(store);
}

export function saveCustomGame(store: Store, game: SavedCustomGame): void {
  const existing = store.settings.savedCustomGames.findIndex((g) => g.id === game.id);
  if (existing >= 0) {
    store.settings.savedCustomGames = store.settings.savedCustomGames.map((g, i) =>
      i === existing ? game : g
    );
  } else {
    store.settings.savedCustomGames = [...store.settings.savedCustomGames, game];
  }
  store.settings.lastCustomGameId = game.id;
  save(store);
}

export function deleteCustomGame(store: Store, id: string): void {
  store.settings.savedCustomGames = store.settings.savedCustomGames.filter((g) => g.id !== id);
  if (store.settings.lastCustomGameId === id) {
    store.settings.lastCustomGameId = store.settings.savedCustomGames[0]?.id;
  }
  save(store);
}
