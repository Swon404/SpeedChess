import {
  createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState
} from "react";
import {
  GameState, Move, PieceType, Square, initialState, pieceAt
} from "./engine/board";
import {
  forfeitMove, gameResult, inCheck, legalMovesFrom, makeMove
} from "./engine/rules";
import { toSAN } from "./engine/notation";
import { chooseBotMove } from "./engine/bot";
import { playSound } from "./engine/sound";
import {
  load, Profile, recordResult, saveActiveGame, Settings, Store, updateSettings,
  createProfile, deleteProfile, renameProfile,
  loadActiveSession, saveActiveSession, clearActiveSession,
  recordPuzzleSolved as storeRecordPuzzleSolved,
  recordPuzzleAttempt as storeRecordPuzzleAttempt
} from "./engine/storage";

type Mode =
  | { kind: "two-player" }
  | { kind: "bot"; level: number }
  | { kind: "portal"; opponent: "two-player" | { kind: "bot"; level: number }; creator: PieceType };
export interface Players { w: string; b: string; }

/** Build the initial state for Portal Chess (creator-type portals). */
function portalInitialState(creator: PieceType): GameState {
  const s = initialState();
  s.portals = { w: null, b: null };
  s.portalCreators = { w: creator, b: creator };
  return s;
}

interface GameCtx {
  store: Store;
  activeProfile: Profile | null;
  state: GameState;
  mode: Mode;
  players: Players;
  selected: Square | null;
  legalFromSelected: Move[];
  timeLeft: number; // seconds remaining for current move (Infinity if off)
  isBotThinking: boolean;
  result: ReturnType<typeof gameResult>;

  paused: boolean;
  togglePause(): void;

  select(sq: Square | null): void;
  tryMove(from: Square, to: Square, promotion?: "Q" | "R" | "B" | "N", portalTo?: Square): boolean;
  undo(): void;
  newGame(mode: Mode, players?: Partial<Players>): void;
  forfeit(): void;

  // puzzles
  loadPosition(state: GameState, players?: Partial<Players>, opts?: { noTimer?: boolean }): void;
  recordPuzzleSolved(puzzleId: string): void;
  recordPuzzleAttempt(puzzleId: string): void;

  // hint
  hint: Move | null;
  requestHint(): void;
  clearHint(): void;

  // profile & settings
  setActiveProfile(id: string | null): void;
  addProfile(name: string): Profile;
  removeProfile(id: string): void;
  renamePlayer(id: string, name: string): void;
  updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void;
}

/** Returns the bot level if the mode is bot-driven (incl. portal+bot), else null. */
function botLevelOf(m: Mode): number | null {
  if (m.kind === "bot") return m.level;
  if (m.kind === "portal" && typeof m.opponent !== "string" && m.opponent.kind === "bot") {
    return m.opponent.level;
  }
  return null;
}

const Ctx = createContext<GameCtx | null>(null);

export function useGame(): GameCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGame must be used within GameProvider");
  return v;
}

type Action =
  | { type: "set-state"; state: GameState }
  | { type: "make"; move: Move; san: string }
  | { type: "undo" }
  | { type: "new"; initial: GameState }
  | { type: "forfeit" };

function reducer(stack: GameState[], action: Action): GameState[] {
  switch (action.type) {
    case "set-state": return [action.state];
    case "make": {
      const cur = stack[stack.length - 1];
      const next = makeMove(cur, { ...action.move, san: action.san });
      return [...stack, next];
    }
    case "undo": {
      if (stack.length <= 1) return stack;
      return stack.slice(0, -1);
    }
    case "new": return [action.initial];
    case "forfeit": {
      const cur = stack[stack.length - 1];
      return [...stack, forfeitMove(cur)];
    }
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(() => load());
  // Resume any in-progress game from localStorage on first mount.
  const restored = useMemo(() => loadActiveSession(), []);
  const [mode, setMode] = useState<Mode>(restored?.mode ?? { kind: "two-player" });
  const [players, setPlayers] = useState<Players>(restored?.players ?? { w: "White", b: "Black" });
  const [stack, dispatch] = useReducer(
    reducer,
    undefined,
    () => (restored?.stack && restored.stack.length > 0 ? restored.stack : [initialState()])
  );
  const state = stack[stack.length - 1];
  const [selected, setSelected] = useState<Square | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (restored && restored.timeLeft !== null && Number.isFinite(restored.timeLeft)) {
      return restored.timeLeft as number;
    }
    const t = store.settings.timerSeconds;
    return t > 0 ? t : Infinity;
  });
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [hint, setHint] = useState<Move | null>(null);
  const [paused, setPaused] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  // Track latest store for callbacks that need the freshest settings.
  const storeRef = useRef(store);
  useEffect(() => { storeRef.current = store; }, [store]);

  const activeProfile = useMemo(
    () => store.profiles.find((p) => p.id === store.settings.activeProfileId) ?? null,
    [store]
  );

  const result = useMemo(() => gameResult(state), [state]);

  // Clear hint whenever the position changes.
  useEffect(() => { setHint(null); }, [state.history.length]);

  // Sound effects for moves and game end.
  const soundedLenRef = useRef<number>(state.history.length);
  useEffect(() => {
    if (!store.settings.sound) { soundedLenRef.current = state.history.length; return; }
    if (state.history.length > soundedLenRef.current) {
      const lastMove = state.history[state.history.length - 1];
      const isCheck = result.kind === "ongoing" && isInCheckNow(state);
      if (result.kind === "checkmate") {
        // win/loss from the active profile's perspective (white) when vs bot
        const playerIsWhite = botLevelOf(mode) !== null;
        const winnerIsPlayer = playerIsWhite && result.winner === "w";
        playSound(winnerIsPlayer ? "win" : (botLevelOf(mode) !== null ? "loss" : "win"));
      } else if (result.kind !== "ongoing") {
        playSound("draw");
      } else if (isCheck) {
        playSound("check");
      } else if (lastMove?.captured) {
        playSound("capture");
      } else {
        playSound("move");
      }
    }
    soundedLenRef.current = state.history.length;
  }, [state, result, mode, store.settings.sound]);

  // Persist active session so a refresh / PWA relaunch resumes the game.
  useEffect(() => {
    if (result.kind !== "ongoing") {
      clearActiveSession();
      return;
    }
    saveActiveSession({
      mode,
      players,
      stack,
      timeLeft: Number.isFinite(timeLeft) ? timeLeft : null,
      savedAt: Date.now()
    });
  }, [stack, mode, players, timeLeft, result.kind]);

  // Reset timer on each turn change (but not on initial mount — we may have
  // just restored a mid-game timeLeft from localStorage).
  const lastHistLenRef = useRef<number>(state.history.length);
  const lastTimerSettingRef = useRef<number>(store.settings.timerSeconds);
  const noTimerRef = useRef<boolean>(false);
  useEffect(() => {
    const t = store.settings.timerSeconds;
    const histChanged = state.history.length !== lastHistLenRef.current;
    const settingChanged = t !== lastTimerSettingRef.current;
    lastHistLenRef.current = state.history.length;
    lastTimerSettingRef.current = t;
    if (noTimerRef.current) {
      setTimeLeft(Infinity);
      return;
    }
    if (histChanged || settingChanged) {
      setTimeLeft(t > 0 ? t : Infinity);
    }
  }, [state.history.length, store.settings.timerSeconds]);

  // Tick timer
  useEffect(() => {
    if (result.kind !== "ongoing") return;
    if (paused) return;
    if (!Number.isFinite(timeLeft)) return;
    if (isBotThinking) return;
    if (timeLeft <= 0) {
      dispatch({ type: "forfeit" });
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, isBotThinking, result.kind, paused]);

  // Bot move
  useEffect(() => {
    const lvl = botLevelOf(mode);
    if (lvl === null) return;
    if (result.kind !== "ongoing") return;
    if (paused) return;
    // Bot plays black by default
    if (state.turn !== "b") return;
    let cancelled = false;
    setIsBotThinking(true);
    (async () => {
      try {
        // Compute the bot move and ensure at least ~300ms have elapsed so the
        // human's own sliding animation has time to play before the board
        // re-renders with the bot's response.
        const minThinkMs = 320;
        const t0 = performance.now();
        const move = await chooseBotMove(state, lvl);
        const elapsed = performance.now() - t0;
        if (elapsed < minThinkMs) {
          await new Promise((r) => setTimeout(r, minThinkMs - elapsed));
        }
        if (cancelled) return;
        if (move) {
          const san = toSAN(state, move);
          dispatch({ type: "make", move, san });
        }
      } finally {
        // Always clear the thinking flag so the timer can resume ticking on
        // the human's next turn, even if this effect was cancelled mid-flight.
        setIsBotThinking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [state, mode, result.kind, paused]);

  // Auto-record result when game ends
  const recordedRef = useRef<number>(-1);
  useEffect(() => {
    if (result.kind === "ongoing") return;
    if (recordedRef.current === stack.length) return;
    recordedRef.current = stack.length;
    const winner = result.kind === "checkmate" ? result.winner : null;
    const updated = cloneStore(store);
    const lvl = botLevelOf(mode);
    if (lvl !== null) {
      if (!activeProfile) return;
      const outcome: "win" | "loss" | "draw" =
        winner === null ? "draw" : winner === "w" ? "win" : "loss";
      recordResult(updated, activeProfile.id, { kind: "bot", level: lvl }, outcome);
      saveActiveGame(updated, activeProfile.id, null);
    } else {
      // two-player: record vs each named profile if found
      const wProf = updated.profiles.find((p) => p.name === players.w);
      const bProf = updated.profiles.find((p) => p.name === players.b);
      const wOutcome: "win" | "loss" | "draw" = winner === null ? "draw" : winner === "w" ? "win" : "loss";
      const bOutcome: "win" | "loss" | "draw" = winner === null ? "draw" : winner === "b" ? "win" : "loss";
      if (wProf) recordResult(updated, wProf.id, { kind: "human" }, wOutcome);
      if (bProf) recordResult(updated, bProf.id, { kind: "human" }, bOutcome);
      if (activeProfile) saveActiveGame(updated, activeProfile.id, null);
    }
    setStore(updated);
  }, [result, mode, activeProfile, store, stack.length, players]);

  // Persist active game
  useEffect(() => {
    if (!activeProfile) return;
    if (result.kind !== "ongoing") return;
    const updated = cloneStore(store);
    saveActiveGame(updated, activeProfile.id, {
      state,
      mode: botLevelOf(mode) !== null ? "bot" : "two-player",
      botLevel: botLevelOf(mode) ?? undefined,
      players: { w: players.w, b: players.b },
      timerSeconds: store.settings.timerSeconds,
      startedAt: Date.now()
    });
    setStore(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.history.length]);

  const legalFromSelected = useMemo(() => {
    if (!selected) return [];
    return legalMovesFrom(state, selected);
  }, [selected, state]);

  const select = useCallback((sq: Square | null) => {
    if (!sq) { setSelected(null); return; }
    const p = pieceAt(state, sq);
    if (p && p.color === state.turn) setSelected(sq);
    else setSelected(null);
  }, [state]);

  const tryMove = useCallback((from: Square, to: Square, promotion?: "Q" | "R" | "B" | "N", portalTo?: Square): boolean => {
    if (paused) return false;
    const candidates = legalMovesFrom(state, from).filter(
      (m) => m.to.file === to.file && m.to.rank === to.rank
    );
    if (candidates.length === 0) return false;
    let move = candidates[0];
    if (portalTo) {
      const portalMatch = candidates.find(
        (m) => m.isPortalEntry && m.portalTo && m.portalTo.file === portalTo.file && m.portalTo.rank === portalTo.rank
      );
      if (portalMatch) move = portalMatch;
    } else if (candidates.some((m) => m.promotion)) {
      move = candidates.find((m) => m.promotion === (promotion ?? "Q")) ?? candidates[0];
    }
    const san = toSAN(state, move);
    dispatch({ type: "make", move, san });
    setSelected(null);
    return true;
  }, [state, paused]);

  const undo = useCallback(() => {
    // Undo twice if playing a bot and it's the human's turn (to remove bot reply + own move).
    dispatch({ type: "undo" });
    if (botLevelOf(mode) !== null) dispatch({ type: "undo" });
    setSelected(null);
  }, [mode]);

  const newGame = useCallback((m: Mode, p?: Partial<Players>) => {
    clearActiveSession();
    noTimerRef.current = false;
    setMode(m);
    const defaultW = activeProfile?.name ?? "White";
    const defaultB =
      m.kind === "bot"
        ? `Bot Lv ${m.level}`
        : m.kind === "portal" && typeof m.opponent !== "string" && m.opponent.kind === "bot"
          ? `Bot Lv ${m.opponent.level}`
          : "Player 2";
    setPlayers({ w: p?.w ?? defaultW, b: p?.b ?? defaultB });
    const fresh = m.kind === "portal" ? portalInitialState(m.creator) : initialState();
    dispatch({ type: "new", initial: fresh });
    setSelected(null);
    setPaused(false);
    // Force the clock to use the freshest timer setting — the caller often
    // updates settings immediately before calling newGame (e.g. the New Game
    // screen), so reading storeRef gives us the value they just picked
    // instead of the stale closure-captured one.
    const t = storeRef.current.settings.timerSeconds;
    setTimeLeft(t > 0 ? t : Infinity);
  }, [activeProfile]);

  const forfeit = useCallback(() => dispatch({ type: "forfeit" }), []);

  const loadPosition = useCallback((newState: GameState, p?: Partial<Players>, opts?: { noTimer?: boolean }) => {
    clearActiveSession();
    noTimerRef.current = !!opts?.noTimer;
    setMode({ kind: "two-player" });
    setPlayers({ w: p?.w ?? "You", b: p?.b ?? "Puzzle" });
    dispatch({ type: "set-state", state: newState });
    setSelected(null);
    setHint(null);
    setPaused(false);
    if (opts?.noTimer) setTimeLeft(Infinity);
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  const requestHint = useCallback(() => {
    (async () => {
      const best = await chooseBotMove(state, 5);
      if (best) setHint(best);
    })();
  }, [state]);
  const clearHint = useCallback(() => setHint(null), []);

  const setActiveProfile = useCallback((id: string | null) => {
    const updated = cloneStore(store);
    updateSettings(updated, { activeProfileId: id });
    setStore(updated);
  }, [store]);

  const addProfile = useCallback((name: string): Profile => {
    const updated = cloneStore(store);
    const p = createProfile(updated, name);
    setStore(updated);
    return p;
  }, [store]);

  const removeProfile = useCallback((id: string) => {
    const updated = cloneStore(store);
    deleteProfile(updated, id);
    setStore(updated);
  }, [store]);

  const renamePlayer = useCallback((id: string, name: string) => {
    const updated = cloneStore(store);
    renameProfile(updated, id, name);
    setStore(updated);
  }, [store]);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    const updated = cloneStore(store);
    updateSettings(updated, { [key]: value } as Partial<Settings>);
    setStore(updated);
    // Keep ref in sync immediately so any synchronous code that runs right
    // after this (e.g. New Game screen's Start button: updateSetting → newGame)
    // sees the freshest settings.
    storeRef.current = updated;
  }, [store]);

  const recordPuzzleSolved = useCallback((puzzleId: string) => {
    if (!activeProfile) return;
    const updated = cloneStore(store);
    storeRecordPuzzleSolved(updated, activeProfile.id, puzzleId);
    setStore(updated);
    storeRef.current = updated;
  }, [store, activeProfile]);

  const recordPuzzleAttempt = useCallback((puzzleId: string) => {
    if (!activeProfile) return;
    const updated = cloneStore(store);
    storeRecordPuzzleAttempt(updated, activeProfile.id, puzzleId);
    setStore(updated);
    storeRef.current = updated;
  }, [store, activeProfile]);

  const value: GameCtx = {
    store, activeProfile, state, mode, players, selected, legalFromSelected, timeLeft, isBotThinking, result,
    paused, togglePause,
    select, tryMove, undo, newGame, forfeit,
    loadPosition,
    recordPuzzleSolved, recordPuzzleAttempt,
    hint, requestHint, clearHint,
    setActiveProfile, addProfile, removeProfile, renamePlayer, updateSetting
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function isInCheckNow(s: GameState): boolean {
  return inCheck(s, s.turn);
}

function cloneStore(s: Store): Store {
  return {
    profiles: s.profiles.map((p) => ({
      ...p,
      stats: {
        ...p.stats,
        byBotLevel: { ...p.stats.byBotLevel },
        badges: p.stats.badges.slice(),
        puzzleProgress: { ...(p.stats.puzzleProgress ?? {}) }
      }
    })),
    settings: { ...s.settings },
    savedGames: { ...s.savedGames }
  };
}

// Unused re-exports to keep bundler happy for tree-shaking consumers.
export type { Profile, Settings, Store };
