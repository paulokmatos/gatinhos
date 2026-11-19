import type { Puzzle } from './types';

/** 3 fases fixas do marco M1 (coordenadas internas a partir de 0). */
export const FIXED_LEVELS: Puzzle[] = [
  {
    size: 5,
    regions: [
      [0, 0, 1, 1, 1],
      [0, 0, 1, 1, 1],
      [4, 2, 4, 1, 1],
      [4, 4, 4, 3, 3],
      [4, 4, 4, 4, 4],
    ],
    solution: [0, 3, 1, 4, 2],
  },
  {
    size: 6,
    regions: [
      [1, 4, 0, 2, 2, 2],
      [1, 4, 0, 2, 2, 2],
      [4, 4, 4, 2, 2, 2],
      [4, 4, 2, 2, 3, 3],
      [4, 4, 2, 2, 2, 3],
      [4, 4, 4, 2, 5, 3],
    ],
    solution: [2, 0, 3, 5, 1, 4],
  },
  {
    size: 7,
    regions: [
      [1, 1, 1, 2, 2, 2, 0],
      [1, 3, 3, 2, 2, 2, 2],
      [3, 3, 3, 5, 2, 4, 4],
      [5, 5, 3, 5, 4, 4, 4],
      [5, 5, 5, 5, 4, 4, 4],
      [5, 5, 6, 6, 4, 4, 4],
      [5, 6, 6, 6, 6, 6, 4],
    ],
    solution: [6, 0, 4, 2, 5, 1, 3],
  },
];
