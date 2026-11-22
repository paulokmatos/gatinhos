import { describe, expect, it } from 'vitest';
import { MAX_TIER, nextTier, performance, tierOf, TIERS, updateRating, type Result } from '../src/core/difficulty';
import { generateLevel, specForTier } from '../src/core/progression';

const ok: Result = { won: true, mistakes: 0, hintsUsed: 0, powersUsed: 0, timeMs: 1000, size: 6 };

describe('desempenho', () => {
  it('perfeito = 1; perder = 0; erros, dicas e poder descontam; nunca sai de 0–1', () => {
    expect(performance(ok)).toBe(1);
    expect(performance({ ...ok, won: false })).toBe(0);
    expect(performance({ ...ok, mistakes: 1 })).toBeLessThan(1);
    expect(performance({ ...ok, hintsUsed: 1 })).toBeLessThan(1);
    expect(performance({ ...ok, mistakes: 2, hintsUsed: 3, powersUsed: 1, timeMs: 1e9 })).toBe(0);
  });
  it('demorar muito (mais de 2× o tempo de referência) desconta', () => {
    expect(performance({ ...ok, timeMs: 1e9 })).toBeLessThan(1);
  });
});

describe('nota do jogador', () => {
  it('sobe com bom desempenho, desce com ruim, fica nos limites', () => {
    expect(updateRating(3, 1)).toBeGreaterThan(3);
    expect(updateRating(3, 0)).toBeLessThan(3);
    expect(updateRating(MAX_TIER, 1)).toBe(MAX_TIER);
    expect(updateRating(0, 0)).toBe(0);
  });
});

describe('próximo nível', () => {
  const t = (rating: number, recent: number[], level = 1, last = 0, now = 0) => nextTier(rating, recent, level, last, now);
  it('onda: o 4º nível do ciclo é desafio e o 5º é respiro', () => {
    expect(t(4, [], 4)).toBeGreaterThan(t(4, [], 3));
    expect(t(4, [], 5)).toBeLessThan(t(4, [], 4));
  });
  it('2 frustrações seguidas facilitam; 3 vitórias perfeitas seguidas dificultam', () => {
    expect(t(4, [0, 0], 4)).toBe(3);
    expect(t(4, [1, 1, 1], 3)).toBe(5);
    expect(t(4, [0, 1, 1], 3)).toBe(4);
  });
  it('volta depois de 3+ dias começa 1 degrau abaixo', () => {
    const day = 86_400_000;
    expect(t(4, [], 3, 1, 1 + 3 * day)).toBe(3);
    expect(t(4, [], 3, 1, 1 + day)).toBe(4);
  });
  it('sempre dentro da escala', () => {
    expect(t(0, [0, 0], 1)).toBe(0);
    expect(t(MAX_TIER, [1, 1, 1], 4)).toBe(MAX_TIER);
  });
});

describe('tiers e geração', () => {
  it('tierOf encontra o tier pelo tamanho e dificuldade (e -1 se não existe)', () => {
    TIERS.forEach((x, i) => expect(tierOf(x.size, x.difficulty)).toBe(i));
    expect(tierOf(4, 'facil')).toBe(-1);
    expect(tierOf(5, undefined)).toBe(-1);
  });
  it('gatinho de brinde nos degraus: nenhum abaixo do 9×9 Difícil, depois a chance só cai', () => {
    const chances = TIERS.map((_, i) => specForTier(7, i).givenChance);
    expect(chances.slice(0, 5).every((c) => c === 0)).toBe(true);
    expect(chances[5]).toBeGreaterThan(0);
    for (let i = 6; i < chances.length; i++) expect(chances[i]).toBeLessThanOrEqual(chances[i - 1]);
  });
  it('cada tier gera um nível com o tamanho e a dificuldade do tier, igual em duas execuções', () => {
    TIERS.forEach((x, i) => {
      const r = generateLevel(7, 3000, i);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect([r.puzzle.size, r.puzzle.difficulty]).toEqual([x.size, x.difficulty]);
      expect(r).toEqual(generateLevel(7, 3000, i));
      expect(specForTier(7, i).size).toBe(x.size);
      for (const g of r.puzzle.givens ?? []) expect(r.puzzle.solution[Math.floor(g / x.size)]).toBe(g % x.size);
    });
  }, 120_000);
});
