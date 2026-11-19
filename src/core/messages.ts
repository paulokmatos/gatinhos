import type { Deduction } from './human';

export const COLOR_NAMES = ['Aguapé', 'Ipê', 'Pitanga', 'Jabuticaba', 'Céu', 'Capim', 'Barro claro', 'Flor', 'Tangerina', 'Neblina'];
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

/** Texto da dica (nível 2). Linhas e colunas aparecem a partir de 1. Máximo de 2 frases. */
export function hintMessage(d: Deduction, size: number): string {
  const cell = (i: number) => ({ r: Math.floor(i / size), c: i % size });
  switch (d.tech) {
    case 1: {
      const { r, c } = cell(d.cats[0]);
      return `Só sobrou uma casa livre para ${unitName(d.unit!)}: linha ${r + 1}, coluna ${c + 1}. Coloque um gato nela.`;
    }
    case 2:
      return `A ${colors(d.regions)} só cabe na ${lineLoc(d.lineKind, d.lines)} — risque as outras casas dessa ${lineWord(d.lineKind, 1)}.`;
    case 3:
      return `Na ${lineLoc(d.lineKind, d.lines)} só há casas da ${colors(d.regions)} — risque as outras casas dessa cor.`;
    case 4: {
      const { r, c } = cell(d.xs[0]);
      return `Um gato na linha ${r + 1}, coluna ${c + 1} deixaria ${unitName(d.unit!)} sem nenhuma casa — risque essa casa.`;
    }
    case 5:
      return `As ${colors(d.regions)} só cabem nas ${lineLoc(d.lineKind, d.lines)} — risque as outras casas ${d.lineKind === 'row' ? 'dessas linhas' : 'dessas colunas'}.`;
    case 6:
      return `As ${lineLoc(d.lineKind, d.lines)} só têm casas das ${colors(d.regions)} — risque as outras casas dessas cores.`;
    case 7: {
      const { r, c } = cell(d.xs[0]);
      return `Se houvesse um gato na linha ${r + 1}, coluna ${c + 1}, o tabuleiro travaria. Risque essa casa.`;
    }
  }
}

/** Texto do nível 1 ("olhe estas 2 colunas"). */
export function areaMessage(d: Deduction): string {
  if (d.tech === 1 && d.unit) return d.unit.kind === 'region' ? `Olhe a cor ${color(d.unit.index)}.` : `Olhe a ${d.unit.kind === 'row' ? 'linha' : 'coluna'} ${d.unit.index + 1}.`;
  if (d.tech === 2 || d.tech === 5) return `Olhe ${d.lines.length > 1 ? 'estas ' + d.lines.length : 'a'} ${lineWord(d.lineKind, d.lines.length)}${d.lines.length === 1 ? ' ' + nums(d.lines) : ''}.`;
  if (d.tech === 3 || d.tech === 6) return `Olhe ${d.regions.length > 1 ? 'estas ' + d.regions.length + ' cores' : 'a cor ' + color(d.regions[0])}.`;
  return 'Olhe a região destacada.';
}
