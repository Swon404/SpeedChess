import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGame } from "../GameContext";

export function NewGameScreen() {
  const nav = useNavigate();
  const { newGame, store, updateSetting } = useGame();
  const [kind, setKind] = useState<"two-player" | "bot">("bot");
  const [level, setLevel] = useState<number>(1);
  const [timer, setTimer] = useState<number>(store.settings.timerSeconds);

  const start = () => {
    updateSetting("timerSeconds", timer);
    if (kind === "two-player") newGame({ kind: "two-player" });
    else newGame({ kind: "bot", level });
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
