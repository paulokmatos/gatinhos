/**
 * Solver de força bruta: enumera soluções (parando em `limit`).
 * Um gato por linha, coluna e região; gatos não se encostam (inclui diagonal).
 */
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

export const countSolutions = (regions: number[][], limit = 2): number => listSolutions(regions, limit).length;

export const solveFirst = (regions: number[][]): number[] | null => listSolutions(regions, 1)[0] ?? null;
