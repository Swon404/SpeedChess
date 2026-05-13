import {
  createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState
} from "react";
import {
  Color, GameState, Move, PieceType, Square, initialState, pieceAt
} from "./engine/board";
import {
  forfeitMove, gameResult, inCheck, legalMovesFrom, makeMove
} from "./engine/rules";
import { toSAN } from "./engine/notation";
import { chooseBotMove } from "./engine/bot";
import {
  evaluateMoveFeedback,
  type GamePerformanceSummary,
  type MoveFeedback,
  summarizeMoveGrades
} from "./engine/performance";
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
  | { kind: "portal"; opponent: "two-player" | { kind: "bot"; level: number }; creator: PieceType; portalMax?: number };
export interface Players { w: string; b: string; }

interface RatedMoveFeedback extends MoveFeedback {
  color: Color;
  moveNumber: number;
  playerName: string;
}

export interface RatedMoveEntry extends RatedMoveFeedback {
  san: string;
}

type CachedRatedMoveEntry = Omit<RatedMoveEntry, "playerName">;

interface PlayerGamePerformance extends GamePerformanceSummary {
  color: Color;
  playerName: string;
  addedStars: number;
  totalStars: number | null;
  mode: "bot" | "human";
}

interface NewGameOptions {
  timerSeconds?: number;
}

/** Build the initial state for Portal Chess (creator-type portals). */
function portalInitialState(creator: PieceType, portalMax = 2): GameState {
  const s = initialState();
  s.portals = { w: [], b: [], max: portalMax };
  s.portalCreators = { w: creator, b: creator };
  s.portalAdjacencyRule = false;
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
  lastMoveReplayNonce: number;
  replayLastMove(): void;
  undo(): void;
  newGame(mode: Mode, players?: Partial<Players>, opts?: NewGameOptions): void;
  forfeit(): void;

  // puzzles
  loadPosition(state: GameState, players?: Partial<Players>, opts?: { noTimer?: boolean }): void;
  recordPuzzleSolved(puzzleId: string): void;
  recordPuzzleAttempt(puzzleId: string): void;

  // hint
  hint: Move | null;
  requestHint(): void;
  clearHint(): void;

  moveFeedback: RatedMoveFeedback | null;
  clearMoveFeedback(): void;
  ratedMoves: RatedMoveEntry[];
  gamePerformance: { w: PlayerGamePerformance | null; b: PlayerGamePerformance | null };

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

function triggerHaptics(enabled: boolean, pattern: number | number[]) {
  if (!enabled || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore unsupported or blocked vibration requests.
  }
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
  const [lastMoveReplayNonce, setLastMoveReplayNonce] = useState(0);
  const [moveFeedback, setMoveFeedback] = useState<RatedMoveFeedback | null>(null);
  const [gamePerformance, setGamePerformance] = useState<{ w: PlayerGamePerformance | null; b: PlayerGamePerformance | null }>(blankGamePerformance());
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  // Track latest store for callbacks that need the freshest settings.
  const storeRef = useRef(store);
  useEffect(() => { storeRef.current = store; }, [store]);
  const moveFeedbackTimeoutRef = useRef<number | null>(null);
  const moveGradesRef = useRef<{ w: number[]; b: number[] }>({ w: [], b: [] });
  const queuedMoveSoundRef = useRef<"blunder" | "grandmaster" | null>(null);
  const ratedMoveCacheRef = useRef<Array<CachedRatedMoveEntry | null>>([]);

  useEffect(() => () => {
    if (moveFeedbackTimeoutRef.current !== null) window.clearTimeout(moveFeedbackTimeoutRef.current);
  }, []);

  const activeProfile = useMemo(
    () => store.profiles.find((p) => p.id === store.settings.activeProfileId) ?? null,
    [store]
  );

  const ratedMoves = useMemo<RatedMoveEntry[]>(() => {
    const cache = ratedMoveCacheRef.current.slice(0, state.history.length);
    for (let index = 0; index < state.history.length; index++) {
      if (cache[index]) continue;
      const before = stack[index];
      const after = stack[index + 1];
      const move = after?.history[index];
      if (!move || move.from.file < 0) {
        cache[index] = null;
        continue;
      }
      const feedback = evaluateMoveFeedback(before, move);
      cache[index] = {
        ...feedback,
        color: move.color,
        moveNumber: index + 1,
        san: move.san ?? ""
      };
    }
    ratedMoveCacheRef.current = cache;
    return cache.flatMap((entry) => {
      if (!entry) return [];
      return [{
        ...entry,
        playerName: entry.color === "w" ? players.w : players.b
      }];
    });
  }, [stack, state.history.length, players]);

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
        queuedMoveSoundRef.current = null;
        playSound(winnerIsPlayer ? "win" : (botLevelOf(mode) !== null ? "loss" : "win"));
      } else if (result.kind !== "ongoing") {
        queuedMoveSoundRef.current = null;
        playSound("draw");
      } else if (queuedMoveSoundRef.current && lastMove) {
        playSound(queuedMoveSoundRef.current);
        queuedMoveSoundRef.current = null;
      } else if (isCheck) {
        playSound("check");
      } else if (lastMove?.isPortalEntry) {
        playSound("teleport");
      } else if (lastMove?.captured) {
        if (!store.settings.explodeOnCapture) playSound("capture");
      } else {
        playSound("move");
      }
    }
    soundedLenRef.current = state.history.length;
  }, [state, result, mode, store.settings.sound, store.settings.explodeOnCapture]);

  const hapticsLenRef = useRef<number>(state.history.length);
  useEffect(() => {
    if (!store.settings.haptics) {
      hapticsLenRef.current = state.history.length;
      return;
    }
    if (state.history.length > hapticsLenRef.current) {
      const lastMove = state.history[state.history.length - 1];
      const isCheck = result.kind === "ongoing" && isInCheckNow(state);
      if (result.kind === "checkmate") {
        triggerHaptics(true, [60, 40, 90]);
      } else if (result.kind !== "ongoing") {
        triggerHaptics(true, [45, 30, 45]);
      } else if (isCheck) {
        triggerHaptics(true, [35, 25, 55]);
      } else if (lastMove?.captured) {
        triggerHaptics(true, 45);
      } else if (lastMove?.isPortalEntry) {
        triggerHaptics(true, [18, 20, 18]);
      } else {
        triggerHaptics(true, 20);
      }
    }
    hapticsLenRef.current = state.history.length;
  }, [state, result, store.settings.haptics]);

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
        // Compute the bot move and ensure enough time has elapsed so the
        // human's own animation has time to play before the board re-renders
        // with the bot's response. Delay scales with animation-speed setting
        // so replay/slow modes remain visually readable.
        const speed = store.settings.animationSpeed;
        const minThinkMs =
          speed === "very-slow"
            ? 950
            : speed === "slow"
              ? 600
              : 400;
        const t0 = performance.now();
        const move = await chooseBotMove(state, lvl, { allowExternal: mode.kind === "bot" });
        const elapsed = performance.now() - t0;
        if (elapsed < minThinkMs) {
          await new Promise((r) => setTimeout(r, minThinkMs - elapsed));
        }
        if (cancelled) return;
        if (move) {
          const feedback = evaluateMoveFeedback(state, move);
          queuedMoveSoundRef.current = feedback.grade === 0 ? "blunder" : null;
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
  }, [state, mode, result.kind, paused, store.settings.animationSpeed]);

  // Auto-record result when game ends
  const recordedRef = useRef<number>(-1);
  useEffect(() => {
    if (result.kind === "ongoing") return;
    if (recordedRef.current === stack.length) return;
    recordedRef.current = stack.length;
    const winner = result.kind === "checkmate" ? result.winner : null;
    const updated = cloneStore(store);
    const lvl = botLevelOf(mode);
    const summaries = {
      w: isHumanControlledColor(mode, "w") ? summarizeMoveGrades(moveGradesRef.current.w) : null,
      b: isHumanControlledColor(mode, "b") ? summarizeMoveGrades(moveGradesRef.current.b) : null
    };
    const nextPerformance = blankGamePerformance();
    if (lvl !== null) {
      const outcome: "win" | "loss" | "draw" =
        winner === null ? "draw" : winner === "w" ? "win" : "loss";
      if (activeProfile && summaries.w) {
        recordResult(updated, activeProfile.id, { kind: "bot", level: lvl }, outcome, {
          stars: summaries.w.stars,
          score: summaries.w.score,
          moveGrades: moveGradesRef.current.w
        });
        saveActiveGame(updated, activeProfile.id, null);
        const refreshed = updated.profiles.find((p) => p.id === activeProfile.id) ?? null;
        nextPerformance.w = toPlayerGamePerformance("w", players.w, summaries.w, refreshed?.stats.totalStars ?? null, "bot");
      } else if (summaries.w) {
        nextPerformance.w = toPlayerGamePerformance("w", players.w, summaries.w, null, "bot");
      }
    } else {
      // two-player: record vs each named profile if found
      const wProf = updated.profiles.find((p) => p.name === players.w);
      const bProf = updated.profiles.find((p) => p.name === players.b);
      const wOutcome: "win" | "loss" | "draw" = winner === null ? "draw" : winner === "w" ? "win" : "loss";
      const bOutcome: "win" | "loss" | "draw" = winner === null ? "draw" : winner === "b" ? "win" : "loss";
      if (wProf && summaries.w) {
        recordResult(updated, wProf.id, { kind: "human" }, wOutcome, {
          stars: summaries.w.stars,
          score: summaries.w.score,
          moveGrades: moveGradesRef.current.w
        });
      }
      if (bProf && summaries.b) {
        recordResult(updated, bProf.id, { kind: "human" }, bOutcome, {
          stars: summaries.b.stars,
          score: summaries.b.score,
          moveGrades: moveGradesRef.current.b
        });
      }
      if (summaries.w) nextPerformance.w = toPlayerGamePerformance("w", players.w, summaries.w, wProf?.stats.totalStars ?? null, "human");
      if (summaries.b) nextPerformance.b = toPlayerGamePerformance("b", players.b, summaries.b, bProf?.stats.totalStars ?? null, "human");
      if (activeProfile) saveActiveGame(updated, activeProfile.id, null);
    }
    setStore(updated);
    setGamePerformance(nextPerformance);
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
    const mover = state.turn;
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
    const feedback = isHumanControlledColor(mode, mover) ? evaluateMoveFeedback(state, move) : null;
    const san = toSAN(state, move);
    dispatch({ type: "make", move, san });
    setSelected(null);
    if (feedback) {
      queuedMoveSoundRef.current = feedback.sound;
      moveGradesRef.current[mover] = [...moveGradesRef.current[mover], feedback.grade];
      setGamePerformance(blankGamePerformance());
      setMoveFeedback({
        ...feedback,
        color: mover,
        moveNumber: state.history.length + 1,
        playerName: mover === "w" ? players.w : players.b
      });
      if (moveFeedbackTimeoutRef.current !== null) window.clearTimeout(moveFeedbackTimeoutRef.current);
      moveFeedbackTimeoutRef.current = window.setTimeout(() => setMoveFeedback(null), 2100);
    }
    return true;
  }, [state, paused, mode, players]);

  const replayLastMove = useCallback(() => {
    if (state.history.length === 0) return;
    setLastMoveReplayNonce((n) => n + 1);
  }, [state.history.length]);

  const undo = useCallback(() => {
    const undoCount = botLevelOf(mode) !== null ? 2 : 1;
    const undoneMoves = state.history.slice(-undoCount);
    for (const move of undoneMoves) {
      if (move && move.from.file >= 0 && isHumanControlledColor(mode, move.color)) {
        moveGradesRef.current[move.color] = moveGradesRef.current[move.color].slice(0, -1);
      }
    }
    // Undo twice if playing a bot and it's the human's turn (to remove bot reply + own move).
    dispatch({ type: "undo" });
    if (botLevelOf(mode) !== null) dispatch({ type: "undo" });
    setSelected(null);
    queuedMoveSoundRef.current = null;
    setMoveFeedback(null);
    setGamePerformance(blankGamePerformance());
  }, [mode, state.history]);

  const newGame = useCallback((m: Mode, p?: Partial<Players>, opts?: NewGameOptions) => {
    if (
      result.kind === "ongoing" &&
      state.history.length > 0 &&
      typeof window !== "undefined" &&
      !window.confirm("Start a new game? Your current game will be replaced.")
    ) {
      return;
    }
    clearActiveSession();
    noTimerRef.current = false;
    if (opts?.timerSeconds !== undefined && opts.timerSeconds !== storeRef.current.settings.timerSeconds) {
      const updated = cloneStore(storeRef.current);
      updateSettings(updated, { timerSeconds: opts.timerSeconds });
      setStore(updated);
      storeRef.current = updated;
    }
    setMode(m);
    const defaultW = activeProfile?.name ?? "White";
    const defaultB =
      m.kind === "bot"
        ? `Bot Lv ${m.level}`
        : m.kind === "portal" && typeof m.opponent !== "string" && m.opponent.kind === "bot"
          ? `Bot Lv ${m.opponent.level}`
          : "Player 2";
    setPlayers({ w: p?.w ?? defaultW, b: p?.b ?? defaultB });
    const fresh = m.kind === "portal" ? portalInitialState(m.creator, m.portalMax ?? 2) : initialState();
    dispatch({ type: "new", initial: fresh });
    setSelected(null);
    setPaused(false);
    setLastMoveReplayNonce(0);
    moveGradesRef.current = { w: [], b: [] };
    queuedMoveSoundRef.current = null;
    if (moveFeedbackTimeoutRef.current !== null) window.clearTimeout(moveFeedbackTimeoutRef.current);
    setMoveFeedback(null);
    setGamePerformance(blankGamePerformance());
    // Force the clock to use the freshest timer setting — the caller often
    // updates settings immediately before calling newGame (e.g. the New Game
    // screen), so reading storeRef gives us the value they just picked
    // instead of the stale closure-captured one.
    const t = opts?.timerSeconds ?? storeRef.current.settings.timerSeconds;
    setTimeLeft(t > 0 ? t : Infinity);
  }, [activeProfile, result.kind, state.history.length]);

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
    setLastMoveReplayNonce(0);
    moveGradesRef.current = { w: [], b: [] };
    queuedMoveSoundRef.current = null;
    if (moveFeedbackTimeoutRef.current !== null) window.clearTimeout(moveFeedbackTimeoutRef.current);
    setMoveFeedback(null);
    setGamePerformance(blankGamePerformance());
    if (opts?.noTimer) setTimeLeft(Infinity);
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  const requestHint = useCallback(() => {
    (async () => {
      const best = await chooseBotMove(state, 5, { allowExternal: mode.kind === "bot" });
      if (best) setHint(best);
    })();
  }, [state, mode.kind]);
  const clearHint = useCallback(() => setHint(null), []);
  const clearMoveFeedback = useCallback(() => setMoveFeedback(null), []);

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
    select, tryMove, lastMoveReplayNonce, replayLastMove, undo, newGame, forfeit,
    loadPosition,
    recordPuzzleSolved, recordPuzzleAttempt,
    hint, requestHint, clearHint,
    moveFeedback, clearMoveFeedback, ratedMoves, gamePerformance,
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
        puzzleProgress: { ...(p.stats.puzzleProgress ?? {}) },
        performanceHistory: (p.stats.performanceHistory ?? []).map((record) => ({
          ...record,
          moveGrades: record.moveGrades?.slice()
        }))
      }
    })),
    settings: { ...s.settings },
    savedGames: { ...s.savedGames }
  };
}

function isHumanControlledColor(mode: Mode, color: Color): boolean {
  if (mode.kind === "bot") return color === "w";
  if (mode.kind === "portal") {
    if (typeof mode.opponent === "string") return true;
    return color === "w";
  }
  return true;
}

function blankGamePerformance(): { w: PlayerGamePerformance | null; b: PlayerGamePerformance | null } {
  return { w: null, b: null };
}

function toPlayerGamePerformance(
  color: Color,
  playerName: string,
  summary: GamePerformanceSummary,
  totalStars: number | null,
  mode: "bot" | "human"
): PlayerGamePerformance {
  return {
    ...summary,
    color,
    playerName,
    addedStars: summary.stars,
    totalStars,
    mode
  };
}

// Unused re-exports to keep bundler happy for tree-shaking consumers.
export type { Profile, Settings, Store };
