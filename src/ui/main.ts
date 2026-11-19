import './style.css';
import { applyHint, canHint, dragX, elapsedMs, newGame, pressHint, redo, restart, tap, undo, type GameState } from '../core/game';
import { findErrors } from '../core/hint';
import { FIXED_LEVELS } from '../core/levels';
import { requestLevel } from '../core/levelClient';
import { COLOR_HEX, COLOR_SYMBOLS } from '../core/messages';
import { DIFFICULTY_LABEL } from '../core/progression';
import { load, save, type KV } from '../core/storage';
import type { Puzzle } from '../core/types';
import { catCheer, catFace, catHint } from './cat';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const kv: KV = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => localStorage.setItem(k, v),
};

let level = 1;
let symbols = false;
let game: GameState | null = null;
let loading = false;
let prevStates: string[] | null = null;
let prevPuzzle: Puzzle | null = null;

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const X_SVG = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" style="display:block"><path d="M6 6 L18 18 M18 6 L6 18" stroke="#FFFFFF" stroke-width="4.6" stroke-linecap="round"/></svg>';
const SPARK_COLORS = ['#FFD23F', '#FFFFFF', '#FF8FB1', '#7FD4FF'];
const SPARK_DIRS = [[0, -26], [19, -19], [26, 0], [19, 19], [0, 26], [-19, 19], [-26, 0], [-19, -19]];
const SPARKLES = SPARK_DIRS.map((d, k) => `<span class="spk" style="--dx:${d[0]}px;--dy:${d[1]}px;background:${SPARK_COLORS[k % 4]};animation-delay:${60 + (k % 2) * 40}ms"></span>`).join('');
const CONFETTI = Array.from({ length: 22 }, (_, q) => `<span class="confetti" style="left:${(q * 37) % 100}%;background:${COLOR_HEX[q % 8]};animation-delay:${(q * 173) % 2400}ms"></span>`).join('');

const stateName = { empty: 'vazia', x: 'marcada com X', cat: 'gatinho' } as const;

function render(): void {
  if (!game) return;
  const g = game;
  const n = g.puzzle.size;
  const sameBoard = prevPuzzle === g.puzzle && prevStates !== null;
  const board = $('board');
  board.style.setProperty('--n', String(n));
  board.classList.toggle('dense', n >= 9);

  const h = g.hint;
  const area = new Set(h?.level === 1 && h.data.kind === 'deduction' ? h.data.areaCells : []);
  const targets = new Set(h && h.level >= 2 && h.data.kind === 'deduction' ? [...h.data.deduction!.cats, ...h.data.deduction!.xs] : []);
  const errCells = new Set(h?.data.kind === 'error' ? h.data.areaCells : []);

  board.innerHTML = g.cells
    .map((m, i) => {
      const r = Math.floor(i / n);
      const c = i % n;
      const reg = g.puzzle.regions[r][c];
      const fresh = sameBoard && prevStates![i] !== m.state;
      const cls = ['cell', errCells.has(i) ? 'err' : area.has(i) || targets.has(i) ? 'hl' : ''].join(' ');
      const sym = symbols ? `<span class="sym">${COLOR_SYMBOLS[reg]}</span>` : '';
      const x = m.state === 'x' ? `<span class="layer"><span class="xmark ${fresh ? 'x-in' : ''}">${X_SVG}</span></span>` : '';
      const cat = m.state === 'cat' ? `<span class="layer"><span class="${fresh ? 'cat-in' : ''}" style="display:block;width:100%;height:100%;display:flex;align-items:center;justify-content:center">${catFace(36)}</span></span>${fresh ? `<span class="ring"></span>${SPARKLES}` : ''}` : '';
      return `<button class="${cls}" role="gridcell" data-i="${i}" aria-label="Linha ${r + 1}, coluna ${c + 1}: ${stateName[m.state]}" style="background:${COLOR_HEX[reg]}">${sym}${x}${cat}</button>`;
    })
    .join('');
  prevStates = g.cells.map((m) => m.state);
  prevPuzzle = g.puzzle;

  const found = new Set<number>();
  g.cells.forEach((m, i) => m.state === 'cat' && found.add(g.puzzle.regions[Math.floor(i / n)][i % n]));
  $('progress').innerHTML = Array.from({ length: n }, (_, k) => `<span class="dot ${found.has(k) ? 'on' : ''}" style="background:${COLOR_HEX[k]}"></span>`).join('');
  $('found').textContent = `${found.size} de ${n} gatinhos`;
  $('warn').hidden = findErrors(g.puzzle, g.cells).length === 0 || g.won;

  $('title').textContent = `Nível ${level}`;
  $('sub').textContent = `${g.puzzle.difficulty ? DIFFICULTY_LABEL[g.puzzle.difficulty] : 'Fixa'} · ${n}×${n} · ${fmt(elapsedMs(g))}`;
  ($('undo') as HTMLButtonElement).disabled = g.history.length === 0 || g.won;
  ($('redo') as HTMLButtonElement).disabled = g.redo.length === 0 || g.won;
  ($('hintBtn') as HTMLButtonElement).disabled = !canHint(g);
  $('symbols').setAttribute('aria-pressed', String(symbols));

  const hint = $('hint');
  if (h && !g.won) {
    hint.hidden = false;
    const text = h.level === 1 ? h.data.areaText : h.data.message;
    hint.innerHTML = `${catHint(60)}<div class="bubble"><span>${text}</span>${h.level === 3 && h.data.apply ? '<button id="apply" class="apply">Aplicar</button>' : ''}</div>`;
  } else hint.hidden = true;

  const ov = $('overlay');
  if (g.won) {
    ov.hidden = false;
    ov.innerHTML = `${CONFETTI}<div class="card"><span class="bob">${catCheer(124)}</span><h2>Você achou todos!</h2><p>Nível ${level} concluído em ${fmt(elapsedMs(g))}</p><p>Dicas usadas: ${g.hintsUsed}</p><button id="next" class="next">Próxima fase</button></div>`;
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
  $('title').textContent = `Gerando nível ${k}…`;
  const res = await requestLevel(k);
  // erro tratado: a interface não trava e cai numa fase fixa
  const puzzle: Puzzle = res.ok ? res.puzzle : FIXED_LEVELS[(k - 1) % FIXED_LEVELS.length];
  loading = false;
  prevStates = null;
  update(newGame(puzzle));
}

// --- entrada: toque e arrasto ---
let down: { start: number; path: number[]; dragging: boolean } | null = null;
const cellAt = (x: number, y: number): number | null => {
  const i = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('.cell')?.dataset.i;
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
// teclado: Enter/Espaço num botão da casa gera click sem ponteiro (detail === 0)
board.addEventListener('click', (e) => {
  const i = (e.target as HTMLElement).closest<HTMLElement>('.cell')?.dataset.i;
  if (e.detail === 0 && i !== undefined && game) update(tap(game, Number(i)));
});

document.addEventListener('click', (e) => {
  const id = (e.target as HTMLElement).closest('button')?.id;
  if (!game || !id) return;
  if (id === 'undo') update(undo(game));
  else if (id === 'redo') update(redo(game));
  else if (id === 'restart') update(restart(game));
  else if (id === 'hintBtn') update(pressHint(game));
  else if (id === 'apply') update(applyHint(game));
  else if (id === 'symbols') { symbols = !symbols; update(game); }
  else if (id === 'next') void startLevel(level + 1);
});

setInterval(() => {
  if (game && !game.won) $('sub').textContent = `${game.puzzle.difficulty ? DIFFICULTY_LABEL[game.puzzle.difficulty] : 'Fixa'} · ${game.puzzle.size}×${game.puzzle.size} · ${fmt(elapsedMs(game))}`;
}, 1000);

const saved = load(kv);
if (saved) {
  level = saved.level;
  symbols = saved.symbols;
  game = saved.game;
  render();
} else void startLevel(1);
