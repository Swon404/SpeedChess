import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { PieceType } from "../engine/board";
import { useGame } from "../GameContext";
import { deleteCustomGame, type SavedCustomGame } from "../engine/storage";

type Kind = "two-player" | "bot" | "portal" | "custom";

export function NewGameScreen() {
  const nav = useNavigate();
  const location = useLocation();
  const { newGame, store, updateSetting, addProfile, setActiveProfile, activeProfile } = useGame();

  const [kind, setKind] = useState<Kind>("bot");
  const [level, setLevel] = useState<number>(1);
  const [timer, setTimer] = useState<number>(store.settings.timerSeconds);
  const [whiteName, setWhiteName] = useState<string>(activeProfile?.name ?? "");
  const [blackName, setBlackName] = useState<string>("");

  // Portal Chess sub-options
  const [portalCreator, setPortalCreator] = useState<PieceType>(store.settings.portalCreatorDefault);
  const [portalOpponentKind, setPortalOpponentKind] = useState<"two-player" | "bot">(store.settings.portalOpponentDefault);
  const [portalMax, setPortalMax] = useState<1 | 2 | 3>(store.settings.portalMaxDefault);

  // Custom Game sub-options
  const [customGame, setCustomGame] = useState<SavedCustomGame | null>(null);
  const [customOpponent, setCustomOpponent] = useState<"two-player" | "bot">("bot");

  // Restore state arriving from designer screens
  useEffect(() => {
    const s = location.state as { customGame?: SavedCustomGame; customDef?: unknown } | null;
    if (s?.customGame) {
      setCustomGame(s.customGame);
      setKind("custom");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const maxLevel = kind === "bot" ? 20 : 10;
  useEffect(() => {
    if (level > maxLevel) setLevel(maxLevel);
  }, [level, maxLevel]);

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

  const handleDeleteCustomGame = (id: string) => {
    const updated = { ...store, settings: { ...store.settings } };
    deleteCustomGame(updated, id);
    updateSetting("savedCustomGames", updated.settings.savedCustomGames);
    if (customGame?.id === id) setCustomGame(null);
  };

  const start = () => {
    updateSetting("timerSeconds", timer);
    updateSetting("portalCreatorDefault", portalCreator);
    updateSetting("portalOpponentDefault", portalOpponentKind);
    updateSetting("portalMaxDefault", portalMax);

    const w = ensureProfile(whiteName || "Player 1");
    const wProf = store.profiles.find((p) => p.name.toLowerCase() === w.toLowerCase());
    if (wProf) setActiveProfile(wProf.id);

    if (kind === "two-player") {
      const b = ensureProfile(blackName || "Player 2");
      newGame({ kind: "two-player" }, { w, b });
    } else if (kind === "bot") {
      newGame({ kind: "bot", level }, { w, b: `Bot Lv ${level}` });
    } else if (kind === "portal") {
      if (portalOpponentKind === "two-player") {
        const b = ensureProfile(blackName || "Player 2");
        newGame({ kind: "portal", opponent: "two-player", creator: portalCreator, portalMax }, { w, b });
      } else {
        newGame({ kind: "portal", opponent: { kind: "bot", level }, creator: portalCreator, portalMax }, { w, b: `Bot Lv ${level}` });
      }
    } else {
      // Custom Game mode
      if (!customGame) { alert("Please design or select a custom game first."); return; }
      const hasCustomPieces = Boolean(customGame.customPieceDef || customGame.customPieces?.length);
      const customPiece = customGame.customPieceDef ?? customGame.customPieces?.[0]?.def;
      if (!hasCustomPieces) {
        // No custom piece — start as normal bot/two-player with custom layout
        if (customOpponent === "two-player") {
          const b = ensureProfile(blackName || "Player 2");
          newGame({ kind: "two-player" }, { w, b }, { customGame });
        } else {
          newGame({ kind: "bot", level }, { w, b: `Bot Lv ${level}` }, { customGame });
        }
      } else {
        if (customOpponent === "two-player") {
          const b = ensureProfile(blackName || "Player 2");
          newGame({ kind: "custom", customPiece, opponent: "two-player" }, { w, b }, { customGame });
        } else {
          newGame({ kind: "custom", customPiece, opponent: { kind: "bot", level } }, { w, b: `Bot Lv ${level}` }, { customGame });
        }
      }
    }
    nav("/play");
  };

  const showBlackName =
    kind === "two-player" ||
    (kind === "portal" && portalOpponentKind === "two-player") ||
    (kind === "custom" && customOpponent === "two-player");
  const showLevel =
    kind === "bot" ||
    (kind === "portal" && portalOpponentKind === "bot") ||
    (kind === "custom" && customOpponent === "bot");

  return (
    <div className="screen">
      <div className="topbar">
        <Link to="/">&#8592; Home</Link>
        <Link to="/settings">&#9881; Settings</Link>
      </div>
      <h2>New Game</h2>

      {/* Mode selector */}
      <section>
        <h3>Mode</h3>
        <label><input type="radio" checked={kind === "bot"} onChange={() => setKind("bot")} /> Play the bot</label>
        <label><input type="radio" checked={kind === "two-player"} onChange={() => setKind("two-player")} /> Two players (pass &amp; play)</label>
        <label><input type="radio" checked={kind === "portal"} onChange={() => setKind("portal")} /> &#127760; Portal Chess</label>
        <label><input type="radio" checked={kind === "custom"} onChange={() => setKind("custom")} /> &#127918; Custom Game</label>
      </section>

      {/* Portal sub-options */}
      {kind === "portal" && (
        <>
          <section>
            <h3>Portal opponent</h3>
            <label><input type="radio" checked={portalOpponentKind === "bot"} onChange={() => setPortalOpponentKind("bot")} /> Play the bot</label>
            <label><input type="radio" checked={portalOpponentKind === "two-player"} onChange={() => setPortalOpponentKind("two-player")} /> Two players</label>
          </section>
          <section>
            <h3>Nominated piece (creates portals)</h3>
            <div className="difficulty">
              {(["Q", "R", "B", "N", "K"] as PieceType[]).map((p) => (
                <button key={p} className={p === portalCreator ? "pill active" : "pill"} onClick={() => setPortalCreator(p)}>
                  {p === "Q" ? "Queen" : p === "R" ? "Rook" : p === "B" ? "Bishop" : p === "N" ? "Knight" : "King"}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>Active portals per player</h3>
            <div className="difficulty">
              {([1, 2, 3] as const).map((n) => (
                <button key={n} className={n === portalMax ? "pill active" : "pill"} onClick={() => setPortalMax(n)}>{n}</button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Custom Game sub-options */}
      {kind === "custom" && (
        <>
          <section>
            <h3>Custom game</h3>
            {store.settings.savedCustomGames.length > 0 ? (
              <div className="difficulty">
                {store.settings.savedCustomGames.map((g) => (
                  <span key={g.id} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <button
                      className={`pill${customGame?.id === g.id ? " active" : ""}`}
                      onClick={() => setCustomGame(g)}
                    >
                      {g.name}
                      {g.customPieceDef || g.customPieces?.length ? " &#127918;" : ""}
                    </button>
                    <button
                      className="pill"
                      style={{ color: "var(--accent-red, #f55)" }}
                      onClick={() => handleDeleteCustomGame(g.id)}
                      aria-label={`Delete ${g.name}`}
                    >
                      &#128465;
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="hint">No saved custom games yet. Design one below!</p>
            )}
            {customGame && (
              <p className="hint">
                Selected: <strong>{customGame.name}</strong>
                {customGame.customPieces?.length
                  ? ` with ${customGame.customPieces.length} custom piece${customGame.customPieces.length === 1 ? "" : "s"}`
                  : customGame.customPieceDef
                    ? ` with custom piece (${customGame.customPieceDef.label})`
                    : ""}
              </p>
            )}
            <div style={{ marginTop: 8 }}>
              <Link to="/board-designer" className="pill">&#9998; Design board</Link>
            </div>
          </section>
          <section>
            <h3>Opponent</h3>
            <label><input type="radio" checked={customOpponent === "bot"} onChange={() => setCustomOpponent("bot")} /> Play the bot</label>
            <label><input type="radio" checked={customOpponent === "two-player"} onChange={() => setCustomOpponent("two-player")} /> Two players</label>
          </section>
        </>
      )}

      {/* White player name */}
      <section>
        <h3>&#9817; White player</h3>
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
              <button key={p.id} className={p.name === whiteName ? "pill active" : "pill"} onClick={() => setWhiteName(p.name)}>{p.name}</button>
            ))}
          </div>
        )}
      </section>

      {/* Black player name */}
      {showBlackName && (
        <section>
          <h3>&#9823; Black player</h3>
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
                <button key={p.id} className={p.name === blackName ? "pill active" : "pill"} onClick={() => setBlackName(p.name)}>{p.name}</button>
              ))}
            </div>
          )}
          <p className="hint">New names are saved as profiles so stats track over time.</p>
        </section>
      )}

      {/* Bot difficulty */}
      {showLevel && (
        <section>
          <h3>Bot difficulty</h3>
          {kind === "bot" ? (
            <div className="bot-level-groups">
              <div className="bot-level-group">
                <div className="bot-level-label">Learn</div>
                <div className="bot-level-grid learn-grid">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((lv) => (
                    <button key={lv} className={lv === level ? "pill active" : "pill"} onClick={() => setLevel(lv)}>{lv}</button>
                  ))}
                </div>
              </div>
              <div className="bot-level-group">
                <div className="bot-level-label">Challenge</div>
                <div className="bot-level-grid challenge-grid">
                  {Array.from({ length: 15 }, (_, i) => i + 6).map((lv) => (
                    <button key={lv} className={lv === level ? "pill active" : "pill"} onClick={() => setLevel(lv)}>{lv}</button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="difficulty">
              {Array.from({ length: maxLevel }, (_, i) => i + 1).map((lv) => (
                <button key={lv} className={lv === level ? "pill active" : "pill"} onClick={() => setLevel(lv)}>{lv}</button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Timer */}
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
