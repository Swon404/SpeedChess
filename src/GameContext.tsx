import {
  createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState
} from "react";
import {
  GameState, Move, Square, initialState, pieceAt
} from "./engine/board";
import {
  forfeitMove, gameResult, legalMovesFrom, makeMove
} from "./engine/rules";
import { toSAN } from "./engine/notation";
import { chooseBotMove } from "./engine/bot";
import {
  load, Profile, recordResult, saveActiveGame, Settings, Store, updateSettings,
  createProfile, deleteProfile, renameProfile
} from "./engine/storage";

type Mode = { kind: "two-player" } | { kind: "bot"; level: number };

interface GameCtx {
  store: Store;
  activeProfile: Profile | null;
  state: GameState;
  mode: Mode;
  selected: Square | null;
  legalFromSelected: Move[];
  timeLeft: number; // seconds remaining for current move (Infinity if off)
  isBotThinking: boolean;
  result: ReturnType<typeof gameResult>;

  select(sq: Square | null): void;
  tryMove(from: Square, to: Square, promotion?: "Q" | "R" | "B" | "N"): boolean;
  undo(): void;
  newGame(mode: Mode, players?: { w?: string; b?: string }): void;
  forfeit(): void;

  // profile & settings
  setActiveProfile(id: string | null): void;
  addProfile(name: string): Profile;
  removeProfile(id: string): void;
  renamePlayer(id: string, name: string): void;
  updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void;
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
  const [mode, setMode] = useState<Mode>({ kind: "two-player" });
  const [stack, dispatch] = useReducer(reducer, undefined, () => [initialState()]);
  const state = stack[stack.length - 1];
  const [selected, setSelected] = useState<Square | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(
    store.settings.timerSeconds > 0 ? store.settings.timerSeconds : Infinity
  );
  const [isBotThinking, setIsBotThinking] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const activeProfile = useMemo(
    () => store.profiles.find((p) => p.id === store.settings.activeProfileId) ?? null,
    [store]
  );

  const result = useMemo(() => gameResult(state), [state]);

  // Reset timer on each turn change
  useEffect(() => {
    const t = store.settings.timerSeconds;
    setTimeLeft(t > 0 ? t : Infinity);
  }, [state.history.length, store.settings.timerSeconds]);

  // Tick timer
  useEffect(() => {
    if (result.kind !== "ongoing") return;
    if (!Number.isFinite(timeLeft)) return;
    if (isBotThinking) return;
    if (timeLeft <= 0) {
      dispatch({ type: "forfeit" });
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, isBotThinking, result.kind]);

  // Bot move
  useEffect(() => {
    if (mode.kind !== "bot") return;
    if (result.kind !== "ongoing") return;
    // Bot plays black by default
    if (state.turn !== "b") return;
    let cancelled = false;
    setIsBotThinking(true);
    (async () => {
      const move = await chooseBotMove(state, mode.level);
      if (cancelled) return;
      if (move) {
        const san = toSAN(state, move);
        dispatch({ type: "make", move, san });
      }
      setIsBotThinking(false);
    })();
    return () => { cancelled = true; };
  }, [state, mode, result.kind]);

  // Auto-record result when game ends
  const recordedRef = useRef<number>(-1);
  useEffect(() => {
    if (result.kind === "ongoing") return;
    if (recordedRef.current === stack.length) return;
    recordedRef.current = stack.length;
    if (!activeProfile) return;
    if (mode.kind !== "bot") return;
    let outcome: "win" | "loss" | "draw" = "draw";
    if (result.kind === "checkmate") {
      outcome = result.winner === "w" ? "win" : "loss";
    }
    const updated = cloneStore(store);
    recordResult(updated, activeProfile.id, { kind: "bot", level: mode.level }, outcome);
    saveActiveGame(updated, activeProfile.id, null);
    setStore(updated);
  }, [result, mode, activeProfile, store, stack.length]);

  // Persist active game
  useEffect(() => {
    if (!activeProfile) return;
    if (result.kind !== "ongoing") return;
    const updated = cloneStore(store);
    saveActiveGame(updated, activeProfile.id, {
      state,
      mode: mode.kind === "bot" ? "bot" : "two-player",
      botLevel: mode.kind === "bot" ? mode.level : undefined,
      players: { w: activeProfile.name, b: mode.kind === "bot" ? `Bot Lv ${mode.level}` : "Player 2" },
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

  const tryMove = useCallback((from: Square, to: Square, promotion?: "Q" | "R" | "B" | "N"): boolean => {
    const candidates = legalMovesFrom(state, from).filter(
      (m) => m.to.file === to.file && m.to.rank === to.rank
    );
    if (candidates.length === 0) return false;
    let move = candidates[0];
    if (candidates.some((m) => m.promotion)) {
      move = candidates.find((m) => m.promotion === (promotion ?? "Q")) ?? candidates[0];
    }
    const san = toSAN(state, move);
    dispatch({ type: "make", move, san });
    setSelected(null);
    return true;
  }, [state]);

  const undo = useCallback(() => {
    // Undo twice if playing a bot and it's the human's turn (to remove bot reply + own move).
    dispatch({ type: "undo" });
    if (mode.kind === "bot") dispatch({ type: "undo" });
    setSelected(null);
  }, [mode]);

  const newGame = useCallback((m: Mode) => {
    setMode(m);
    dispatch({ type: "new", initial: initialState() });
    setSelected(null);
  }, []);

  const forfeit = useCallback(() => dispatch({ type: "forfeit" }), []);

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
  }, [store]);

  const value: GameCtx = {
    store, activeProfile, state, mode, selected, legalFromSelected, timeLeft, isBotThinking, result,
    select, tryMove, undo, newGame, forfeit,
    setActiveProfile, addProfile, removeProfile, renamePlayer, updateSetting
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function cloneStore(s: Store): Store {
  return {
    profiles: s.profiles.map((p) => ({ ...p, stats: { ...p.stats, byBotLevel: { ...p.stats.byBotLevel }, badges: p.stats.badges.slice() } })),
    settings: { ...s.settings },
    savedGames: { ...s.savedGames }
  };
}

// Unused re-exports to keep bundler happy for tree-shaking consumers.
export type { Profile, Settings, Store };
