import { MAX_TIER, performance, tierOf, updateRating, type Result } from './difficulty';
import { specForLevel } from './progression';
import type { KV } from './storage';

/** Progresso do jogador, guardado só neste aparelho (localStorage). */
export interface Progress {
  version: 1;
  /** nome escolhido pelo jogador (opcional, só neste aparelho) */
  name: string;
  /** níveis concluídos */
  completed: number;
  /** nível em que o jogador está / parou */
  maxLevel: number;
  /** melhor tempo (ms) por nível */
  best: Record<string, number>;
  /** nota do jogador na escala de dificuldade (TIERS), fracionária */
  rating: number;
  /** desempenho (0–1) dos últimos níveis, do mais antigo ao mais recente */
  recent: number[];
  /** última vez que jogou (ms desde 1970; 0 = nunca) */
  lastPlayed: number;
}

/** Nota inicial/ao pular para um nível: o degrau que a curva antiga dava a esse nível. */
export function ratingForLevel(level: number): number {
  const sp = specForLevel(level);
  return Math.max(0, tierOf(sp.size, sp.difficulty));
}

export const PROGRESS_KEY = 'gatinhos:progress:v1';

export const MAX_NAME = 20;

/** Limpa o nome digitado: sem caracteres de controle, espaços simples, até MAX_NAME. */
export function sanitizeName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return String(raw ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();
}

export const defaultProgress = (): Progress => ({ version: 1, name: '', completed: 0, maxLevel: 1, best: {}, rating: 0, recent: [], lastPlayed: 0 });

const nonNeg = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0;

export function loadProgress(kv: KV): Progress {
  try {
    const raw = kv.getItem(PROGRESS_KEY);
    if (!raw) return defaultProgress();
    const p = JSON.parse(raw) as Progress;
    if (p?.version !== 1 || !nonNeg(p.completed) || !Number.isInteger(p.maxLevel) || p.maxLevel < 1) return defaultProgress();
    const best: Record<string, number> = {};
    for (const [k, v] of Object.entries(p.best ?? {})) if (Number.isFinite(v) && v >= 0) best[k] = v;
    const rating = Number.isFinite(p.rating) ? Math.min(MAX_TIER, Math.max(0, p.rating)) : ratingForLevel(p.maxLevel); // progresso antigo: parte da curva antiga
    const recent = Array.isArray(p.recent) ? p.recent.filter((x) => Number.isFinite(x) && x >= 0 && x <= 1).slice(-5) : [];
    const lastPlayed = Number.isFinite(p.lastPlayed) && p.lastPlayed > 0 ? p.lastPlayed : 0;
    return { version: 1, name: typeof p.name === 'string' ? sanitizeName(p.name) : '', completed: p.completed, maxLevel: p.maxLevel, best, rating, recent, lastPlayed };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(kv: KV, p: Progress): void {
  try {
    kv.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* sem armazenamento: o jogo segue, só não lembra */
  }
}

/** Registra um nível concluído (chamar uma única vez por vitória). */
export function recordCompletion(p: Progress, level: number, timeMs: number): Progress {
  const completed = p.completed + 1;
  const prevBest = p.best[String(level)];
  return {
    ...p,
    completed,
    maxLevel: Math.max(p.maxLevel, level + 1),
    best: { ...p.best, [String(level)]: prevBest === undefined ? timeMs : Math.min(prevBest, timeMs) },
  };
}

/** Registra o desfecho de um nível (vitória ou derrota): atualiza a nota e o histórico recente. */
export function recordResult(p: Progress, r: Result, now = Date.now()): Progress {
  const perf = performance(r);
  return { ...p, rating: updateRating(p.rating, perf), recent: [...p.recent, perf].slice(-5), lastPlayed: now };
}

export function setName(p: Progress, raw: string): Progress {
  return { ...p, name: sanitizeName(raw) };
}

/** Pular para o próximo nível sem concluir este (depois de perder): só avança o ponto de retomada. */
export function skipLevel(p: Progress, level: number): Progress {
  return { ...p, maxLevel: Math.max(p.maxLevel, level + 1) };
}

/** Ir direto para um nível (ex.: começar já nos 10×10): o ponto de retomada passa a ser esse nível. */
export function jumpTo(p: Progress, level: number): Progress {
  const maxLevel = Math.max(1, Math.floor(level));
  return { ...p, maxLevel, rating: ratingForLevel(maxLevel), recent: [] };
}

/** Lê `?nivel=26` do endereço (1–999). Qualquer outra coisa é ignorada. */
export function parseLevelParam(search: string): number | null {
  const raw = new URLSearchParams(search).get('nivel');
  if (raw === null || !/^\d{1,3}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 ? n : null;
}
