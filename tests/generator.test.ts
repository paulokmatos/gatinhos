import { describe, expect, it } from 'vitest';
import { drawRegions, generatePuzzle, generateSolution, isUnique } from '../src/core/generator';
import { mulberry32 } from '../src/core/rng';
import { countSolutions } from '../src/core/solver';

const SIZES = [5, 6, 7, 8, 9, 10];

describe('CA06 solução válida', () => {
  it('permutação, 1 gato por linha/coluna, linhas vizinhas a 2+ colunas (1000 seeds × tamanho)', () => {
    for (const n of SIZES)
      for (let seed = 0; seed < 1000; seed++) {
        const sol = generateSolution(n, mulberry32(seed));
        expect([...sol].sort((a, b) => a - b)).toEqual([...Array(n).keys()]);
        for (let r = 1; r < n; r++) expect(Math.abs(sol[r] - sol[r - 1])).toBeGreaterThanOrEqual(2);
      }
  });
});

describe('CA07 regiões válidas', () => {
  it('N regiões contíguas, sem casa sem cor, 1 gato por região', () => {
    for (const n of SIZES)
      for (let seed = 0; seed < 100; seed++) {
        const rnd = mulberry32(seed);
        const sol = generateSolution(n, rnd);
        const reg = drawRegions(sol, rnd);
        expect(new Set(reg.flat())).toEqual(new Set([...Array(n).keys()]));
        expect(reg.flat().every((v) => v >= 0 && v < n)).toBe(true);
        sol.forEach((c, r) => expect(reg[r][c]).toBe(r)); // 1 gato por região
        for (let id = 0; id < n; id++) {
          const cells: [number, number][] = [];
          reg.forEach((row, r) => row.forEach((v, c) => v === id && cells.push([r, c])));
          const seen = new Set([cells[0].join()]);
          const stack = [cells[0]];
          while (stack.length) {
            const [r, c] = stack.pop()!;
            for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
              if (reg[r + dr]?.[c + dc] === id && !seen.has([r + dr, c + dc].join())) {
                seen.add([r + dr, c + dc].join());
                stack.push([r + dr, c + dc]);
              }
          }
          expect(seen.size).toBe(cells.length);
        }
      }
  });
});

describe('CA08 unicidade', () => {
  it('fases aceitas têm exatamente 1 solução', () => {
    for (const n of SIZES)
      for (let seed = 0; seed < 5; seed++) {
        const r = generatePuzzle(n, seed);
        expect(r.ok).toBe(true);
        if (r.ok) expect(countSolutions(r.puzzle.regions, 2)).toBe(1);
      }
  });
  it('fase com 2 soluções é rejeitada', () => {
    // regiões 4×4 por faixas de linhas… procura uma construção com ≥2 soluções
    let found: number[][] | null = null;
    for (let seed = 0; seed < 500 && !found; seed++) {
      const rnd = mulberry32(seed);
      const reg = drawRegions(generateSolution(6, rnd), rnd);
      if (countSolutions(reg, 3) >= 2) found = reg;
    }
    expect(found).not.toBeNull();
    expect(isUnique(found!)).toBe(false);
  });
  it('limite de tentativas devolve erro tratado, sem loop infinito', () => {
    const r = generatePuzzle(8, 1, { maxAttempts: 3, accept: () => false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/limite/);
    expect(generatePuzzle(99, 1).ok).toBe(false);
  });
});

describe('CA09 seed reproduzível', () => {
  it('mesma seed e size → mesma fase', () => {
    for (const n of SIZES) {
      const a = generatePuzzle(n, 42);
      const b = generatePuzzle(n, 42);
      expect(a).toEqual(b);
    }
  });
  it('10×10 gera em tempo razoável', () => {
    const t = Date.now();
    expect(generatePuzzle(10, 7).ok).toBe(true);
    expect(Date.now() - t).toBeLessThan(5000);
  });
});
