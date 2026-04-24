import type { BoardTheme, PieceSet } from "../engine/storage";
import { useGame } from "../GameContext";

const THEMES: BoardTheme[] = ["wood", "blue", "green", "neon"];
const SETS: PieceSet[] = ["classic", "modern", "neon", "emoji"];

const THEME_LABEL: Record<BoardTheme, string> = {
  wood: "🪵", blue: "🟦", green: "🟩", neon: "✨"
};
const SET_LABEL: Record<PieceSet, string> = {
  classic: "♚", modern: "♟︎", neon: "💎", emoji: "🐉"
};

export function LookPicker() {
  const { store, updateSetting } = useGame();
  const theme = store.settings.theme;
  const pieceSet = store.settings.pieceSet;

  const cycleTheme = () => {
    const i = THEMES.indexOf(theme);
    updateSetting("theme", THEMES[(i + 1) % THEMES.length]);
  };
  const cycleSet = () => {
    const i = SETS.indexOf(pieceSet);
    updateSetting("pieceSet", SETS[(i + 1) % SETS.length]);
  };

  return (
    <div className="look-picker">
      <button onClick={cycleTheme} aria-label="Cycle board theme">
        {THEME_LABEL[theme]} {theme}
      </button>
      <button onClick={cycleSet} aria-label="Cycle piece set">
        {SET_LABEL[pieceSet]} {pieceSet}
      </button>
    </div>
  );
}
