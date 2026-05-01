import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PieceType } from "../engine/board";
import { useGame } from "../GameContext";

export function NewGameScreen() {
  const nav = useNavigate();
  const { newGame, store, updateSetting, addProfile, setActiveProfile, activeProfile } = useGame();
  const [kind, setKind] = useState<"two-player" | "bot" | "portal">("bot");
  const [level, setLevel] = useState<number>(1);
  const [timer, setTimer] = useState<number>(store.settings.timerSeconds);
  const [whiteName, setWhiteName] = useState<string>(activeProfile?.name ?? "");
  const [blackName, setBlackName] = useState<string>("");
  // Portal Chess sub-options
  const [portalCreator, setPortalCreator] = useState<PieceType>("N");
  const [portalOpponentKind, setPortalOpponentKind] = useState<"two-player" | "bot">("bot");
  const [portalAdjacencyRule, setPortalAdjacencyRule] = useState<boolean>(false);
  const [portalMax, setPortalMax] = useState<1 | 2 | 3>(1);

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
    } else if (kind === "bot") {
      newGame({ kind: "bot", level }, { w, b: `Bot Lv ${level}` });
    } else {
      // Portal Chess
      if (portalOpponentKind === "two-player") {
        const b = ensureProfile(blackName || "Player 2");
        newGame(
          { kind: "portal", opponent: "two-player", creator: portalCreator, adjacencyRule: portalAdjacencyRule, portalMax },
          { w, b }
        );
      } else {
        newGame(
          { kind: "portal", opponent: { kind: "bot", level }, creator: portalCreator, adjacencyRule: portalAdjacencyRule, portalMax },
          { w, b: `Bot Lv ${level}` }
        );
      }
    }
    nav("/play");
  };

  const showBlackName = kind === "two-player" || (kind === "portal" && portalOpponentKind === "two-player");
  const showLevel = kind === "bot" || (kind === "portal" && portalOpponentKind === "bot");

  return (
    <div className="screen">
      <div className="topbar"><Link to="/">← Home</Link></div>
      <h2>New Game</h2>

      <section>
        <h3>Mode</h3>
        <label><input type="radio" checked={kind === "bot"} onChange={() => setKind("bot")} /> Play the bot</label>
        <label><input type="radio" checked={kind === "two-player"} onChange={() => setKind("two-player")} /> Two players (pass &amp; play)</label>
        <label><input type="radio" checked={kind === "portal"} onChange={() => setKind("portal")} /> 🌀 Portal Chess</label>
        {kind === "portal" && (
          <p className="hint">
            After every move of the nominated piece, a glowing portal appears on the
            square it lands on. When one of your non-pawn pieces (other than the
            nominated piece) lands on your own portal, nothing happens immediately —
            but on a later turn that piece may teleport from the portal to any
            empty square. The piece cannot stay on the portal; the portal is spent
            when the piece leaves. Each side can hold up to the configured number
            of active portals at a time.
          </p>
        )}
      </section>

      {kind === "portal" && (
        <>
          <section>
            <h3>Portal opponent</h3>
            <label>
              <input type="radio" checked={portalOpponentKind === "bot"}
                onChange={() => setPortalOpponentKind("bot")} /> Play the bot
            </label>
            <label>
              <input type="radio" checked={portalOpponentKind === "two-player"}
                onChange={() => setPortalOpponentKind("two-player")} /> Two players (pass &amp; play)
            </label>
          </section>

          <section>
            <h3>Nominated piece (creates portals)</h3>
            <div className="difficulty">
              {(["Q", "R", "B", "N", "K"] as PieceType[]).map((p) => (
                <button key={p}
                  className={p === portalCreator ? "pill active" : "pill"}
                  onClick={() => setPortalCreator(p)}>
                  {p === "Q" ? "Queen" : p === "R" ? "Rook" : p === "B" ? "Bishop" : p === "N" ? "Knight" : "King"}
                </button>
              ))}
            </div>
            <p className="hint">
              The nominated piece auto-drops a portal under itself after each move (if
              its side has no active portal yet). It does not teleport through portals
              itself. Pawns are excluded entirely &mdash; they never use portals.
            </p>
          </section>

          <section>
            <h3>Active portals per player</h3>
            <div className="difficulty">
              {([1, 2, 3] as const).map((n) => (
                <button key={n}
                  className={n === portalMax ? "pill active" : "pill"}
                  onClick={() => setPortalMax(n)}>
                  {n}
                </button>
              ))}
            </div>
            <p className="hint">
              Each side can have up to this many active portals at once. The
              nominated piece keeps dropping a new portal under itself after
              each move until the cap is reached.
            </p>
          </section>

          <section>
            <h3>House rules</h3>
            <label>
              <input type="checkbox"
                checked={portalAdjacencyRule}
                onChange={(e) => setPortalAdjacencyRule(e.target.checked)} />
              {" "}Prevent teleport next to any piece
            </label>
            <p className="hint">
              When ticked, teleport targets cannot be adjacent to any other piece.
              When unticked (default), you can teleport to any empty square
              except the portal square itself.
            </p>
          </section>
        </>
      )}

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

      {showBlackName && (
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

      {showBlackName && (
        <section>
          <h3>Board orientation (2-player)</h3>
          <label>
            <input
              type="checkbox"
              checked={store.settings.autoFlip}
              onChange={(e) => updateSetting("autoFlip", e.target.checked)}
            />
            {" "}Auto-turn board after each move
          </label>
          <p className="hint">Turn this off to keep the board fixed from White's side.</p>
        </section>
      )}

      {showLevel && (
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
