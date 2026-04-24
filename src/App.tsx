import { HashRouter, Route, Routes } from "react-router-dom";
import { GameProvider } from "./GameContext";
import { HomeScreen } from "./screens/HomeScreen";
import { NewGameScreen } from "./screens/NewGameScreen";
import { GameScreen } from "./screens/GameScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { LearnScreen } from "./screens/LearnScreen";
import { PuzzlesScreen } from "./screens/PuzzlesScreen";

export default function App() {
  return (
    <GameProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/new" element={<NewGameScreen />} />
          <Route path="/play" element={<GameScreen />} />
          <Route path="/puzzles" element={<PuzzlesScreen />} />
          <Route path="/profiles" element={<ProfileScreen />} />
          <Route path="/leaderboard" element={<LeaderboardScreen />} />
          <Route path="/learn" element={<LearnScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </HashRouter>
    </GameProvider>
  );
}
