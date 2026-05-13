import { opposite, type Color, type GameState, type Move } from "./board";
import { materialScore } from "./bot";
import { allLegalMoves, gameResult, inCheck, makeMove } from "./rules";

export type MoveGrade = 0 | 1 | 2 | 3 | 4 | 5;

export interface MoveFeedback {
  grade: MoveGrade;
  label: string;
  title: string;
  emoji: string;
  sound: "blunder" | "grandmaster" | null;
  score: number;
  loss: number;
}

export interface GamePerformanceSummary {
  stars: MoveGrade;
  score: number;
  title: string;
  summary: string;
  averageGrade: number;
}

const MOVE_FEEDBACK: Record<MoveGrade, Omit<MoveFeedback, "score" | "loss">> = {
  0: { grade: 0, label: "Donkey", title: "Donkey move", emoji: "🐴", sound: "blunder" },
  1: { grade: 1, label: "Wobbly", title: "Wobbly move", emoji: "🐑", sound: null },
  2: { grade: 2, label: "Solid", title: "Solid move", emoji: "🦫", sound: null },
  3: { grade: 3, label: "Clever", title: "Clever move", emoji: "🦊", sound: null },
  4: { grade: 4, label: "Sharp", title: "Sharp move", emoji: "🦅", sound: null },
  5: { grade: 5, label: "Grandmaster", title: "Grandmaster move", emoji: "🦁", sound: "grandmaster" }
};

function clampGrade(value: number): MoveGrade {
  return Math.max(0, Math.min(5, Math.round(value))) as MoveGrade;
}

function pieceDevelopmentBonus(state: GameState, color: Color): number {
  let score = 0;
  const homeRank = color === "w" ? 0 : 7;
  const pawnRank = color === "w" ? 1 : 6;

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = state.board[rank][file];
      if (!piece || piece.color !== color) continue;

      const distanceFromCenter = Math.abs(3.5 - file) + Math.abs(3.5 - rank);
      if ((piece.type === "N" || piece.type === "B") && rank !== homeRank) {
        score += 22;
        score += Math.max(0, 8 - distanceFromCenter * 2);
      }
      if (piece.type === "P") {
        if (rank !== pawnRank) score += 4;
        if ((file === 3 || file === 4) && (rank === 3 || rank === 4)) score += 20;
        if ((file === 2 || file === 5) && (rank === 2 || rank === 5)) score += 6;
        if ((file === 5 || file === 6) && Math.abs(rank - pawnRank) > 0 && !state.history.some((m) => m.color === color && m.isCastle)) {
          score -= 18;
        }
      }
      if (piece.type === "Q" && rank !== homeRank) {
        score -= 14;
      }
      if (piece.type === "K" && file !== 4 && rank !== homeRank) {
        score += 26;
      }
    }
  }

  return Math.round(score);
}

function centerControlBonus(state: GameState, color: Color): number {
  const centers = [
    { file: 3, rank: 3 },
    { file: 4, rank: 3 },
    { file: 3, rank: 4 },
    { file: 4, rank: 4 }
  ];
  let score = 0;
  for (const square of centers) {
    const piece = state.board[square.rank][square.file];
    if (piece?.color === color) score += 12;
    else if (piece?.color === opposite(color)) score -= 12;
  }
  return score;
}

function tacticalThreatBonus(state: GameState, color: Color): number {
  const enemy = opposite(color);
  const enemyMoves = allLegalMoves({ ...state, turn: enemy });
  const ownMoves = allLegalMoves(state);
  return ownMoves.length * 2 - enemyMoves.length;
}

function evaluatePosition(state: GameState, color: Color): number {
  const result = gameResult(state);
  if (result.kind === "checkmate") {
    return result.winner === color ? 1_000_000 : -1_000_000;
  }
  if (result.kind !== "ongoing") return 0;

  let score = materialScore(state, color);
  score += pieceDevelopmentBonus(state, color);
  score += centerControlBonus(state, color);
  score += tacticalThreatBonus(state, color);
  if (inCheck(state, opposite(color))) score += 40;
  if (inCheck(state, color)) score -= 55;

  const lastMove = state.history[state.history.length - 1];
  if (lastMove?.promotion) score += 120;
  if (lastMove?.isPortalEntry) score += 18;

  return score;
}

function gradeFromLoss(loss: number): MoveGrade {
  if (loss <= 15) return 5;
  if (loss <= 60) return 4;
  if (loss <= 140) return 3;
  if (loss <= 260) return 2;
  if (loss <= 450) return 1;
  return 0;
}

export function describeMoveGrade(grade: MoveGrade): Omit<MoveFeedback, "score" | "loss"> {
  return MOVE_FEEDBACK[grade];
}

export function evaluateMoveFeedback(state: GameState, move: Move): MoveFeedback {
  const color = state.turn;
  const moves = allLegalMoves(state);
  if (moves.length === 0) {
    const fallback = MOVE_FEEDBACK[2];
    return { ...fallback, score: 50, loss: 0 };
  }

  let bestScore = -Infinity;
  let moveScore = -Infinity;

  for (const candidate of moves) {
    const next = makeMove(state, candidate);
    const score = evaluateMoveLine(next, color);
    if (score > bestScore) bestScore = score;
    if (
      candidate.from.file === move.from.file &&
      candidate.from.rank === move.from.rank &&
      candidate.to.file === move.to.file &&
      candidate.to.rank === move.to.rank &&
      candidate.promotion === move.promotion &&
      candidate.portalTo?.file === move.portalTo?.file &&
      candidate.portalTo?.rank === move.portalTo?.rank
    ) {
      moveScore = score;
    }
  }

  if (!Number.isFinite(moveScore)) {
    moveScore = evaluateMoveLine(makeMove(state, move), color);
    if (!Number.isFinite(bestScore)) bestScore = moveScore;
  }

  const loss = Math.max(0, bestScore - moveScore);
  const grade = gradeFromLoss(loss);
  const feedback = MOVE_FEEDBACK[grade];
  const score = Math.max(0, Math.min(100, Math.round(100 - loss / 12)));
  return { ...feedback, score, loss };
}

function evaluateMoveLine(next: GameState, color: Color): number {
  const immediate = evaluatePosition(next, color);
  const result = gameResult(next);
  if (result.kind !== "ongoing") return immediate;

  const replies = allLegalMoves(next);
  if (replies.length === 0) return immediate;

  let worstReply = Infinity;
  for (const reply of replies) {
    const replyState = makeMove(next, reply);
    const replyScore = evaluatePosition(replyState, color);
    if (replyScore < worstReply) worstReply = replyScore;
  }

  return Math.round(immediate * 0.45 + worstReply * 0.55);
}

export function summarizeMoveGrades(grades: number[]): GamePerformanceSummary {
  if (grades.length === 0) {
    return {
      stars: 0,
      score: 0,
      title: "No rating yet",
      summary: "Make a few moves to earn stars.",
      averageGrade: 0
    };
  }

  const total = grades.reduce((sum, grade) => sum + clampGrade(grade), 0);
  const averageGrade = total / grades.length;
  const stars = clampGrade(Math.round(averageGrade));
  const strongMoves = grades.filter((grade) => grade >= 4).length;
  const blunders = grades.filter((grade) => grade === 0).length;
  const score = Math.max(0, Math.min(100, Math.round((averageGrade / 5) * 100 + strongMoves * 2 - blunders * 4)));

  let summary = "A good learning game.";
  if (stars === 5) summary = "Brilliant choices almost all game.";
  else if (stars === 4) summary = "Strong play with lots of sharp ideas.";
  else if (stars === 3) summary = "Good thinking and a few clever moves.";
  else if (stars === 2) summary = "Plenty of solid moves to build on.";
  else if (stars === 1) summary = "A wobbly game, but there were useful ideas.";
  else summary = "Tough game. Slow down and look for safer moves.";

  return {
    stars,
    score,
    title: `${MOVE_FEEDBACK[stars].label} game`,
    summary,
    averageGrade: Math.round(averageGrade * 10) / 10
  };
}