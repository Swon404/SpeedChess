import { Link } from "react-router-dom";
import { useGame } from "../GameContext";

export function LeaderboardScreen() {
  const { store } = useGame();
  const sorted = store.profiles.slice().sort((a, b) => b.stats.rating - a.stats.rating);
  return (
    <div className="screen">
      <div className="topbar">
        <Link to="/">← Home</Link>
        <Link to="/settings">⚙ Settings</Link>
      </div>
      <h2>🏆 Leaderboard</h2>
      {sorted.length === 0 ? (
        <p>No players yet. <Link to="/profiles">Add one</Link>.</p>
      ) : (
        <table className="leaderboard">
          <thead>
            <tr><th>#</th><th>Player</th><th>Rating</th><th>W</th><th>L</th><th>D</th><th>Puzzles</th><th>Badges</th></tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td>{p.name}</td>
                <td>{p.stats.rating}</td>
                <td>{p.stats.wins}</td>
                <td>{p.stats.losses}</td>
                <td>{p.stats.draws}</td>
                <td>{p.stats.puzzlesSolved}</td>
                <td>{p.stats.badges.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
