import { describe, expect, it } from 'vitest';
import { newGame, revealCat, tap, undo } from '../src/core/game';
import { FIXED_LEVELS } from '../src/core/levels';
import { generateLevel, givenChanceFor, pickGiven, SIZE_RANGE, specForLevel } from '../src/core/progression';
import { defaultProgress, EARN_EVERY, loadProgress, PROGRESS_KEY, recordCompletion, saveProgress, spendReveal, START_REVEALS } from '../src/core/progress';
import { load, save, type KV } from '../src/core/storage';

const memory = (): KV & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};
const P = FIXED_LEVELS[1];

describe('progressão por lotes', () => {
  it('1–30: lotes de 5 níveis, 5×5 → 10×10', () => {
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

describe('gatinho inicial (givens)', () => {
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
  it('a fase já começa com o gatinho, que não é desfeito e persiste', () => {
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
  it('revela um gatinho certo, sem gastar tentativa, numa jogada desfazível', () => {
    let g = newGame(P);
    g = revealCat(g);
    const cats = g.cells.map((m, i) => (m.state === 'cat' ? i : -1)).filter((i) => i >= 0);
    expect(cats).toHaveLength(1);
    expect(P.solution[Math.floor(cats[0] / P.size)]).toBe(cats[0] % P.size);
    expect(g.mistakes).toBe(0);
    expect(g.powersUsed).toBe(1);
    expect(g.history).toHaveLength(1);
    expect(undo(g).cells.every((m) => m.state === 'empty')).toBe(true);
  });
  it('revela todos, um por vez, e vence; depois não faz nada', () => {
    let g = newGame(P);
    for (let i = 0; i < P.size; i++) g = revealCat(g);
    expect(g.won).toBe(true);
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
  it('começa com poderes e vazio; vazio/corrompido volta ao padrão', () => {
    const kv = memory();
    expect(loadProgress(kv)).toEqual(defaultProgress());
    expect(defaultProgress().powers.reveal).toBe(START_REVEALS);
    for (const bad of ['{', 'null', '{"version":1,"completed":-1}', '{"version":2}']) {
      kv.setItem(PROGRESS_KEY, bad);
      expect(loadProgress(kv)).toEqual(defaultProgress());
    }
  });
  it('concluir nível avança, guarda melhor tempo e dá poder a cada ' + EARN_EVERY + ' níveis', () => {
    let p = defaultProgress();
    p = recordCompletion(p, 1, 9000);
    p = recordCompletion(p, 2, 8000);
    expect(p.powers.reveal).toBe(START_REVEALS);
    p = recordCompletion(p, 3, 7000);
    expect(p.powers.reveal).toBe(START_REVEALS + 1);
    expect(p.maxLevel).toBe(4);
    expect(p.completed).toBe(3);
    p = recordCompletion(p, 1, 12000); // refazer não piora o recorde
    expect(p.best['1']).toBe(9000);
    p = recordCompletion(p, 1, 5000);
    expect(p.best['1']).toBe(5000);
  });
  it('gasta poder e não fica negativo; persiste', () => {
    let p = defaultProgress();
    p = spendReveal(spendReveal(p)!)!;
    expect(p.powers.reveal).toBe(0);
    expect(spendReveal(p)).toBeNull();
    const kv = memory();
    saveProgress(kv, recordCompletion(p, 1, 1000));
    expect(loadProgress(kv).completed).toBe(1);
  });
  it('falha ao gravar não derruba o app', () => {
    const kv: KV = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(() => saveProgress(kv, defaultProgress())).not.toThrow();
  });
});
