import { generatePuzzle } from './generator';
import { humanSolve } from './human';
import { hashInts } from './rng';
import type { Difficulty, Puzzle } from './types';

export const SIZE_RANGE: Record<Difficulty, [number, number]> = {
  facil: [5, 7],
  medio: [7, 8],
  dificil: [8, 10],
  expert: [9, 10],
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
  expert: 'Expert',
};

/**
 * Progressão (cada nível K tem tamanho, dificuldade e seed só dependentes de K):
 *  - Níveis 1–30: lotes de 5 níveis crescendo o tabuleiro 5×5 → 10×10.
 *  - Depois do 30: a cada 10 níveis o patamar sobe (31–40 Difícil, 41+ Expert) e a maioria é 10×10
 *    (todo nível múltiplo de 5 é 9×9, um respiro).
 */
const EARLY: { to: number; size: number; difficulty: Difficulty }[] = [
  { to: 5, size: 5, difficulty: 'facil' },
  { to: 10, size: 6, difficulty: 'facil' },
  { to: 15, size: 7, difficulty: 'facil' },
  { to: 20, size: 8, difficulty: 'medio' },
  { to: 25, size: 9, difficulty: 'dificil' },
  { to: 30, size: 10, difficulty: 'dificil' },
];

export interface LevelSpec {
  level: number;
  difficulty: Difficulty;
  size: number;
  seed: number;
  /** chance (0–1) de a fase já começar com 1 gatinho revelado */
  givenChance: number;
}

/**
 * O que decide se há gatinho inicial: só dificuldades altas (a partir do nível 21, tabuleiros 9×9+),
 * como um empurrãozinho que some aos poucos: 50% nos níveis 21–30, 60% nos 31–40 e −15 pontos a cada 10 níveis,
 * chegando a 0 a partir do 71. O sorteio é determinístico (seed do nível).
 */
export function givenChanceFor(level: number): number {
  if (level < 21) return 0;
  if (level <= 30) return 0.5;
  const decade = Math.floor((level - 31) / 10);
  return Math.max(0, 0.6 - 0.15 * decade);
}

/** Seed derivada só do número da fase: igual em qualquer aparelho. */
export const seedForLevel = (level: number) => hashInts(0x6a7a, level);

export function specForLevel(level: number): LevelSpec {
  const k = Math.max(1, Math.floor(level));
  const seed = seedForLevel(k);
  const givenChance = givenChanceFor(k);
  const early = EARLY.find((e) => k <= e.to);
  if (early) return { level: k, difficulty: early.difficulty, size: early.size, seed, givenChance };
  const decade = Math.floor((k - 31) / 10);
  return { level: k, difficulty: decade === 0 ? 'dificil' : 'expert', size: k % 5 === 0 ? 9 : 10, seed, givenChance };
}

/** Gatinho inicial: o da cor com mais casas (a menos informativa). */
export function pickGiven(puzzle: Puzzle): number {
  const n = puzzle.size;
  const count = new Array<number>(n).fill(0);
  puzzle.regions.flat().forEach((r) => count[r]++);
  let best = 0;
  puzzle.solution.forEach((c, r) => {
    const here = count[puzzle.regions[r][c]];
    if (here > count[puzzle.regions[best][puzzle.solution[best]]]) best = r;
  });
  return best * n + puzzle.solution[best];
}

export type LevelResult = { ok: true; puzzle: Puzzle; spec: LevelSpec } | { ok: false; error: string };

/** Gera a fase K: solução única e classificada na dificuldade da faixa. */
export function generateLevel(level: number, maxAttempts = 3000): LevelResult {
  const spec = specForLevel(level);
  const res = generatePuzzle(spec.size, spec.seed, {
    maxAttempts,
    accept: (p) => {
      const rep = humanSolve(p);
      if (!rep.solved || rep.difficulty !== spec.difficulty) return false;
      p.difficulty = rep.difficulty;
      return true;
    },
  });
  if (!res.ok) return { ok: false, error: res.error };
  const roll = (hashInts(spec.seed, 0x91) % 1000) / 1000;
  if (roll < spec.givenChance) res.puzzle.givens = [pickGiven(res.puzzle)];
  return { ok: true, puzzle: res.puzzle, spec };
}
