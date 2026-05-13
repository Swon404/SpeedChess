import { useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../GameContext";
import { getPerformanceSummary } from "../engine/storage";

function pct(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return "No games yet";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(timestamp);
}

function formatTimer(seconds: number | undefined): string {
  if (seconds === undefined) return "No data yet";
  if (seconds <= 0) return "No clock";
  if (seconds < 60) return `${seconds}s per move`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m per move` : `${minutes}m ${remainder}s per move`;
}

function averageTimerSeconds(timers: Array<number | undefined>): number | undefined {
  const valid = timers.filter((timer): timer is number => typeof timer === "number");
  if (valid.length === 0) return undefined;
  return Math.round(valid.reduce((sum, timer) => sum + timer, 0) / valid.length);
}

function matchRatingHint(rating: number, games: number): string {
  const delta = rating - 800;
  if (games === 0) return "Starts at 800 in SpeedChess";
  if (delta === 0) return "At the SpeedChess starting rating of 800";
  if (delta > 0) return `${delta} above the 800 starting rating`;
  return `${Math.abs(delta)} below the 800 starting rating`;
}

function matchRatingBand(rating: number): string {
  if (rating < 700) return "Beginner";
  if (rating < 850) return "Learning";
  if (rating < 1000) return "Improving";
  if (rating < 1150) return "Strong";
  if (rating < 1300) return "Expert";
  return "Masterful";
}

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
      <p className="profile-screen-note">
        Match rating starts at 800 and moves with wins and losses. Performance rating and average score are out of 100. Stars are out of 5 per game.
      </p>
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
              const history = p.stats.performanceHistory ?? [];
              const totalGames = p.stats.wins + p.stats.losses + p.stats.draws;
              const lastPlayedAt = history.length > 0 ? Math.max(...history.map((record) => record.playedAt)) : undefined;
              const averageStars = history.length > 0
                ? history.reduce((sum, record) => sum + record.stars, 0) / history.length
                : 0;
              const averageScore = history.length > 0
                ? history.reduce((sum, record) => sum + record.score, 0) / history.length
                : 0;
              const averageTimer = averageTimerSeconds(history.map((record) => record.timerSeconds));
              const statCards = [
                { label: "Match rating", value: `${p.stats.rating} · ${matchRatingBand(p.stats.rating)}`, hint: `${matchRatingHint(p.stats.rating, totalGames)} · ${totalGames} games played` },
                { label: "Performance rating", value: `${overall.overall.rating} / 100`, hint: "Weighted move quality" },
                { label: "Win rate", value: pct(p.stats.wins, totalGames), hint: `${p.stats.wins}W ${p.stats.losses}L ${p.stats.draws}D` },
                { label: "Average stars", value: history.length > 0 ? `${averageStars.toFixed(1)} / 5` : "No games", hint: `${p.stats.totalStars ?? 0} total stars` },
                { label: "Average score", value: history.length > 0 ? `${Math.round(averageScore)} / 100` : "No games", hint: "Across rated games" },
                { label: "Average timer", value: formatTimer(averageTimer), hint: `Last played ${formatDate(lastPlayedAt)}` }
              ];
              const performanceSections = [
                {
                  label: "Overall",
                  hint: "All rated games",
                  summary: overall
                },
                {
                  label: "Vs bot",
                  hint: "Engine and bot matches",
                  summary: vsBot
                },
                {
                  label: "Local",
                  hint: "Pass-and-play games",
                  summary: local
                }
              ];
              return (
                <>
                  <div className="profile-main profile-main-rich">
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        Member since {formatDate(p.createdAt)} · Last played {formatDate(lastPlayedAt)}
                      </small>
                    </div>
                    <div className="profile-record-pill">
                      {p.stats.wins}W / {p.stats.losses}L / {p.stats.draws}D
                    </div>
                  </div>

                  <div className="profile-stat-cards">
                    {statCards.map((stat) => (
                      <div key={stat.label} className="profile-stat-card">
                        <span className="profile-stat-label">{stat.label}</span>
                        <strong className="profile-stat-value">{stat.value}</strong>
                        <small className="profile-stat-hint">{stat.hint}</small>
                      </div>
                    ))}
                  </div>

                  <div className="profile-performance-sections">
                    {performanceSections.map((section) => (
                      <section key={section.label} className="profile-performance-panel">
                        <div className="profile-performance-panel-head">
                          <div>
                            <strong>{section.label}</strong>
                            <small>{section.hint}</small>
                          </div>
                        </div>
                        <div className="profile-performance-grid profile-performance-grid-rich">
                          <div className="profile-performance-header">
                            <span>Window</span>
                            <span>Score</span>
                            <span>Games</span>
                            <span>Stars</span>
                          </div>
                          <div className="profile-performance-row">
                            <span>Lifetime</span>
                            <strong>{section.summary.overall.rating}</strong>
                            <strong>{section.summary.overall.games}</strong>
                            <strong>{section.summary.overall.stars}</strong>
                          </div>
                          <div className="profile-performance-row muted">
                            <span>Last 7d</span>
                            <strong>{section.summary.last7Days.rating}</strong>
                            <strong>{section.summary.last7Days.games}</strong>
                            <strong>{section.summary.last7Days.stars}</strong>
                          </div>
                          <div className="profile-performance-row muted">
                            <span>Last 30d</span>
                            <strong>{section.summary.last30Days.rating}</strong>
                            <strong>{section.summary.last30Days.games}</strong>
                            <strong>{section.summary.last30Days.stars}</strong>
                          </div>
                        </div>
                        <small className="profile-performance-footnote">Score is the performance rating out of 100. Stars are total stars earned in that window.</small>
                      </section>
                    ))}
                  </div>

                  <div className="profile-actions">
                    <button onClick={() => setActiveProfile(p.id)}>
                      {activeProfile?.id === p.id ? "Active" : "Use profile"}
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
