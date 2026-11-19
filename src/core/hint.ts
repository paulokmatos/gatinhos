import { type Deduction, isSolved, lowestDeductions, stateFromMarks } from './human';
import { areaMessage, hintMessage } from './messages';
import type { Mark, Puzzle } from './types';

export const ERROR_MESSAGE = 'tem algo errado aqui';

export interface Hint {
  kind: 'error' | 'deduction';
  /** nível 1: casas da premissa (por que a dedução vale) */
  areaCells: number[];
  areaText: string;
  /** nível 2: frase */
  message: string;
  /** nível 2: as casas da conclusão (riscar / gatinho) saem em `deduction`; nível 3: o que o botão Aplicar marca */
  apply: { cats: number[]; xs: number[] } | null;
  deduction?: Deduction;
}

export const chebyshev = (n: number, a: number, b: number) =>
  Math.max(Math.abs(Math.floor(a / n) - Math.floor(b / n)), Math.abs((a % n) - (b % n)));

/** Casas com erro: gato fora da solução ou X em casa de gato da solução (o X é rascunho e pode estar errado). */
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

export function getHint(puzzle: Puzzle, cells: Mark[], lastMove: number | null): Hint | null {
  const n = puzzle.size;
  const errors = findErrors(puzzle, cells);
  if (errors.length) {
    const e = pickClosest(errors, (x) => [x], n, lastMove);
    return { kind: 'error', areaCells: [e], areaText: ERROR_MESSAGE, message: ERROR_MESSAGE, apply: null };
  }
  const s = stateFromMarks(puzzle, cells);
  if (isSolved(s)) return null;
  const ds = lowestDeductions(s);
  if (!ds.length) return null;
  const d = pickClosest(ds, (x) => [...x.cats, ...x.xs], n, lastMove);
  return {
    kind: 'deduction',
    areaCells: d.premise,
    areaText: areaMessage(d, n),
    message: hintMessage(d, n),
    apply: { cats: d.cats, xs: d.xs },
    deduction: d,
  };
}
