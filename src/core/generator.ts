import { hashInts, mulberry32, shuffle } from './rng';
import { countSolutions, listSolutions } from './solver';
import type { Puzzle } from './types';

type Rnd = () => number;

/** Permutação com 1 gato por linha/coluna; linhas vizinhas a 2+ colunas de distância. */
export function generateSolution(size: number, rnd: Rnd): number[] {
  const sol: number[] = [];
  const used = new Array<boolean>(size).fill(false);
  const dfs = (r: number): boolean => {
    if (r === size) return true;
    for (const c of shuffle([...Array(size).keys()], rnd)) {
      if (used[c]) continue;
      if (r > 0 && Math.abs(sol[r - 1] - c) <= 1) continue;
      sol[r] = c;
      used[c] = true;
      if (dfs(r + 1)) return true;
      used[c] = false;
    }
    return false;
  };
  if (!dfs(0)) throw new Error(`Sem solução possível para size ${size}`);
  return sol;
}

/** Cresce N regiões contíguas a partir dos gatos da solução. */
export function drawRegions(solution: number[], rnd: Rnd): number[][] {
  const n = solution.length;
  const reg = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
  solution.forEach((c, r) => (reg[r][c] = r));
  let left = n * n - n;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (left > 0) {
    const cand: [number, number, number][] = [];
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        if (reg[r][c] !== -1) continue;
        for (const [dr, dc] of dirs) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < n && cc >= 0 && cc < n && reg[rr][cc] !== -1) cand.push([r, c, reg[rr][cc]]);
        }
      }
    const [r, c, id] = cand[Math.floor(rnd() * cand.length)];
    reg[r][c] = id;
    left--;
  }
  return reg;
}

/** A região de (r,c) continua conexa se a casa sair dela? */
function staysConnected(reg: number[][], r: number, c: number): boolean {
  const n = reg.length;
  const id = reg[r][c];
  const cells: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (reg[i][j] === id && !(i === r && j === c)) cells.push([i, j]);
  if (cells.length === 0) return false;
  const seen = new Set<number>([cells[0][0] * n + cells[0][1]]);
  const stack = [cells[0]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di;
      const b = j + dj;
      if (a < 0 || b < 0 || a >= n || b >= n || (a === r && b === c) || reg[a][b] !== id) continue;
      if (!seen.has(a * n + b)) {
        seen.add(a * n + b);
        stack.push([a, b]);
      }
    }
  }
  return seen.size === cells.length;
}

/**
 * Tenta tornar a solução única: enquanto houver outra solução, move uma casa dela
 * para uma região vizinha (mantendo regiões contíguas e os gatos da solução).
 */
function repairUniqueness(solution: number[], reg: number[][], rnd: Rnd, steps: number): boolean {
  const n = reg.length;
  for (let s = 0; s < steps; s++) {
    const sols = listSolutions(reg, 2);
    if (sols.length === 1) return true;
    const other = sols.find((x) => x.some((c, r) => c !== solution[r]))!;
    const diff = other.map((c, r) => [r, c] as [number, number]).filter(([r, c]) => c !== solution[r]);
    const [r, c] = diff[Math.floor(rnd() * diff.length)];
    const neighbors = new Set<number>();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = r + dr;
      const b = c + dc;
      if (a >= 0 && b >= 0 && a < n && b < n && reg[a][b] !== reg[r][c]) neighbors.add(reg[a][b]);
    }
    if (neighbors.size === 0 || !staysConnected(reg, r, c)) continue;
    const list = [...neighbors];
    reg[r][c] = list[Math.floor(rnd() * list.length)];
  }
  return countSolutions(reg, 2) === 1;
}

export type GenerationResult = { ok: true; puzzle: Puzzle; attempts: number } | { ok: false; error: string };

export interface GenerateOptions {
  maxAttempts?: number;
  /** filtro extra de aceitação (ex.: dificuldade) */
  accept?: (p: Puzzle) => boolean;
}

/** Gera uma fase de solução única. Determinística para (size, seed). Nunca entra em loop infinito. */
export function generatePuzzle(size: number, seed: number, opts: GenerateOptions = {}): GenerationResult {
  const maxAttempts = opts.maxAttempts ?? 300;
  if (!Number.isInteger(size) || size < 4 || size > 10) return { ok: false, error: `size inválido: ${size}` };
  const rnd = mulberry32(hashInts(seed, size));
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const solution = generateSolution(size, rnd);
    const regions = drawRegions(solution, rnd);
    if (!repairUniqueness(solution, regions, rnd, 60)) continue;
    if (countSolutions(regions, 2) !== 1) continue;
    const puzzle: Puzzle = { size, regions, solution };
    if (opts.accept && !opts.accept(puzzle)) continue;
    return { ok: true, puzzle, attempts: attempt };
  }
  return { ok: false, error: `limite de ${maxAttempts} tentativas atingido (size ${size}, seed ${seed})` };
}

/** Uma fase só é aceita se o solver de força bruta achar exatamente 1 solução. */
export const isUnique = (regions: number[][]): boolean => countSolutions(regions, 2) === 1;
