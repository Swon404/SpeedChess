import { allLegalMoves } from "../rules";
import { parseUci, toFEN, type GameState, type Move } from "../board";

const STOCKFISH_API_URL = "https://stockfish.online/api/s/v2.php";

export interface StockfishAnalysis {
  evaluation: number | null;
  mate: number | null;
  bestmoveUci: string | null;
  continuation: string | null;
}

function depthForLevel(level: number): number {
  const clamped = Math.max(5, Math.min(20, level));
  // Smoothly scale search depth from about 8 to 20 over levels 5..20.
  return Math.max(8, Math.min(20, 8 + Math.round(((clamped - 5) / 15) * 12)));
}

function parseBestMoveUci(raw: string | undefined): string | null {
  if (!raw) return null;
  const direct = raw.trim();
  if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(direct)) return direct.toLowerCase();
  const match = raw.match(/bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function stockfishMoveFromUci(state: GameState, uci: string | null): Move | null {
  if (!uci) return null;
  const legal = allLegalMoves(state);
  if (legal.length === 0) return null;

  const parsed = parseUci(uci);
  const exact = legal.find(
    (m) =>
      m.from.file === parsed.from.file &&
      m.from.rank === parsed.from.rank &&
      m.to.file === parsed.to.file &&
      m.to.rank === parsed.to.rank &&
      (parsed.promotion ? m.promotion === parsed.promotion : true)
  );
  if (exact) return exact;

  return (
    legal.find(
      (m) =>
        m.from.file === parsed.from.file &&
        m.from.rank === parsed.from.rank &&
        m.to.file === parsed.to.file &&
        m.to.rank === parsed.to.rank
    ) ?? null
  );
}

export async function stockfishAnalyzePosition(state: GameState, level = 12): Promise<StockfishAnalysis | null> {
  if (state.portals) return null;

  const fen = toFEN(state);
  const depth = depthForLevel(level);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const url = `${STOCKFISH_API_URL}?fen=${encodeURIComponent(fen)}&depth=${depth}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      evaluation?: number | string | null;
      mate?: number | string | null;
      bestmove?: string;
      continuation?: string | null;
    };
    if (data.success === false) return null;

    return {
      evaluation: toFiniteNumber(data.evaluation),
      mate: toFiniteNumber(data.mate),
      bestmoveUci: parseBestMoveUci(data.bestmove),
      continuation: data.continuation ?? null
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function stockfishBestMove(state: GameState, level: number): Promise<Move | null> {
  if (state.portals) return null;
  const analysis = await stockfishAnalyzePosition(state, level);
  return stockfishMoveFromUci(state, analysis?.bestmoveUci ?? null);
}
