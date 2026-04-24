import { Link } from "react-router-dom";

const LESSONS = [
  { piece: "♙ Pawn", text: "Pawns walk one square forward. On their first move they can step two. They capture diagonally, one square." },
  { piece: "♘ Knight", text: "Knights jump in an L-shape: two in one direction, then one to the side. They're the only piece that jumps over others." },
  { piece: "♗ Bishop", text: "Bishops slide along diagonals as far as they like, until something blocks them." },
  { piece: "♖ Rook", text: "Rooks slide in straight lines — up, down, left, right — as far as they can." },
  { piece: "♕ Queen", text: "The queen is the strongest piece. She moves like a rook and a bishop combined." },
  { piece: "♔ King", text: "The king moves one square in any direction. Protect him — if he's trapped in check, it's checkmate!" }
];

export function LearnScreen() {
  const speak = (t: string) => {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(t);
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }
  };
  return (
    <div className="screen">
      <div className="topbar"><Link to="/">← Home</Link></div>
      <h2>🧠 Learn</h2>
      <p>Tap a piece to hear how it moves. More interactive lessons coming soon!</p>
      <ul className="lessons">
        {LESSONS.map((l) => (
          <li key={l.piece}>
            <div><strong>{l.piece}</strong></div>
            <div>{l.text}</div>
            <button onClick={() => speak(l.text)}>🔊 Read aloud</button>
          </li>
        ))}
      </ul>
      <p className="hint">Coming soon: interactive piece practice, mate-in-1 puzzles, hint arrows, and badges.</p>
    </div>
  );
}
