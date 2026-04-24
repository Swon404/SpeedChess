import { useGame } from "../GameContext";

export function MoveList() {
  const { state } = useGame();
  const rows: Array<{ n: number; w: string; b: string }> = [];
  for (let i = 0; i < state.history.length; i += 2) {
    rows.push({
      n: Math.floor(i / 2) + 1,
      w: state.history[i]?.san ?? "",
      b: state.history[i + 1]?.san ?? ""
    });
  }
  return (
    <div className="movelist">
      <h3>Moves</h3>
      <ol>
        {rows.map((r) => (
          <li key={r.n}>
            <span className="move-num">{r.n}.</span>
            <span>{r.w}</span>
            <span>{r.b}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
