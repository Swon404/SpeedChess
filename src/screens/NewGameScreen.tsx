import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGame } from "../GameContext";

export function NewGameScreen() {
  const nav = useNavigate();
  const { newGame, store, updateSetting, addProfile, setActiveProfile, activeProfile } = useGame();
  const [kind, setKind] = useState<"two-player" | "bot">("bot");
  const [level, setLevel] = useState<number>(1);
  const [timer, setTimer] = useState<number>(store.settings.timerSeconds);
  const [whiteName, setWhiteName] = useState<string>(activeProfile?.name ?? "");
  const [blackName, setBlackName] = useState<string>("");

  const ensureProfile = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return "";
    const existing = store.profiles.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing.name;
    const created = addProfile(trimmed);
    return created.name;
  };

  const start = () => {
    updateSetting("timerSeconds", timer);

    // Ensure white profile exists and is active — stats are tied to this name
    const w = ensureProfile(whiteName || "Player 1");
    const wProf = store.profiles.find((p) => p.name.toLowerCase() === w.toLowerCase());
    if (wProf) setActiveProfile(wProf.id);

    if (kind === "two-player") {
      const b = ensureProfile(blackName || "Player 2");
      newGame({ kind: "two-player" }, { w, b });
    } else {
      newGame({ kind: "bot", level }, { w, b: `Bot Lv ${level}` });
    }
    nav("/play");
  };

  return (
    <div className="screen">
      <div className="topbar"><Link to="/">← Home</Link></div>
      <h2>New Game</h2>

      <section>
        <h3>Opponent</h3>
        <label><input type="radio" checked={kind === "bot"} onChange={() => setKind("bot")} /> Play the bot</label>
        <label><input type="radio" checked={kind === "two-player"} onChange={() => setKind("two-player")} /> Two players (pass & play)</label>
      </section>

      <section>
        <h3>♙ White player</h3>
        <input
          className="name-input"
          type="text"
          placeholder="Enter name"
          value={whiteName}
          onChange={(e) => setWhiteName(e.target.value)}
          maxLength={24}
        />
        {store.profiles.length > 0 && (
          <div className="difficulty" style={{ marginTop: 6 }}>
            {store.profiles.map((p) => (
              <button key={p.id}
                className={p.name === whiteName ? "pill active" : "pill"}
                onClick={() => setWhiteName(p.name)}>{p.name}</button>
            ))}
          </div>
        )}
      </section>

      {kind === "two-player" && (
        <section>
          <h3>♟ Black player</h3>
          <input
            className="name-input"
            type="text"
            placeholder="Enter name"
            value={blackName}
            onChange={(e) => setBlackName(e.target.value)}
            maxLength={24}
          />
          {store.profiles.length > 0 && (
            <div className="difficulty" style={{ marginTop: 6 }}>
              {store.profiles.map((p) => (
                <button key={p.id}
                  className={p.name === blackName ? "pill active" : "pill"}
                  onClick={() => setBlackName(p.name)}>{p.name}</button>
              ))}
            </div>
          )}
          <p className="hint">New names are saved as profiles so stats track over time.</p>
        </section>
      )}

      {kind === "bot" && (
        <section>
          <h3>Bot difficulty</h3>
          <div className="difficulty">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((lv) => (
              <button
                key={lv}
                className={lv === level ? "pill active" : "pill"}
                onClick={() => setLevel(lv)}
              >{lv}</button>
            ))}
          </div>
          <p className="hint">
            Level 1 is very easy (good for a new learner). Levels 6+ use a stronger engine when available.
          </p>
        </section>
      )}

      <section>
        <h3>Timer per move</h3>
        <div className="difficulty">
          {[0, 10, 30, 60, 120].map((t) => (
            <button key={t} className={t === timer ? "pill active" : "pill"} onClick={() => setTimer(t)}>
              {t === 0 ? "Off" : `${t}s`}
            </button>
          ))}
        </div>
        <p className="hint">If time runs out, that move is forfeited and the opponent plays.</p>
      </section>

      <button className="primary" onClick={start}>Start game</button>
    </div>
  );
}
