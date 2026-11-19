/// <reference lib="webworker" />
import { generateLevel } from './progression';

self.onmessage = (e: MessageEvent<{ level: number }>) => {
  self.postMessage({ level: e.data.level, result: generateLevel(e.data.level) });
};
