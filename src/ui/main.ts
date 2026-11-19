import './style.css';
import { applyHint, attemptsLeft, canHint, canReveal, canRedo, canUndo, continueAfterLoss, dragX, elapsedMs, isLost, MAX_ATTEMPTS, newGame, pressHint, redo, restart, revealCat, tap, undo, type GameState } from '../core/game';
import { FIXED_LEVELS } from '../core/levels';
import { requestLevel } from '../core/levelClient';
import { COLOR_HEX, COLOR_NAMES, COLOR_SYMBOLS } from '../core/messages';
import { DIFFICULTY_LABEL, specForLevel } from '../core/progression';
import { jumpTo, loadProgress, MAX_NAME, parseLevelParam, recordCompletion, saveProgress, setName, skipLevel, type Progress } from '../core/progress';
import { load, save, type KV } from '../core/storage';
import type { Puzzle } from '../core/types';
import { setupUpdates } from './pwa';
import { catCheer, catDot, catFace, catHint, catSad } from './cat';

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
let winClosed = false;
let lostClosed = false;
let sheetKind: 'powers' | 'profile' | null = null;
let confirming = false;
/** degraus oferecidos em "Ir para um nível" (começa de onde quiser, ex.: já nos 10×10) */
const JUMPS = [1, 6, 11, 16, 21, 26, 31, 41, 61];
let breakIdx = -1;
let progress: Progress = loadProgress(kv);

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const X_SVG = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" style="display:block"><path d="M6 6 L18 18 M18 6 L6 18" stroke="#FFFFFF" stroke-width="4.6" stroke-linecap="round"/></svg>';
const SPARK_COLORS = ['#FFD23F', '#FFFFFF', '#FF8FB1', '#7FD4FF'];
const SPARK_DIRS = [[0, -26], [19, -19], [26, 0], [19, 19], [0, 26], [-19, 19], [-26, 0], [-19, -19]];
const SPARKLES = SPARK_DIRS.map((d, k) => `<span class="spk" style="--dx:${d[0]}px;--dy:${d[1]}px;background:${SPARK_COLORS[k % 4]};animation-delay:${60 + (k % 2) * 40}ms"></span>`).join('');
const CONFETTI = Array.from({ length: 22 }, (_, q) => `<span class="confetti" style="left:${(q * 37) % 100}%;background:${COLOR_HEX[q % 8]};animation-delay:${(q * 173) % 2400}ms"></span>`).join('');

const PAW = (on: boolean) => `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="${on ? '#26262B' : '#B8C2CC'}"><ellipse cx="12" cy="16" rx="5.2" ry="4.4"/><ellipse cx="5.5" cy="10.5" rx="2.2" ry="2.8"/><ellipse cx="9.5" cy="6.5" rx="2.2" ry="2.9"/><ellipse cx="14.5" cy="6.5" rx="2.2" ry="2.9"/><ellipse cx="18.5" cy="10.5" rx="2.2" ry="2.8"/></g></svg>`;
const CLOSE_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" stroke="#2F6B5E" stroke-width="2.8" stroke-linecap="round"/></svg>';

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
  const area = new Set(h && h.data.kind === 'deduction' ? h.data.areaCells : []);
  const targets = new Set(h && h.level >= 2 && h.data.kind === 'deduction' ? [...h.data.deduction!.cats, ...h.data.deduction!.xs] : []);
  const dedCats = new Set(h && h.level >= 2 && h.data.kind === 'deduction' ? h.data.deduction!.cats : []);
  const errCells = new Set(h?.data.kind === 'error' ? h.data.areaCells : []);

  board.innerHTML = g.cells
    .map((m, i) => {
      const r = Math.floor(i / n);
      const c = i % n;
      const reg = g.puzzle.regions[r][c];
      const fresh = sameBoard && prevStates![i] !== m.state;
      const cls = ['cell', g.armed === i ? 'armed' : '', g.puzzle.givens?.includes(i) ? 'given' : '', errCells.has(i) ? 'err' : targets.has(i) ? 'tgt' : area.has(i) ? 'hl' : ''].join(' ');
      const sym = symbols ? `<span class="sym">${COLOR_SYMBOLS[reg]}</span>` : '';
      const ghost = dedCats.has(i) ? `<span class="layer ghost">${catFace(36)}</span>` : targets.has(i) && m.state === 'empty' ? `<span class="layer ghost">${X_SVG}</span>` : '';
      const x = m.state === 'x' ? `<span class="layer"><span class="xmark ${fresh ? 'x-in' : ''}">${X_SVG}</span></span>` : '';
      const cat = m.state === 'cat' ? `<span class="layer"><span class="${fresh ? 'cat-in' : ''}" style="display:block;width:100%;height:100%;display:flex;align-items:center;justify-content:center">${catFace(36)}</span></span>${fresh ? `<span class="ring"></span>${SPARKLES}` : ''}` : '';
      return `<button class="${cls}" role="gridcell" data-i="${i}" aria-label="Linha ${r + 1}, coluna ${c + 1}: ${stateName[m.state]}" style="background:${COLOR_HEX[reg]}">${sym}${x}${cat}${ghost}</button>`;
    })
    .join('');
  prevStates = g.cells.map((m) => m.state);
  prevPuzzle = g.puzzle;

  const found = new Set<number>();
  g.cells.forEach((m, i) => m.state === 'cat' && found.add(g.puzzle.regions[Math.floor(i / n)][i % n]));
  $('progress').innerHTML = Array.from({ length: n }, (_, k) => `<span class="dot ${found.has(k) ? 'on' : ''}" style="background:${COLOR_HEX[k]}" title="${COLOR_NAMES[k]}: ${found.has(k) ? 'achado' : 'falta'}">${found.has(k) ? catDot(16) : ''}</span>`).join('');
  $('found').textContent = `${found.size} de ${n} gatinhos`;
  const missing = Array.from({ length: n }, (_, k) => k).filter((k) => !found.has(k)).map((k) => COLOR_NAMES[k]);
  $('missing').textContent = missing.length ? `Faltam: ${missing.join(', ')}` : 'Todos achados!';
  const left = attemptsLeft(g);
  $('tries').innerHTML = Array.from({ length: MAX_ATTEMPTS }, (_, k) => `<span class="paw ${k === breakIdx ? 'break' : ''}">${PAW(k < left)}</span>`).join('');
  $('tries').setAttribute('aria-label', `${left} de ${MAX_ATTEMPTS} tentativas restantes`);
  $('tip').hidden = g.won;

  $('title').textContent = `Nível ${level}`;
  $('sub').textContent = `${g.puzzle.difficulty ? DIFFICULTY_LABEL[g.puzzle.difficulty] : 'Fixa'} · ${n}×${n} · ${fmt(elapsedMs(g))}`;
  ($('undo') as HTMLButtonElement).disabled = !canUndo(g);
  ($('redo') as HTMLButtonElement).disabled = !canRedo(g);
  const hintBtn = $('hintBtn') as HTMLButtonElement;
  hintBtn.disabled = !g.won && !canHint(g);
  hintBtn.dataset.mode = g.won ? 'next' : 'hint';
  hintBtn.lastChild!.textContent = g.won ? ' Próximo nível' : ' Dica';
  $('symbols').setAttribute('aria-pressed', String(symbols));

  const hint = $('hint');
  if (h && !g.won) {
    hint.hidden = false;
    const text = h.level === 1 ? h.data.areaText : h.data.message;
    const tag = h.data.kind === 'deduction' ? `<small class="tag">${h.level === 1 ? 'O motivo' : 'O que fazer'}</small>` : '';
    hint.innerHTML = `${catHint(60)}<div class="bubble"><span>${tag}${text}</span>${h.level === 3 && h.data.apply ? '<button id="apply" class="apply">Fazer por mim</button>' : ''}</div>`;
  } else hint.hidden = true;

  $('powerCount').textContent = canReveal(g) ? '1' : '0';
  $('powerCount').classList.toggle('used', !canReveal(g));
  const initial = progress.name ? progress.name.charAt(0).toUpperCase() : '';
  $('avatar').innerHTML = initial ? initial : catFace(26);
  $('profileBtn').setAttribute('aria-label', progress.name ? `Seu nome: ${progress.name}` : 'Escolher seu nome');
  const sheet = $('sheet');
  if (sheetKind === 'powers' && !g.won) {
    const can = canReveal(g);
    sheet.hidden = false;
    sheet.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-label="Poderes"><button id="closeSheet" class="close" aria-label="Fechar">${CLOSE_SVG}</button><h2>Poderes</h2>
      <div class="power-item"><span class="ico"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" fill="currentColor"/></svg></span>
      <span class="txt"><b>Revelar gatinho</b>Mostra um gatinho que ainda não foi achado. Não gasta tentativa.</span>
      <button id="useReveal" class="use" ${can ? '' : 'disabled'}>${can ? 'Usar' : 'Já usado'}</button></div>
      <p class="sheet-note">Você pode usar 1 vez por nível. Níveis concluídos até agora: ${progress.completed}.</p></div>`;
  } else if (sheetKind === 'profile') {
    sheet.hidden = false;
    sheet.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-label="Seu nome"><button id="closeSheet" class="close" aria-label="Fechar">${CLOSE_SVG}</button><h2>Como podemos te chamar?</h2>
      <label class="field"><span>Seu nome (opcional)</span><input id="nameInput" type="text" maxlength="${MAX_NAME}" autocomplete="nickname" autocapitalize="words" value="${progress.name.replace(/"/g, '&quot;')}" placeholder="Ex.: Paulo" /></label>
      <button id="saveName" class="cta">Salvar</button>
      <label class="field"><span>Ir para um nível</span><select id="jumpSel">${JUMPS.map((k) => { const sp = specForLevel(k); return `<option value="${k}" ${k === level ? 'selected' : ''}>Nível ${k} · ${sp.size}×${sp.size} · ${DIFFICULTY_LABEL[sp.difficulty]}</option>`; }).join('')}</select></label>
      <button id="jumpBtn" class="ghost">Começar nesse nível</button>
      <p class="sheet-note">O nome e o progresso ficam só neste aparelho. Versão ${__APP_VERSION__}.</p></div>`;
  } else sheet.hidden = true;

  const ov = $('overlay');
  if (confirming) {
    ov.hidden = false;
    ov.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-label="Recomeçar nível"><h2>Recomeçar nível?</h2><p>O tabuleiro fica limpo e você volta às ${MAX_ATTEMPTS} tentativas. Os gatinhos continuam nos mesmos lugares.</p><button id="confirmRestart" class="cta">Recomeçar</button><button id="cancelRestart" class="ghost">Cancelar</button></div>`;
  } else if (g.won && !winClosed) {
    ov.hidden = false;
    ov.innerHTML = `${CONFETTI}<div class="card" role="dialog" aria-modal="true" aria-label="Nível concluído"><button id="closeWin" class="close" aria-label="Fechar">${CLOSE_SVG}</button><span class="bob">${catCheer(124)}</span><h2>Você achou todos os gatinhos!</h2><p>${progress.name ? `Parabéns, ${progress.name.replace(/[&<>]/g, '')}! ` : ''}Nível ${level} concluído em ${fmt(elapsedMs(g))}</p><p>Dicas: ${g.hintsUsed} · Poderes: ${g.powersUsed} · Tentativas restantes: ${attemptsLeft(g)}</p><button id="next" class="next">Próximo nível</button></div>`;
  } else if (isLost(g) && !lostClosed) {
    ov.hidden = false;
    ov.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-label="Sem tentativas"><button id="closeLost" class="close" aria-label="Fechar">${CLOSE_SVG}</button><span class="bob">${catSad(96)}</span><h2>Sem tentativas</h2><p>Você usou as ${MAX_ATTEMPTS} tentativas deste nível.</p><button id="again" class="cta">Tentar novamente</button><button id="keep" class="ghost">Continuar sem limite</button></div>`;
  } else ov.hidden = true;

  // Perdeu e fechou o aviso: tabuleiro congelado e só duas saídas (tentar de novo ou seguir para o próximo nível)
  const ended = isLost(g) && lostClosed;
  $('app').classList.toggle('ended', ended);
  $('endbar').hidden = !ended;
  $('mainbar').hidden = ended;
  if (ended) { $('hint').hidden = true; $('tip').hidden = true; }
}

function update(next: GameState): void {
  if (next.won && game && !game.won) {
    progress = recordCompletion(progress, level, elapsedMs(next));
    saveProgress(kv, progress);
  }
if (game && next.mistakes > game.mistakes) {
    if (isLost(next)) { breakIdx = attemptsLeft(next); window.setTimeout(() => { breakIdx = -1; if (game) render(); }, 1300); }
    else crack(attemptsLeft(next));
  }
  game = next;
  save(kv, level, game, symbols);
  render();
}

/** Esqueleto animado enquanto o Worker prepara o nível (níveis grandes podem levar alguns segundos). */
function showLoading(k: number): void {
  const spec = specForLevel(k);
  const n = spec.size;
  $('app').classList.add('loading');
  $('app').classList.remove('ended');
  $('endbar').hidden = true;
  $('mainbar').hidden = false;
  $('title').textContent = `Nível ${k}`;
  $('sub').textContent = `${DIFFICULTY_LABEL[spec.difficulty]} · ${n}×${n}`;
  const board = $('board');
  board.style.setProperty('--n', String(n));
  board.classList.toggle('dense', n >= 9);
  board.innerHTML = Array.from({ length: n * n }, (_, i) => `<div class="cell skel" style="animation-delay:${((Math.floor(i / n) + (i % n)) * 70) % 1400}ms"></div>`).join('');
  $('powerCount').textContent = '1';
  $('progress').innerHTML = '';
  $('found').textContent = '';
  $('missing').textContent = '';
  $('tries').innerHTML = '';
  $('tip').hidden = true;
  $('overlay').hidden = true;
  $('sheet').hidden = true;
  const hint = $('hint');
  hint.hidden = false;
  hint.innerHTML = `<span class="bob">${catHint(60)}</span><div class="bubble"><span>Preparando o nível ${k}…${n >= 9 ? ' Tabuleiros grandes demoram um pouquinho.' : ''}</span></div>`;
}

/**
 * Palpite errado: o fundo escurece como num modal e uma patinha grande é rasgada ao meio no centro da tela.
 * Não bloqueia os toques e some sozinho; a patinha do contador também balança.
 */
const PAW_BIG = '<svg viewBox="0 0 24 24" width="150" height="150" aria-hidden="true"><g fill="#1F1F25"><ellipse cx="12" cy="16" rx="5.2" ry="4.4"/><ellipse cx="5.5" cy="10.5" rx="2.2" ry="2.8"/><ellipse cx="9.5" cy="6.5" rx="2.2" ry="2.9"/><ellipse cx="14.5" cy="6.5" rx="2.2" ry="2.9"/><ellipse cx="18.5" cy="10.5" rx="2.2" ry="2.8"/></g></svg>';
let crackTimer = 0;
function crack(left: number): void {
  const el = $('crack');
  const msg = left === 1 ? 'Última tentativa!' : `Restam ${left} tentativas`;
  el.innerHTML = `<div class="tear"><span class="half l">${PAW_BIG}</span><span class="half r">${PAW_BIG}</span></div><strong>Palpite errado</strong><span>${msg}</span>`;
  el.hidden = false;
  el.classList.remove('play');
  void el.offsetWidth; // reinicia a animação se houver dois erros seguidos
  el.classList.add('play');
  breakIdx = left;
  try { navigator.vibrate?.(160); } catch { /* sem vibração */ }
  clearTimeout(crackTimer);
  crackTimer = window.setTimeout(() => { el.hidden = true; breakIdx = -1; if (game) render(); }, 1700);
}

async function startLevel(k: number): Promise<void> {
  if (loading) return;
  loading = true;
  level = k;
  showLoading(k);
  const res = await requestLevel(k);
  // erro tratado: a interface não trava e cai num nível fixo
  const puzzle: Puzzle = res.ok ? res.puzzle : FIXED_LEVELS[(k - 1) % FIXED_LEVELS.length];
  loading = false;
  $('app').classList.remove('loading');
  prevStates = null;
  winClosed = false;
  lostClosed = false;
  sheetKind = null;
  confirming = false;
  update(newGame(puzzle));
}

// --- entrada: toque e arrasto ---
// Arrasto: as marcas ✕ aparecem enquanto o dedo passa (recalculadas a partir do estado do início do arrasto,
// então tudo vira uma única entrada de histórico).
let down: { start: number; path: number[]; dragging: boolean; base: GameState } | null = null;
const cellAt = (x: number, y: number): number | null => {
  const i = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('.cell')?.dataset.i;
  return i === undefined ? null : Number(i);
};
const board = $('board');
board.addEventListener('pointerdown', (e) => {
  const i = cellAt(e.clientX, e.clientY);
  if (i === null || !game || game.won || loading) return;
  down = { start: i, path: [i], dragging: false, base: game };
  // o tabuleiro é redesenhado durante o arrasto: sem a captura, o toque se perderia junto com a casa antiga
  try { board.setPointerCapture(e.pointerId); } catch { /* sem captura: o arrasto ainda funciona com mouse */ }
});
board.addEventListener('pointermove', (e) => {
  if (!down) return;
  const i = cellAt(e.clientX, e.clientY);
  if (i === null || i === down.path[down.path.length - 1]) return;
  if (down.base.cells[down.start].state !== 'empty' && !down.dragging) return;
  down.dragging = true;
  down.path.push(i);
  game = dragX(down.base, down.path);
  render();
});
window.addEventListener('pointerup', () => {
  if (!down || !game) return;
  const d = down;
  down = null;
  if (d.dragging) save(kv, level, game, symbols);
  else update(tap(game, d.start));
});
window.addEventListener('pointercancel', () => {
  if (down?.dragging) { game = down.base; render(); }
  down = null;
});
// teclado: Enter/Espaço num botão da casa gera click sem ponteiro (detail === 0)
board.addEventListener('click', (e) => {
  const i = (e.target as HTMLElement).closest<HTMLElement>('.cell')?.dataset.i;
  if (e.detail === 0 && i !== undefined && game) update(tap(game, Number(i)));
});

document.addEventListener('click', (e) => {
  if (loading) return;
  const id = (e.target as HTMLElement).closest('button')?.id;
  if (!game || !id) return;
  if (id === 'undo') update(undo(game));
  else if (id === 'redo') update(redo(game));
  else if (id === 'restart') { confirming = true; render(); }
  else if (id === 'cancelRestart') { confirming = false; render(); }
  else if (id === 'confirmRestart' || id === 'again' || id === 'again2') { confirming = false; winClosed = false; lostClosed = false; update(restart(game)); }
  else if (id === 'keep') { lostClosed = false; update(continueAfterLoss(game)); }
  else if (id === 'closeLost') { lostClosed = true; render(); }
  else if (id === 'skip') { progress = skipLevel(progress, level); saveProgress(kv, progress); void startLevel(level + 1); }
  else if (id === 'closeWin') { winClosed = true; render(); }
  else if (id === 'hintBtn') { if (game.won) void startLevel(level + 1); else update(pressHint(game)); }
  else if (id === 'apply') update(applyHint(game));
  else if (id === 'symbols') { symbols = !symbols; update(game); }
  else if (id === 'next') void startLevel(level + 1);
  else if (id === 'powersBtn') { sheetKind = 'powers'; render(); }
  else if (id === 'profileBtn') { sheetKind = 'profile'; render(); (document.getElementById('nameInput') as HTMLInputElement | null)?.focus(); }
  else if (id === 'closeSheet') { sheetKind = null; render(); }
  else if (id === 'jumpBtn') {
    const k = Number((document.getElementById('jumpSel') as HTMLSelectElement).value);
    progress = jumpTo(progress, k);
    saveProgress(kv, progress);
    sheetKind = null;
    void startLevel(k);
  }
  else if (id === 'saveName') {
    progress = setName(progress, (document.getElementById('nameInput') as HTMLInputElement).value);
    saveProgress(kv, progress);
    sheetKind = null;
    render();
  }
  else if (id === 'useReveal') {
    const next = revealCat(game);
    if (next !== game) {
      sheetKind = null;
      update(next);
    }
  }
});

setInterval(() => {
  if (game && !game.won && !loading) $('sub').textContent = `${game.puzzle.difficulty ? DIFFICULTY_LABEL[game.puzzle.difficulty] : 'Fixa'} · ${game.puzzle.size}×${game.puzzle.size} · ${fmt(elapsedMs(game))}`;
}, 1000);

setupUpdates();

// ?nivel=26 abre direto nesse nível (ex.: https://…/gatinhos/?nivel=26 para já cair nos 10×10)
const wanted = parseLevelParam(location.search);
if (wanted !== null) {
  progress = jumpTo(progress, wanted);
  saveProgress(kv, progress);
  history.replaceState(null, '', location.pathname);
  void startLevel(wanted);
} else {
  const saved = load(kv);
  if (saved) {
    level = saved.level;
    symbols = saved.symbols;
    game = saved.game;
    winClosed = false;
    lostClosed = false;
    render();
  } else void startLevel(progress.maxLevel);
}
