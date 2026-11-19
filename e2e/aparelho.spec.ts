import { expect, test } from '@playwright/test';
import { openGame } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('limpo')) { localStorage.clear(); sessionStorage.setItem('limpo', '1'); } });
});

test('CA24 (emulado) 10×10 cabe na tela sem rolagem e com casas tocáveis', async ({ page }) => {
  await openGame(page, '?nivel=26');
  expect(await page.locator('#board .cell').count()).toBe(100);
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight }));
  expect(m.sw).toBeLessThanOrEqual(m.cw);
  expect(m.sh).toBeLessThanOrEqual(m.ch);
  const box = (await page.locator('#board .cell').first().boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(24);
});

test('CA09 (neste computador) gerar um 10×10 não trava a tela (nenhuma tarefa longa ≥ 100 ms)', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __long: number[] }).__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (window as unknown as { __long: number[] }).__long.push(e.duration))).observe({ entryTypes: ['longtask'] });
  });
  await page.goto('?nivel=30');
  await page.waitForSelector('#board .cell:not(.skel)', { timeout: 40_000 });
  const long = await page.evaluate(() => (window as unknown as { __long: number[] }).__long);
  expect(Math.max(0, ...long)).toBeLessThan(100);
});

test('CA22 (emulado) offline: depois de aberto uma vez, o jogo abre sem rede', async ({ page, context }) => {
  await openGame(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.waitForTimeout(1500); // deixa o cache de arquivos terminar
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('#board .cell:not(.skel)', { timeout: 30_000 });
  await context.setOffline(false);
});

test('CA21 (parte do Chrome) o app é instalável: manifest válido e service worker', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  await openGame(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.enable');
  const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors')) as { installabilityErrors: { errorId: string }[] };
  expect(installabilityErrors.map((e) => e.errorId).filter((id) => id !== 'in-incognito')).toEqual([]); // o contexto de teste é anônimo
});
