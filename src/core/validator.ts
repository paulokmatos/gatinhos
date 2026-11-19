import type { Conflict, Mark, Pos, Puzzle } from './types';

/** Casas vizinhas (inclui diagonal). */
export function touches(a: Pos, b: Pos): boolean {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c)) <= 1;
}

/** Devolve os conflitos entre gatos, separados por tipo. */
export function findConflicts(puzzle: Puzzle, cells: Mark[]): Conflict[] {
  const n = puzzle.size;
  const cats: Pos[] = [];
  cells.forEach((m, i) => {
    if (m.state === 'cat') cats.push({ r: Math.floor(i / n), c: i % n });
  });
  const out: Conflict[] = [];
  const group = (type: 'row' | 'col' | 'color', key: (p: Pos) => number) => {
    const map = new Map<number, Pos[]>();
    for (const p of cats) {
      const k = key(p);
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    for (const list of map.values()) if (list.length > 1) out.push({ type, cells: list });
  };
  group('row', (p) => p.r);
  group('col', (p) => p.c);
  group('color', (p) => puzzle.regions[p.r][p.c]);
  for (let i = 0; i < cats.length; i++)
    for (let j = i + 1; j < cats.length; j++)
      if (touches(cats[i], cats[j])) out.push({ type: 'adjacent', cells: [cats[i], cats[j]] });
  return out;
}

export function conflictIndexes(puzzle: Puzzle, cells: Mark[]): Set<number> {
  const s = new Set<number>();
  for (const cf of findConflicts(puzzle, cells)) for (const p of cf.cells) s.add(p.r * puzzle.size + p.c);
  return s;
}
