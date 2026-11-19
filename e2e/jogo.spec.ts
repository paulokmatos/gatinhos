import { expect, test } from '@playwright/test';
import { dragCells, expectState, nonCat, openGame, solution, tapCell } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('limpo')) { localStorage.clear(); sessionStorage.setItem('limpo', '1'); } });
  await openGame(page);
});

test('toque: casa vazia vira ✕ e outro toque tira o ✕ na hora (bug do desmarcar)', async ({ page }) => {
  const { n, cats } = await solution(page);
  const a = nonCat(n, cats);
  await tapCell(page, a);
  await expectState(page, a, 'marcada com X');
  await page.waitForTimeout(600);
  await tapCell(page, a);
  await expectState(page, a, 'vazia');
  await tapCell(page, nonCat(n, cats, 1)); // casa diferente: independente
  await tapCell(page, a);
  await expectState(page, a, 'marcada com X');
});

test('duplo toque numa casa com gatinho revela o gatinho sem gastar tentativa', async ({ page }) => {
  const { cats } = await solution(page);
  await tapCell(page, cats[0], 2);
  await expectState(page, cats[0], 'gatinho');
  await expect(page.locator('#tries')).toHaveAttribute('aria-label', '3 de 3 tentativas restantes');
});

test('duplo toque numa casa sem gatinho gasta 1 tentativa e mostra o aviso', async ({ page }) => {
  const { n, cats } = await solution(page);
  const a = nonCat(n, cats);
  await tapCell(page, a, 2);
  await expectState(page, a, 'vazia');
  await expect(page.locator('#tries')).toHaveAttribute('aria-label', '2 de 3 tentativas restantes');
  await expect(page.locator('#crack')).toBeVisible();
});

test('2 toques lentos não são palpite', async ({ page }) => {
  const { n, cats } = await solution(page);
  const a = nonCat(n, cats);
  await tapCell(page, a);
  await page.waitForTimeout(700);
  await tapCell(page, a);
  await expect(page.locator('#tries')).toHaveAttribute('aria-label', '3 de 3 tentativas restantes');
});

test('CA03 arrastar marca ✕ nas casas e um único Desfazer limpa tudo', async ({ page }) => {
  const { n, cats } = await solution(page);
  const row = Array.from({ length: n }, (_, c) => c).filter((i) => !cats.includes(i)).slice(0, 3) // 3 casas da 1ª linha;
  await dragCells(page, row);
  for (const i of row) await expectState(page, i, 'marcada com X');
  await page.locator('#undo').click();
  for (const i of row) await expectState(page, i, 'vazia');
});

test('CA17 dica em 3 passos: motivo, o que fazer, fazer por mim', async ({ page }) => {
  await page.locator('#hintBtn').click();
  await expect(page.locator('#hint')).toBeVisible();
  await page.locator('#hintBtn').click();
  await page.locator('#hintBtn').click();
  await expect(page.locator('#apply')).toBeVisible();
});

test('recomeçar pede confirmação e mantém o mesmo tabuleiro', async ({ page }) => {
  const { n, cats } = await solution(page);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('gatinhos:v1')!).puzzle.regions);
  const a = nonCat(n, cats);
  await tapCell(page, a);
  await page.locator('#restart').click();
  await expect(page.locator('#cancelRestart')).toBeVisible(); // pede confirmação; nada mudou ainda
  await expectState(page, a, 'marcada com X');
  await page.locator('#confirmRestart').click();
  await expectState(page, a, 'vazia');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gatinhos:v1')!).puzzle.regions)).toEqual(before);
});

test('CA23 recarregar a página retoma a partida (marcas e tentativas)', async ({ page }) => {
  const { n, cats } = await solution(page);
  const a = nonCat(n, cats);
  await tapCell(page, a);
  await page.reload();
  await page.waitForSelector('#board .cell:not(.skel)');
  await expectState(page, a, 'marcada com X');
});

test('CA25 (emulado) jogar um nível inteiro até a vitória', async ({ page }) => {
  const { cats } = await solution(page);
  for (const c of cats) await tapCell(page, c, 2);
  await expect(page.locator('#hintBtn')).toHaveAttribute('data-mode', 'next');
  await expect(page.locator('#found')).toHaveText(`${cats.length} de ${cats.length} gatinhos`);
});
