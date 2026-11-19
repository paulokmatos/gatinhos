import { expect, type Page } from '@playwright/test';
import { solveFirst } from '../src/core/solver';

/** Abre o jogo limpo e espera o tabuleiro aparecer. */
export async function openGame(page: Page, query = ''): Promise<void> {
  await page.goto(query);
  await page.waitForSelector('#board .cell:not(.skel)', { timeout: 30_000 });
}

/** Casas do gatinho (índice linha*n+coluna), recalculadas das cores salvas (a solução não é guardada). */
export async function solution(page: Page): Promise<{ n: number; cats: number[] }> {
  const raw = await page.evaluate(() => localStorage.getItem('gatinhos:v1'));
  const { puzzle } = JSON.parse(raw!) as { puzzle: { size: number; regions: number[][] } };
  const sol = solveFirst(puzzle.regions)!;
  return { n: puzzle.size, cats: sol.map((c, r) => r * puzzle.size + c) };
}

const hasTouch = (page: Page) => (page.viewportSize()?.width ?? 1000) < 600; // projeto "celular"

async function center(page: Page, i: number) {
  const box = (await page.locator(`.cell[data-i="${i}"]`).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** `times` toques seguidos na casa (rápidos, como um duplo toque). Toque de verdade no celular, mouse no desktop. */
export async function tapCell(page: Page, i: number, times = 1): Promise<void> {
  const { x, y } = await center(page, i);
  for (let k = 0; k < times; k++) await (hasTouch(page) ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
}

/** Arrasta o dedo (CDP, toque real) ou o mouse pelas casas, na ordem dada. */
export async function dragCells(page: Page, cells: number[]): Promise<void> {
  const pts = await Promise.all(cells.map((i) => center(page, i)));
  if (hasTouch(page)) {
    const cdp = await page.context().newCDPSession(page);
    const send = (type: string, p?: { x: number; y: number }) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
    await send('touchStart', pts[0]);
    for (const p of pts.slice(1)) await send('touchMove', p);
    await send('touchEnd');
  } else {
    await page.mouse.move(pts[0].x, pts[0].y);
    await page.mouse.down();
    for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y, { steps: 4 });
    await page.mouse.up();
  }
}

export const state = (page: Page, i: number) => page.locator(`.cell[data-i="${i}"]`).getAttribute('aria-label').then((s) => s!.split(': ')[1]);
export const expectState = async (page: Page, i: number, want: 'vazia' | 'marcada com X' | 'gatinho') => expect(await state(page, i)).toBe(want);

/** Uma casa sem gatinho que não encosta em nenhum (qualquer casa fora das casas da solução). */
export function nonCat(n: number, cats: number[], skip = 0): number {
  return Array.from({ length: n * n }, (_, i) => i).filter((i) => !cats.includes(i))[skip];
}
