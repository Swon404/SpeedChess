import { useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../GameContext";
import { getPerformanceSummary } from "../engine/storage";

export function ProfileScreen() {
  const { store, activeProfile, addProfile, setActiveProfile, removeProfile, renamePlayer } = useGame();
  const [newName, setNewName] = useState("");

  return (
    <div className="screen">
      <div className="topbar">
        <Link to="/">← Home</Link>
        <Link to="/settings">⚙ Settings</Link>
      </div>
      <h2>Players</h2>
      <div className="new-player">
        <input
          placeholder="New player name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={24}
        />
        <button
          disabled={!newName.trim()}
          onClick={() => { addProfile(newName); setNewName(""); }}
        >Add</button>
      </div>
      <ul className="profile-list">
        {store.profiles.map((p) => (
          <li key={p.id} className={activeProfile?.id === p.id ? "active" : ""}>
            {(() => {
              const overall = getPerformanceSummary(p.stats, "all");
              const vsBot = getPerformanceSummary(p.stats, "bot");
              const local = getPerformanceSummary(p.stats, "human");
              return (
                <>
            <div className="profile-main">
              <strong>{p.name}</strong>
              <small> classic rating {p.stats.rating} · stars {p.stats.totalStars ?? 0} · {p.stats.wins}W/{p.stats.losses}L/{p.stats.draws}D</small>
            </div>
            <div className="profile-performance-grid">
              <div className="profile-performance-row">
                <span>Overall</span>
                <strong>{overall.overall.rating}</strong>
                <strong>{overall.last7Days.rating}</strong>
                <strong>{overall.last30Days.rating}</strong>
              </div>
              <div className="profile-performance-row muted">
                <span>Vs bot</span>
                <strong>{vsBot.overall.rating}</strong>
                <strong>{vsBot.last7Days.rating}</strong>
                <strong>{vsBot.last30Days.rating}</strong>
              </div>
              <div className="profile-performance-row muted">
                <span>Local</span>
                <strong>{local.overall.rating}</strong>
                <strong>{local.last7Days.rating}</strong>
                <strong>{local.last30Days.rating}</strong>
              </div>
              <div className="profile-performance-header">
                <span>Mode</span>
                <span>Life</span>
                <span>7d</span>
                <span>30d</span>
              </div>
            </div>
            <div className="profile-actions">
              <button onClick={() => setActiveProfile(p.id)}>
                {activeProfile?.id === p.id ? "Active" : "Use"}
              </button>
              <button onClick={() => {
                const n = prompt("Rename player:", p.name);
                if (n) renamePlayer(p.id, n);
              }}>Rename</button>
              <button onClick={() => {
                if (confirm(`Delete ${p.name}? Stats will be lost.`)) removeProfile(p.id);
              }}>Delete</button>
            </div>
                </>
              );
            })()}
          </li>
        ))}
        {store.profiles.length === 0 && <li className="empty">No players yet — add one above.</li>}
      </ul>
    </div>
  );
}
