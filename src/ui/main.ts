import './style.css';
import { applyHint, canHint, conflicts, dragX, elapsedMs, newGame, pressHint, redo, restart, setAutoX, tap, undo, type GameState } from '../core/game';
import { FIXED_LEVELS } from '../core/levels';
import { requestLevel } from '../core/levelClient';
import { COLOR_HEX, COLOR_SYMBOLS } from '../core/messages';
import { DIFFICULTY_LABEL } from '../core/progression';
import { load, save, type KV } from '../core/storage';
import type { Puzzle } from '../core/types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const kv: KV = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => localStorage.setItem(k, v),
};

let level = 1;
let symbols = false;
let game: GameState | null = null;
let loading = false;

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function render(): void {
  if (!game) return;
  const g = game;
  const n = g.puzzle.size;
  const board = $('board');
  board.style.setProperty('--n', String(n));
  const bad = conflicts(g);
  const hl = new Set(g.hint && g.hint.level === 1 ? g.hint.data.areaCells : g.hint?.data.kind === 'error' ? g.hint.data.areaCells : []);
  const targets = new Set(g.hint && g.hint.level >= 2 && g.hint.data.kind === 'deduction' ? [...g.hint.data.deduction!.cats, ...g.hint.data.deduction!.xs] : []);
  const errCells = new Set(g.hint?.data.kind === 'error' ? g.hint.data.areaCells : []);
  board.innerHTML = g.cells
    .map((m, i) => {
      const r = Math.floor(i / n);
      const c = i % n;
      const reg = g.puzzle.regions[r][c];
      const edge = (rr: number, cc: number) => (rr < 0 || cc < 0 || rr >= n || cc >= n || g.puzzle.regions[rr][cc] !== reg ? 2 : 0.5);
      const border = `border-width:${edge(r - 1, c)}px ${edge(r, c + 1)}px ${edge(r + 1, c)}px ${edge(r, c - 1)}px;`;
      const cls = ['cell', m.state === 'x' ? 'x' : '', bad.has(i) ? 'bad' : '', errCells.has(i) ? 'err' : hl.has(i) || targets.has(i) ? 'hl' : ''].join(' ');
      const content = m.state === 'cat' ? '🐱' : m.state === 'x' ? '✕' : '';
      return `<div class="${cls}" role="gridcell" data-i="${i}" aria-label="linha ${r + 1}, coluna ${c + 1}" style="background-color:${COLOR_HEX[reg]};${border}">${symbols ? `<span class="sym">${COLOR_SYMBOLS[reg]}</span>` : ''}${content}</div>`;
    })
    .join('');
  $('title').textContent = `Fase ${level} · ${g.puzzle.difficulty ? DIFFICULTY_LABEL[g.puzzle.difficulty] : 'Fixa'} · ${n}×${n}`;
  ($('undo') as HTMLButtonElement).disabled = g.history.length === 0 || g.won;
  ($('redo') as HTMLButtonElement).disabled = g.redo.length === 0 || g.won;
  ($('hintBtn') as HTMLButtonElement).disabled = !canHint(g);
  $('autox').setAttribute('aria-pressed', String(g.autoX));
  $('symbols').setAttribute('aria-pressed', String(symbols));
  const hint = $('hint');
  if (g.hint && !g.won) {
    hint.hidden = false;
    const h = g.hint;
    const text = h.level === 1 ? h.data.areaText : h.data.message;
    hint.innerHTML = `<span>${text}</span>${h.level === 3 && h.data.apply ? '<button id="apply" style="flex:none;padding:0 14px">Aplicar</button>' : ''}`;
  } else hint.hidden = true;
  const ov = $('overlay');
  if (g.won) {
    ov.hidden = false;
    ov.innerHTML = `<div class="card"><h2>🎉 Fase concluída!</h2><div>Tempo: ${fmt(elapsedMs(g))}</div><div>Dicas usadas: ${g.hintsUsed}</div><button id="next">Próxima fase</button></div>`;
  } else ov.hidden = true;
}

function update(next: GameState): void {
  game = next;
  save(kv, level, game, symbols);
  render();
}

async function startLevel(k: number): Promise<void> {
  if (loading) return;
  loading = true;
  level = k;
  $('title').textContent = `Gerando fase ${k}…`;
  const res = await requestLevel(k);
  let puzzle: Puzzle;
  if (res.ok) puzzle = res.puzzle;
  else puzzle = FIXED_LEVELS[(k - 1) % FIXED_LEVELS.length]; // erro tratado: a interface não trava
  loading = false;
  update(newGame(puzzle, { autoX: game?.autoX ?? true }));
}

// --- entrada: toque e arrasto ---
let down: { start: number; path: number[]; dragging: boolean } | null = null;
const cellAt = (x: number, y: number): number | null => {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const i = el?.closest<HTMLElement>('.cell')?.dataset.i;
  return i === undefined ? null : Number(i);
};
const board = $('board');
board.addEventListener('pointerdown', (e) => {
  const i = cellAt(e.clientX, e.clientY);
  if (i !== null && game && !game.won) down = { start: i, path: [i], dragging: false };
});
board.addEventListener('pointermove', (e) => {
  if (!down || !game) return;
  const i = cellAt(e.clientX, e.clientY);
  if (i === null || i === down.path[down.path.length - 1]) return;
  if (game.cells[down.start].state !== 'empty' && !down.dragging) return;
  down.dragging = true;
  down.path.push(i);
});
window.addEventListener('pointerup', () => {
  if (!down || !game) return;
  const d = down;
  down = null;
  update(d.dragging ? dragX(game, d.path) : tap(game, d.start));
});
window.addEventListener('pointercancel', () => (down = null));

document.addEventListener('click', (e) => {
  const id = (e.target as HTMLElement).id;
  if (!game) return;
  if (id === 'undo') update(undo(game));
  else if (id === 'redo') update(redo(game));
  else if (id === 'restart') update(restart(game));
  else if (id === 'hintBtn') update(pressHint(game));
  else if (id === 'apply') update(applyHint(game));
  else if (id === 'autox') update(setAutoX(game, !game.autoX));
  else if (id === 'symbols') { symbols = !symbols; update(game); }
  else if (id === 'next') void startLevel(level + 1);
});

setInterval(() => { if (game && !game.won) $('timer').textContent = fmt(elapsedMs(game)); }, 500);

const saved = load(kv);
if (saved) {
  level = saved.level;
  symbols = saved.symbols;
  game = saved.game;
  render();
} else void startLevel(1);
