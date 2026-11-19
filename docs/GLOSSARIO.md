# Glossário de termos do jogo (para revisão)

Objetivo: um vocabulário único, simples e consistente em toda a interface, mensagens, README e código visível ao jogador.
**Status: aprovado e aplicado** (interface, README, canvas e imagens). A coluna "Proposta" é o termo em uso.

Regras gerais: tratamento neutro e direto ("você"), frases curtas, verbos no imperativo nos botões, sempre **gatinho** (nunca "gato"), sempre contar linhas/colunas a partir de 1.

## Estrutura do jogo

| Conceito | Hoje na interface | Proposta | Evitar | Observação |
|---|---|---|---|---|
| Uma partida num tabuleiro específico | "quadro", "fase", "nível" (misturados) | **Nível** ("Nível 12") | quadro, fase, stage | "Quadro" sai de vez. Cabeçalho: "Nível 12". |
| Passar ao seguinte | "Próxima fase" | **Próximo nível** | próxima fase | |
| Recomeçar o mesmo nível | "Reiniciar o quadro" | **Recomeçar nível** | reiniciar, resetar | Ícone ⟲ com rótulo acessível "Recomeçar nível". |
| A grade onde se joga | "tabuleiro" | **Tabuleiro** | quadro, grade, campo | Tamanho: "5×5". |
| Cada quadradinho | "casa" | **Casa** | célula, quadradinho | "linha 3, coluna 5". |
| Área colorida | "região", "cor" | **Cor** (ex.: "a cor Roxa") | região, zona | Regra do jogo fala "uma por cor". |
| O que se procura | "gatinho" | **Gatinho** | gato, pet | |
| Grau do nível | Fácil / Médio / Difícil / Expert | **Fácil · Médio · Difícil · Expert** | — | Manter. |
| Grupo de níveis com o mesmo tamanho | "lote" (só no código/README) | **Etapa** (ex.: "Etapa 7×7") — só se aparecer na tela | lote, batch | Hoje não aparece para o jogador. |

## Ações do jogador

| Conceito | Hoje | Proposta | Evitar | Observação |
|---|---|---|---|---|
| Marca de "aqui não tem gatinho" | "X", "✕", "rascunho" | **Marca ✕** ("marcar", "desmarcar") | risco, rabisco, X automático | Explicar uma vez: "Marcas ✕ são suas anotações." |
| Palpite de que há um gatinho | "dois toques", "tentativa" | **Palpite**: dois toques seguidos numa casa | arriscar, chutar | Ver "Tentativas". |
| Voltar / repetir marcações | Desfazer / Refazer | **Desfazer · Refazer** | — | Só mexem em marcações ✕. |
| Passar o dedo marcando | "arrasto" | **Arrastar para marcar** | pincel | |
| Mostrar cores por símbolo | "símbolos nas cores" | **Símbolos** (botão ◇, rótulo "Mostrar símbolos nas cores") | modo daltônico, acessibilidade | Mais neutro e curto. |

## Tentativas e resultado

| Conceito | Hoje | Proposta | Evitar | Observação |
|---|---|---|---|---|
| Limite de erros | "3 tentativas por quadro" | **3 tentativas por nível** (🐾🐾🐾) | vidas, chances vs. tentativas misturados | Escolha única: "tentativas". |
| Perder uma tentativa | "errar o palpite" | **Palpite errado** | falha, erro | Texto: "Aqui não tem gatinho. Você perdeu 1 tentativa." |
| Fim das tentativas | "Acabaram as tentativas" | **Sem tentativas** | game over | Corpo: "Você usou as 3 tentativas deste nível." |
| Ação principal | "Reiniciar o quadro" | **Tentar novamente** (no aviso de sem tentativas); **Recomeçar nível** no cabeçalho | — | Botão em destaque. Depois de fechar o aviso: **Tentar novamente** · **Próximo nível**. |
| Ação secundária | "Continuar mesmo assim" | **Continuar sem limite** | continuar mesmo assim | Deixa claro que não há mais penalidade. |
| Vitória | "Você achou todos!" | **Você achou todos os gatinhos!** | — | Mostra tempo, dicas, poderes usados. |
| Fechar o aviso de vitória | ✕ | **Fechar** | — | Depois, o botão vira "Próximo nível". |

| Escolher como ser chamado | — | **Seu nome** (opcional, só neste aparelho) | login, conta, perfil | Círculo ao lado de Símbolos. |
| Confirmar recomeço | — | **Recomeçar nível?** — "Recomeçar" / "Cancelar" | tem certeza?, OK | Não regera o tabuleiro. |
| Começar de outro nível | — | **Ir para um nível** / **Começar nesse nível** (e `?nivel=N`) | pular, fast-forward | Fica na folha do seu nome. |

## Ajuda

| Conceito | Hoje | Proposta | Evitar | Observação |
|---|---|---|---|---|
| Ajuda que explica | "Dica" | **Dica** | pista, ajuda | |
| Passo 1 da dica | "premissa" | **O motivo** | premissa | Casas do motivo em verde. |
| Passo 2 da dica | "conclusão" | **O que fazer** | conclusão | Casas a marcar em laranja. |
| Passo 3 | "Aplicar" | **Fazer por mim** | aplicar | Só este passo conta como dica usada. |
| Poderes | "Poderes" | **Poderes** | itens, boosts, power-ups | |
| Primeiro poder | "Revelar um gatinho" | **Revelar gatinho** | — | Não gasta tentativa. |

| Gatinho que já vem na tela | "gatinho inicial", "given" | **Gatinho de brinde** | given, inicial | Contorno tracejado. |

## Mensagens do tabuleiro

| Situação | Proposta |
|---|---|
| Progresso | "2 de 5 gatinhos" · "Faltam: Ipê, Céu" |
| Marca ✕ sobre um gatinho verdadeiro | "Alguma marca ✕ está no lugar errado." |
| Carregando | "Preparando o nível 12…" (em vez de "Gerando") |
| Erro ao preparar nível | "Não deu para preparar este nível. Tente de novo." |
| Dica de erro | "Tem algo errado aqui." |

## Nomes das cores do tabuleiro (simplificados)

Menta · Amarelo · Coral · Roxo · Azul · Verde · Marrom · Rosa · Laranja · Cinza (antes: Aguapé, Ipê, Pitanga, Jabuticaba, Céu, Capim, Barro claro, Flor, Tangerina, Neblina). "Tangerina" fica reservado à cor de ação da interface.

## Perguntas respondidas (todas aceitas como propostas)

1. **Nível** como termo único (sem "fase")? Concordo em trocar também "Próxima fase" → "Próximo nível".
2. **Tentativas** (🐾) ou **vidas**? Proposto: tentativas.
3. **Fazer por mim** no lugar de "Aplicar" — ok, ou prefere manter "Aplicar"?
4. **Gatinho de brinde**: nome divertido ok, ou prefere "gatinho dado"/"gatinho inicial"?
5. **Marca ✕** em vez de "X" nas mensagens ao jogador?
