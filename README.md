<h1 align="center">🐱 Gatinhos</h1>

<p align="center">
  Um quebra-cabeça zen de lógica: ache o gatinho escondido em cada cor.<br/>
  <a href="https://paulokmatos.github.io/gatinhos/"><b>▶ Jogar agora</b></a> · funciona no navegador e instala como app (PWA)
</p>

<p align="center">
  <img src="docs/celular-jogo.png" alt="Gatinhos no celular" width="210" />
  &nbsp;&nbsp;
  <img src="docs/desktop-jogo.png" alt="Gatinhos no computador" width="400" />
</p>

## 📜 Como jogar

O tabuleiro é dividido em **regiões coloridas**. Seu objetivo é encontrar **um gatinho em cada região**, seguindo três regras:

| | Regra |
|---|---|
| 🎨 | **1 gatinho por cor** |
| ↔️↕️ | **1 gatinho por linha e por coluna** |
| 🚫 | **Gatinhos não podem se encostar**, nem na diagonal |

Quando todos os gatinhos forem achados, a fase termina. 🎉

### Controles

- **Toque numa casa** para riscar ✕ (o ✕ é só o *seu rascunho*: nunca é marcado sozinho e pode estar errado).
- **Dois toques seguidos na mesma casa = 1 tentativa:** se há um gatinho ali, ele aparece 🐱; se não há, você perde uma tentativa. Ter ou não um ✕ na casa não importa; só importa haver mesmo um gatinho.
- **Arraste** o dedo (ou o mouse) sobre casas vazias para riscar várias de uma vez.
- **Desfazer / Refazer** voltam e repetem só as suas marcações ✕. Gatinho é escrita do jogo: depois de revelado, nunca é desfeito.
- **Reiniciar** (canto superior esquerdo) limpa o quadro.
- **◇** (canto superior direito) liga os **símbolos nas cores**, para ajudar quem tem dificuldade de distinguir tons.

### Tentativas e progresso

- Você tem **3 tentativas por quadro** (as patinhas ao lado do quadro). Gasta uma quando você faz o duplo toque numa casa que **não** tem gatinho. Desfazer não devolve tentativa.
- Acima do tabuleiro, as bolinhas mostram **quais cores já têm gatinho** (com o gatinho dentro) e quais ainda faltam, com os nomes ao lado.
- Se alguma marcação ✕ estiver sobre um gatinho de verdade, aparece um aviso — sem dizer onde.

<p align="center">
  <img src="docs/celular-tentativas.png" alt="Fim das tentativas" width="170" />
  &nbsp;&nbsp;
  <img src="docs/celular-vitoria.png" alt="Fase concluída" width="170" />
</p>

- **Acabaram as tentativas?** Você escolhe: **Reiniciar o quadro** (recomendado) ou **Continuar mesmo assim**.
- **Venceu?** Um aviso mostra seu tempo e as dicas usadas, com botão para a **próxima fase** (e um ✕ para fechar e admirar o tabuleiro).

### ✨ Poderes

O botão **✨** (com o número de cargas) abre os poderes. Por enquanto existe o **Revelar um gatinho**: mostra um gatinho que ainda não foi achado (o da cor mais difícil de deduzir), sem gastar tentativa, e dá para desfazer. Você começa com 2 cargas e ganha **+1 a cada 3 níveis concluídos**.

### 📈 Progressão

- **Níveis 1–30:** lotes de 5 níveis, o tabuleiro cresce de **5×5 → 6×6 → … → 10×10** (Fácil → Médio → Difícil).
- **Depois do 30:** a maioria é **10×10** (todo nível múltiplo de 5 é 9×9, um respiro) e, **a cada 10 níveis, o patamar sobe**: 31–40 Difícil, 41+ Expert.
- **Gatinho inicial:** nas dificuldades altas (a partir do nível 21) a fase pode já começar com 1 gatinho revelado, marcado com contorno tracejado. A chance é 50% nos níveis 21–30, 60% nos 31–40 e cai 15 pontos a cada 10 níveis, chegando a 0 no nível 71 — um empurrãozinho que some conforme você evolui. O sorteio é fixo por nível (igual em qualquer aparelho).
- **Salvo no seu aparelho:** o nível atual, a partida em andamento, as cargas de poder, níveis concluídos e melhores tempos ficam no `localStorage` do navegador. Cada aparelho tem o próprio progresso, sem conta nem servidor.

## 💡 3 dicas para começar

1. **Comece pelas cores pequenas.** Uma região com poucas casas (ou numa linha/coluna só) tem pouquíssimos lugares possíveis para o gatinho.
2. **Gatinho achado = risque ao redor.** Na linha, na coluna, na mesma cor e nas 8 casas vizinhas, ninguém mais pode ficar. Marque ✕ nelas para limpar a cabeça.
3. **Travou? Peça a Dica.** Toque em **Dica** até 3 vezes: o 1º mostra *o porquê* (as casas da premissa ficam destacadas, ex.: "a cor Jabuticaba só tem casas na linha 5"), o 2º diz *o que fazer* (as casas a riscar ficam em laranja) e o 3º oferece **Aplicar**. Só aplicar conta como dica usada.

---

## 🛠️ Desenvolvimento

```sh
npm install
npm run dev        # servidor local
npm test           # testes automatizados (Vitest)
npm run build      # typecheck + build de produção
```

**Estrutura**

- `src/core/` — lógica pura e testável: modelo, validador, gerador (seed + unicidade), solver de força bruta, solver humano T1–T7, dicas, estado do jogo (desfazer, tentativas), persistência.
- `src/ui/` — interface (toque/arrasto, dicas, modais). A geração das fases roda num Web Worker.
- `tests/` — testes por marco; cada um cita o critério de aceite (CA01–CA25).
- `docs/` — imagens deste README.

**Técnicas do solver humano** (usadas na dificuldade e nas dicas): T1 único · T2 cor numa linha/coluna · T3 linha/coluna numa cor · T4 vizinhança · T5 N cores em N linhas/colunas · T6 N linhas/colunas em N cores · T7 hipótese de profundidade 1.
Dificuldade: T1–T2 Fácil, T3–T4 Médio, T5–T6 Difícil, T7 Expert.

**CI** (`.github/workflows/ci.yml`): typecheck + testes → build → deploy no GitHub Pages (só em `main`).
Para **pular os testes**: `[skip tests]` na mensagem do commit, label `skip-tests` no PR, ou "Pular os testes" ao disparar manualmente. O build e o deploy continuam rodando.

**Pendente no aparelho:** CA03 (arrasto), CA09 (long task), CA17, CA21–CA25 (instalação, offline, safe areas, roteiro no iPhone).
