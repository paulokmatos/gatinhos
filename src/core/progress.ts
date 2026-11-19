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
  powers: { reveal: number };
  /** melhor tempo (ms) por nível */
  best: Record<string, number>;
}

export const PROGRESS_KEY = 'gatinhos:progress:v1';
export const START_REVEALS = 2;
/** +1 poder "revelar" a cada N níveis concluídos */
export const EARN_EVERY = 3;

export const MAX_NAME = 20;

/** Limpa o nome digitado: sem caracteres de controle, espaços simples, até MAX_NAME. */
export function sanitizeName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return String(raw ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim();
}

export const defaultProgress = (): Progress => ({ version: 1, name: '', completed: 0, maxLevel: 1, powers: { reveal: START_REVEALS }, best: {} });

const nonNeg = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0;

export function loadProgress(kv: KV): Progress {
  try {
    const raw = kv.getItem(PROGRESS_KEY);
    if (!raw) return defaultProgress();
    const p = JSON.parse(raw) as Progress;
    if (p?.version !== 1 || !nonNeg(p.completed) || !Number.isInteger(p.maxLevel) || p.maxLevel < 1 || !nonNeg(p.powers?.reveal)) return defaultProgress();
    const best: Record<string, number> = {};
    for (const [k, v] of Object.entries(p.best ?? {})) if (Number.isFinite(v) && v >= 0) best[k] = v;
    return { version: 1, name: typeof p.name === 'string' ? sanitizeName(p.name) : '', completed: p.completed, maxLevel: p.maxLevel, powers: { reveal: p.powers.reveal }, best };
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
    powers: { reveal: p.powers.reveal + (completed % EARN_EVERY === 0 ? 1 : 0) },
    best: { ...p.best, [String(level)]: prevBest === undefined ? timeMs : Math.min(prevBest, timeMs) },
  };
}

export function setName(p: Progress, raw: string): Progress {
  return { ...p, name: sanitizeName(raw) };
}

export function spendReveal(p: Progress): Progress | null {
  return p.powers.reveal > 0 ? { ...p, powers: { reveal: p.powers.reveal - 1 } } : null;
}
