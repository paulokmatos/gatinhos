import { describe, expect, it } from 'vitest';
import { canReveal, continueAfterLoss, newGame, restart, revealCat, tap, undo, type GameState } from '../src/core/game';
import { FIXED_LEVELS } from '../src/core/levels';
import { generateLevel, givenChanceFor, pickGiven, SIZE_RANGE, specForLevel } from '../src/core/progression';
import { defaultProgress, loadProgress, PROGRESS_KEY, recordCompletion, saveProgress, settle } from '../src/core/progress';
import { load, save, type KV } from '../src/core/storage';

const memory = (): KV & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};
const P = FIXED_LEVELS[1];

describe('progressão por etapas', () => {
  it('1–30: etapas de 5 níveis, 5×5 → 10×10', () => {
    const sizes = [1, 6, 11, 16, 21, 26].map((k) => specForLevel(k).size);
    expect(sizes).toEqual([5, 6, 7, 8, 9, 10]);
    for (let k = 1; k <= 30; k++) expect(specForLevel(k).size).toBe(specForLevel(Math.ceil(k / 5) * 5).size);
  });
  it('depois do 30: maioria 10×10 e o patamar sobe a cada 10 níveis', () => {
    const after = Array.from({ length: 70 }, (_, i) => specForLevel(31 + i));
    expect(after.filter((s) => s.size === 10).length / after.length).toBeGreaterThanOrEqual(0.75);
    expect(specForLevel(35).difficulty).toBe('dificil');
    expect(specForLevel(40).difficulty).toBe('dificil');
    expect(specForLevel(41).difficulty).toBe('expert');
  });
  it('dificuldade nunca diminui e o tamanho respeita a tabela (1–200)', () => {
    const order = ['facil', 'medio', 'dificil', 'expert'];
    let prev = 0;
    for (let k = 1; k <= 200; k++) {
      const s = specForLevel(k);
      expect(order.indexOf(s.difficulty)).toBeGreaterThanOrEqual(prev);
      prev = order.indexOf(s.difficulty);
      expect(s.size).toBeGreaterThanOrEqual(SIZE_RANGE[s.difficulty][0]);
      expect(s.size).toBeLessThanOrEqual(SIZE_RANGE[s.difficulty][1]);
    }
  });
});

describe('gatinho de brinde (givens)', () => {
  it('só em dificuldades altas e some aos poucos', () => {
    expect(givenChanceFor(1)).toBe(0);
    expect(givenChanceFor(20)).toBe(0);
    expect(givenChanceFor(25)).toBeGreaterThan(0);
    expect(givenChanceFor(31)).toBeGreaterThan(givenChanceFor(55));
    expect(givenChanceFor(71)).toBe(0);
    expect(givenChanceFor(500)).toBe(0);
  });
  it('é determinístico por nível e o gatinho dado é da solução', () => {
    let withGiven = 0;
    for (const k of [21, 22, 23, 24, 25]) {
      const a = generateLevel(k);
      expect(a).toEqual(generateLevel(k));
      if (!a.ok) throw new Error(a.error);
      for (const i of a.puzzle.givens ?? []) {
        withGiven++;
        expect(a.puzzle.solution[Math.floor(i / a.puzzle.size)]).toBe(i % a.puzzle.size);
      }
    }
    expect(withGiven).toBeGreaterThanOrEqual(0);
  });
  it('o nível já começa com o gatinho de brinde, que não é desfeito e persiste', () => {
    const given = pickGiven(P);
    const puzzle = { ...P, givens: [given] };
    let g = newGame(puzzle);
    expect(g.cells[given].state).toBe('cat');
    g = tap(g, given);
    expect(undo(g).cells[given].state).toBe('cat');
    const kv = memory();
    save(kv, 1, g, false);
    expect(load(kv)!.game.puzzle.givens).toEqual([given]);
  });
  it('pickGiven escolhe o gatinho da cor com mais casas', () => {
    const g = pickGiven(P);
    const n = P.size;
    const size = (id: number) => P.regions.flat().filter((r) => r === id).length;
    const id = P.regions[Math.floor(g / n)][g % n];
    for (let r = 0; r < n; r++) expect(size(id)).toBeGreaterThanOrEqual(size(P.regions[r][P.solution[r]]));
  });
});

describe('poder: revelar um gatinho', () => {
  it('revela um gatinho certo, sem gastar tentativa; desfazer não o remove', () => {
    let g = newGame(P);
    g = revealCat(g);
    const cats = g.cells.map((m, i) => (m.state === 'cat' ? i : -1)).filter((i) => i >= 0);
    expect(cats).toHaveLength(1);
    expect(P.solution[Math.floor(cats[0] / P.size)]).toBe(cats[0] % P.size);
    expect(g.mistakes).toBe(0);
    expect(g.powersUsed).toBe(1);
    expect(g.history).toHaveLength(0);
    expect(undo(g)).toBe(g);
  });
  it('só 1 uso por nível: o 2º não faz nada; recomeçar devolve o uso', () => {
    let g = revealCat(newGame(P));
    expect(canReveal(g)).toBe(false);
    expect(revealCat(g)).toBe(g);
    expect(g.cells.filter((m) => m.state === 'cat')).toHaveLength(1);
    g = restart(g);
    expect(canReveal(g)).toBe(true);
  });
  it('depois de vencer não revela mais', () => {
    let g = newGame(P);
    for (let r = 0; r < P.size; r++) g = tap(tap(g, r * P.size + P.solution[r]), r * P.size + P.solution[r]);
    expect(g.won).toBe(true);
    expect(canReveal(g)).toBe(false);
    expect(revealCat(g)).toBe(g);
  });
  it('substitui um X errado na casa', () => {
    let g = newGame(P);
    for (let r = 0; r < P.size; r++) g = tap(g, r * P.size + P.solution[r]); // X em todas as casas de gatinho
    g = revealCat(g);
    expect(g.cells.filter((m) => m.state === 'cat')).toHaveLength(1);
  });
});

describe('progresso salvo no aparelho', () => {
  it('começa vazio; vazio/corrompido volta ao padrão', () => {
    const kv = memory();
    expect(loadProgress(kv)).toEqual(defaultProgress());
    for (const bad of ['{', 'null', '{"version":1,"completed":-1}', '{"version":2}']) {
      kv.setItem(PROGRESS_KEY, bad);
      expect(loadProgress(kv)).toEqual(defaultProgress());
    }
  });
  it('concluir nível avança e guarda o melhor tempo', () => {
    let p = defaultProgress();
    p = recordCompletion(p, 1, 9000);
    p = recordCompletion(p, 2, 8000);
    p = recordCompletion(p, 3, 7000);
    expect(p.maxLevel).toBe(4);
    expect(p.completed).toBe(3);
    p = recordCompletion(p, 1, 12000); // refazer não piora o recorde
    expect(p.best['1']).toBe(9000);
    p = recordCompletion(p, 1, 5000);
    expect(p.best['1']).toBe(5000);
  });
  it('persiste o progresso', () => {
    const kv = memory();
    saveProgress(kv, recordCompletion(defaultProgress(), 1, 1000));
    expect(loadProgress(kv).completed).toBe(1);
  });

  it('falha ao gravar não derruba o app', () => {
    const kv: KV = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(() => saveProgress(kv, defaultProgress())).not.toThrow();
  });
});

describe('pular nível depois de perder', () => {
  it('avança o ponto de retomada sem contar como concluído', async () => {
    const { skipLevel } = await import('../src/core/progress');
    let p = defaultProgress();
    p = skipLevel(p, 1);
    expect(p.maxLevel).toBe(2);
    expect(p.completed).toBe(0);
    expect(skipLevel(p, 1).maxLevel).toBe(2); // nunca volta atrás
    expect(skipLevel(p, 5).maxLevel).toBe(6);
  });
});

describe('nome do jogador', () => {
  it('sanitiza, limita e persiste só neste aparelho', async () => {
    const { sanitizeName, setName, MAX_NAME } = await import('../src/core/progress');
    expect(sanitizeName('  Paulo   Matos  ')).toBe('Paulo Matos');
    expect(sanitizeName('<b>Ana</b>\n')).toBe('bAna/b');
    expect(sanitizeName('x'.repeat(50))).toHaveLength(MAX_NAME);
    expect(sanitizeName('')).toBe('');
    const kv = memory();
    saveProgress(kv, setName(defaultProgress(), 'Lia'));
    expect(loadProgress(kv).name).toBe('Lia');
    kv.setItem(PROGRESS_KEY, JSON.stringify({ ...defaultProgress(), name: 42 }));
    expect(loadProgress(kv).name).toBe('');
  });
});

describe('começar de um nível avançado', () => {
  it('?nivel=N só aceita 1–999', async () => {
    const { parseLevelParam } = await import('../src/core/progress');
    expect(parseLevelParam('?nivel=26')).toBe(26);
    expect(parseLevelParam('?x=1&nivel=7')).toBe(7);
    for (const bad of ['', '?nivel=0', '?nivel=-3', '?nivel=abc', '?nivel=1000', '?nivel=2.5', '?nivel=']) expect(parseLevelParam(bad)).toBeNull();
  });
  it('pular para um nível muda o ponto de retomada (também para trás)', async () => {
    const { jumpTo } = await import('../src/core/progress');
    let p = recordCompletion(defaultProgress(), 1, 1000);
    p = jumpTo(p, 26);
    expect(p.maxLevel).toBe(26);
    expect(p.completed).toBe(1);
    expect(jumpTo(p, 1).maxLevel).toBe(1);
  });
});

describe('nota e histórico no progresso', () => {
  it('progresso antigo (sem nota) parte do degrau da curva antiga; valores inválidos são ignorados', async () => {
    const { ratingForLevel } = await import('../src/core/progress');
    const kv = memory();
    kv.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, name: '', completed: 3, maxLevel: 26, best: {} }));
    const p = loadProgress(kv);
    expect(p.rating).toBe(ratingForLevel(26));
    expect(p.recent).toEqual([]);
    kv.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, name: '', completed: 0, maxLevel: 1, best: {}, rating: 99, recent: [2, 'x', 0.5], lastPlayed: -4 }));
    const q = loadProgress(kv);
    expect(q.rating).toBeLessThanOrEqual(8);
    expect(q.recent).toEqual([0.5]);
    expect(q.lastPlayed).toBe(0);
  });
  it('recordResult: vitória perfeita sobe a nota; derrota desce e entra no histórico (máx. 5)', async () => {
    const { recordResult } = await import('../src/core/progress');
    const r = { won: true, mistakes: 0, hintsUsed: 0, powersUsed: 0, timeMs: 1000, size: 6 };
    let p = { ...defaultProgress(), rating: 3 };
    p = recordResult(p, r, 5);
    expect(p.rating).toBeGreaterThan(3);
    expect(p.lastPlayed).toBe(5);
    const high = p.rating;
    p = recordResult(p, { ...r, won: false }, 6);
    expect(p.rating).toBeLessThan(high);
    for (let i = 0; i < 8; i++) p = recordResult(p, r, 7);
    expect(p.recent).toHaveLength(5);
  });
  it('ir para um nível redefine a nota por esse nível e zera o histórico', async () => {
    const { jumpTo, ratingForLevel } = await import('../src/core/progress');
    const p = jumpTo({ ...defaultProgress(), recent: [0, 0] }, 26);
    expect(p.rating).toBe(ratingForLevel(26));
    expect(p.recent).toEqual([]);
  });
});

describe('fechar o nível (settle): conta vitória e derrota uma vez só', () => {
  const rated = { ...FIXED_LEVELS[0], difficulty: 'facil' as const };
  const n = rated.size;
  const guess = (g: GameState, i: number) => tap(tap(g, i), i);
  const winAll = (g: GameState) => rated.solution.reduce((s, c, r) => guess(s, r * n + c), g);
  const loseAll = (g: GameState) => [0, 1, 2].reduce((s, r) => guess(s, r * n + ((rated.solution[r] + 2) % n)), g);
  const finishWin = (g: GameState) => {
    const cells = rated.solution.map((c, r) => r * n + c);
    const before = cells.slice(0, -1).reduce((s, i) => guess(s, i), g);
    return [before, guess(before, cells[cells.length - 1])] as const;
  };

  it('vitória: +1 concluído e a nota muda', () => {
    const [prev, next] = finishWin(newGame(rated, { now: 0 }));
    const p = settle(defaultProgress(), 3, prev, next, 1000);
    expect(p.completed).toBe(1);
    expect(p.maxLevel).toBe(4);
    expect(p.recent).toHaveLength(1);
    expect(p.lastPlayed).toBe(1000);
  });
  it('derrota: só a nota (desempenho 0), sem concluir', () => {
    const lost = loseAll(newGame(rated));
    const prev = { ...lost, mistakes: 2 };
    const p = settle(defaultProgress(), 3, prev, lost);
    expect(p.completed).toBe(0);
    expect(p.recent).toEqual([0]);
  });
  it('perdeu, continuou e venceu: conclui, mas a nota não conta de novo', () => {
    const [prev, next] = finishWin(continueAfterLoss(loseAll(newGame(rated))));
    const p = settle(defaultProgress(), 3, prev, next);
    expect(p.completed).toBe(1);
    expect(p.recent).toEqual([]);
  });
  it('nível fixo de reserva conclui sem mexer na nota', () => {
    const fixed = FIXED_LEVELS[0];
    const cells = fixed.solution.map((c, r) => r * n + c);
    const before = cells.slice(0, -1).reduce((s, i) => guess(s, i), newGame(fixed));
    const p = settle(defaultProgress(), 1, before, guess(before, cells[cells.length - 1]));
    expect(p.completed).toBe(1);
    expect(p.recent).toEqual([]);
  });
  it('jogada comum ou estado já vencido: progresso intacto (mesmo objeto)', () => {
    const p0 = defaultProgress();
    const g = newGame(rated);
    expect(settle(p0, 1, g, tap(g, 0))).toBe(p0);
    const won = winAll(g);
    expect(settle(p0, 1, won, won)).toBe(p0);
  });
});
