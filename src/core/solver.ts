/**
 * Solver de força bruta: conta soluções (parando em `limit`).
 * Um gato por linha, coluna e região; gatos não se encostam (inclui diagonal).
 */
export function countSolutions(regions: number[][], limit = 2): number {
  const n = regions.length;
  let count = 0;
  const cols: number[] = [];
  const dfs = (r: number, usedCols: number, usedRegions: number): void => {
    if (count >= limit) return;
    if (r === n) {
      count++;
      return;
    }
    for (let c = 0; c < n; c++) {
      if (usedCols & (1 << c)) continue;
      const reg = regions[r][c];
      if (usedRegions & (1 << reg)) continue;
      if (r > 0 && Math.abs(cols[r - 1] - c) <= 1) continue;
      cols[r] = c;
      dfs(r + 1, usedCols | (1 << c), usedRegions | (1 << reg));
      if (count >= limit) return;
    }
  };
  dfs(0, 0, 0);
  return count;
}

/** Primeira solução encontrada (ou null). */
export function solveFirst(regions: number[][]): number[] | null {
  const n = regions.length;
  const cols: number[] = [];
  const dfs = (r: number, usedCols: number, usedRegions: number): boolean => {
    if (r === n) return true;
    for (let c = 0; c < n; c++) {
      if (usedCols & (1 << c)) continue;
      const reg = regions[r][c];
      if (usedRegions & (1 << reg)) continue;
      if (r > 0 && Math.abs(cols[r - 1] - c) <= 1) continue;
      cols[r] = c;
      if (dfs(r + 1, usedCols | (1 << c), usedRegions | (1 << reg))) return true;
    }
    return false;
  };
  return dfs(0, 0, 0) ? cols.slice() : null;
}

/** Enumera até `limit` soluções. */
export function listSolutions(regions: number[][], limit = 2): number[][] {
  const n = regions.length;
  const out: number[][] = [];
  const cols: number[] = [];
  const dfs = (r: number, usedCols: number, usedRegions: number): void => {
    if (out.length >= limit) return;
    if (r === n) {
      out.push(cols.slice());
      return;
    }
    for (let c = 0; c < n; c++) {
      if (usedCols & (1 << c)) continue;
      const reg = regions[r][c];
      if (usedRegions & (1 << reg)) continue;
      if (r > 0 && Math.abs(cols[r - 1] - c) <= 1) continue;
      cols[r] = c;
      dfs(r + 1, usedCols | (1 << c), usedRegions | (1 << reg));
    }
  };
  dfs(0, 0, 0);
  return out;
}
