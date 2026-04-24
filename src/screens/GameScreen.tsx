import { Link } from "react-router-dom";
import { Board } from "../components/Board";
import { Clock } from "../components/Clock";
import { Controls } from "../components/Controls";
import { MoveList } from "../components/MoveList";
import { useGame } from "../GameContext";

export function GameScreen() {
  const { mode, state, store } = useGame();
  const flipped =
    mode.kind === "two-player" && store.settings.autoFlip && state.turn === "b";

  return (
    <div className="screen game">
      <div className="topbar">
        <Link to="/">← Home</Link>
        <Link to="/new">New game</Link>
      </div>
      <Clock />
      <Board flipped={flipped} />
      <Controls />
      <MoveList />
    </div>
  );
}
