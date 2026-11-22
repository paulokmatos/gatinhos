import { describe, expect, it } from 'vitest';
import { applyHint, canHint, newGame, pressHint, tap, undo, type GameState } from '../src/core/game';
import { chebyshev, findErrors, getDeduction, getHint } from '../src/core/hint';
import { generateLevel } from '../src/core/progression';
import { FIXED_LEVELS } from '../src/core/levels';
import { generatePuzzle } from '../src/core/generator';
import { applyDeduction, hintDeductions, isSolved, lowestDeductions, stateFromMarks, visibleState, type Tech } from '../src/core/human';
import { COLOR_NAMES, hintMessage } from '../src/core/messages';
import type { Mark, Puzzle } from '../src/core/types';
import { mulberry32 } from '../src/core/rng';

const P = FIXED_LEVELS[0]; // 5×5
const N = P.size;
/** Põe um gato direto (o toque só revela gatinhos em casas certas; para testar erros forço o estado). */
const put = (g: GameState, i: number, state: 'x' | 'cat'): GameState =>
  state === 'cat' ? { ...g, cells: g.cells.map((m, j) => (j === i ? { state: 'cat' as const } : m)), lastMove: i } : tap(g, i);
const solCell = (r: number) => r * N + P.solution[r];
const wrongCell = (r: number) => r * N + ((P.solution[r] + 2) % N);

describe('CA13/CA14 erros', () => {
  it('gatinho fora do lugar: destaca com "tem algo errado aqui", sem solver', () => {
    const g = put(newGame(P, {}), wrongCell(0), 'cat');
    const h = getHint(P, g.cells, g.lastMove);
    expect(h.kind).toBe('error');
    expect(h.areaCells).toEqual([wrongCell(0)]);
    expect(h.message).toBe('Tem algo errado aqui.');
    expect(h.deduction).toBeUndefined();
  });
  it('marca ✕ em casa de gatinho → mesmo comportamento', () => {
    const g = put(newGame(P, {}), solCell(2), 'x');
    expect(findErrors(P, g.cells)).toEqual([solCell(2)]);
    const h = getHint(P, g.cells, g.lastMove);
    expect(h.areaText).toBe(`Algum ✕ seu está numa casa onde pode haver gatinho. Confira a coluna ${P.solution[2] + 1}.`);
    expect(h.areaCells).toEqual([solCell(2)]);
    expect(h.apply).toEqual({ cats: [], xs: [], clear: [solCell(2)] }); // nível 3: "Tirar este ✕"
    let p = pressHint(pressHint(pressHint(g)));
    p = applyHint(p);
    expect(p.cells[solCell(2)].state).toBe('empty');
    const cells: Mark[] = g.cells.map((m, i) => (i === solCell(3) ? { state: 'x' } : m));
    expect(findErrors(P, cells)).toContain(solCell(3));
  });
  it('vários erros: aponta só um, o mais perto da última jogada', () => {
    let g = newGame(P, {});
    g = put(g, wrongCell(0), 'cat');
    g = put(g, wrongCell(4), 'cat'); // última jogada
    const h = getHint(P, g.cells, g.lastMove)!;
    expect(h.areaCells).toEqual([wrongCell(4)]);
  });
});

describe('CA15/CA16 passo mais fácil, inédito e desempate', () => {
  it('para na primeira técnica; nunca sugere o que já está marcado', () => {
    const r = generateLevel(1);
    if (!r.ok) throw new Error(r.error);
    const p = r.puzzle;
    let g = newGame(p, {});
    for (let i = 0; i < 40 && !g.won; i++) {
      const d = getHint(p, g.cells, g.lastMove).deduction!;
      expect(d).toBeDefined();
      const s = visibleState(p, g.cells);
      expect(Math.min(...hintDeductions(s, true).map((x) => x.tech))).toBe(d.tech);
      for (const c of d.cats) expect(g.cells[c].state).toBe('empty');
      for (const x of d.xs) expect(g.cells[x].state).toBe('empty');
      // aplica o passo manualmente
      g = pressHint(pressHint(pressHint(g)));
      g = applyHint(g);
    }
    expect(g.won).toBe(true);
  });
  it('desempate: menor distância Chebyshev, depois linha, depois coluna', () => {
    expect(chebyshev(5, 0, 12)).toBe(2);
    const r = generateLevel(1);
    if (!r.ok) throw new Error(r.error);
    const p = r.puzzle;
    const empty = Array.from({ length: p.size ** 2 }, () => ({ state: 'empty' as const }));
    const ds = lowestDeductions(stateFromMarks(p, empty));
    const targets = (d: (typeof ds)[number]) => [...d.cats, ...d.xs];
    const a = getHint(p, empty, null).deduction!;
    // sem jogada anterior: vence a de menor linha/coluna
    const minFirst = Math.min(...ds.map((d) => Math.min(...targets(d))));
    expect(Math.min(...targets(a))).toBe(minFirst);
    // com jogada anterior: vence a mais perto
    const last = p.size ** 2 - 1;
    const b = getHint(p, empty, last).deduction!;
    const dist = (d: (typeof ds)[number]) => Math.min(...targets(d).map((c) => chebyshev(p.size, last, c)));
    expect(dist(b)).toBe(Math.min(...ds.map(dist)));
    // determinismo
    expect(getHint(p, empty, last)).toEqual(getHint(p, empty, last));
  });
});

describe('CA17/CA18/CA20 dica em 3 níveis, aplicar e contagem', () => {
  const start = () => {
    const r = generateLevel(1);
    if (!r.ok) throw new Error(r.error);
    return newGame(r.puzzle, {});
  };
  it('3 toques: motivo → o que fazer → Fazer por mim; toques 1 e 2 não contam', () => {
    let g = start();
    g = pressHint(g);
    expect(g.hint!.level).toBe(1);
    g = pressHint(g);
    expect(g.hint!.level).toBe(2);
    g = pressHint(g);
    expect(g.hint!.level).toBe(3);
    expect(g.hintsUsed).toBe(0);
  });
  it('qualquer jogada reinicia o ciclo', () => {
    let g = pressHint(pressHint(start()));
    g = tap(g, 0);
    expect(g.hint).toBeNull();
    expect(pressHint(g).hint!.level).toBe(1);
  });
  it('Fazer por mim: uma entrada no histórico (só marcas ✕), desfazer reverte os ✕, hintsUsed +1', () => {
    let g = start();
    g = pressHint(pressHint(pressHint(g)));
    const before = g.history.length;
    const target = g.hint!.data.apply!;
    g = applyHint(g);
    expect(g.hintsUsed).toBe(1);
    expect(g.history.length).toBe(before + (target.xs.length ? 1 : 0));
    for (const x of target.xs) expect(g.cells[x]).toEqual({ state: 'x' });
    for (const c of target.cats) expect(g.cells[c].state).toBe('cat');
        g = undo(g);
    // gatinho é escrita do código: o desfazer reverte só as marcações (X) do passo
    for (const x of target.xs) expect(g.cells[x].state).toBe('empty');
    for (const c of target.cats) expect(g.cells[c].state).toBe('cat');
  });
  it('Fazer por mim só funciona no 3º toque', () => {
    const g = pressHint(start());
    expect(applyHint(g)).toBe(g);
  });
  it('sempre há dedução em estados sem erros; resolvido desativa o botão', () => {
    const r = generateLevel(1);
    if (!r.ok) throw new Error(r.error);
    let g = newGame(r.puzzle, {});
    for (let i = 0; i < 60 && !g.won; i++) {
      g = pressHint(pressHint(pressHint(g)));
      expect(g.hint).not.toBeNull();
      g = applyHint(g);
    }
    expect(g.won).toBe(true);
    expect(canHint(g)).toBe(false);
    expect(pressHint(g)).toBe(g);
    expect(g.hintsUsed).toBeGreaterThan(0);
  });
});

describe('dica explica o porquê (motivo → o que fazer)', () => {
  it('o texto do 1º toque (motivo) abre o texto do 2º (o que fazer); erro não oferece "Fazer por mim"', () => {
    const r = generateLevel(1);
    if (!r.ok) throw new Error(r.error);
    const p = r.puzzle;
    const empty = Array.from({ length: p.size ** 2 }, () => ({ state: 'empty' as const }));
    const h = getHint(p, empty, null);
    expect(h.areaCells.length).toBeGreaterThan(0); // casas da premissa
    expect(h.message.startsWith(h.areaText)).toBe(true);
    expect(h.apply).not.toBeNull();
    const emptyP = Array.from({ length: N * N }, () => ({ state: 'empty' as const }));
    const wrongCells = emptyP.map((m, i) => (i === wrongCell(0) ? { state: 'cat' as const } : m));
    expect(getHint(P, wrongCells, null).apply).toBeNull();
  });
});

describe('CA19 mensagens', () => {
  it('cada técnica: ≤ 2 frases, cita linhas/colunas reais a partir de 1', () => {
    const seen = new Set<Tech>();
    for (let seed = 0; seed < 60 && seen.size < 7; seed++) {
      const g = generatePuzzle(8 + (seed % 3), seed);
      if (!g.ok) continue;
      const p = g.puzzle;
      const s = stateFromMarks(p, Array.from({ length: p.size ** 2 }, () => ({ state: 'empty' as const })));
      while (!isSolved(s)) {
        const ds = lowestDeductions(s);
        if (!ds.length) break;
        for (const d of ds) {
          if (!seen.has(d.tech)) {
            seen.add(d.tech);
            const msg = hintMessage(d, p.size);
            expect((msg.match(/[.!?](\s|$)/g) ?? []).length).toBeLessThanOrEqual(2);
            expect(msg).not.toMatch(/\b0\b/);
            if (d.tech === 1 || d.tech === 4 || d.tech === 7) {
              const t = (d.cats[0] ?? d.xs[0]) as number;
              expect(msg).toContain(String(Math.floor(t / p.size) + 1));
              expect(msg).toContain(String((t % p.size) + 1));
            } else {
              for (const l of d.lines) expect(msg).toContain(String(l + 1));
              for (const r of d.regions) expect(msg).toContain(COLOR_NAMES[r]);
            }
          }
          applyDeduction(s, d);
        }
      }
    }
    expect(seen.size).toBe(7);
  });
  it('exemplo T5 em texto', () => {
    const msg = hintMessage({ tech: 5, cats: [], xs: [0], lineKind: 'col', lines: [4, 5], regions: [3, 7], premise: [] }, 10);
    expect(msg).toBe('As cores Roxo e Rosa só têm casas livres nas colunas 5 e 6. Elas ocupam essas colunas, então as casas de outras cores nelas não podem ter gatinho: marque ✕ nelas.');
  });
});

describe('dicas só com o estado visível', () => {
  const level = (k: number) => {
    const r = generateLevel(k);
    if (!r.ok) throw new Error(r.error);
    return r.puzzle;
  };
  const cellsOf = (p: Puzzle, cat: [number, number][], x: number[] = []): Mark[] =>
    Array.from({ length: p.size ** 2 }, (_, i) => (cat.some(([r, c]) => r * p.size + c === i) ? { state: 'cat' as const } : x.includes(i) ? { state: 'x' as const } : { state: 'empty' as const }));

  it('nível 25 (9×9), gatinho Azul em (5,2): a 1ª dica é a de consequência, não a da linha 6', () => {
    const p = level(25);
    expect(p.solution[4]).toBe(1); // linha 5, coluna 2 (cor Azul)
    const h = getHint(p, cellsOf(p, [[4, 1]]), 4 * 9 + 1);
    expect(h.deduction!.tech).toBe(0);
    expect(h.areaText).toContain('O gatinho Azul (linha 5, coluna 2) já descarta estas casas');
    expect(h.areaCells).toEqual([4 * 9 + 1]);
    expect(h.apply!.xs.length).toBeGreaterThan(0);
  });
  it('nível 27 (10×10): só as casas do gatinho que ainda não têm ✕ entram na dica; depois de marcá-las, vem outra técnica', () => {
    const p = level(27);
    const n = p.size;
    const cat = [3, 7] as [number, number]; // (4,8)
    const all = visibleState(p, cellsOf(p, [cat]));
    const full = hintDeductions(all, true)[0]; // consequências do gatinho
    expect(full.tech).toBe(0);
    const rest = [7 * n + 7, 8 * n + 7]; // (8,8) e (9,8): coluna 8
    const x = full.xs.filter((i) => !rest.includes(i));
    const g = cellsOf(p, [cat], x);
    const h = getHint(p, g, null);
    expect(h.deduction!.tech).toBe(0);
    expect(h.apply!.xs).toEqual(rest);
    expect(h.message).toContain('Marque ✕ nelas.');
    const g2 = g.map((m, i) => (rest.includes(i) ? { state: 'x' as const } : m));
    expect(getHint(p, g2, null).deduction!.tech).not.toBe(0);
  });
  it('estados aleatórios válidos: dica correta, sem citar casas ocupadas, e igual com outra solução', () => {
    const rnd = mulberry32(7);
    for (const k of [3, 12, 25, 27]) {
      const p = level(k);
      const n = p.size;
      for (let t = 0; t < 25; t++) {
        const cells: Mark[] = Array.from({ length: n * n }, (_, i) => {
          const sol = p.solution[Math.floor(i / n)] === i % n;
          if (sol) return rnd() < 0.25 ? { state: 'cat' } : { state: 'empty' };
          return rnd() < 0.35 ? { state: 'x' } : { state: 'empty' };
        });
        const h = getHint(p, cells, null);
        expect(h.kind).not.toBe('error');
        // outra "solução" (lixo): o resultado não pode mudar
        expect(getDeduction({ ...p, solution: p.solution.map(() => 0) } as Puzzle, cells, null)).toEqual(h);
        if (h.kind !== 'deduction') continue;
        const d = h.deduction!;
        for (const i of [...d.xs, ...d.cats]) expect(cells[i].state).toBe('empty');
        for (const i of d.xs) expect(p.solution[Math.floor(i / n)] === i % n).toBe(false); // sólida
        for (const i of d.cats) expect(p.solution[Math.floor(i / n)] === i % n).toBe(true);
        if (d.tech === 0) expect(d.premise.every((i) => cells[i].state === 'cat')).toBe(true);
        else for (const i of d.premise) expect(cells[i].state).not.toBe('cat'); // prova de linha/coluna/cor pode incluir casas já com ✕
        expect(h.message.startsWith(h.areaText)).toBe(true);
      }
    }
  });
  it('sem dedução simples: mostra o aviso; o "Fazer por mim" não aparece', () => {
    const p = level(1);
    const solved = Array.from({ length: p.size ** 2 }, (_, i) => (p.solution[Math.floor(i / p.size)] === i % p.size ? { state: 'cat' as const } : { state: 'x' as const }));
    const h = getHint(p, solved, null);
    expect(h.kind).toBe('none');
    expect(h.message).toBe('Não achei uma dedução simples a partir daqui.');
    expect(h.apply).toBeNull();
  });
});
