import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../GameContext";
import { getPerformanceSummary, type PerformanceMode } from "../engine/storage";

type WindowKey = "overall" | "last7Days" | "last30Days";

export function LeaderboardScreen() {
  const { store } = useGame();
  const [windowKey, setWindowKey] = useState<WindowKey>("overall");
  const [mode, setMode] = useState<PerformanceMode | "all">("all");
  const sorted = useMemo(() => store.profiles.slice().sort((a, b) => {
    const aSummary = getPerformanceSummary(a.stats, mode)[windowKey].rating;
    const bSummary = getPerformanceSummary(b.stats, mode)[windowKey].rating;
    if (bSummary !== aSummary) return bSummary - aSummary;
    return b.stats.rating - a.stats.rating;
  }), [store.profiles, mode, windowKey]);
  return (
    <div className="screen">
      <div className="topbar">
        <Link to="/">← Home</Link>
        <Link to="/settings">⚙ Settings</Link>
      </div>
      <h2>🏆 Leaderboard</h2>
      <div className="leaderboard-filters">
        <div className="difficulty">
          <button className={`pill ${windowKey === "overall" ? "active" : ""}`} onClick={() => setWindowKey("overall")}>Lifetime</button>
          <button className={`pill ${windowKey === "last7Days" ? "active" : ""}`} onClick={() => setWindowKey("last7Days")}>Last week</button>
          <button className={`pill ${windowKey === "last30Days" ? "active" : ""}`} onClick={() => setWindowKey("last30Days")}>Last month</button>
        </div>
        <div className="difficulty">
          <button className={`pill ${mode === "all" ? "active" : ""}`} onClick={() => setMode("all")}>All modes</button>
          <button className={`pill ${mode === "bot" ? "active" : ""}`} onClick={() => setMode("bot")}>Vs bot</button>
          <button className={`pill ${mode === "human" ? "active" : ""}`} onClick={() => setMode("human")}>Local</button>
        </div>
      </div>
      {sorted.length === 0 ? (
        <p>No players yet. <Link to="/profiles">Add one</Link>.</p>
      ) : (
        <table className="leaderboard">
          <thead>
            <tr><th>#</th><th>Player</th><th>Score</th><th>Stars</th><th>Games</th><th>Classic</th><th>Puzzles</th></tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              (() => {
                const perf = getPerformanceSummary(p.stats, mode)[windowKey];
                return (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>{p.name}</td>
                    <td>{perf.rating}</td>
                    <td>{windowKey === "overall" ? (p.stats.totalStars ?? 0) : perf.stars}</td>
                    <td>{perf.games}</td>
                    <td>{p.stats.rating}</td>
                    <td>{p.stats.puzzlesSolved}</td>
                  </tr>
                );
              })()
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
