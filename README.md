# Gatinhos 🐱

Puzzle de lógica (um gatinho por linha, coluna e cor; gatos não se encostam, nem na diagonal). PWA em TypeScript + Vite.

**Jogar:** https://paulokmatos.github.io/gatinhos/

## Desenvolvimento

```sh
npm install
npm run dev        # servidor local
npm test           # testes automatizados (Vitest)
npm run build      # typecheck + build de produção
```

## Regras de interação

- Toque: vazio → X → gatinho. O **X é só rascunho do jogador** (pode estar errado) e **nunca é marcado automaticamente**.
- O gatinho só aparece na casa que é dele; depois de revelado, tocar de novo não o remove (use Desfazer). Tocar num X de casa sem gatinho apenas limpa o X.
- Acima do tabuleiro: progresso (cores com gatinho achado) e um aviso quando alguma marcação ✕ está errada.

## Estrutura

- `src/core/` — lógica pura e testável: modelo, validador, gerador (seed + unicidade), solver de força bruta, solver humano T1–T7, dicas, estado de jogo (undo/redo/auto-X), persistência.
- `src/ui/` — interface (toque/arrasto, dicas, vitória). A geração roda num Web Worker.
- `tests/` — um arquivo por marco; cada teste cita o critério de aceite (CA01–CA25).

## Técnicas do solver humano

T1 único · T2 cor numa linha/coluna · T3 linha/coluna numa cor · T4 vizinhança (gato zeraria uma unidade) · T5 N cores em N linhas/colunas · T6 N linhas/colunas em N cores · T7 hipótese de profundidade 1.
Dificuldade: T1–T2 Fácil, T3–T4 Médio, T5–T6 Difícil, T7 Expert.

## CI

`.github/workflows/ci.yml`: typecheck + testes → build → deploy no GitHub Pages (só em `main`).
Para **pular os testes**: `[skip tests]` na mensagem do commit, label `skip-tests` no PR, ou "Pular os testes" ao disparar manualmente.
O build e o deploy continuam rodando mesmo com os testes pulados.

## Critérios manuais pendentes

CA03 (arrasto no toque), CA05 (vermelho/vitória), CA09 (long task < 100 ms), CA17, CA21 (instalação), CA22 (offline), CA23 (matar o app), CA24, CA25 — roteiro no aparelho.
