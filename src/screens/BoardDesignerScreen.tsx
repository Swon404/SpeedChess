import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { CustomPieceDef, PieceType } from "../engine/board";
import { useGame } from "../GameContext";
import {
  deleteCustomGame,
  deleteCustomPiece,
  saveCustomGame,
  type SavedCustomGame,
  type SavedCustomPiece,
} from "../engine/storage";
import { Piece } from "../components/Piece";

const STD_PIECES: PieceType[] = ["K", "Q", "R", "B", "N", "P"];
const PIECE_LABEL: Record<string, string> = {
  K: "King", Q: "Queen", R: "Rook", B: "Bishop", N: "Knight", P: "Pawn", X1: "Custom",
};
const LEGACY_CUSTOM_ID = "legacy-x1";

type SquareEntry = { rank: number; file: number; type: PieceType; customPieceId?: string };
type CustomPieceOption = SavedCustomPiece & { aliasIds: string[] };

type BoardDesignerLocationState = {
  customPieceDef?: CustomPieceDef;
  savedPieceId?: string;
  boardSquares?: SquareEntry[];
  customPieces?: SavedCustomPiece[];
  gameName?: string;
  editingId?: string | null;
  returnPickerAt?: { rank: number; file: number };
} | null;

const DEFAULT_SQUARES: SquareEntry[] = [
  { rank: 0, file: 0, type: "R" }, { rank: 0, file: 1, type: "N" },
  { rank: 0, file: 2, type: "B" }, { rank: 0, file: 3, type: "Q" },
  { rank: 0, file: 4, type: "K" }, { rank: 0, file: 5, type: "B" },
  { rank: 0, file: 6, type: "N" }, { rank: 0, file: 7, type: "R" },
  { rank: 1, file: 0, type: "P" }, { rank: 1, file: 1, type: "P" },
  { rank: 1, file: 2, type: "P" }, { rank: 1, file: 3, type: "P" },
  { rank: 1, file: 4, type: "P" }, { rank: 1, file: 5, type: "P" },
  { rank: 1, file: 6, type: "P" }, { rank: 1, file: 7, type: "P" },
];

function validateLayout(squares: SquareEntry[]): string | null {
  const kings = squares.filter((square) => square.type === "K");
  if (kings.length === 0) return "You need a King!";
  if (kings.length > 1) return "Only one King allowed.";
  return null;
}

function clonePiece(piece: SavedCustomPiece): SavedCustomPiece {
  return {
    ...piece,
    def: {
      ...piece.def,
      stepDirs: piece.def.stepDirs.slice(),
      slideDirs: piece.def.slideDirs.slice(),
      leapPatterns: piece.def.leapPatterns.slice(),
    },
  };
}

function pieceSignature(piece: SavedCustomPiece): string {
  const def = piece.def;
  return JSON.stringify({
    name: piece.name,
    animal: def.animal,
    label: def.label,
    maxRange: def.maxRange,
    stepDirs: def.stepDirs,
    slideDirs: def.slideDirs,
    leapPatterns: def.leapPatterns,
  });
}

function dedupePieces(pieces: SavedCustomPiece[]): CustomPieceOption[] {
  const bySignature = new Map<string, CustomPieceOption>();
  for (const originalPiece of pieces) {
    const piece = clonePiece(originalPiece);
    const signature = pieceSignature(piece);
    const existing = bySignature.get(signature);
    if (!existing) {
      bySignature.set(signature, { ...piece, aliasIds: [piece.id] });
      continue;
    }
    bySignature.set(signature, {
      ...piece,
      aliasIds: Array.from(new Set([...existing.aliasIds, piece.id])),
    });
  }
  return [...bySignature.values()];
}

function legacyPieceFromDef(def?: CustomPieceDef): SavedCustomPiece[] {
  return def ? [{ id: LEGACY_CUSTOM_ID, name: def.label || "Custom", def }] : [];
}

type PickerChoice =
  | { kind: "std"; type: PieceType }
  | { kind: "custom"; piece: SavedCustomPiece }
  | { kind: "empty" };

interface PickerProps {
  customPieces: CustomPieceOption[];
  pieceSet: string;
  onPick: (choice: PickerChoice) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

function PiecePicker({ customPieces, pieceSet, onPick, onCreateNew, onClose }: PickerProps) {
  return (
    <div className="piece-picker-overlay" onClick={onClose}>
      <div className="piece-picker" onClick={(e) => e.stopPropagation()}>
        <div className="piece-picker-row">
          <button className="picker-cell picker-empty" onClick={() => onPick({ kind: "empty" })} title="Empty square">
            &#x2715;
          </button>
          {STD_PIECES.map((pieceType) => (
            <button
              key={pieceType}
              className="picker-cell"
              onClick={() => onPick({ kind: "std", type: pieceType })}
              title={PIECE_LABEL[pieceType]}
            >
              <Piece color="w" type={pieceType} set={pieceSet as any} />
            </button>
          ))}
        </div>
        {customPieces.length > 0 && (
          <div className="piece-picker-row">
            {customPieces.map((piece) => (
              <button
                key={piece.id}
                className="picker-cell picker-custom"
                onClick={() => onPick({ kind: "custom", piece })}
                title={piece.name}
              >
                <Piece color="w" type="X1" set={pieceSet as any} customPieceDef={piece.def} />
                <span className="picker-label">{piece.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="piece-picker-row">
          <button className="picker-create-btn" onClick={onCreateNew}>
            + Create new piece
          </button>
        </div>
      </div>
    </div>
  );
}

export function BoardDesignerScreen() {
  const nav = useNavigate();
  const location = useLocation();
  const { store, updateSetting } = useGame();
  const pieceSet = store.settings.pieceSet;
  const theme = store.settings.theme;
  const locState = location.state as BoardDesignerLocationState;

  const returnedPiece: SavedCustomPiece | null = locState?.customPieceDef
    ? {
        id: locState.savedPieceId ?? crypto.randomUUID(),
        name: locState.customPieceDef.label || "Custom",
        def: locState.customPieceDef,
      }
    : null;

  const initialCustomPieces = dedupePieces([
    ...(locState?.customPieces?.map(clonePiece) ?? []),
    ...legacyPieceFromDef(!locState?.customPieces?.length ? locState?.customPieceDef : undefined),
    ...(returnedPiece ? [clonePiece(returnedPiece)] : []),
  ]);

  const initialSquares = (): SquareEntry[] => {
    const base = (locState?.boardSquares ?? DEFAULT_SQUARES).map((square) => ({ ...square }));
    const normalized = base.map((square) => (
      square.type === "X1" && !square.customPieceId && initialCustomPieces.length === 1
        ? { ...square, customPieceId: initialCustomPieces[0].id }
        : square
    ));
    if (locState?.returnPickerAt && returnedPiece) {
      const { rank, file } = locState.returnPickerAt;
      return [
        ...normalized.filter((square) => !(square.rank === rank && square.file === file)),
        { rank, file, type: "X1", customPieceId: returnedPiece.id },
      ];
    }
    return normalized;
  };

  const [squares, setSquares] = useState<SquareEntry[]>(initialSquares);
  const [gameName, setGameName] = useState(locState?.gameName ?? "My Custom Game");
  const [editingId, setEditingId] = useState<string | null>(locState?.editingId ?? null);
  const [boardCustomPieces, setBoardCustomPieces] = useState<SavedCustomPiece[]>(initialCustomPieces.map(({ aliasIds: _aliasIds, ...piece }) => piece));
  const [pickerAt, setPickerAt] = useState<{ rank: number; file: number } | null>(null);

  const availableCustomPieces = useMemo(
    () => dedupePieces([...boardCustomPieces, ...store.settings.savedCustomPieces.map(clonePiece)]),
    [boardCustomPieces, store.settings.savedCustomPieces]
  );

  const getAt = (rank: number, file: number) =>
    squares.find((square) => square.rank === rank && square.file === file);

  const customPieceOptionFor = (id?: string) => availableCustomPieces.find((piece) => piece.aliasIds.includes(id ?? ""));
  const customPieceFor = (id?: string) => customPieceOptionFor(id)?.def;

  const handlePick = (choice: PickerChoice) => {
    if (!pickerAt) return;
    const { rank, file } = pickerAt;
    if (choice.kind === "empty") {
      setSquares((current) => current.filter((square) => !(square.rank === rank && square.file === file)));
    } else if (choice.kind === "std") {
      setSquares((current) => [
        ...current.filter((square) => !(square.rank === rank && square.file === file)),
        { rank, file, type: choice.type },
      ]);
    } else {
      setBoardCustomPieces((current) => {
        const merged = dedupePieces([clonePiece(choice.piece), ...current]);
        return merged.map(({ aliasIds: _aliasIds, ...piece }) => piece);
      });
      setSquares((current) => [
        ...current.filter((square) => !(square.rank === rank && square.file === file)),
        { rank, file, type: "X1", customPieceId: choice.piece.id },
      ]);
    }
    setPickerAt(null);
  };

  const handleCreateNewPiece = (fromPickerAt?: { rank: number; file: number }) => {
    const savedPickerAt = fromPickerAt ?? pickerAt ?? undefined;
    setPickerAt(null);
    nav("/piece-designer", {
      state: {
        returnTo: "/board-designer",
        boardSquares: squares,
        customPieces: boardCustomPieces,
        gameName,
        editingId,
        returnPickerAt: savedPickerAt,
      },
    });
  };

  const handleSave = () => {
    const error = validateLayout(squares);
    if (error) {
      alert(error);
      return;
    }
    const referencedIds = new Set(
      squares
        .filter((square) => square.type === "X1" && square.customPieceId)
        .map((square) => square.customPieceId as string)
    );
    const game: SavedCustomGame = {
      id: editingId ?? crypto.randomUUID(),
      name: gameName.trim() || "My Custom Game",
      squares: squares.map((square) => ({
        ...square,
        customPieceId: square.type === "X1" ? (customPieceOptionFor(square.customPieceId)?.id ?? square.customPieceId) : square.customPieceId,
      })),
      customPieces: availableCustomPieces
        .filter((piece) => piece.aliasIds.some((aliasId) => referencedIds.has(aliasId)))
        .map(({ aliasIds: _aliasIds, ...piece }) => clonePiece(piece)),
    };
    const updated = { ...store, settings: { ...store.settings } };
    saveCustomGame(updated, game);
    updateSetting("savedCustomGames", updated.settings.savedCustomGames);
    updateSetting("lastCustomGameId", game.id);
    setEditingId(game.id);
    nav("/new", { state: { customGame: game } });
  };

  const handleUseWithoutSaving = () => {
    const error = validateLayout(squares);
    if (error) {
      alert(error);
      return;
    }
    const referencedIds = new Set(
      squares
        .filter((square) => square.type === "X1" && square.customPieceId)
        .map((square) => square.customPieceId as string)
    );
    const game: SavedCustomGame = {
      id: crypto.randomUUID(),
      name: gameName.trim() || "Custom",
      squares: squares.map((square) => ({
        ...square,
        customPieceId: square.type === "X1" ? (customPieceOptionFor(square.customPieceId)?.id ?? square.customPieceId) : square.customPieceId,
      })),
      customPieces: availableCustomPieces
        .filter((piece) => piece.aliasIds.some((aliasId) => referencedIds.has(aliasId)))
        .map(({ aliasIds: _aliasIds, ...piece }) => clonePiece(piece)),
    };
    nav("/new", { state: { customGame: game } });
  };

  const handleLoad = (game: SavedCustomGame) => {
    const loadedCustomPieces = dedupePieces([
      ...(game.customPieces?.map(clonePiece) ?? []),
      ...legacyPieceFromDef(!game.customPieces?.length ? game.customPieceDef : undefined),
    ]);
    setSquares(game.squares.map((square) => ({
      ...square,
      customPieceId: square.type === "X1" && !square.customPieceId && loadedCustomPieces.length === 1
        ? loadedCustomPieces[0].id
        : square.customPieceId,
    })));
    setBoardCustomPieces(loadedCustomPieces.map(({ aliasIds: _aliasIds, ...piece }) => piece));
    setGameName(game.name);
    setEditingId(game.id);
  };

  const handleDeleteGame = (id: string) => {
    const updated = { ...store, settings: { ...store.settings } };
    deleteCustomGame(updated, id);
    updateSetting("savedCustomGames", updated.settings.savedCustomGames);
    if (editingId === id) setEditingId(null);
  };

  const handleDeletePiece = (id: string) => {
    const option = customPieceOptionFor(id);
    const aliasIds = option?.aliasIds ?? [id];
    setSquares((current) => current.filter((square) => !aliasIds.includes(square.customPieceId ?? "")));
    setBoardCustomPieces((current) => current.filter((piece) => !aliasIds.includes(piece.id)));
    if (store.settings.savedCustomPieces.some((piece) => aliasIds.includes(piece.id))) {
      const updated = { ...store, settings: { ...store.settings } };
      for (const aliasId of aliasIds) deleteCustomPiece(updated, aliasId);
      updateSetting("savedCustomPieces", updated.settings.savedCustomPieces);
      updateSetting("lastCustomPieceId", updated.settings.lastCustomPieceId);
    }
  };

  const handleResetBoard = () => setSquares(DEFAULT_SQUARES.map((square) => ({ ...square })));
  const handleClearBoard = () => setSquares([{ rank: 0, file: 4, type: "K" }]);

  const error = validateLayout(squares);
  const hasMissingCustomPiece = squares.some((square) => square.type === "X1" && !customPieceFor(square.customPieceId));

  return (
    <div className="screen">
      <div className="topbar">
        <Link to="/new">&#8592; Back</Link>
        <span>Board Designer</span>
      </div>

      {store.settings.savedCustomGames.length > 0 && (
        <section>
          <h3>Saved custom games</h3>
          <div className="difficulty">
            {store.settings.savedCustomGames.map((game) => (
              <span key={game.id} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <button className={`pill${editingId === game.id ? " active" : ""}`} onClick={() => handleLoad(game)}>
                  {game.name}
                </button>
                <button
                  className="pill"
                  style={{ color: "var(--accent-red, #f55)" }}
                  onClick={() => handleDeleteGame(game.id)}
                  aria-label={`Delete ${game.name}`}
                >
                  &#128465;
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3>Design your board</h3>
        <p className="hint">
          Click any square to change its piece. Edit white&#8217;s side (bottom 4 rows) &#8212; black mirrors automatically.
        </p>

        <div className={`board-designer-grid board-theme-${theme}`} style={{ position: "relative" }}>
          {[7, 6, 5, 4].map((rank) => (
            <div key={rank} className="board-row">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((file) => {
                const entry = getAt(7 - rank, file);
                const isLight = (rank + file) % 2 === 1;
                return (
                  <div
                    key={file}
                    className={`square ${isLight ? "light" : "dark"} board-designer-mirror`}
                    aria-hidden="true"
                  >
                    {entry && (
                      <span className="piece-wrap" style={{ opacity: 0.4 }}>
                        <Piece
                          color="b"
                          type={entry.type}
                          set={pieceSet}
                          customPieceDef={entry.type === "X1" ? customPieceFor(entry.customPieceId) : undefined}
                        />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {[3, 2, 1, 0].map((rank) => (
            <div key={rank} className="board-row">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((file) => {
                const entry = getAt(rank, file);
                const isLight = (rank + file) % 2 === 1;
                const isActive = pickerAt?.rank === rank && pickerAt?.file === file;
                return (
                  <button
                    key={file}
                    className={`square ${isLight ? "light" : "dark"} board-designer-square${isActive ? " picker-active" : ""}`}
                    onClick={() => setPickerAt({ rank, file })}
                    aria-label={`${String.fromCharCode(97 + file)}${rank + 1}`}
                  >
                    {entry && (
                      <span className="piece-wrap">
                        <Piece
                          color="w"
                          type={entry.type}
                          set={pieceSet}
                          customPieceDef={entry.type === "X1" ? customPieceFor(entry.customPieceId) : undefined}
                        />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {hasMissingCustomPiece && (
          <p className="hint" style={{ color: "var(--accent-red,#f55)", marginTop: 6 }}>
            One or more custom pieces on the board no longer have a definition. Delete them or recreate the missing piece.
          </p>
        )}
        {error && <p className="hint" style={{ color: "var(--accent-red,#f55)", marginTop: 6 }}>{error}</p>}

        <div className="btn-row" style={{ marginTop: 8 }}>
          <button className="btn-secondary" onClick={handleResetBoard} title="Restore default chess starting position">
            &#8635; Reset board
          </button>
          <button className="btn-secondary" onClick={handleClearBoard} title="Clear all pieces (keeps King)">
            &#9003; New board
          </button>
          <button className="btn-primary" onClick={() => handleCreateNewPiece()} title="Open the piece designer">
            + Create new piece
          </button>
        </div>

        {availableCustomPieces.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h3>Custom pieces</h3>
            <div className="difficulty">
              {availableCustomPieces.map((piece) => (
                <span key={piece.id} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                  <span className="pill" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span className="custom-piece-icon" style={{ width: 24, height: 24 }}>
                      <Piece color="w" type="X1" set={pieceSet as any} customPieceDef={piece.def} />
                    </span>
                    {piece.name}
                  </span>
                  <button
                    className="pill"
                    style={{ color: "var(--accent-red, #f55)" }}
                    onClick={() => handleDeletePiece(piece.id)}
                    aria-label={`Delete ${piece.name}`}
                  >
                    &#128465;
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {pickerAt && (
          <PiecePicker
            customPieces={availableCustomPieces}
            pieceSet={pieceSet}
            onPick={handlePick}
            onCreateNew={handleCreateNewPiece}
            onClose={() => setPickerAt(null)}
          />
        )}
      </section>

      <section>
        <h3>Save</h3>
        <label>
          Name{" "}
          <input
            className="text-input"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            maxLength={30}
          />
        </label>
        <div className="btn-row">
          <button className="btn-secondary" onClick={handleUseWithoutSaving} disabled={!!error}>
            Use without saving
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!!error}>
            Save &amp; use
          </button>
        </div>
      </section>
    </div>
  );
}
