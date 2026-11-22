import { newGame, type GameState } from './game';
import { countSolutions, solveFirst } from './solver';
import type { Mark, Puzzle } from './types';

export interface Settings {
  symbols: boolean;
}

export interface Saved {
  version: 1;
  level: number;
  /** a solução NÃO é salva: é recalculada das cores ao carregar (a fase tem solução única) */
  puzzle: Omit<Puzzle, 'solution'>;
  cells: Mark[];
  history: GameState['history'];
  redo: GameState['redo'];
  hintsUsed: number;
  mistakes?: number;
  powersUsed?: number;
  continued?: boolean;
  startedAt: number;
  finishedAt: number | null;
  pausedAt?: number | null;
  won: boolean;
  settings: Settings;
}

export const STORAGE_KEY = 'gatinhos:v1';
export const DEFAULT_SETTINGS: Settings = { symbols: false };

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

function stripSolution(p: Puzzle): Omit<Puzzle, 'solution'> {
  const { solution: _solution, ...rest } = p;
  void _solution;
  return rest;
}

export function serialize(level: number, g: GameState, symbols: boolean): Saved {
  return {
    version: 1,
    level,
    puzzle: stripSolution(g.puzzle),
    cells: g.cells,
    history: g.history,
    redo: g.redo,
    hintsUsed: g.hintsUsed,
    mistakes: g.mistakes,
    powersUsed: g.powersUsed,
    continued: g.continued,
    startedAt: g.startedAt,
    finishedAt: g.finishedAt,
    pausedAt: g.pausedAt,
    won: g.won,
    settings: { symbols },
  };
}

export function save(kv: KV, level: number, g: GameState, symbols: boolean): void {
  try {
    kv.setItem(STORAGE_KEY, JSON.stringify(serialize(level, g, symbols)));
  } catch {
    /* armazenamento indisponível: o jogo segue sem persistir */
  }
}

const isMark = (m: unknown): m is Mark => !!m && typeof m === 'object' && ['empty', 'x', 'cat', 'bad'].includes((m as Mark).state);
const isChanges = (h: unknown, total: number): boolean =>
  Array.isArray(h) &&
  h.every(
    (e) => Array.isArray(e) && e.every((c) => c && Number.isInteger(c.index) && c.index >= 0 && c.index < total && isMark(c.before) && isMark(c.after)),
  );

function validPuzzle(p: Omit<Puzzle, 'solution'>): boolean {
  const n = p?.size;
  return (
    Number.isInteger(n) &&
    n >= 4 &&
    n <= 10 &&
    Array.isArray(p.regions) &&
    p.regions.length === n &&
    p.regions.every((row) => Array.isArray(row) && row.length === n && row.every((v) => Number.isInteger(v) && v >= 0 && v < n)) &&
    (p.givens === undefined || (Array.isArray(p.givens) && p.givens.every((i) => Number.isInteger(i) && i >= 0 && i < n * n)))
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
    // recalcula a solução a partir das cores; fase adulterada (sem solução única) é descartada
    if (countSolutions(s.puzzle.regions, 2) !== 1) return null;
    const solution = solveFirst(s.puzzle.regions);
    if (!solution) return null;
    const puzzle: Puzzle = { size: s.puzzle.size, regions: s.puzzle.regions, solution, difficulty: s.puzzle.difficulty, givens: s.puzzle.givens };
    if (puzzle.difficulty === undefined) delete puzzle.difficulty;
    if (puzzle.givens === undefined) delete puzzle.givens;
    const total = puzzle.size ** 2;
    if (!Array.isArray(s.cells) || s.cells.length !== total || !s.cells.every(isMark)) return null;
    if (!isChanges(s.history, total) || !isChanges(s.redo, total)) return null;
    if (!Number.isFinite(s.startedAt) || !Number.isInteger(s.hintsUsed) || s.hintsUsed < 0) return null;
    const game: GameState = {
      ...newGame(puzzle, { now: s.startedAt }),
      cells: s.cells,
      history: s.history,
      redo: s.redo,
      hintsUsed: s.hintsUsed,
      mistakes: Number.isInteger(s.mistakes) && s.mistakes! >= 0 ? s.mistakes! : 0,
      powersUsed: Number.isInteger(s.powersUsed) && s.powersUsed! >= 0 ? s.powersUsed! : 0,
      continued: !!s.continued,
      finishedAt: typeof s.finishedAt === 'number' ? s.finishedAt : null,
      pausedAt: Number.isFinite(s.pausedAt) ? s.pausedAt! : null,
      won: !!s.won,
    };
    return { level: s.level, game, symbols: !!s.settings?.symbols };
  } catch {
    return null;
  }
}
