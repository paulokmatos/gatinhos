import { describe, expect, it } from 'vitest';
import { applyHint, conflicts, dragX, newGame, redo, restart, tap, undo } from '../src/core/game';
import { FIXED_LEVELS } from '../src/core/levels';
import { countSolutions } from '../src/core/solver';
import type { Mark } from '../src/core/types';
import { findConflicts } from '../src/core/validator';

const P = FIXED_LEVELS[0];
const idx = (r: number, c: number, n = P.size) => r * n + c;
const board = (cats: [number, number][], n = P.size): Mark[] => {
  const cells: Mark[] = Array.from({ length: n * n }, () => ({ state: 'empty' as const }));
  for (const [r, c] of cats) cells[r * n + c] = { state: 'cat' };
  return cells;
};

describe('CA01 modelo e fases fixas', () => {
  it('3 fases com N×N, N cores, N gatos e solução única', () => {
    expect(FIXED_LEVELS).toHaveLength(3);
    for (const p of FIXED_LEVELS) {
      const n = p.size;
      expect(p.regions).toHaveLength(n);
      p.regions.forEach((row) => expect(row).toHaveLength(n));
      expect(new Set(p.regions.flat()).size).toBe(n);
      expect(p.solution).toHaveLength(n);
      expect(countSolutions(p.regions, 2)).toBe(1);
      // a solução declarada é a encontrada
      expect(findConflicts(p, board(p.solution.map((c, r) => [r, c]), n))).toEqual([]);
    }
  });
});

describe('CA02 validador', () => {
  it('conflito de linha', () => expect(findConflicts(P, board([[0, 0], [0, 3]])).map((c) => c.type)).toContain('row'));
  it('conflito de coluna', () => expect(findConflicts(P, board([[0, 0], [3, 0]])).map((c) => c.type)).toContain('col'));
  it('conflito de cor', () => expect(findConflicts(P, board([[0, 0], [1, 1]])).map((c) => c.type)).toContain('color'));
  it('conflito de encostados (inclui diagonal)', () => {
    const t = findConflicts(P, board([[0, 4], [1, 3]])).map((c) => c.type);
    expect(t).toContain('adjacent');
  });
  it('tabuleiro sem conflitos', () => {
    expect(findConflicts(P, board(P.solution.map((c, r) => [r, c])))).toEqual([]);
    expect(findConflicts(P, board([]))).toEqual([]);
  });
});

describe('CA03 toque e arrasto', () => {
  it('cicla vazio → X → gato → vazio', () => {
    let g = newGame(P, { autoX: false });
    const states = [];
    for (let i = 0; i < 3; i++) {
      g = tap(g, 0);
      states.push(g.cells[0].state);
    }
    expect(states).toEqual(['x', 'cat', 'empty']);
  });
  it('arrasto risca vazias sem sobrescrever gatos', () => {
    let g = newGame(P, { autoX: false });
    g = tap(tap(g, 1), 1); // gato em 1
    g = dragX(g, [0, 1, 2, 3]);
    expect(g.cells.slice(0, 4).map((m) => m.state)).toEqual(['x', 'cat', 'x', 'x']);
    expect(g.history).toHaveLength(3); // arrasto = 1 entrada
  });
});

describe('CA04 auto-X, desfazer, refazer, reiniciar', () => {
  it('auto-X marca linha, coluna, cor e vizinhos e some só os automáticos', () => {
    let h = newGame(P, { autoX: true });
    h = tap(tap(h, idx(0, 1)), idx(0, 1)); // gato em (0,1)
    h = tap(h, idx(4, 4)); // X manual longe
    const sh = h.cells.map((m, i) => (m.auto ? i : -1)).filter((i) => i >= 0);
    expect(sh.length).toBeGreaterThan(0);
    expect(h.cells[idx(0, 0)]).toEqual({ state: 'x', auto: true }); // linha
    expect(h.cells[idx(1, 1)]).toEqual({ state: 'x', auto: true }); // coluna/vizinho
    h = tap(h, idx(0, 1)); // gato → vazio
    expect(h.cells[idx(0, 1)].state).toBe('empty');
    expect(h.cells.some((m) => m.auto)).toBe(false);
    expect(h.cells[idx(4, 4)].state).toBe('x'); // manual fica
  });
  it('sem auto-X nada é riscado sozinho', () => {
    let g = newGame(P, { autoX: false });
    g = tap(tap(g, 0), 0);
    expect(g.cells.filter((m) => m.state === 'x')).toHaveLength(0);
  });
  it('desfazer/refazer em qualquer ordem', () => {
    let g = newGame(P, { autoX: true });
    g = tap(tap(g, 0), 0);
    g = tap(g, idx(4, 3));
    const snap = JSON.stringify(g.cells);
    g = undo(undo(undo(g)));
    expect(g.cells.every((m) => m.state === 'empty')).toBe(true);
    g = redo(g);
    g = undo(g);
    g = redo(redo(redo(g)));
    expect(JSON.stringify(g.cells)).toBe(snap);
    expect(redo(g)).toBe(g);
  });
  it('reiniciar limpa tabuleiro e histórico', () => {
    let g = tap(newGame(P), 3);
    g = restart(g);
    expect(g.history).toHaveLength(0);
    expect(g.redo).toHaveLength(0);
    expect(g.cells.every((m) => m.state === 'empty')).toBe(true);
  });
});

describe('CA05 conflitos e vitória', () => {
  it('conflitos ficam marcados e somem ao resolver', () => {
    let g = newGame(P, { autoX: false });
    for (const [r, c] of [[0, 0], [0, 3]]) g = tap(tap(g, idx(r, c)), idx(r, c));
    expect(conflicts(g).size).toBe(2);
    g = tap(g, idx(0, 3)); // cat → vazio
    expect(conflicts(g).size).toBe(0);
  });
  it('vitória dispara uma única vez com tempo e dicas = 0', () => {
    let g = newGame(P, { autoX: false, now: 1000 });
    let wins = 0;
    for (const [r, c] of P.solution.map((c, r) => [r, c])) {
      const before = g.won;
      g = tap(tap(g, idx(r, c)), idx(r, c));
      if (!before && g.won) wins++;
    }
    expect(g.won).toBe(true);
    expect(wins).toBe(1);
    expect(g.hintsUsed).toBe(0);
    expect(g.finishedAt).not.toBeNull();
    expect(tap(g, 0)).toBe(g); // sem novas ações
    expect(applyHint(g)).toBe(g);
  });
});
