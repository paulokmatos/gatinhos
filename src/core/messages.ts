import type { Deduction } from './human';

export const COLOR_NAMES = ['Menta', 'Amarelo', 'Coral', 'Roxo', 'Azul', 'Verde', 'Marrom', 'Rosa', 'Laranja', 'Cinza'];
export const COLOR_HEX = ['#8FD3C1', '#F4C542', '#F28C7A', '#9B7BD1', '#8EC5F0', '#A9D86E', '#D9A273', '#F2A7C8', '#F7A955', '#B8C2CC'];
export const COLOR_SYMBOLS = ['●', '▲', '■', '◆', '★', '✚', '⬟', '♥', '☾', '✿'];

const color = (i: number) => COLOR_NAMES[i];
const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1]);
const nums = (xs: number[]) => list(xs.map((x) => String(x + 1)));
const lineWord = (kind: 'row' | 'col' | undefined, n: number) => (kind === 'row' ? (n > 1 ? 'linhas' : 'linha') : n > 1 ? 'colunas' : 'coluna');
const lineLoc = (kind: 'row' | 'col' | undefined, lines: number[]) => `${lineWord(kind, lines.length)} ${nums(lines)}`;
const colors = (rs: number[]) => (rs.length > 1 ? 'cores ' : 'cor ') + list(rs.map(color));

function unitName(u: { kind: 'row' | 'col' | 'region'; index: number }): string {
  return u.kind === 'region' ? `a cor ${color(u.index)}` : `a ${u.kind === 'row' ? 'linha' : 'coluna'} ${u.index + 1}`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Nível 1 da dica: a PREMISSA, o fato que o jogador pode conferir no tabuleiro (casas destacadas).
 * Linhas e colunas aparecem a partir de 1.
 */
export function areaMessage(d: Deduction, size = 0): string {
  const cell = (i: number) => ({ r: Math.floor(i / size) + 1, c: (i % size) + 1 });
  switch (d.tech) {
    case 0: {
      const { r, c } = cell(d.premise[0]);
      return `O gatinho ${color(d.regions[0])} (linha ${r}, coluna ${c}) já descarta estas casas: elas estão na mesma linha, coluna ou cor, ou encostam nele.`;
    }
    case 1:
      return `${cap(unitName(d.unit!))} só tem uma casa livre.`;
    case 2:
      return `A ${colors(d.regions)} só tem casas livres na ${lineLoc(d.lineKind, d.lines)}.`;
    case 3:
      return `Na ${lineLoc(d.lineKind, d.lines)}, as únicas casas livres são da ${colors(d.regions)}.`;
    case 4: {
      const { r, c } = cell(d.xs[0]);
      return `Imagine um gatinho na linha ${r}, coluna ${c}: ${unitName(d.unit!)} ficaria sem nenhuma casa livre.`;
    }
    case 5:
      return `As ${colors(d.regions)} só têm casas livres nas ${lineLoc(d.lineKind, d.lines)}.`;
    case 6:
      return `Nas ${lineLoc(d.lineKind, d.lines)}, as únicas casas livres são das ${colors(d.regions)}.`;
    case 7: {
      const { r, c } = cell(d.xs[0]);
      return `Imagine um gatinho na linha ${r}, coluna ${c}: ao riscar o que ele elimina, o tabuleiro trava.`;
    }
  }
}

/** Nível 2: premissa + conclusão (o porquê e o que fazer). Máximo de 2 frases. */
export function hintMessage(d: Deduction, size: number): string {
  const premise = areaMessage(d, size);
  switch (d.tech) {
    case 0:
      return `${premise} Marque ✕ nelas.`;
    case 1: {
      const r = Math.floor(d.cats[0] / size) + 1;
      const c = (d.cats[0] % size) + 1;
      return `${premise} Ela fica na linha ${r}, coluna ${c} (cor ${color(d.regions[0])}): coloque um gatinho lá.`;
    }
    case 2:
      return `${premise} Então o gatinho da ${colors(d.regions)} está nela, e as outras casas dessa ${lineWord(d.lineKind, 1)} (que não são dessa cor) não podem ter gatinho: marque ✕ nelas.`;
    case 3:
      return `${premise} Então o gatinho dessa ${lineWord(d.lineKind, 1)} é da ${colors(d.regions)}, e as casas dessa cor fora dela não podem ter gatinho: marque ✕ nelas.`;
    case 4:
    case 7:
      return `${premise} Então não pode haver gatinho ali: marque ✕ nessa casa.`;
    case 5:
      return `${premise} Elas ocupam essas ${lineWord(d.lineKind, 2)}, então as casas de outras cores nelas não podem ter gatinho: marque ✕ nelas.`;
    case 6:
      return `${premise} Os gatinhos dessas ${lineWord(d.lineKind, 2)} serão dessas cores, então as outras casas dessas cores, fora delas, não podem ter gatinho: marque ✕ nelas.`;
  }
}
