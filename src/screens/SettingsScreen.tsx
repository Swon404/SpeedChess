import { Link, useNavigate } from "react-router-dom";
import { useGame } from "../GameContext";

export function SettingsScreen() {
  const nav = useNavigate();
  const { store, updateSetting } = useGame();
  const s = store.settings;

  const goBack = () => {
    if (window.history.length > 1) nav(-1);
    else nav("/");
  };

  return (
    <div className="screen">
      <div className="topbar">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            goBack();
          }}
        >
          ← Back
        </a>
        <Link to="/">⌂ Home</Link>
      </div>
      <h2>⚙ Settings</h2>

      <section>
        <h3>Timer per move (default)</h3>
        <div className="difficulty">
          {[0, 10, 30, 60, 120].map((t) => (
            <button key={t}
              className={t === s.timerSeconds ? "pill active" : "pill"}
              onClick={() => updateSetting("timerSeconds", t)}>
              {t === 0 ? "Off" : `${t}s`}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Move animation speed</h3>
        <div className="difficulty">
          {([
            { key: "normal" as const, label: "Normal" },
            { key: "slow" as const, label: "Slow" },
            { key: "very-slow" as const, label: "Very Slow" }
          ]).map((v) => (
            <button
              key={v.key}
              className={v.key === s.animationSpeed ? "pill active" : "pill"}
              onClick={() => updateSetting("animationSpeed", v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="hint">Slow or Very Slow is easier to follow on smaller screens.</p>
      </section>

      <section>
        <h3>Board theme</h3>
        <div className="difficulty">
          {(["wood", "blue", "green", "neon"] as const).map((t) => (
            <button key={t}
              className={t === s.theme ? "pill active" : "pill"}
              onClick={() => updateSetting("theme", t)}>{t}</button>
          ))}
        </div>
      </section>

      <section>
        <h3>Piece set</h3>
        <div className="difficulty">
          {([
            { key: "classic" as const, label: "Classic" },
            { key: "modern" as const, label: "Modern" },
            { key: "neon" as const, label: "Neon" }
          ]).map((t) => (
            <button key={t.key}
              className={t.key === s.pieceSet ? "pill active" : "pill"}
              onClick={() => updateSetting("pieceSet", t.key)}>{t.label}</button>
          ))}
        </div>
        <p className="hint">Classic = Unicode ♚ · Modern = crisp SVG · Neon = glow</p>
      </section>

      <section>
        <h3>Toggles</h3>
        <label><input type="checkbox" checked={s.sound} onChange={(e) => updateSetting("sound", e.target.checked)} /> Sound effects</label>
        <label><input type="checkbox" checked={s.haptics} onChange={(e) => updateSetting("haptics", e.target.checked)} /> Vibration feedback (supported devices)</label>
        <label><input type="checkbox" checked={s.autoFlip} onChange={(e) => updateSetting("autoFlip", e.target.checked)} /> Auto-flip board in 2-player mode</label>
        <label><input type="checkbox" checked={s.rotateBlackPiecesFixedBoard} onChange={(e) => updateSetting("rotateBlackPiecesFixedBoard", e.target.checked)} /> Rotate black pieces 180° on fixed 2-player board</label>
        <label><input type="checkbox" checked={s.showThreats} onChange={(e) => updateSetting("showThreats", e.target.checked)} /> Show threatened pieces</label>
        <label><input type="checkbox" checked={s.explodeOnCapture} onChange={(e) => updateSetting("explodeOnCapture", e.target.checked)} /> 💥 Explode pieces on capture</label>
      </section>
    </div>
  );
}
