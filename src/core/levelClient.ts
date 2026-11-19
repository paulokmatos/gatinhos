import type { LevelResult } from './progression';
import { specForLevel } from './progression';

interface Job { level: number; promise: Promise<LevelResult>; cancel: () => void }
let current: Job | null = null; // no máximo 1 geração em andamento/pronta (a atual ou o pré-carregamento)

/** Gera o nível num Web Worker próprio (a interface continua respondendo). Erros viram resultado tratado. */
function generate(level: number): Job {
  let cancel = () => {};
  const promise = new Promise<LevelResult>((resolve) => {
    try {
      const w = new Worker(new URL('./levelWorker.ts', import.meta.url), { type: 'module' });
      const done = (r: LevelResult) => { clearTimeout(timer); w.terminate(); resolve(r); };
      const timer = setTimeout(() => done({ ok: false, error: 'tempo esgotado ao gerar a fase' }), 30000);
      cancel = () => done({ ok: false, error: 'cancelado' });
      w.onmessage = (e: MessageEvent<{ level: number; result: LevelResult }>) => done(e.data.result);
      w.onerror = () => done({ ok: false, error: 'falha no worker do gerador' });
      w.postMessage({ level });
    } catch (err) {
      resolve({ ok: false, error: String(err) });
    }
  });
  return { level, promise, cancel: () => cancel() };
}

export function requestLevel(level: number): Promise<LevelResult> {
  if (current?.level === level) {
    const j = current;
    current = null;
    // pré-carregamento que falhou não condena o nível: tenta de novo, já valendo
    return j.promise.then((r) => (r.ok ? r : generate(level).promise));
  }
  current?.cancel(); // pré-carregamento de outro nível não serve mais
  current = null;
  return generate(level).promise;
}

/** Começa a gerar o próximo nível em segundo plano, só se for 10×10 (o lento) e só 1 por vez. */
export function prefetchLevel(level: number): void {
  if (current || specForLevel(level).size < 10) return;
  current = generate(level);
}
