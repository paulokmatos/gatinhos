/**
 * Solver "humano": técnicas T1–T7, tentadas nessa ordem.
 * A propagação (riscar linha, coluna, cor e vizinhos após cada gato) NÃO é técnica.
 *
 *  T1 Único: linha/coluna/cor com uma só casa livre → gato.
 *  T2 Cor numa linha só: cor confinada a uma linha/coluna → risca o resto da linha/coluna.
 *  T3 Linha numa cor só: linha/coluna cujas casas são todas de uma cor → risca o resto da cor.
 *  T4 Vizinhança: um gato aqui deixaria uma cor/linha/coluna sem casas → risca a casa.
 *  T5 N cores em N linhas/colunas (N=2,3) → risca o resto dessas linhas/colunas.
 *  T6 N linhas/colunas em N cores (N=2,3) → risca o resto dessas cores.
 *  T7 Hipótese de profundidade 1: assume um gato, propaga e aplica únicos; se travar → risca.
 */
import type { Difficulty, Mark, Puzzle } from './types';

export type Tech = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type UnitKind = 'row' | 'col' | 'region';

export interface Deduction {
  tech: Tech;
  cats: number[];
  xs: number[];
  /** linhas/colunas/cores envolvidas (0-based) */
  lineKind?: 'row' | 'col';
  lines: number[];
  regions: number[];
  /** T1: unidade com uma só casa; T4: unidade que ficaria sem casas */
  unit?: { kind: UnitKind; index: number };
}

export interface HState {
  n: number;
  reg: number[];
  cand: boolean[];
  cats: boolean[];
}

const rowOf = (s: HState, i: number) => Math.floor(i / s.n);
const colOf = (s: HState, i: number) => i % s.n;

export function stateFromMarks(puzzle: Puzzle, cells: Mark[]): HState {
  const n = puzzle.size;
  const s: HState = {
    n,
    reg: puzzle.regions.flat(),
    cand: cells.map((m) => m.state === 'empty'),
    cats: cells.map((m) => m.state === 'cat'),
  };
  cells.forEach((m, i) => {
    if (m.state === 'cat') eliminateAround(s, i);
  });
  return s;
}

function eliminateAround(s: HState, i: number): void {
  const r = rowOf(s, i);
  const c = colOf(s, i);
  for (let j = 0; j < s.n * s.n; j++) {
    if (j === i) continue;
    const jr = rowOf(s, j);
    const jc = colOf(s, j);
    if (jr === r || jc === c || s.reg[j] === s.reg[i] || (Math.abs(jr - r) <= 1 && Math.abs(jc - c) <= 1)) s.cand[j] = false;
  }
  s.cand[i] = false;
}

function place(s: HState, i: number): void {
  s.cats[i] = true;
  eliminateAround(s, i);
}

function cloneState(s: HState): HState {
  return { n: s.n, reg: s.reg, cand: s.cand.slice(), cats: s.cats.slice() };
}

interface Unit {
  kind: UnitKind;
  index: number;
  cells: number[];
}

function buildUnits(s: HState): Unit[] {
  const units: Unit[] = [];
  for (let k = 0; k < s.n; k++) {
    units.push({ kind: 'row', index: k, cells: [] }, { kind: 'col', index: k, cells: [] }, { kind: 'region', index: k, cells: [] });
  }
  for (let i = 0; i < s.n * s.n; i++) {
    units[rowOf(s, i) * 3].cells.push(i);
    units[colOf(s, i) * 3 + 1].cells.push(i);
    units[s.reg[i] * 3 + 2].cells.push(i);
  }
  return units;
}

const unitCache = new WeakMap<number[], Unit[]>();
function unitsOf(s: HState): Unit[] {
  let u = unitCache.get(s.reg);
  if (!u) {
    u = buildUnits(s);
    unitCache.set(s.reg, u);
  }
  return u;
}

const satisfied = (s: HState, u: Unit) => u.cells.some((i) => s.cats[i]);
const candsOf = (s: HState, u: Unit) => u.cells.filter((i) => s.cand[i]);
const subsets = <T,>(arr: T[], k: number): T[][] => {
  if (k === 0) return [[]];
  const out: T[][] = [];
  arr.forEach((x, i) => subsets(arr.slice(i + 1), k - 1).forEach((rest) => out.push([x, ...rest])));
  return out;
};
const uniq = (xs: number[]) => [...new Set(xs)];

export function isSolved(s: HState): boolean {
  return s.cats.filter(Boolean).length === s.n;
}

function t1(s: HState): Deduction[] {
  const out: Deduction[] = [];
  for (const u of unitsOf(s)) {
    if (satisfied(s, u)) continue;
    const c = candsOf(s, u);
    if (c.length === 1)
      out.push({
        tech: 1,
        cats: [c[0]],
        xs: [],
        lines: [rowOf(s, c[0]), colOf(s, c[0])],
        regions: [s.reg[c[0]]],
        unit: { kind: u.kind, index: u.index },
      });
  }
  return out;
}

function t2(s: HState): Deduction[] {
  const out: Deduction[] = [];
  for (const u of unitsOf(s).filter((x) => x.kind === 'region')) {
    if (satisfied(s, u)) continue;
    const c = candsOf(s, u);
    if (c.length < 2) continue;
    for (const lineKind of ['row', 'col'] as const) {
      const key = (i: number) => (lineKind === 'row' ? rowOf(s, i) : colOf(s, i));
      const lines = uniq(c.map(key));
      if (lines.length !== 1) continue;
      const xs = s.cand.map((v, i) => (v && key(i) === lines[0] && s.reg[i] !== u.index ? i : -1)).filter((i) => i >= 0);
      if (xs.length) out.push({ tech: 2, cats: [], xs, lineKind, lines, regions: [u.index] });
    }
  }
  return out;
}

function t3(s: HState): Deduction[] {
  const out: Deduction[] = [];
  for (const lineKind of ['row', 'col'] as const) {
    const key = (i: number) => (lineKind === 'row' ? rowOf(s, i) : colOf(s, i));
    for (const u of unitsOf(s).filter((x) => x.kind === lineKind)) {
      if (satisfied(s, u)) continue;
      const c = candsOf(s, u);
      if (c.length < 2) continue;
      const regs = uniq(c.map((i) => s.reg[i]));
      if (regs.length !== 1) continue;
      const xs = s.cand.map((v, i) => (v && s.reg[i] === regs[0] && key(i) !== u.index ? i : -1)).filter((i) => i >= 0);
      if (xs.length) out.push({ tech: 3, cats: [], xs, lineKind, lines: [u.index], regions: regs });
    }
  }
  return out;
}

/** Existe unidade insatisfeita sem nenhuma casa livre? */
function dead(s: HState): Deduction['unit'] | null {
  for (const u of unitsOf(s)) if (!satisfied(s, u) && !u.cells.some((i) => s.cand[i])) return { kind: u.kind, index: u.index };
  return null;
}

function t4(s: HState): Deduction[] {
  const out: Deduction[] = [];
  for (let i = 0; i < s.n * s.n; i++) {
    if (!s.cand[i]) continue;
    const t = cloneState(s);
    place(t, i);
    const unit = dead(t);
    if (unit) out.push({ tech: 4, cats: [], xs: [i], lines: [rowOf(s, i), colOf(s, i)], regions: [s.reg[i]], unit });
  }
  return out;
}

function t5(s: HState): Deduction[] {
  const out: Deduction[] = [];
  const regs = unitsOf(s).filter((u) => u.kind === 'region' && !satisfied(s, u));
  for (const k of [2, 3]) {
    for (const group of subsets(regs, k)) {
      for (const lineKind of ['row', 'col'] as const) {
        const key = (i: number) => (lineKind === 'row' ? rowOf(s, i) : colOf(s, i));
        const lines = uniq(group.flatMap((u) => candsOf(s, u).map(key))).sort((a, b) => a - b);
        if (lines.length !== k) continue;
        const ids = group.map((u) => u.index);
        const xs = s.cand.map((v, i) => (v && lines.includes(key(i)) && !ids.includes(s.reg[i]) ? i : -1)).filter((i) => i >= 0);
        if (xs.length) out.push({ tech: 5, cats: [], xs, lineKind, lines, regions: ids });
      }
    }
  }
  return out;
}

function t6(s: HState): Deduction[] {
  const out: Deduction[] = [];
  for (const lineKind of ['row', 'col'] as const) {
    const key = (i: number) => (lineKind === 'row' ? rowOf(s, i) : colOf(s, i));
    const lines = unitsOf(s).filter((u) => u.kind === lineKind && !satisfied(s, u));
    for (const k of [2, 3]) {
      for (const group of subsets(lines, k)) {
        const regs = uniq(group.flatMap((u) => candsOf(s, u).map((i) => s.reg[i]))).sort((a, b) => a - b);
        if (regs.length !== k) continue;
        const ids = group.map((u) => u.index);
        const xs = s.cand.map((v, i) => (v && regs.includes(s.reg[i]) && !ids.includes(key(i)) ? i : -1)).filter((i) => i >= 0);
        if (xs.length) out.push({ tech: 6, cats: [], xs, lineKind, lines: ids, regions: regs });
      }
    }
  }
  return out;
}

/** Hipótese: gato em i → propaga e aplica únicos; true se der contradição. */
function contradicts(s: HState, i: number): boolean {
  const t = cloneState(s);
  place(t, i);
  const units = unitsOf(t);
  for (;;) {
    if (dead(t)) return true;
    let moved = false;
    for (const u of units) {
      if (satisfied(t, u)) continue;
      const c = candsOf(t, u);
      if (c.length === 1) {
        place(t, c[0]);
        moved = true;
        break;
      }
    }
    if (!moved) return false;
  }
}

function t7(s: HState): Deduction[] {
  const out: Deduction[] = [];
  for (let i = 0; i < s.n * s.n; i++)
    if (s.cand[i] && contradicts(s, i)) out.push({ tech: 7, cats: [], xs: [i], lines: [rowOf(s, i), colOf(s, i)], regions: [s.reg[i]] });
  return out;
}

export const TECHNIQUES: ((s: HState) => Deduction[])[] = [t1, t2, t3, t4, t5, t6, t7];

/** Técnica por técnica (T1→T7): devolve todas as deduções do menor nível que gera algo novo. */
export function lowestDeductions(s: HState): Deduction[] {
  for (const t of TECHNIQUES) {
    const d = t(s);
    if (d.length) return d;
  }
  return [];
}

export function applyDeduction(s: HState, d: Deduction): void {
  for (const i of d.xs) s.cand[i] = false;
  for (const i of d.cats) place(s, i);
}

export const difficultyOfTech = (t: Tech): Difficulty => (t <= 2 ? 'facil' : t <= 4 ? 'medio' : t <= 6 ? 'dificil' : 'expert');

export interface SolveReport {
  solved: boolean;
  hardest: Tech | 0;
  difficulty: Difficulty | null;
  techUsed: Tech[];
}

/** Resolve do zero com o solver humano. Se nem T7 resolve, `solved` = false. */
export function humanSolve(puzzle: Puzzle): SolveReport {
  const s = stateFromMarks(
    puzzle,
    Array.from({ length: puzzle.size * puzzle.size }, () => ({ state: 'empty' as const })),
  );
  let hardest: Tech | 0 = 0;
  const used = new Set<Tech>();
  while (!isSolved(s)) {
    const ds = lowestDeductions(s);
    if (!ds.length) return { solved: false, hardest, difficulty: null, techUsed: [...used] };
    for (const d of ds) {
      applyDeduction(s, d);
      used.add(d.tech);
      hardest = Math.max(hardest, d.tech) as Tech;
    }
  }
  return { solved: true, hardest, difficulty: hardest ? difficultyOfTech(hardest) : 'facil', techUsed: [...used].sort() };
}
