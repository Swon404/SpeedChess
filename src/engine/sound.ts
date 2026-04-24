// Lightweight Web Audio synth for UI sounds — no external asset files.
// Each sound is a tiny oscillator burst so the PWA stays offline-friendly.

type SoundName = "move" | "capture" | "check" | "win" | "draw" | "loss";

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = Ctor ? new Ctor() : null;
    } catch { ctx = null; }
  }
  return ctx;
}

function tone(freq: number, durMs: number, type: OscillatorType = "sine", gain = 0.15, delayMs = 0) {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime + delayMs / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0005, now + durMs / 1000);
  osc.connect(g).connect(c.destination);
  osc.start(now);
  osc.stop(now + durMs / 1000 + 0.02);
}

export function playSound(name: SoundName, enabled = true) {
  if (!enabled) return;
  try {
    if (name === "move")    { tone(440, 70, "triangle", 0.12); }
    else if (name === "capture") { tone(180, 90, "square",  0.14); tone(110, 120, "sawtooth", 0.08, 30); }
    else if (name === "check")   { tone(880, 110, "sine",   0.15); tone(1175, 120, "sine", 0.13, 90); }
    else if (name === "win")     { tone(523, 120, "triangle"); tone(659, 120, "triangle", 0.15, 120); tone(784, 180, "triangle", 0.18, 240); }
    else if (name === "loss")    { tone(392, 140, "sawtooth", 0.14); tone(311, 220, "sawtooth", 0.14, 140); }
    else if (name === "draw")    { tone(523, 120, "sine"); tone(523, 180, "sine", 0.12, 140); }
  } catch { /* ignore */ }
}
