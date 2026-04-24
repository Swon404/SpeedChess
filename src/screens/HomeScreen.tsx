import { Link } from "react-router-dom";
import { useGame } from "../GameContext";

export function HomeScreen() {
  const { activeProfile } = useGame();
  return (
    <div className="screen home">
      <h1>♞ SpeedChess</h1>
      <p className="tagline">A friendly chess game for learners.</p>
      <div className="who">
        {activeProfile
          ? <>Playing as <strong>{activeProfile.name}</strong> · <Link to="/profiles">switch</Link></>
          : <Link to="/profiles">Create a player to get started</Link>}
      </div>
      <div className="menu">
        <Link className="menu-btn" to="/new">▶ Play</Link>
        <Link className="menu-btn" to="/puzzles">🧩 Puzzles</Link>
        <Link className="menu-btn" to="/learn">🧠 Learn</Link>
        <Link className="menu-btn" to="/leaderboard">🏆 Leaderboard</Link>
        <Link className="menu-btn" to="/profiles">👤 Players</Link>
        <Link className="menu-btn" to="/settings">⚙ Settings</Link>
      </div>
    </div>
  );
}
