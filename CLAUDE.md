# Gatinhos — guia para agentes

Jogo de lógica (um gatinho por linha, coluna e cor; sem se encostar), PWA em TypeScript + Vite. Português do Brasil em tudo que o jogador vê.

**Leia primeiro: `docs/REGRAS.md`** (regras decididas, o que fica fora dos testes, design, fluxo, pendências) e `docs/GLOSSARIO.md` (vocabulário obrigatório).

## Princípios

1. **Testes são a fonte de verdade das regras do jogo.** Mudou uma regra? Altere/crie o teste primeiro. O que não vale cobrir com teste está em `docs/REGRAS.md`.
2. **Canvas de design = fonte visual** (link em `docs/REGRAS.md`, seção 4). Código e canvas se espelham. O dono edita o canvas à mão: **releia os arquivos logo antes de publicar**. Ignore o quadro "Rascunho pessoal".
3. **Vocabulário**: Nível, tabuleiro, casa, cor, gatinho, marca ✕, palpite, tentativas, Dica, Poderes. Nunca "quadro", "fase", "gato", "reiniciar", "aplicar" (há teste que barra).
4. A marca ✕ do jogador **nunca** é automática (única exceção: o ✕ vermelho travado do palpite errado); dicas só usam o estado visível, nunca a solução; 2 toques seguidos = 1 palpite; 3 tentativas por nível; desfazer só mexe em marcas ✕ (gatinho nunca é desfeito); recomeçar pede confirmação e não regera o nível; a solução **não** é guardada no localStorage.

## Comandos

```sh
npm install
npm test            # Vitest (≈10 s)
npm run typecheck
npm run test:e2e    # Playwright (local; Chrome do sistema; roda o build)
npm run build       # typecheck + build (gera o service worker)
npm run dev         # http://localhost:5173/gatinhos/
```

## Fluxo

- Branch + Pull Request; **merge só quando o dono pedir**. CI: typecheck+testes → build → deploy Pages (só `main`); testes puláveis com `[skip tests]`.
- Mudou interface? Atualize canvas, README e os prints em `docs/` (veja `docs/REGRAS.md`, seção 5).
- **Não escreva comentários em prosa no código.** O código tem de se ler sozinho: nomes claros, funções pequenas por tarefa. O porquê vai nos testes (nomes dos `it`), em `docs/REGRAS.md` ou na mensagem do commit.
- Não esqueça: `src/core/` é lógica pura e testável; `src/ui/` é a interface.
