import { getHint, type Hint } from './hint';
import { stateFromMarks } from './human';
import type { Mark, Puzzle } from './types';
import { conflictIndexes } from './validator';

export const MAX_ATTEMPTS = 3;
/** usos do poder "Revelar gatinho" por nível */
export const MAX_REVEALS = 1;

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
  /** erros do jogador (X em casa de gatinho); ao chegar em MAX_ATTEMPTS o nível é perdido */
  mistakes: number;
  /** poderes usados neste nível */
  powersUsed: number;
  /** casa que recebeu o toque anterior: um 2º toque seguido nela é uma tentativa */
  armed: number | null;
  /** instante (ms) do toque que armou a casa */
  armedAt: number;
  /** o jogador escolheu continuar depois de perder */
  continued: boolean;
  startedAt: number;
  finishedAt: number | null;
  pausedAt: number | null;
  won: boolean;
  lastMove: number | null;
  /** dica em andamento: nível 1–3 (3 = mostra Aplicar) */
  hint: { level: 1 | 2 | 3; data: Hint } | null;
}

export const isLost = (g: GameState) => !g.won && !g.continued && g.mistakes >= MAX_ATTEMPTS;
const locked = (g: GameState) => g.won || isLost(g);
export const attemptsLeft = (g: GameState) => Math.max(0, MAX_ATTEMPTS - g.mistakes);

const EMPTY: Mark = { state: 'empty' };
/** casas que o jogador não altera: gatinho e ✕ vermelho */
const LOCKED = new Set<string>(['cat', 'bad']);

export function newGame(puzzle: Puzzle, opts: { now?: number } = {}): GameState {
  return {
    puzzle,
    cells: Array.from({ length: puzzle.size * puzzle.size }, (_, i) => (puzzle.givens?.includes(i) ? { state: 'cat' as const } : { ...EMPTY })),
    history: [],
    redo: [],
    hintsUsed: 0,
    mistakes: 0,
    powersUsed: 0,
    armed: null,
    armedAt: 0,
    continued: false,
    startedAt: opts.now ?? Date.now(),
    finishedAt: null,
    pausedAt: null,
    won: false,
    lastMove: null,
    hint: null,
  };
}

/**
 * Aplica mudanças. Gatinho é escrita do código (não é estado que o jogador altera): só as marcações
 * do jogador (X) entram no histórico, numa única entrada. Quem desfaz/refaz nunca mexe em gatinho.
 */
function commit(g: GameState, changes: Change[], last: number | null): GameState {
  const real = changes.filter((c) => c.before.state !== c.after.state);
  if (!real.length) return g;
  const cells = g.cells.slice();
  for (const c of real) cells[c.index] = { ...c.after };
  const marks = real.filter((c) => !LOCKED.has(c.before.state) && !LOCKED.has(c.after.state));
  return finalize({
    ...g,
    cells,
    history: marks.length ? [...g.history, marks] : g.history,
    redo: marks.length ? [] : g.redo,
    lastMove: last,
    hint: null,
    armed: null,
    armedAt: 0,
  });
}

/** Mudanças de uma entrada que ainda valem agora (casas que viraram gatinho não voltam atrás). */
const effective = (g: GameState, entry: Change[]) => entry.filter((c) => !LOCKED.has(g.cells[c.index].state));

export const canUndo = (g: GameState) => !locked(g) && g.history.some((e) => effective(g, e).length > 0);
export const canRedo = (g: GameState) => !locked(g) && g.redo.some((e) => effective(g, e).length > 0);

function finalize(g: GameState, now = Date.now()): GameState {
  const cats = g.cells.filter((m) => m.state === 'cat').length;
  const winning = cats === g.puzzle.size && conflictIndexes(g.puzzle, g.cells).size === 0;
  if (winning && !g.won) return { ...g, won: true, finishedAt: now, hint: null };
  return g;
}

export function conflicts(g: GameState): Set<number> {
  return conflictIndexes(g.puzzle, g.cells);
}

/** Janela do duplo toque: o 2º toque só vale se vier até este tempo depois do 1º. */
export const DOUBLE_TAP_MS = 400;

/**
 * Duplo toque (2 toques na mesma casa em até DOUBLE_TAP_MS) = uma tentativa de achar o gatinho. O que decide acerto ou erro é
 * só haver (ou não) um gatinho ali; ter ou não um X na casa não importa.
 *  - 1º toque: casa vazia vira X (anotação do jogador, nunca automática); casa com X perde o X na hora.
 *  - 2º toque dentro da janela: se há gatinho, ele aparece; se não há, a casa ganha ✕ vermelho travado e a tentativa é gasta (MAX_ATTEMPTS).
 * Um gatinho revelado não some ao tocar de novo.
 */
export function tap(g: GameState, i: number, now = Date.now()): GameState {
  if (locked(g)) return g;
  const before = g.cells[i];
  if (LOCKED.has(before.state)) return g.armed === null ? g : { ...g, armed: null };
  const n = g.puzzle.size;
  const isCatCell = g.puzzle.solution[Math.floor(i / n)] === i % n;
  if (g.armed === i && now - g.armedAt <= DOUBLE_TAP_MS) {
    // palpite errado: a casa ganha um ✕ vermelho travado (fato confirmado; única exceção à regra "✕ nunca é automático")
    const after: Mark = { state: isCatCell ? 'cat' : 'bad' };
    const next = commit(g, [{ index: i, before, after }], i);
    return { ...next, armed: null, mistakes: isCatCell ? g.mistakes : g.mistakes + 1 };
  }
  // toque numa casa com ✕ (fora de um duplo toque): tira a marca na hora e arma a casa; um 2º toque rápido é o palpite
  if (before.state === 'x') return { ...commit(g, [{ index: i, before, after: { ...EMPTY } }], i), armed: i, armedAt: now };
  if (before.state === 'empty') return { ...commit(g, [{ index: i, before, after: { state: 'x' } }], i), armed: i, armedAt: now };
  return g;
}

/**
 * Arrasto: segue a casa onde começou. Começou numa casa vazia → ✕ em todas as vazias percorridas;
 * começou numa casa com ✕ → tira o ✕ de todas as percorridas. Gatinho e ✕ vermelho são ignorados.
 * Tudo numa única entrada de histórico.
 */
export function dragX(g: GameState, path: number[]): GameState {
  if (locked(g) || !path.length) return g;
  const from = g.cells[path[0]].state;
  if (from !== 'empty' && from !== 'x') return g;
  const after: Mark = { state: from === 'empty' ? 'x' : 'empty' };
  const changes = [...new Set(path)].filter((i) => g.cells[i].state === from).map((index) => ({ index, before: g.cells[index], after }));
  return commit(g, changes, path[path.length - 1]);
}

export function undo(g: GameState): GameState {
  if (locked(g)) return g;
  const history = g.history.slice();
  while (history.length) {
    const entry = history.pop()!;
    const todo = effective(g, entry);
    if (!todo.length) continue; // jogada que virou gatinho: nada a desfazer
    const cells = g.cells.slice();
    for (const c of todo) cells[c.index] = { ...c.before };
    return { ...g, cells, history, redo: [...g.redo, todo], hint: null, lastMove: null, armed: null };
  }
  return g;
}

export function redo(g: GameState): GameState {
  if (locked(g)) return g;
  const stack = g.redo.slice();
  while (stack.length) {
    const entry = stack.pop()!;
    const todo = effective(g, entry);
    if (!todo.length) continue;
    const cells = g.cells.slice();
    for (const c of todo) cells[c.index] = { ...c.after };
    return finalize({ ...g, cells, redo: stack, history: [...g.history, todo], hint: null, armed: null });
  }
  return g;
}

/**
 * Poder "Revelar gatinho" (1 vez por nível): mostra um gatinho ainda não achado, sem gastar tentativa.
 * Escolhe o da cor com mais casas livres (a mais difícil de deduzir), empate pela menor posição.
 * Entra no histórico como uma única jogada.
 */
export const canReveal = (g: GameState) => !locked(g) && g.powersUsed < MAX_REVEALS;

export function revealCat(g: GameState): GameState {
  if (!canReveal(g)) return g;
  const n = g.puzzle.size;
  const s = stateFromMarks(g.puzzle, g.cells);
  let best = -1;
  let bestScore = -1;
  g.puzzle.solution.forEach((c, r) => {
    const i = r * n + c;
    if (g.cells[i].state === 'cat') return;
    const region = g.puzzle.regions[r][c];
    const score = s.cand.filter((v, j) => v && s.reg[j] === region).length;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  if (best < 0) return g;
  const next = commit(g, [{ index: best, before: g.cells[best], after: { state: 'cat' } }], best);
  return next === g ? g : { ...next, powersUsed: g.powersUsed + 1 };
}

export function continueAfterLoss(g: GameState): GameState {
  return isLost(g) ? { ...g, continued: true } : g;
}

export function restart(g: GameState, now = Date.now()): GameState {
  return g.won ? g : newGame(g.puzzle, { now });
}

export function canHint(g: GameState): boolean {
  return !locked(g);
}

/** Toque no botão de dica: 1 = área, 2 = frase, 3 = botão Fazer por mim. Não conta em hintsUsed. */
export function pressHint(g: GameState): GameState {
  if (!canHint(g)) return g;
  if (!g.hint) return { ...g, hint: { level: 1, data: getHint(g.puzzle, g.cells, g.lastMove) } };
  if (g.hint.level === 3 || g.hint.data.kind === 'none') return g;
  return { ...g, hint: { ...g.hint, level: (g.hint.level + 1) as 2 | 3 } };
}

/** Fazer por mim (só no nível 3): marca o passo numa única entrada de histórico; hintsUsed +1. */
export function applyHint(g: GameState): GameState {
  const h = g.hint;
  if (!h || h.level !== 3 || !h.data.apply || locked(g)) return g;
  const changes: Change[] = [];
  for (const i of h.data.apply.xs) if (g.cells[i].state === 'empty') changes.push({ index: i, before: g.cells[i], after: { state: 'x' } });
  for (const i of h.data.apply.cats) if (g.cells[i].state !== 'cat') changes.push({ index: i, before: g.cells[i], after: { state: 'cat' } });
  for (const i of h.data.apply.clear ?? []) if (g.cells[i].state === 'x') changes.push({ index: i, before: g.cells[i], after: { ...EMPTY } });
  const next = commit(g, changes, changes[0]?.index ?? g.lastMove);
  return next === g ? g : { ...next, hintsUsed: g.hintsUsed + 1 };
}

export const elapsedMs = (g: GameState, now = Date.now()) => (g.finishedAt ?? g.pausedAt ?? now) - g.startedAt;

export const pause = (g: GameState, now = Date.now()): GameState => (g.won || g.pausedAt !== null ? g : { ...g, pausedAt: now });

export const resume = (g: GameState, now = Date.now()): GameState =>
  g.pausedAt === null ? g : { ...g, startedAt: g.startedAt + Math.max(0, now - g.pausedAt), pausedAt: null };
