import type { LevelResult } from './progression';
import { TIERS } from './difficulty';

interface Job { level: number; tier: number | undefined; promise: Promise<LevelResult>; cancel: () => void }
let current: Job | null = null; // no máximo 1 geração em andamento/pronta (a atual ou o pré-carregamento)

/** Gera o nível num Web Worker próprio (a interface continua respondendo). Erros viram resultado tratado. */
function generate(level: number, tier?: number): Job {
  let cancel = () => {};
  const promise = new Promise<LevelResult>((resolve) => {
    try {
      const w = new Worker(new URL('./levelWorker.ts', import.meta.url), { type: 'module' });
      const done = (r: LevelResult) => { clearTimeout(timer); w.terminate(); resolve(r); };
      const timer = setTimeout(() => done({ ok: false, error: 'tempo esgotado ao gerar a fase' }), 30000);
      cancel = () => done({ ok: false, error: 'cancelado' });
      w.onmessage = (e: MessageEvent<{ level: number; result: LevelResult }>) => done(e.data.result);
      w.onerror = () => done({ ok: false, error: 'falha no worker do gerador' });
      w.postMessage({ level, tier });
    } catch (err) {
      resolve({ ok: false, error: String(err) });
    }
  });
  return { level, tier, promise, cancel: () => cancel() };
}

export function requestLevel(level: number, tier?: number): Promise<LevelResult> {
  if (current?.level === level && current.tier === tier) {
    const j = current;
    current = null;
    // pré-carregamento que falhou não condena o nível: tenta de novo, já valendo
    return j.promise.then((r) => (r.ok ? r : generate(level, tier).promise));
  }
  current?.cancel(); // pré-carregamento de outro nível não serve mais
  current = null;
  return generate(level, tier).promise;
}

/** Gera o próximo nível em segundo plano, só se for 10×10 (o lento) e só 1 por vez; troca o pré-carregado se o degrau mudou. */
export function prefetchLevel(level: number, tier: number): void {
  if (TIERS[tier].size < 10 || (current?.level === level && current.tier === tier)) return;
  current?.cancel();
  current = generate(level, tier);
}
