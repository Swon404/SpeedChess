import { type RatedMoveEntry, useGame } from "../GameContext";

export function MoveList() {
  const { ratedMoves, players } = useGame();
  const rows: Array<{ n: number; w: RatedMoveEntry | null; b: RatedMoveEntry | null }> = [];
  for (let i = 0; i < ratedMoves.length; i += 2) {
    rows.push({
      n: Math.floor(i / 2) + 1,
      w: ratedMoves[i] ?? null,
      b: ratedMoves[i + 1] ?? null
    });
  }
  return (
    <div className="movelist">
      <h3>Moves</h3>
      <div className="movelist-head">
        <span className="movelist-spacer" aria-hidden="true" />
        <span>{players.w}</span>
        <span>{players.b}</span>
      </div>
      <ol>
        {rows.map((r) => (
          <li key={r.n}>
            <span className="move-num">{r.n}.</span>
            <MoveCell move={r.w} />
            <MoveCell move={r.b} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function MoveCell({ move }: { move: RatedMoveEntry | null }) {
  if (!move) return <span className="move-cell move-cell-empty">-</span>;
  return (
    <span className={`move-cell move-cell-${move.color}`} title={`${move.playerName}: ${move.title} · ${move.score}/100`}>
      <span className="move-san">{move.san || "-"}</span>
      <span className="move-stars" aria-label={`${move.grade} star move`}>
        {"★".repeat(move.grade)}{"☆".repeat(5 - move.grade)}
      </span>
      <span className="move-label">{move.label}</span>
    </span>
  );
}
