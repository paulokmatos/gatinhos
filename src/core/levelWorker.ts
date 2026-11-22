/// <reference lib="webworker" />
import { generateLevel } from './progression';

self.onmessage = (e: MessageEvent<{ level: number; tier?: number }>) => {
  self.postMessage({ level: e.data.level, result: generateLevel(e.data.level, 3000, e.data.tier) });
};
