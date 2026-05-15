import { afterEach, describe, expect, it } from "vitest";
import {
  getPerformanceSummary,
  load,
  recordResult,
  type Store
} from "../storage";

function installStorage(raw?: string) {
  const values = new Map<string, string>();
  if (raw !== undefined) values.set("speedchess.v1", raw);
  const localStorageMock = {
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    }
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    configurable: true,
    writable: true
  });
}

function makeStore(): Store {
  return {
    profiles: [{
      id: "p1",
      name: "Stew",
      createdAt: 1,
      stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        rating: 800,
        byBotLevel: {},
        puzzlesSolved: 0,
        streak: 0,
        badges: [],
        puzzleProgress: {},
        totalStars: 0,
        performanceHistory: []
      }
    }],
    settings: {
      activeProfileId: "p1",
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
    },
    savedGames: {}
  };
}

afterEach(() => {
  // @ts-expect-error test cleanup
  delete globalThis.localStorage;
});

describe("storage performance history", () => {
  it("loads older profiles with default performance fields", () => {
    installStorage(JSON.stringify({
      profiles: [{
        id: "p1",
        name: "Old Profile",
        createdAt: 1,
        stats: {
          wins: 2,
          losses: 1,
          draws: 3,
          rating: 840,
          byBotLevel: {},
          puzzlesSolved: 0,
          streak: 1,
          badges: []
        }
      }],
      settings: {},
      savedGames: {}
    }));

    const store = load();
    expect(store.profiles[0].stats.totalStars).toBe(0);
    expect(store.profiles[0].stats.performanceHistory).toEqual([]);
  });

  it("records stars and summarizes overall, weekly, and monthly ratings", () => {
    installStorage();
    const now = Date.UTC(2026, 4, 12);
    const store = makeStore();

    recordResult(store, "p1", { kind: "bot", level: 3 }, "win", {
      playedAt: now,
      stars: 5,
      score: 96,
      moveGrades: [5, 4, 5]
    });
    recordResult(store, "p1", { kind: "human" }, "draw", {
      playedAt: now - 8 * 24 * 60 * 60 * 1000,
      stars: 2,
      score: 61,
      moveGrades: [2, 3, 1]
    });
    recordResult(store, "p1", { kind: "human" }, "loss", {
      playedAt: now - 40 * 24 * 60 * 60 * 1000,
      stars: 1,
      score: 28,
      moveGrades: [1, 0, 2]
    });
    recordResult(store, "p1", { kind: "bot", level: 12 }, "win", {
      playedAt: now - 2 * 24 * 60 * 60 * 1000,
      stars: 3,
      score: 70,
      moveGrades: [3, 3, 4]
    });

    const stats = store.profiles[0].stats;
    const all = getPerformanceSummary(stats, "all", now);
    const human = getPerformanceSummary(stats, "human", now);
    const bot = getPerformanceSummary(stats, "bot", now);

    expect(stats.totalStars).toBe(11);
    expect(all.overall.games).toBe(4);
    expect(all.overall.rating).toBe(63);
    expect(all.last7Days.games).toBe(2);
    expect(all.last7Days.rating).toBe(80);
    expect(all.last30Days.games).toBe(3);
    expect(all.last30Days.rating).toBe(74);
    expect(all.last30Days.stars).toBe(10);
    expect(human.overall.games).toBe(2);
    expect(human.last7Days.games).toBe(0);
    expect(human.last30Days.games).toBe(1);
    expect(human.last30Days.rating).toBe(61);
    expect(bot.overall.games).toBe(2);
    expect(bot.overall.rating).toBe(80);
  });
});