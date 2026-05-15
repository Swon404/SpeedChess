import { useState, type ReactElement } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { AnimalId, CustomPieceDef } from "../engine/board";
import { useGame } from "../GameContext";
import {
  deleteCustomPiece,
  saveCustomPiece,
  type SavedCustomPiece
} from "../engine/storage";

// ---------------------------------------------------------------------------
// Animal options
// ---------------------------------------------------------------------------

interface AnimalOption {
  id: AnimalId;
  label: string;
  icon: string; // emoji or short key for SVG
}

const ANIMALS: AnimalOption[] = [
  { id: "camel",     label: "Camel",     icon: "🐪" },
  { id: "cat",       label: "Cat",       icon: "🐱" },
  { id: "trex",      label: "T-Rex",     icon: "🦖" },
  { id: "dog",       label: "Dog",       icon: "🐶" },
  { id: "creeper",   label: "Creeper",   icon: "👾" },
  { id: "gd-yellow", label: "GD Yellow", icon: "🟨" },
  { id: "gd-red",    label: "GD Red",    icon: "🟥" },
  { id: "dragon",    label: "Dragon",    icon: "🐉" },
  { id: "lion",      label: "Lion",      icon: "🦁" },
  { id: "eagle",     label: "Eagle",     icon: "🦅" },
  { id: "wolf",      label: "Wolf",      icon: "🐺" },
  { id: "frog",      label: "Frog",      icon: "🐸" },
  { id: "unicorn",   label: "Unicorn",   icon: "🦄" },
];

// ---------------------------------------------------------------------------
// Preset movement definitions (one per animal)
// ---------------------------------------------------------------------------

const PRESETS: Record<AnimalId, Omit<CustomPieceDef, "animal" | "label">> = {
  camel:    { stepDirs: [], slideDirs: [], leapPatterns: [[1,3],[3,1],[-1,3],[-3,1],[1,-3],[3,-1],[-1,-3],[-3,-1]], maxRange: 1 },
  cat:      { stepDirs: [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]], slideDirs: [], leapPatterns: [], maxRange: 1 },
  trex:     { stepDirs: [], slideDirs: [[1,0],[-1,0],[0,1],[0,-1]], leapPatterns: [], maxRange: 3 },
  dog:      { stepDirs: [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]], slideDirs: [], leapPatterns: [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]], maxRange: 1 },
  creeper:  { stepDirs: [], slideDirs: [], leapPatterns: [[2,0],[-2,0],[0,2],[0,-2]], maxRange: 1 },
  "gd-yellow": { stepDirs: [], slideDirs: [[1,1],[-1,1],[1,-1],[-1,-1]], leapPatterns: [], maxRange: 5 },
  "gd-red":    { stepDirs: [], slideDirs: [[1,0],[-1,0],[0,1],[0,-1]], leapPatterns: [], maxRange: 2 },
  dragon:   { stepDirs: [[1,1],[-1,1],[1,-1],[-1,-1]], slideDirs: [[1,0],[-1,0],[0,1],[0,-1]], leapPatterns: [], maxRange: 8 },
  lion:     { stepDirs: [], slideDirs: [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]], leapPatterns: [[2,0],[-2,0],[0,2],[0,-2],[2,2],[-2,2],[2,-2],[-2,-2]], maxRange: 2 },
  eagle:    { stepDirs: [], slideDirs: [[1,1],[-1,1],[1,-1],[-1,-1]], leapPatterns: [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]], maxRange: 8 },
  wolf:     { stepDirs: [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]], slideDirs: [], leapPatterns: [[1,3],[3,1],[-1,3],[-3,1],[1,-3],[3,-1],[-1,-3],[-3,-1]], maxRange: 1 },
  frog:     { stepDirs: [], slideDirs: [], leapPatterns: [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1],[2,2],[-2,2],[2,-2],[-2,-2]], maxRange: 1 },
  unicorn:  { stepDirs: [], slideDirs: [[1,1],[-1,1],[1,-1],[-1,-1]], leapPatterns: [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]], maxRange: 8 },
};

// ---------------------------------------------------------------------------
// Grid state model (7×7, centre = (3,3))
// Row 0 = top = rank+3; df = col-3; dr = 3-row
// Ring-1 cells (max(|df|,|dr|) == 1): off | step | slide
// Outer cells: off | leap
// ---------------------------------------------------------------------------

type Ring1State = "off" | "step" | "slide";
type OuterState = "off" | "leap";

interface GridState {
  ring1: Record<string, Ring1State>; // key: `${df},${dr}`
  outer: Record<string, OuterState>; // key: `${df},${dr}`
  maxRange: number;
}

function defToGrid(def: Omit<CustomPieceDef, "animal" | "label">): GridState {
  const ring1: Record<string, Ring1State> = {};
  const outer: Record<string, OuterState> = {};
  for (const [df, dr] of def.stepDirs) ring1[`${df},${dr}`] = "step";
  for (const [df, dr] of def.slideDirs) ring1[`${df},${dr}`] = "slide";
  for (const [df, dr] of def.leapPatterns) outer[`${df},${dr}`] = "leap";
  return { ring1, outer, maxRange: def.maxRange };
}

function gridToDef(animal: AnimalId, label: string, g: GridState): CustomPieceDef {
  const stepDirs: [number, number][] = [];
  const slideDirs: [number, number][] = [];
  const leapPatterns: [number, number][] = [];
  for (const [key, st] of Object.entries(g.ring1)) {
    const [df, dr] = key.split(",").map(Number) as [number, number];
    if (st === "step") stepDirs.push([df, dr]);
    else if (st === "slide") slideDirs.push([df, dr]);
  }
  for (const [key, st] of Object.entries(g.outer)) {
    const [df, dr] = key.split(",").map(Number) as [number, number];
    if (st === "leap") leapPatterns.push([df, dr]);
  }
  return { animal, label, stepDirs, slideDirs, leapPatterns, maxRange: g.maxRange };
}

function movementSummary(def: CustomPieceDef): string {
  const parts: string[] = [];
  if (def.slideDirs.length > 0) {
    const isAll = def.slideDirs.length === 8;
    const isRook = def.slideDirs.length >= 4 && def.slideDirs.every(([df, dr]) => df === 0 || dr === 0);
    const isBishop = def.slideDirs.length >= 4 && def.slideDirs.every(([df, dr]) => df !== 0 && dr !== 0);
    const dir = isAll ? "any direction" : isRook ? "straight lines" : isBishop ? "diagonal lines" : "some directions";
    const range = def.maxRange >= 8 ? "unlimited distance" : `up to ${def.maxRange} squares`;
    parts.push(`slides ${range} in ${dir}`);
  }
  if (def.stepDirs.length > 0) {
    const isKing = def.stepDirs.length === 8;
    parts.push(isKing ? "steps one square in any direction" : `steps in ${def.stepDirs.length} direction${def.stepDirs.length > 1 ? "s" : ""}`);
  }
  if (def.leapPatterns.length > 0) {
    const isKnight = def.leapPatterns.length === 8 && def.leapPatterns.every(([df, dr]) => Math.abs(df) + Math.abs(dr) === 3);
    parts.push(isKnight ? "leaps like a knight" : `jumps to ${def.leapPatterns.length / 2} spots`);
  }
  return parts.length === 0 ? "No movement defined yet." : parts.join(", ") + ".";
}

// ---------------------------------------------------------------------------
// Screen component
// ---------------------------------------------------------------------------

export function PieceDesignerScreen() {
  const nav = useNavigate();
  const location = useLocation();
  const { store, updateSetting } = useGame();

  // If we came from the board designer, pass back the custom piece def
  const returnTo = (location.state as { returnTo?: string; boardSquares?: unknown; gameName?: string; editingId?: string | null } | null)?.returnTo ?? "/new";
  const returnState = location.state as Record<string, unknown> | null;

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [animal, setAnimal] = useState<AnimalId>("camel");
  const [grid, setGrid] = useState<GridState>(() => defToGrid(PRESETS["camel"]));
  const [label, setLabel] = useState("My Piece");
  const [saveName, setSaveName] = useState("My Piece");

  const selectAnimal = (a: AnimalId) => {
    setAnimal(a);
    setGrid(defToGrid(PRESETS[a]));
    const opt = ANIMALS.find((o) => o.id === a);
    setLabel(opt?.label ?? "My Piece");
    setSaveName(opt?.label ?? "My Piece");
  };

  const currentDef = gridToDef(animal, label, grid);

  // Ring-1 cell click: off → step → slide → off
  const toggleRing1 = (df: number, dr: number) => {
    const key = `${df},${dr}`;
    setGrid((g) => {
      const cur: Ring1State = g.ring1[key] ?? "off";
      const next: Ring1State = cur === "off" ? "step" : cur === "step" ? "slide" : "off";
      const updated = { ...g.ring1 };
      if (next === "off") delete updated[key];
      else updated[key] = next;
      return { ...g, ring1: updated };
    });
  };

  // Outer cell click: off ↔ leap
  const toggleOuter = (df: number, dr: number) => {
    const key = `${df},${dr}`;
    setGrid((g) => {
      const cur: OuterState = g.outer[key] ?? "off";
      const updated = { ...g.outer };
      if (cur === "leap") delete updated[key];
      else updated[key] = "leap";
      return { ...g, outer: updated };
    });
  };

  const handleSave = () => {
    const def = gridToDef(animal, saveName.trim() || animal, grid);
    const saved: SavedCustomPiece = {
      id: crypto.randomUUID(),
      name: saveName.trim() || def.label,
      def
    };
    const updated = { ...store, settings: { ...store.settings } };
    saveCustomPiece(updated, saved);
    updateSetting("savedCustomPieces", updated.settings.savedCustomPieces);
    updateSetting("lastCustomPieceId", saved.id);
    nav(returnTo, { state: { ...(returnState ?? {}), customPieceDef: def, savedPieceId: saved.id } });
  };

  const handleUseWithoutSaving = () => {
    const def = gridToDef(animal, label, grid);
    nav(returnTo, { state: { ...(returnState ?? {}), customPieceDef: def } });
  };

  const handleDeleteSavedPiece = (id: string) => {
    const updated = { ...store, settings: { ...store.settings } };
    deleteCustomPiece(updated, id);
    updateSetting("savedCustomPieces", updated.settings.savedCustomPieces);
    updateSetting("lastCustomPieceId", updated.settings.lastCustomPieceId);
  };

  return (
    <div className="screen">
      <div className="topbar">
        <Link to={returnTo}>&#8592; Back</Link>
        <span>Piece Designer</span>
      </div>

      {/* Step indicators */}
      <div className="designer-steps">
        {["Pick Animal", "Movement", "Save"].map((s, i) => (
          <button
            key={s}
            className={`designer-step-btn${step === i ? " active" : ""}`}
            onClick={() => setStep(i as 0 | 1 | 2)}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* ── Step 0: Pick animal ── */}
      {step === 0 && (
        <section>
          <h3>Pick an animal</h3>
          <div className="animal-grid">
            {ANIMALS.map((a) => (
              <button
                key={a.id}
                className={`animal-btn${animal === a.id ? " active" : ""}`}
                onClick={() => { selectAnimal(a.id); setStep(1); }}
              >
                <span className="animal-icon">{a.icon}</span>
                <span className="animal-label">{a.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Step 1: Movement grid ── */}
      {step === 1 && (
        <section>
          <h3>How does it move?</h3>
          <p className="hint">
            <strong>Ring around centre</strong> — click to cycle: grey = off → 🟦 step → 🟩 slide → off.<br />
            <strong>Outer squares</strong> — click to toggle 🟨 jump (leaps over pieces).
          </p>
          <MovementGrid grid={grid} onRing1={toggleRing1} onOuter={toggleOuter} />
          {grid.ring1 && Object.values(grid.ring1).some((v) => v === "slide") && (
            <div className="range-row">
              <label>Max slide range:&nbsp;
                <strong>{grid.maxRange >= 8 ? "∞" : grid.maxRange}</strong>
              </label>
              <input
                type="range" min={1} max={8} value={grid.maxRange}
                onChange={(e) => setGrid((g) => ({ ...g, maxRange: Number(e.target.value) }))}
              />
            </div>
          )}
          <p className="hint">{movementSummary(currentDef)}</p>
          <div className="btn-row">
            <button className="btn-secondary" onClick={() => setStep(0)}>← Animals</button>
            <button className="btn-primary" onClick={() => setStep(2)}>Next →</button>
          </div>
        </section>
      )}

      {/* ── Step 2: Name & save ── */}
      {step === 2 && (
        <section>
          <h3>Name your piece</h3>
          <div className="animal-preview">
            <span className="animal-icon-large">
              {ANIMALS.find((a) => a.id === animal)?.icon}
            </span>
            <p>{movementSummary(currentDef)}</p>
          </div>
          <label>
            Piece name
            <input
              className="text-input"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              maxLength={24}
            />
          </label>
          <div className="btn-row">
            <button className="btn-secondary" onClick={() => setStep(1)}>← Movement</button>
            <button className="btn-secondary" onClick={handleUseWithoutSaving}>
              Use without saving
            </button>
            <button className="btn-primary" onClick={handleSave}>
              Save &amp; use
            </button>
          </div>
          <div className="saved-pieces-list">
            {store.settings.savedCustomPieces.length > 0 && (
              <>
                <h4>Saved pieces</h4>
                {store.settings.savedCustomPieces.map((sp) => (
                  <div key={sp.id} className="saved-piece-row">
                    <button
                      className="pill"
                      onClick={() => {
                        setAnimal(sp.def.animal);
                        setGrid(defToGrid(sp.def));
                        setLabel(sp.name);
                        setSaveName(sp.name);
                      }}
                    >
                      {sp.name}
                    </button>
                    <button
                      className="pill"
                      style={{ color: "var(--accent-red, #f55)" }}
                      onClick={() => handleDeleteSavedPiece(sp.id)}
                      aria-label={`Delete ${sp.name}`}
                    >
                      &#128465;
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7×7 movement grid component
// ---------------------------------------------------------------------------

interface MovementGridProps {
  grid: GridState;
  onRing1: (df: number, dr: number) => void;
  onOuter: (df: number, dr: number) => void;
}

function MovementGrid({ grid, onRing1, onOuter }: MovementGridProps) {
  const SIZE = 7;
  const CENTER = 3;

  const rows: ReactElement[] = [];
  for (let row = 0; row < SIZE; row++) {
    const cells: ReactElement[] = [];
    for (let col = 0; col < SIZE; col++) {
      const df = col - CENTER;
      const dr = CENTER - row;
      const isCenter = df === 0 && dr === 0;
      const isRing1 = !isCenter && Math.max(Math.abs(df), Math.abs(dr)) === 1;
      const key = `${df},${dr}`;

      if (isCenter) {
        cells.push(
          <div key={key} className="mgrid-cell mgrid-center">●</div>
        );
      } else if (isRing1) {
        const st: Ring1State = grid.ring1[key] ?? "off";
        cells.push(
          <button
            key={key}
            className={`mgrid-cell mgrid-ring1 mgrid-${st}`}
            onClick={() => onRing1(df, dr)}
            title={st === "off" ? "click: step" : st === "step" ? "click: slide" : "click: off"}
          >
            {st === "step" ? "M" : st === "slide" ? "S" : ""}
          </button>
        );
      } else {
        const st: OuterState = grid.outer[key] ?? "off";
        cells.push(
          <button
            key={key}
            className={`mgrid-cell mgrid-outer mgrid-${st}`}
            onClick={() => onOuter(df, dr)}
            title={st === "off" ? "click: jump" : "click: off"}
          >
            {st === "leap" ? "J" : ""}
          </button>
        );
      }
    }
    rows.push(<div key={row} className="mgrid-row">{cells}</div>);
  }

  return <div className="mgrid">{rows}</div>;
}
