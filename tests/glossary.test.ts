import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** O glossário (docs/GLOSSARIO.md) vira regra executável: termos proibidos não podem aparecer em texto para o jogador. */
const FILES = ['index.html', 'src/ui/main.ts', 'src/ui/cat.ts', 'src/core/messages.ts', 'src/manifest.ts'];
const BANNED: [RegExp, string][] = [
  [/\bquadro\b/i, '"quadro" (use nível / tabuleiro)'],
  [/\bfases?\b/i, '"fase" (use nível)'],
  [/\bgatos?\b/i, '"gato" (use gatinho)'],
  [/\breiniciar\b/i, '"reiniciar" (use recomeçar nível / tentar novamente)'],
  [/\baplicar\b/i, '"Aplicar" (use Fazer por mim)'],
  [/\bregi(ão|ões)\b/i, '"região" (use cor)'],
  [/\brisque|\brascunho\b/i, '"risque/rascunho" (use marque ✕ / anotação)'],
  [/\bcargas?\b/i, '"carga" (poder tem 1 uso por nível)'],
];
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/<!--[\s\S]*?-->/g, '');

describe('glossário: termos proibidos fora da interface', () => {
  for (const file of FILES)
    it(file, () => {
      const text = stripComments(readFileSync(file, 'utf8'));
      for (const [re, why] of BANNED) expect(text, `${file} usa ${why}`).not.toMatch(re);
    });
  it('nomes das cores do tabuleiro são os simples do glossário', async () => {
    const { COLOR_NAMES } = await import('../src/core/messages');
    expect(COLOR_NAMES).toEqual(['Menta', 'Amarelo', 'Coral', 'Roxo', 'Azul', 'Verde', 'Marrom', 'Rosa', 'Laranja', 'Cinza']);
  });
});
