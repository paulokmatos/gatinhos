# Estratégia: dificuldade adaptativa e retenção (proposta)

Status: **implementada** a nota do jogador, a onda e o elástico (seção 2.8 de `REGRAS.md`); estrelas, sequência diária, Nível do dia e o botão "?" seguem **propostas**. Os números abaixo são pontos de partida a calibrar, não regras
(a tabela atual "5×5 até o nível 5… 10×10 depois do 30" também é arbitrária e deve ser substituída).

## 1. Objetivo

Manter o jogador em **estado de fluxo**: ~70–80% dos níveis vencidos sem sofrimento, com um desafio de vez em
quando e sempre um "só mais um". Hoje o nível K tem tamanho/dificuldade fixos por K; todo mundo recebe a mesma
curva, e quem é rápido enjoa e quem é iniciante trava.

## 2. O que medir (tudo local, em `Progress`; sem servidor)

Por nível concluído ou abandonado:

| Sinal | Já existe? | Leitura |
|---|---|---|
| tempo vs. tempo esperado (`par`) | `elapsedMs`, `best` | rápido = fácil demais |
| palpites errados (`mistakes`) | sim | muitos = difícil demais |
| dicas / poder usados (`hintsUsed`, `powersUsed`) | sim | dependência |
| recomeços, "Continuar sem limite", "pular" | parcial | frustração |
| abandono (saiu sem vencer) | não | frustração forte |
| dias sem jogar | não | aquecer na volta |

`par` = tempo de referência por (tamanho, dificuldade), obtido por simulação (ver §6), não chutado.

## 3. Nota do jogador (rating) e nota do nível

- **Nível**: `d` contínuo = combinação de tamanho N, técnica mais difícil exigida (T1…T7) e **quantos passos**
  do `humanSolve` precisam de técnica difícil. Já temos o relatório do solver humano; falta só expor a contagem.
- **Jogador**: `r` na mesma escala, começa baixo (ex.: 5×5 fácil).
- Depois de cada nível, `desempenho p ∈ [0,1]`:
  `p = 1` sem erro, sem dica, tempo ≤ par; desce com erros (−0,25 cada), dica (−0,15), poder (−0,1), tempo > 2×par
  (−0,2); `p = 0` se perdeu/abandonou.
- Atualização estilo Elo: `r += K · (p − esperado(r − d))`, com `esperado` logístico. `K` maior nos primeiros
  níveis (calibra rápido) e menor depois.

## 4. Escolha do próximo nível: onda, não rampa

`d_alvo = r + δ`, onde `δ` segue um ciclo curto (serrote):

1. 2–3 níveis **confortáveis** (`δ ≈ −0,5…0`) → sensação de domínio;
2. 1 nível **desafio** (`δ ≈ +0,7`) → orgulho ao vencer;
3. 1 **respiro** logo depois do desafio, se ele foi sofrido (`p < 0,5`).

Regras de elástico (rubber-band), por cima da onda:

- 2 derrotas/abandonos seguidos → próximo `δ = −1` (nunca duas frustrações seguidas);
- 3 vitórias perfeitas e rápidas seguidas → pula o ciclo, `δ = +1`;
- volta após ≥ 3 dias → 1 nível de aquecimento 1 degrau abaixo;
- **nunca terminar uma sessão numa derrota**: se o jogador perdeu, o botão principal oferece um nível mais
  leve ("Que tal um mais tranquilo?"), sem dizer que está facilitando.
- Tabuleiro 10×10 não vira "sempre": é só um ponto da escala; alterna com 8×8/9×9 conforme a onda.

## 5. Ganchos de retenção (baratos, sem servidor)

- **Estrelas por nível** (★ vencer, ★★ sem dica, ★★★ sem erro e rápido): dá motivo para rejogar.
- **Sequência diária** + **Nível do dia** (seed = data; igual para todos, compartilhável por texto).
- **Melhor tempo** já existe: mostrar "−12 s vs. seu recorde" ao vencer.
- **Pequenos marcos** ("10 níveis sem dica") com a patinha/mascote reagindo; nada de loja nem moeda.
- Respeitar bateria/atenção: sem notificações; o gancho é o "próximo nível" já pré-carregado.

## 6. Como encaixa no código

- `core/difficulty.ts` (puro, testável): `levelScore(report, size)`, `performance(result)`,
  `updateRating(r, d, p)`, `nextTarget(history)`. **Testes primeiro** (regra do projeto).
- `progression.ts`: `specForLevel(level)` passa a `specForTarget(d_alvo, contador)`; a seed vira função do
  **contador de níveis jogados** (continua determinística e igual em qualquer aparelho para o mesmo histórico).
  O `?nivel=N` e "Ir para um nível" passam a significar "começar com este rating".
- `progress.ts`: `rating`, últimos ~10 resultados, último dia jogado (nova `version`, com migração do v1).
- Gerador: já filtra por dificuldade (`accept`); trocar a regra "dificuldade == faixa" por "`d` do nível dentro
  de ±0,3 do alvo". O pré-carregamento do próximo nível (já feito) passa a usar o alvo previsto (antes de
  saber se o atual vai ser vencido: prever com `δ` neutro e descartar se o resultado mudar muito).
- **Calibração offline (uma vez):** script que gera ~200 tabuleiros por (N, técnica), roda `humanSolve` e
  mede passos/técnicas; daí saem a escala de `d` e o `par`. Ajustar constantes com dados, não no chute.

## 7. Riscos

- Adaptar demais deixa o jogo "sem progressão visível": manter um número de nível crescente e estrelas.
- Rating no `localStorage` se perde ao trocar de aparelho (aceito: o projeto já é local).
- Jogador esperto pode "perder de propósito" para baixar a dificuldade: aceitável, é jogo solo.
- Mudar a regra "nível K = mesmo tabuleiro para todos" tira a comparação entre jogadores; o Nível do dia
  devolve isso.

---

# Botão "?" (ajuda) para quem só abre o jogo

Ordem de recomendação, do mais barato ao mais completo; a 1 e a 2 juntas resolvem quase tudo.

1. **Botão "?" na barra superior → folha "Como jogar"** (reaproveita a folha do perfil/poderes): 3 cartões
   curtos com mini-tabuleiro 4×4 desenhado (1 gatinho por cor / linha e coluna / sem se encostar), mais a linha
   "toque = ✕ · toque duplo = palpite · arraste = vários ✕". Texto do README, sem números internos.
2. **Primeira abertura = nível-tutorial guiado** (4×4 ou 5×5 com solução óbvia): balões um de cada vez
   ("toque duas vezes rápido neste quadrado") e o "?" piscando uma vez no final. Quem já sabe pula
   ("Já sei jogar").
3. **Dicas contextuais, uma vez só**: a 1ª vez que erra um palpite, explica as tentativas; a 1ª vez que
   arrasta, mostra o ✕ ao vivo; a 1ª vez que trava (~60 s parado), sugere a **Dica**.
4. **Mini-animação em loop** na folha do "?" mostrando o duplo toque (3 s, só CSS, sem vídeo).
5. Depois: exemplo interativo "tente você" dentro da folha (tabuleiro 3×3 vivo reaproveitando `core/game`).

Detalhes: o "?" precisa de `aria-label="Como jogar"`, abrir com Esc para fechar, e a primeira abertura
grava em `Progress` (`seenTutorial`) para não repetir. Atualizar glossário (Ajuda / Como jogar) e canvas.
