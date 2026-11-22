import { type Deduction, hintDeductions, isSolved, visibleState } from './human';
import { areaMessage, hintMessage } from './messages';
import type { Mark, Puzzle } from './types';

export const ERROR_MESSAGE = 'Tem algo errado aqui.';
export const NONE_MESSAGE = 'Não achei uma dedução simples a partir daqui.';

export interface Hint {
  kind: 'error' | 'deduction' | 'none';
  /** nível 1: casas da premissa (por que a dedução vale) */
  areaCells: number[];
  areaText: string;
  /** nível 2: frase */
  message: string;
  /** nível 2: as casas da conclusão (riscar / gatinho) saem em `deduction`; nível 3: o que o botão Aplicar marca */
  apply: { cats: number[]; xs: number[]; /** ✕ do jogador a tirar (dica de erro) */ clear?: number[] } | null;
  deduction?: Deduction;
}

export const chebyshev = (n: number, a: number, b: number) =>
  Math.max(Math.abs(Math.floor(a / n) - Math.floor(b / n)), Math.abs((a % n) - (b % n)));

/** Casas com erro: gatinho fora da solução ou marca ✕ em casa de gatinho (a marca é anotação e pode estar errada). */
export function findErrors(puzzle: Puzzle, cells: Mark[]): number[] {
  const n = puzzle.size;
  const out: number[] = [];
  cells.forEach((m, i) => {
    const isSolution = puzzle.solution[Math.floor(i / n)] === i % n;
    if ((m.state === 'cat' && !isSolution) || (m.state === 'x' && isSolution)) out.push(i);
  });
  return out;
}

/** Menor distância de Chebyshev; empate: menor linha, depois menor coluna (determinístico). */
function pickClosest<T>(items: T[], cellsOf: (t: T) => number[], size: number, last: number | null): T {
  const key = (t: T) => {
    const cs = cellsOf(t);
    const dist = last === null ? 0 : Math.min(...cs.map((c) => chebyshev(size, last, c)));
    const first = cs.reduce((a, b) => (a < b ? a : b)); // índice row-major = menor linha, depois coluna
    return [dist, first];
  };
  return items.reduce((best, t) => {
    const [d1, f1] = key(best);
    const [d2, f2] = key(t);
    return d2 < d1 || (d2 === d1 && f2 < f1) ? t : best;
  });
}

/**
 * Dedução a partir do estado VISÍVEL. Não recebe a solução de propósito: ela nunca gera dica.
 * `none` = nenhuma técnica achou algo novo.
 */
export function getDeduction(puzzle: Pick<Puzzle, 'size' | 'regions' | 'difficulty'>, cells: Mark[], lastMove: number | null): Hint {
  const s = visibleState(puzzle, cells);
  const ds = isSolved(s) ? [] : hintDeductions(s, puzzle.difficulty === 'expert');
  if (!ds.length) return { kind: 'none', areaCells: [], areaText: NONE_MESSAGE, message: NONE_MESSAGE, apply: null };
  const d = pickClosest(ds, (x) => [...x.cats, ...x.xs], puzzle.size, lastMove);
  return {
    kind: 'deduction',
    areaCells: d.premise,
    areaText: areaMessage(d, puzzle.size),
    message: hintMessage(d, puzzle.size),
    apply: { cats: d.cats, xs: d.xs },
    deduction: d,
  };
}

/** A solução só entra aqui, para achar erros do jogador; as deduções vêm de getDeduction. */
export function getHint(puzzle: Puzzle, cells: Mark[], lastMove: number | null): Hint {
  const n = puzzle.size;
  const errors = findErrors(puzzle, cells);
  if (!errors.length) return getDeduction(puzzle, cells, lastMove);
  const e = pickClosest(errors, (x) => [x], n, lastMove);
  // ✕ do jogador sobre casa de gatinho: 3 níveis (dica geral → casa → "Tirar este ✕"); gatinho fora do lugar: só o aviso
  if (cells[e].state !== 'x') return { kind: 'error', areaCells: [e], areaText: ERROR_MESSAGE, message: ERROR_MESSAGE, apply: null };
  return {
    kind: 'error',
    areaCells: [e],
    areaText: `Algum ✕ seu está numa casa onde pode haver gatinho. Confira a coluna ${(e % n) + 1}.`,
    message: `Este ✕ (linha ${Math.floor(e / n) + 1}, coluna ${(e % n) + 1}) está numa casa onde pode haver gatinho.`,
    apply: { cats: [], xs: [], clear: [e] },
  };
}
