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

/** Faixas das fases 1–100 (depois de 100 tudo é Expert). */
const BANDS: { difficulty: Difficulty; from: number; to: number }[] = [
  { difficulty: 'facil', from: 1, to: 30 },
  { difficulty: 'medio', from: 31, to: 55 },
  { difficulty: 'dificil', from: 56, to: 80 },
  { difficulty: 'expert', from: 81, to: 100 },
];

export interface LevelSpec {
  level: number;
  difficulty: Difficulty;
  size: number;
  seed: number;
}

/** Seed derivada só do número da fase: igual em qualquer aparelho. */
export const seedForLevel = (level: number) => hashInts(0x6a7a, level);

export function specForLevel(level: number): LevelSpec {
  const k = Math.max(1, Math.floor(level));
  const band = BANDS.find((b) => k >= b.from && k <= b.to) ?? BANDS[3];
  const [lo, hi] = SIZE_RANGE[band.difficulty];
  const span = band.to - band.from;
  const pos = Math.min(1, (k - band.from) / span);
  const size = k > 100 ? lo + (hashInts(k) % (hi - lo + 1)) : lo + Math.floor(pos * (hi - lo + 0.999));
  return { level: k, difficulty: band.difficulty, size, seed: seedForLevel(k) };
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
  return res.ok ? { ok: true, puzzle: res.puzzle, spec } : { ok: false, error: res.error };
}
