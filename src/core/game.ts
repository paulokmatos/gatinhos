import { getHint, type Hint } from './hint';
import type { Mark, Puzzle } from './types';
import { conflictIndexes } from './validator';

export const MAX_ATTEMPTS = 3;

export interface Change {
  index: number;
  before: Mark;
  after: Mark;
}

export interface GameState {
  puzzle: Puzzle;
  cells: Mark[];
  history: Change[][];
  redo: Change[][];
  hintsUsed: number;
  /** erros do jogador (X em casa de gatinho); ao chegar em MAX_ATTEMPTS a fase é perdida */
  mistakes: number;
  /** o jogador escolheu continuar depois de perder */
  continued: boolean;
  startedAt: number;
  finishedAt: number | null;
  won: boolean;
  lastMove: number | null;
  /** dica em andamento: nível 1–3 (3 = mostra Aplicar) */
  hint: { level: 1 | 2 | 3; data: Hint } | null;
}

export const isLost = (g: GameState) => !g.won && !g.continued && g.mistakes >= MAX_ATTEMPTS;
const locked = (g: GameState) => g.won || isLost(g);
export const attemptsLeft = (g: GameState) => Math.max(0, MAX_ATTEMPTS - g.mistakes);

const EMPTY: Mark = { state: 'empty' };

export function newGame(puzzle: Puzzle, opts: { now?: number } = {}): GameState {
  return {
    puzzle,
    cells: Array.from({ length: puzzle.size * puzzle.size }, () => ({ ...EMPTY })),
    history: [],
    redo: [],
    hintsUsed: 0,
    mistakes: 0,
    continued: false,
    startedAt: opts.now ?? Date.now(),
    finishedAt: null,
    won: false,
    lastMove: null,
    hint: null,
  };
}

const pos = (g: GameState, i: number) => ({ r: Math.floor(i / g.puzzle.size), c: i % g.puzzle.size });

/** Aplica um conjunto de mudanças como UMA entrada de histórico. */
function commit(g: GameState, changes: Change[], last: number | null): GameState {
  const real = changes.filter((c) => c.before.state !== c.after.state);
  if (!real.length) return g;
  const cells = g.cells.slice();
  for (const c of real) cells[c.index] = { ...c.after };
  return finalize({ ...g, cells, history: [...g.history, real], redo: [], lastMove: last, hint: null });
}

function finalize(g: GameState, now = Date.now()): GameState {
  const cats = g.cells.filter((m) => m.state === 'cat').length;
  const winning = cats === g.puzzle.size && conflictIndexes(g.puzzle, g.cells).size === 0;
  if (winning && !g.won) return { ...g, won: true, finishedAt: now, hint: null };
  return g;
}

export function conflicts(g: GameState): Set<number> {
  return conflictIndexes(g.puzzle, g.cells);
}

/**
 * Toque: vazio → X → gatinho. O X é só rascunho do jogador (pode estar errado) e nunca é posto sozinho.
 * O gatinho só aparece numa casa que é dele; ao tocar de novo num gatinho nada acontece.
 * Num X de casa sem gatinho, o toque limpa o X, o gatinho não aparece e gasta 1 das MAX_ATTEMPTS tentativas.
 */
export function tap(g: GameState, i: number): GameState {
  if (locked(g)) return g;
  const before = g.cells[i];
  if (before.state === 'cat') return g;
  const n = g.puzzle.size;
  const isCatCell = g.puzzle.solution[Math.floor(i / n)] === i % n;
  let after: Mark;
  if (before.state === 'empty') after = { state: 'x' };
  else after = isCatCell ? { state: 'cat' } : { ...EMPTY };
  const next = commit(g, [{ index: i, before, after }], i);
  // tentar o gatinho (2º toque) numa casa que não é dele gasta uma tentativa
  const mistake = before.state === 'x' && !isCatCell;
  return mistake && next !== g ? { ...next, mistakes: g.mistakes + 1 } : next;
}

/** Arrasto: casas vazias percorridas viram X, sem sobrescrever gatos (nem X). */
export function dragX(g: GameState, path: number[]): GameState {
  if (locked(g)) return g;
  const seen = new Set<number>();
  const changes: Change[] = [];
  for (const i of path) {
    if (seen.has(i) || g.cells[i].state !== 'empty') continue;
    seen.add(i);
    changes.push({ index: i, before: g.cells[i], after: { state: 'x' } });
  }
  return commit(g, changes, path.length ? path[path.length - 1] : null);
}

export function undo(g: GameState): GameState {
  const entry = g.history[g.history.length - 1];
  if (!entry || locked(g)) return g;
  const cells = g.cells.slice();
  for (const c of entry) cells[c.index] = { ...c.before };
  return { ...g, cells, history: g.history.slice(0, -1), redo: [...g.redo, entry], hint: null, lastMove: null };
}

export function redo(g: GameState): GameState {
  const entry = g.redo[g.redo.length - 1];
  if (!entry || locked(g)) return g;
  const cells = g.cells.slice();
  for (const c of entry) cells[c.index] = { ...c.after };
  return finalize({ ...g, cells, redo: g.redo.slice(0, -1), history: [...g.history, entry], hint: null });
}

export function continueAfterLoss(g: GameState): GameState {
  return isLost(g) ? { ...g, continued: true } : g;
}

export function restart(g: GameState, now = Date.now()): GameState {
  return newGame(g.puzzle, { now });
}

export function canHint(g: GameState): boolean {
  return !locked(g);
}

/** Toque no botão de dica: 1 = área, 2 = frase, 3 = botão Aplicar. Não conta em hintsUsed. */
export function pressHint(g: GameState): GameState {
  if (!canHint(g)) return g;
  if (!g.hint) {
    const data = getHint(g.puzzle, g.cells, g.lastMove);
    return data ? { ...g, hint: { level: 1, data } } : g;
  }
  if (g.hint.level === 3) return g;
  return { ...g, hint: { ...g.hint, level: (g.hint.level + 1) as 2 | 3 } };
}

/** Aplicar (só no nível 3): marca o passo numa única entrada de histórico; hintsUsed +1. */
export function applyHint(g: GameState): GameState {
  const h = g.hint;
  if (!h || h.level !== 3 || !h.data.apply || locked(g)) return g;
  const changes: Change[] = [];
  for (const i of h.data.apply.xs) if (g.cells[i].state !== 'x') changes.push({ index: i, before: g.cells[i], after: { state: 'x' } });
  for (const i of h.data.apply.cats) if (g.cells[i].state !== 'cat') changes.push({ index: i, before: g.cells[i], after: { state: 'cat' } });
  const next = commit(g, changes, changes[0]?.index ?? g.lastMove);
  return next === g ? g : { ...next, hintsUsed: g.hintsUsed + 1 };
}

export const isWon = (g: GameState) => g.won;
export const elapsedMs = (g: GameState, now = Date.now()) => (g.finishedAt ?? now) - g.startedAt;
