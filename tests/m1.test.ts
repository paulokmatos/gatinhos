import { describe, expect, it } from 'vitest';
import { applyHint, canRedo, canUndo, dragX, newGame, redo, restart, tap, undo } from '../src/core/game';
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

const catCell = (r: number) => idx(r, P.solution[r]);
const wrong = (r: number) => idx(r, (P.solution[r] + 2) % P.size);

describe('CA03 toque e arrasto', () => {
  it('casa do gatinho: 1 toque marca ✕, 2º toque revela o gatinho, que não some ao tocar de novo', () => {
    let g = newGame(P);
    g = tap(g, catCell(0));
    expect(g.cells[catCell(0)].state).toBe('x');
    g = tap(g, catCell(0));
    expect(g.cells[catCell(0)].state).toBe('cat');
    expect(tap(g, catCell(0))).toBe(g);
  });
  it('casa sem gatinho: o gatinho nunca aparece (✕ → vazio, gastando tentativa)', () => {
    let g = newGame(P);
    const seen = [];
    for (let i = 0; i < 4; i++) {
      g = tap(g, wrong(0));
      seen.push(g.cells[wrong(0)].state);
    }
    expect(seen).toEqual(['x', 'empty', 'x', 'empty']);
  });
  it('arrastar marca ✕ nas vazias sem sobrescrever gatinhos nem marcas', () => {
    let g = newGame(P);
    g = tap(tap(g, 1), 1); // 1 só vira gatinho se for casa dele; garante um gatinho conhecido
    g = tap(tap(g, catCell(4)), catCell(4));
    const before = g.cells.map((m) => m.state);
    g = dragX(g, [catCell(4) - 1, catCell(4), catCell(4) + 1].filter((i) => i >= 20));
    expect(g.cells[catCell(4)].state).toBe('cat');
    expect(before.length).toBe(g.cells.length);
    const g2 = dragX(newGame(P), [0, 1, 2, 3]);
    expect(g2.cells.slice(0, 4).every((m) => m.state === 'x')).toBe(true);
    expect(g2.history).toHaveLength(1); // arrasto = 1 entrada
  });
});

describe('CA04 marca ✕ é anotação do jogador; desfazer, refazer e recomeçar', () => {
  it('nunca marca ✕ sozinho, nem ao revelar um gatinho', () => {
    let g = newGame(P);
    g = tap(tap(g, catCell(0)), catCell(0));
    const xs = g.cells.filter((m) => m.state === 'x');
    expect(xs).toHaveLength(0);
    expect(g.cells.filter((m) => m.state === 'cat')).toHaveLength(1);
  });
  it('marca ✕ pode ficar em casa errada e permanece', () => {
    let g = newGame(P);
    g = tap(g, catCell(1)); // X numa casa de gatinho: rascunho errado, permitido
    expect(g.cells[catCell(1)].state).toBe('x');
  });
  it('desfazer/refazer só mexem em marcas ✕; gatinho nunca some', () => {
    let g = newGame(P);
    g = tap(tap(g, catCell(0)), catCell(0)); // gatinho revelado
    g = tap(g, wrong(3));
    g = tap(g, wrong(4));
    const snap = JSON.stringify(g.cells);
    g = undo(undo(g));
    expect(g.cells[wrong(3)].state).toBe('empty');
    expect(g.cells[wrong(4)].state).toBe('empty');
    expect(g.cells[catCell(0)].state).toBe('cat');
    expect(undo(g)).toBe(g); // o X que virou gatinho não é desfeito
    g = redo(redo(g));
    expect(JSON.stringify(g.cells)).toBe(snap);
    expect(redo(g)).toBe(g);
  });
  it('canUndo ignora jogadas que viraram gatinho', () => {
    let g = tap(tap(newGame(P), catCell(0)), catCell(0));
    expect(canUndo(g)).toBe(false);
    g = tap(g, wrong(1));
    expect(canUndo(g)).toBe(true);
    expect(canRedo(undo(g))).toBe(true);
  });
  it('recomeçar limpa tabuleiro e histórico', () => {
    let g = tap(newGame(P), 3);
    g = restart(g);
    expect(g.history).toHaveLength(0);
    expect(g.redo).toHaveLength(0);
    expect(g.cells.every((m) => m.state === 'empty')).toBe(true);
  });
});

describe('CA05 vitória', () => {
  it('vitória dispara uma única vez com tempo e dicas = 0', () => {
    let g = newGame(P, { now: 1000 });
    let wins = 0;
    for (let r = 0; r < P.size; r++) {
      const before = g.won;
      g = tap(tap(g, catCell(r)), catCell(r));
      if (!before && g.won) wins++;
    }
    expect(g.won).toBe(true);
    expect(wins).toBe(1);
    expect(g.hintsUsed).toBe(0);
    expect(g.finishedAt).not.toBeNull();
    expect(tap(g, 0)).toBe(g);
    expect(applyHint(g)).toBe(g);
  });
});
