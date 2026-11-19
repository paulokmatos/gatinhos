import { newGame, type GameState } from './game';
import type { Mark, Puzzle } from './types';

export interface Settings {
  autoX: boolean;
  symbols: boolean;
}

export interface Saved {
  version: 1;
  level: number;
  puzzle: Puzzle;
  cells: Mark[];
  history: GameState['history'];
  redo: GameState['redo'];
  hintsUsed: number;
  startedAt: number;
  finishedAt: number | null;
  won: boolean;
  settings: Settings;
}

export const STORAGE_KEY = 'gatinhos:v1';
export const DEFAULT_SETTINGS: Settings = { autoX: true, symbols: false };

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export function serialize(level: number, g: GameState, symbols: boolean): Saved {
  return {
    version: 1,
    level,
    puzzle: g.puzzle,
    cells: g.cells,
    history: g.history,
    redo: g.redo,
    hintsUsed: g.hintsUsed,
    startedAt: g.startedAt,
    finishedAt: g.finishedAt,
    won: g.won,
    settings: { autoX: g.autoX, symbols },
  };
}

export function save(kv: KV, level: number, g: GameState, symbols: boolean): void {
  try {
    kv.setItem(STORAGE_KEY, JSON.stringify(serialize(level, g, symbols)));
  } catch {
    /* armazenamento indisponível: o jogo segue sem persistir */
  }
}

const isMark = (m: unknown): m is Mark => !!m && typeof m === 'object' && ['empty', 'x', 'cat'].includes((m as Mark).state);
const isChanges = (h: unknown, total: number): boolean =>
  Array.isArray(h) &&
  h.every(
    (e) => Array.isArray(e) && e.every((c) => c && Number.isInteger(c.index) && c.index >= 0 && c.index < total && isMark(c.before) && isMark(c.after)),
  );

function validPuzzle(p: Puzzle): boolean {
  const n = p?.size;
  return (
    Number.isInteger(n) &&
    n >= 4 &&
    n <= 10 &&
    Array.isArray(p.regions) &&
    p.regions.length === n &&
    p.regions.every((row) => Array.isArray(row) && row.length === n && row.every((v) => Number.isInteger(v) && v >= 0 && v < n)) &&
    Array.isArray(p.solution) &&
    p.solution.length === n &&
    p.solution.every((c) => Number.isInteger(c) && c >= 0 && c < n)
  );
}

export interface Loaded {
  level: number;
  game: GameState;
  symbols: boolean;
}

/** Lê e valida o que foi salvo. Vazio/corrompido → null (o app começa na fase 1). */
export function load(kv: KV): Loaded | null {
  try {
    const raw = kv.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    if (s?.version !== 1 || !Number.isInteger(s.level) || s.level < 1 || !validPuzzle(s.puzzle)) return null;
    const total = s.puzzle.size ** 2;
    if (!Array.isArray(s.cells) || s.cells.length !== total || !s.cells.every(isMark)) return null;
    if (!isChanges(s.history, total) || !isChanges(s.redo, total)) return null;
    if (!Number.isFinite(s.startedAt) || !Number.isInteger(s.hintsUsed) || s.hintsUsed < 0) return null;
    const game: GameState = {
      ...newGame(s.puzzle, { autoX: !!s.settings?.autoX, now: s.startedAt }),
      cells: s.cells,
      history: s.history,
      redo: s.redo,
      hintsUsed: s.hintsUsed,
      finishedAt: typeof s.finishedAt === 'number' ? s.finishedAt : null,
      won: !!s.won,
    };
    return { level: s.level, game, symbols: !!s.settings?.symbols };
  } catch {
    return null;
  }
}
