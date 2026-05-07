import { allLegalMoves } from "../rules";
import { parseUci, toFEN, type GameState, type Move } from "../board";

const STOCKFISH_API_URL = "https://stockfish.online/api/s/v2.php";

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

export async function stockfishBestMove(state: GameState, level: number): Promise<Move | null> {
  if (state.portals) return null;
  const legal = allLegalMoves(state);
  if (legal.length === 0) return null;

  const fen = toFEN(state);
  const depth = depthForLevel(level);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const url = `${STOCKFISH_API_URL}?fen=${encodeURIComponent(fen)}&depth=${depth}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { success?: boolean; bestmove?: string };
    if (data.success === false) return null;

    const uci = parseBestMoveUci(data.bestmove);
    if (!uci) return null;
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

    // Some APIs omit promotion suffixes; allow a non-promotion fallback.
    return (
      legal.find(
        (m) =>
          m.from.file === parsed.from.file &&
          m.from.rank === parsed.from.rank &&
          m.to.file === parsed.to.file &&
          m.to.rank === parsed.to.rank
      ) ?? null
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
