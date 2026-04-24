import { Link } from "react-router-dom";
import { useGame } from "../GameContext";

export function SettingsScreen() {
  const { store, updateSetting } = useGame();
  const s = store.settings;
  return (
    <div className="screen">
      <div className="topbar"><Link to="/">← Home</Link></div>
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
          {(["classic", "modern", "neon", "emoji"] as const).map((t) => (
            <button key={t}
              className={t === s.pieceSet ? "pill active" : "pill"}
              onClick={() => updateSetting("pieceSet", t)}>{t}</button>
          ))}
        </div>
        <p className="hint">Classic = Unicode ♚ · Modern = crisp SVG · Neon = glow · Emoji = ⛏️ Minecraft mode (Steve, Alex, Creepers…)</p>
      </section>

      <section>
        <h3>Toggles</h3>
        <label><input type="checkbox" checked={s.sound} onChange={(e) => updateSetting("sound", e.target.checked)} /> Sound effects</label>
        <label><input type="checkbox" checked={s.haptics} onChange={(e) => updateSetting("haptics", e.target.checked)} /> Haptics (iPhone)</label>
        <label><input type="checkbox" checked={s.autoFlip} onChange={(e) => updateSetting("autoFlip", e.target.checked)} /> Auto-flip board in 2-player mode</label>
        <label><input type="checkbox" checked={s.showThreats} onChange={(e) => updateSetting("showThreats", e.target.checked)} /> Show threatened pieces (learn mode)</label>
        <label><input type="checkbox" checked={s.explodeOnCapture} onChange={(e) => updateSetting("explodeOnCapture", e.target.checked)} /> 💥 Explode pieces on capture</label>
      </section>
    </div>
  );
}
