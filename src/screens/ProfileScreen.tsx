import { useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../GameContext";

export function ProfileScreen() {
  const { store, activeProfile, addProfile, setActiveProfile, removeProfile, renamePlayer } = useGame();
  const [newName, setNewName] = useState("");

  return (
    <div className="screen">
      <div className="topbar"><Link to="/">← Home</Link></div>
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
            <div className="profile-main">
              <strong>{p.name}</strong>
              <small> rating {p.stats.rating} · {p.stats.wins}W/{p.stats.losses}L/{p.stats.draws}D</small>
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
          </li>
        ))}
        {store.profiles.length === 0 && <li className="empty">No players yet — add one above.</li>}
      </ul>
    </div>
  );
}
