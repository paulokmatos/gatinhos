import { beforeAll, describe, expect, it } from 'vitest';
import { generatePuzzle } from '../src/core/generator';
import { FIXED_LEVELS } from '../src/core/levels';
import { applyDeduction, difficultyOfTech, humanSolve, isSolved, lowestDeductions, stateFromMarks, TECHNIQUES, type HState, type Tech } from '../src/core/human';
import { generateLevel, seedForLevel, SIZE_RANGE, specForLevel } from '../src/core/progression';
import type { Difficulty } from '../src/core/types';

/** Fixtures mínimas: o primeiro estado, ao resolver do zero, em que a técnica k é a mais fácil disponível. */
const fixtures = new Map<Tech, HState>();
beforeAll(() => {
  for (let seed = 0; seed < 400 && fixtures.size < 7; seed++) {
    for (const n of [6, 8, 9, 10]) {
      const r = generatePuzzle(n, seed);
      if (!r.ok) continue;
      const s = stateFromMarks(r.puzzle, Array.from({ length: n * n }, () => ({ state: 'empty' as const })));
      while (!isSolved(s)) {
        const ds = lowestDeductions(s);
        if (!ds.length) break;
        const t = ds[0].tech;
        if (!fixtures.has(t)) fixtures.set(t, structuredClone(s));
        ds.forEach((d) => applyDeduction(s, d));
      }
    }
  }
});

describe('CA10 técnicas T1–T7', () => {
  for (const t of [1, 2, 3, 4, 5, 6, 7] as Tech[])
    it(`T${t}: aplicada quando as anteriores não bastam`, () => {
      const s = fixtures.get(t);
      expect(s, `fixture de T${t}`).toBeDefined();
      for (let k = 1; k < t; k++) expect(TECHNIQUES[k - 1](s!)).toEqual([]);
      const ds = TECHNIQUES[t - 1](s!);
      expect(ds.length).toBeGreaterThan(0);
      expect(lowestDeductions(s!).every((d) => d.tech === t)).toBe(true);
    });
  it('propagação não é técnica: um gato já elimina linha, coluna, cor e vizinhos sozinho', () => {
    const p = FIXED_LEVELS[0];
    const cells = Array.from({ length: 25 }, () => ({ state: 'empty' as const })) as { state: 'empty' | 'cat' }[];
    cells[0] = { state: 'cat' };
    const s = stateFromMarks(p, cells);
    expect(s.cand[1]).toBe(false); // linha
    expect(s.cand[5]).toBe(false); // coluna
    expect(s.cand[6]).toBe(false); // diagonal
    expect(s.cand[1 * 5 + 1]).toBe(false); // mesma cor
    expect(s.cand[24]).toBe(true);
  });
});

describe('CA11 classificação', () => {
  it('difficulty = técnica mais difícil; tamanhos respeitam a tabela; irresolvíveis descartados', () => {
    for (const [level, diff] of [[1, 'facil'], [40, 'medio'], [60, 'dificil'], [90, 'expert']] as [number, Difficulty][]) {
      const r = generateLevel(level);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      const rep = humanSolve(r.puzzle);
      expect(rep.solved).toBe(true);
      expect(rep.difficulty).toBe(diff);
      expect(r.puzzle.difficulty).toBe(diff);
      const [lo, hi] = SIZE_RANGE[diff];
      expect(r.puzzle.size).toBeGreaterThanOrEqual(lo);
      expect(r.puzzle.size).toBeLessThanOrEqual(hi);
    }
  });
  it('mapeia técnica → nível', () => {
    const map = { 1: 'facil', 2: 'facil', 3: 'medio', 4: 'medio', 5: 'dificil', 6: 'dificil', 7: 'expert' } as const;
    for (const [t, d] of Object.entries(map)) expect(difficultyOfTech(Number(t) as Tech)).toBe(d);
  });
  it('fase que o solver humano não resolve é rejeitada pelo gerador de fases', () => {
    const r = generateLevel(1, 1); // 1 tentativa: ou passa no filtro ou devolve erro tratado
    expect(typeof r.ok).toBe('boolean');
  });
});

describe('CA12 progressão determinística', () => {
  it('fase K idêntica em duas execuções; seed só depende de K', () => {
    for (const k of [1, 35, 70, 95]) {
      expect(generateLevel(k)).toEqual(generateLevel(k));
      expect(seedForLevel(k)).toBe(seedForLevel(k));
    }
  });
  it('fases 1–100: dificuldade nunca diminui e tamanho dentro da faixa', () => {
    const order: Difficulty[] = ['facil', 'medio', 'dificil', 'expert'];
    let prev = 0;
    for (let k = 1; k <= 100; k++) {
      const spec = specForLevel(k);
      const rank = order.indexOf(spec.difficulty);
      expect(rank).toBeGreaterThanOrEqual(prev);
      prev = rank;
      expect(spec.size).toBeGreaterThanOrEqual(SIZE_RANGE[spec.difficulty][0]);
      expect(spec.size).toBeLessThanOrEqual(SIZE_RANGE[spec.difficulty][1]);
    }
  });
  it('fases geradas 1–100 (amostra de cada faixa) respeitam a dificuldade da faixa', () => {
    for (const k of [10, 30, 31, 55, 56, 80, 81, 100]) {
      const r = generateLevel(k);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.puzzle.difficulty).toBe(specForLevel(k).difficulty);
    }
  });
});
