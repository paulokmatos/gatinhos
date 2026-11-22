/** Coordenadas internas partem de 0; a interface mostra a partir de 1. */
export interface Puzzle {
  size: number;
  /** regions[r][c] = índice da cor (0..N-1) */
  regions: number[][];
  /** solution[r] = coluna do gato na linha r */
  solution: number[];
  difficulty?: Difficulty;
  /** gatinhos já revelados no início (dificuldades altas); índices row-major */
  givens?: number[];
}

export type Difficulty = 'facil' | 'medio' | 'dificil' | 'expert';
/** 'bad' = ✕ vermelho automático de palpite errado: fato confirmado, travado (só some ao recomeçar) */
export type CellState = 'empty' | 'x' | 'cat' | 'bad';

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
