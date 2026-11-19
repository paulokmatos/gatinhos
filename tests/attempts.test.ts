import { describe, expect, it } from 'vitest';
import { attemptsLeft, canHint, continueAfterLoss, dragX, isLost, MAX_ATTEMPTS, newGame, restart, tap, undo } from '../src/core/game';
import { FIXED_LEVELS } from '../src/core/levels';
import { load, save, type KV } from '../src/core/storage';

const P = FIXED_LEVELS[0];
const wrong = (r: number) => r * P.size + ((P.solution[r] + 2) % P.size);
const right = (r: number) => r * P.size + P.solution[r];
const guess = (g: ReturnType<typeof newGame>, i: number) => tap(tap(g, i), i); // X e depois tenta o gatinho

describe('tentativas (máx. 3 por quadro)', () => {
  it('começa com 3; acertar não gasta; errar o palpite gasta 1', () => {
    let g = newGame(P);
    expect(MAX_ATTEMPTS).toBe(3);
    expect(attemptsLeft(g)).toBe(3);
    g = guess(g, right(0));
    expect(g.cells[right(0)].state).toBe('cat');
    expect(attemptsLeft(g)).toBe(3);
    g = guess(g, wrong(1));
    expect(g.cells[wrong(1)].state).toBe('empty');
    expect(attemptsLeft(g)).toBe(2);
  });
  it('X de rascunho e arrasto nunca gastam tentativas', () => {
    let g = tap(newGame(P), right(2));
    g = dragX(g, [0, 1, 2, 3, 4]);
    expect(g.mistakes).toBe(0);
  });
  it('desfazer não devolve tentativa', () => {
    let g = guess(newGame(P), wrong(0));
    g = undo(g);
    expect(g.mistakes).toBe(1);
  });
  it('3 erros = fase perdida: jogo trava até reiniciar ou continuar', () => {
    let g = newGame(P);
    for (let r = 0; r < 3; r++) g = guess(g, wrong(r));
    expect(isLost(g)).toBe(true);
    expect(tap(g, 0)).toBe(g);
    expect(canHint(g)).toBe(false);
    const c = continueAfterLoss(g);
    expect(isLost(c)).toBe(false);
    expect(tap(c, 0)).not.toBe(c); // volta a jogar, sem novo modal
    const r = restart(g);
    expect(r.mistakes).toBe(0);
    expect(r.cells.every((m) => m.state === 'empty')).toBe(true);
  });
  it('tentativas e "continuar" persistem', () => {
    const data = new Map<string, string>();
    const kv: KV = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
    let g = newGame(P);
    for (let r = 0; r < 3; r++) g = guess(g, wrong(r));
    g = continueAfterLoss(g);
    save(kv, 1, g, false);
    const back = load(kv)!.game;
    expect(back.mistakes).toBe(3);
    expect(back.continued).toBe(true);
  });
});

describe('dois toques seguidos = 1 tentativa (X não importa, só haver gatinho)', () => {
  it('2 toques numa casa com gatinho: acerta, sem gastar tentativa', () => {
    const g = tap(tap(newGame(P), right(0)), right(0));
    expect(g.cells[right(0)].state).toBe('cat');
    expect(g.mistakes).toBe(0);
  });
  it('2 toques numa casa sem gatinho: erra e gasta 1, mesmo sem X prévio', () => {
    const g = tap(tap(newGame(P), wrong(0)), wrong(0));
    expect(g.cells[wrong(0)].state).toBe('empty');
    expect(g.mistakes).toBe(1);
  });
  it('casa já riscada (ex.: arrasto): o 1º toque só arma, o 2º é a tentativa', () => {
    let g = dragX(newGame(P), [wrong(1), right(2)]);
    g = tap(g, wrong(1));
    expect(g.mistakes).toBe(0);
    expect(g.cells[wrong(1)].state).toBe('x'); // nada mudou ainda
    g = tap(g, wrong(1));
    expect(g.mistakes).toBe(1);
    expect(g.cells[wrong(1)].state).toBe('empty');
    let h = dragX(newGame(P), [right(2)]);
    h = tap(tap(h, right(2)), right(2));
    expect(h.cells[right(2)].state).toBe('cat');
    expect(h.mistakes).toBe(0);
  });
  it('toques em casas diferentes não formam tentativa', () => {
    let g = newGame(P);
    g = tap(g, wrong(0));
    g = tap(g, wrong(1));
    g = tap(g, wrong(0)); // voltou: já tinha X e outro toque no meio → só arma
    expect(g.mistakes).toBe(0);
    expect(g.cells[wrong(0)].state).toBe('x');
  });
});

describe('recomeçar (sem gerar outras posições)', () => {
  it('limpa tabuleiro e tentativas, mantém exatamente o mesmo nível', () => {
    let g = newGame(P);
    g = tap(tap(g, right(0)), right(0));
    g = tap(tap(g, wrong(1)), wrong(1));
    expect(g.mistakes).toBe(1);
    const r = restart(g);
    expect(r.puzzle).toBe(g.puzzle); // mesmo objeto: nada foi regerado
    expect(r.puzzle.solution).toEqual(P.solution);
    expect(r.mistakes).toBe(0);
    expect(r.cells.every((m) => m.state === 'empty')).toBe(true);
  });
  it('gatinhos de brinde continuam no lugar depois de recomeçar', () => {
    const given = P.solution[0];
    const r = restart(newGame({ ...P, givens: [given] }));
    expect(r.cells[given].state).toBe('cat');
  });
});
