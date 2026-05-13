// Lightweight Web Audio synth for UI sounds — no external asset files.
// Each sound is a tiny oscillator burst so the PWA stays offline-friendly.

type SoundName = "move" | "capture" | "boom" | "check" | "win" | "draw" | "loss" | "teleport" | "blunder" | "grandmaster";

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
    else if (name === "boom") {
      tone(82, 220, "sawtooth", 0.2);
      tone(64, 260, "square", 0.14, 20);
      tone(220, 120, "triangle", 0.07, 45);
    }
    else if (name === "check")   { tone(880, 110, "sine",   0.15); tone(1175, 120, "sine", 0.13, 90); }
    else if (name === "win")     { tone(523, 120, "triangle"); tone(659, 120, "triangle", 0.15, 120); tone(784, 180, "triangle", 0.18, 240); }
    else if (name === "loss")    { tone(392, 140, "sawtooth", 0.14); tone(311, 220, "sawtooth", 0.14, 140); }
    else if (name === "draw")    { tone(523, 120, "sine"); tone(523, 180, "sine", 0.12, 140); }
    else if (name === "blunder") {
      tone(180, 160, "sawtooth", 0.13);
      tone(140, 220, "square", 0.12, 70);
      tone(95, 300, "triangle", 0.08, 140);
    }
    else if (name === "grandmaster") {
      tone(523, 120, "triangle", 0.13);
      tone(659, 140, "triangle", 0.14, 100);
      tone(784, 160, "triangle", 0.17, 220);
      tone(988, 220, "sine", 0.12, 360);
    }
    else if (name === "teleport") {
      // Sci-fi whoosh stretched to match the demat (~900ms) + delay (700ms)
      // + remat (~900ms) visual: a rising sweep covers the demat, then a
      // shimmering descent times with the remat onset, plus a soft tail.
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      // Rising sweep: 180Hz -> 1320Hz over 700ms (matches demat).
      const o1 = c.createOscillator();
      const g1 = c.createGain();
      o1.type = "sine";
      o1.frequency.setValueAtTime(180, now);
      o1.frequency.exponentialRampToValueAtTime(1320, now + 0.70);
      g1.gain.setValueAtTime(0, now);
      g1.gain.linearRampToValueAtTime(0.16, now + 0.04);
      g1.gain.exponentialRampToValueAtTime(0.0005, now + 0.80);
      o1.connect(g1).connect(c.destination);
      o1.start(now); o1.stop(now + 0.84);
      // Shimmering descent: 1760Hz -> 520Hz starting at 700ms, lasting 700ms.
      const o2 = c.createOscillator();
      const g2 = c.createGain();
      o2.type = "triangle";
      o2.frequency.setValueAtTime(1760, now + 0.70);
      o2.frequency.exponentialRampToValueAtTime(520, now + 1.40);
      g2.gain.setValueAtTime(0, now + 0.70);
      g2.gain.linearRampToValueAtTime(0.13, now + 0.74);
      g2.gain.exponentialRampToValueAtTime(0.0005, now + 1.50);
      o2.connect(g2).connect(c.destination);
      o2.start(now + 0.70); o2.stop(now + 1.54);
      // Sub-bass tail under the rematerialise.
      tone(110, 380, "sawtooth", 0.07, 1100);
    }
  } catch { /* ignore */ }
}
