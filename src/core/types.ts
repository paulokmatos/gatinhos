/** Coordenadas internas partem de 0; a interface mostra a partir de 1. */
export interface Puzzle {
  size: number;
  /** regions[r][c] = índice da cor (0..N-1) */
  regions: number[][];
  /** solution[r] = coluna do gato na linha r */
  solution: number[];
  difficulty?: Difficulty;
}

export type Difficulty = 'facil' | 'medio' | 'dificil' | 'expert';
export type CellState = 'empty' | 'x' | 'cat';

export interface Mark {
  state: CellState;
}

export interface Pos {
  r: number;
  c: number;
}

export type ConflictType = 'row' | 'col' | 'color' | 'adjacent';
export interface Conflict {
  type: ConflictType;
  cells: Pos[];
}
