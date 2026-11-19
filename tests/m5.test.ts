import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { newGame, pressHint, tap, undo } from '../src/core/game';
import { FIXED_LEVELS } from '../src/core/levels';
import { manifest } from '../src/manifest';
import { load, save, STORAGE_KEY, type KV } from '../src/core/storage';

const memory = (): KV & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe('CA21 manifest', () => {
  it('tem nome, ícone, standalone e retrato; ícones existem', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('portrait');
    expect(manifest.icons.some((i) => i.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((i) => i.sizes === '512x512')).toBe(true);
    for (const i of manifest.icons) expect(existsSync(`public/${i.src}`)).toBe(true);
  });
});

describe('CA22 service worker (parte automática)', () => {
  it('o Worker do gerador é incluído no precache pelo padrão de js', () => {
    const cfg = readFileSync('vite.config.ts', 'utf8');
    expect(cfg).toMatch(/globPatterns.*js/);
  });
});

describe('CA23 persistência', () => {
  it('restaura cells, history, hintsUsed, startedAt, ajustes; desfazer continua funcionando', () => {
    const kv = memory();
    let g = newGame(FIXED_LEVELS[1], { now: 12345 });
    g = tap(g, 3);
    g = tap(g, 10);
    g = { ...g, hintsUsed: 2 };
    save(kv, 7, g, true);
    const back = load(kv)!;
    expect(back.level).toBe(7);
    expect(back.symbols).toBe(true);
    expect(back.game.cells).toEqual(g.cells);
    expect(back.game.history).toEqual(g.history);
    expect(back.game.hintsUsed).toBe(2);
    expect(back.game.startedAt).toBe(12345);
    expect(undo(back.game).cells[10].state).toBe('empty');
  });
  it('armazenamento vazio ou corrompido → null (app começa na fase 1)', () => {
    const kv = memory();
    expect(load(kv)).toBeNull();
    for (const bad of ['{', '[]', '{"version":1}', JSON.stringify({ version: 1, level: 1, puzzle: { size: 5 } }), 'null']) {
      kv.setItem(STORAGE_KEY, bad);
      expect(load(kv)).toBeNull();
    }
    const g = newGame(FIXED_LEVELS[0]);
    save(kv, 1, g, false);
    const obj = JSON.parse(kv.getItem(STORAGE_KEY)!);
    obj.cells = obj.cells.slice(1);
    kv.setItem(STORAGE_KEY, JSON.stringify(obj));
    expect(load(kv)).toBeNull();
  });
  it('falha ao gravar não derruba o app', () => {
    const kv: KV = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(() => save(kv, 1, pressHint(newGame(FIXED_LEVELS[0])), false)).not.toThrow();
  });
});
