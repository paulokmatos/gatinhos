import type { LevelResult } from './progression';

let worker: Worker | null = null;

/** Gera a fase no Web Worker (a interface continua respondendo). Erros viram resultado tratado. */
export function requestLevel(level: number): Promise<LevelResult> {
  return new Promise((resolve) => {
    try {
      worker ??= new Worker(new URL('./levelWorker.ts', import.meta.url), { type: 'module' });
      const w = worker;
      const timer = setTimeout(() => {
        w.terminate();
        worker = null;
        resolve({ ok: false, error: 'tempo esgotado ao gerar a fase' });
      }, 30000);
      w.onmessage = (e: MessageEvent<{ level: number; result: LevelResult }>) => {
        clearTimeout(timer);
        resolve(e.data.result);
      };
      w.onerror = () => {
        clearTimeout(timer);
        resolve({ ok: false, error: 'falha no worker do gerador' });
      };
      w.postMessage({ level });
    } catch (err) {
      resolve({ ok: false, error: String(err) });
    }
  });
}
