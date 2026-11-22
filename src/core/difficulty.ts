import type { Difficulty } from './types';

/** Escala de dificuldade (do mais fácil ao mais difícil). Valores a calibrar com dados (docs/ESTRATEGIA-DIFICULDADE.md). */
export const TIERS: { size: number; difficulty: Difficulty }[] = [
  { size: 5, difficulty: 'facil' },
  { size: 6, difficulty: 'facil' },
  { size: 7, difficulty: 'facil' },
  { size: 8, difficulty: 'medio' },
  { size: 8, difficulty: 'dificil' },
  { size: 9, difficulty: 'dificil' },
  { size: 10, difficulty: 'dificil' },
  { size: 9, difficulty: 'expert' },
  { size: 10, difficulty: 'expert' },
];
export const MAX_TIER = TIERS.length - 1;

export const tierOf = (size: number, difficulty: Difficulty | undefined): number =>
  TIERS.findIndex((t) => t.size === size && t.difficulty === difficulty);

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export interface Result {
  won: boolean;
  mistakes: number;
  hintsUsed: number;
  powersUsed: number;
  timeMs: number;
  size: number;
}

/** Tempo de referência (ms): placeholder proporcional às casas do tabuleiro. */
export const parMs = (size: number) => size * size * 2500;

/** Desempenho de 0 (perdeu/abandonou) a 1 (sem erro, sem ajuda, no tempo). */
export function performance(r: Result): number {
  if (!r.won) return 0;
  let p = 1 - 0.25 * r.mistakes - 0.15 * r.hintsUsed - 0.1 * r.powersUsed;
  if (r.timeMs > 2 * parMs(r.size)) p -= 0.2;
  return clamp(p, 0, 1);
}

/** Desempenho esperado quando o nível está na medida certa. */
const TARGET = 0.75;
const K = 1.5;

/** Atualiza a nota do jogador (mesma escala dos tiers, fracionária). */
export const updateRating = (rating: number, p: number): number => clamp(rating + K * (p - TARGET), 0, MAX_TIER);

/** Onda por posição do nível: confortável, confortável, médio, desafio, respiro. */
const WAVE = [-0.5, -0.5, 0, 0.8, -0.5];
const DAY = 86_400_000;

/**
 * Tier do próximo nível: nota + onda, com elástico (2 frustrações seguidas → mais fácil; 3 vitórias perfeitas
 * seguidas → mais difícil) e aquecimento depois de 3+ dias sem jogar.
 */
export function nextTier(rating: number, recent: number[], level: number, lastPlayed: number, now: number): number {
  let delta = WAVE[(Math.max(1, level) - 1) % WAVE.length];
  const [a, b, c] = recent.slice(-3).reverse();
  if (a !== undefined && b !== undefined && a < 0.4 && b < 0.4) delta = -1;
  else if (a !== undefined && b !== undefined && c !== undefined && a >= 0.9 && b >= 0.9 && c >= 0.9) delta = 1;
  if (lastPlayed > 0 && now - lastPlayed >= 3 * DAY) delta = Math.min(delta, -1);
  return clamp(Math.round(rating + delta), 0, MAX_TIER);
}
