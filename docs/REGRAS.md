# Regras do Gatinhos (para pessoas e agentes de sessões futuras)

## 0. Como ler este documento

1. **A fonte de verdade das regras do jogo são os testes** (`tests/`). Se uma regra está coberta por teste, **o teste manda**; este arquivo só aponta onde olhar. Ao mudar uma regra: mude o teste primeiro, depois o código.
2. **Este arquivo cobre o que não vale (ou não dá) para cobrir com teste**: comportamento de interface, visual, animações, vocabulário de texto livre, fluxo de trabalho, decisões de produto e pendências.
3. O **canvas de design** é a fonte visual (cores, mascote, telas, animações). O código **espelha** o canvas e o canvas espelha o código: mudou um, atualize o outro (seção 4).
4. Vocabulário: `docs/GLOSSARIO.md`. Um teste (`tests/glossary.test.ts`) barra termos proibidos na interface.

## 1. Onde cada regra mora (mapa de testes)

| Assunto | Teste | O que garante |
|---|---|---|
| Modelo, validador de conflitos, vitória | `tests/m1.test.ts` | 3 níveis fixos com solução única; conflitos por tipo (linha, coluna, cor, encostados incl. diagonal); vitória dispara 1 vez |
| Toque, marca ✕, desfazer/refazer, recomeçar | `tests/m1.test.ts`, `tests/attempts.test.ts` | ver seção 2 (regras de interação) |
| Tentativas, palpite, perder, recomeçar sem regerar | `tests/attempts.test.ts` | 3 tentativas/nível; duplo toque (até 400 ms) = 1 palpite; perder trava; recomeçar mantém o mesmo nível |
| Gerador (seed, regiões, unicidade, erro tratado) | `tests/generator.test.ts` | CA06–CA09 |
| Solver humano T1–T7, classificação, progressão 1–100 | `tests/human.test.ts` | CA10–CA12 |
| Etapas/progressão, gatinho de brinde, poder, progresso, nome, `?nivel=` | `tests/progress.test.ts` | seção 2.6–2.9 |
| Dicas (erro, passo mais fácil, desempate, 3 passos, mensagens) | `tests/hints.test.ts` | CA13–CA20 + "motivo → o que fazer" |
| Persistência, manifest, offline (parte automática), solução fora do localStorage | `tests/m5.test.ts` | CA21–CA23 |
| Vocabulário | `tests/glossary.test.ts` | termos proibidos e nomes das cores |

Rodar tudo: `npm test` (≈10 s). Typecheck: `npm run typecheck`. Build: `npm run build`.

## 2. Regras de jogo (resumo; os testes são a referência)

### 2.1 O quebra-cabeça
- Tabuleiro N×N (N de 5 a 10) com N **cores**; 1 gatinho por **linha, coluna e cor**; gatinhos **não se encostam** (diagonal inclusa); **solução única**.
- Coordenadas internas partem de 0; a interface mostra linhas/colunas a partir de 1.

### 2.2 Toque, marca ✕ e palpite
- A **marca ✕ é anotação do jogador**: não é colocada automaticamente e pode estar errada, sem aviso. **Única exceção:** o **✕ vermelho** (`#D93A3F`, estado `bad`) que o palpite errado deixa na casa. Ele é um fato confirmado, não anotação: é **travado** (não sai com toque, arrasto, Desfazer nem Refazer; não entra no histórico), conta como estado visível para as dicas e só some ao **Recomeçar nível**.
- 1 toque numa casa vazia = marca ✕. **Duplo toque (2 toques rápidos, até 400 ms) na mesma casa = 1 palpite**: se há gatinho, ele aparece (e **nunca some**); se não há, a casa ganha o ✕ vermelho e o jogador **perde 1 tentativa**. Ter ou não ✕ na casa **não importa**; só importa haver gatinho.
- Toque numa casa com ✕ (ex.: por arrastar) **tira o ✕ na hora**; um 2º toque rápido na mesma casa é o palpite. Toques em casas diferentes nunca formam palpite.
- **Arrastar** segue a casa onde começou, **ao vivo**: começou numa casa **vazia** → marca ✕ em todas as vazias percorridas; começou numa casa com **✕ do jogador** → **tira** o ✕ de todas as percorridas. Gatinho e ✕ vermelho são ignorados. **Um** passo no histórico; nunca custa tentativa.
- **Desfazer/Refazer só mexem em marcas ✕.** Gatinho é "escrita do jogo": revelado, nunca é desfeito (por palpite, poder, "Fazer por mim" ou brinde). Desfazer **não devolve tentativa**.

### 2.3 Tentativas
- **3 por nível**. Ao zerar: o jogo trava e aparece o aviso "Sem tentativas" (com ✕ para fechar): **Tentar novamente** (destaque) ou **Continuar sem limite**.
- Se o aviso for fechado: tabuleiro **congelado** e a barra de baixo mostra **só** *Tentar novamente* e *Próximo nível* (esse apenas avança o ponto de retomada; não conta como concluído).
- **Recomeçar nível** (⟲ no cabeçalho) **sempre pede confirmação**; limpa o tabuleiro, devolve as 3 tentativas e o uso do poder; **não regera** o nível (mesmas cores e posições; gatinhos de brinde continuam).

### 2.4 Vitória
- Dispara **uma única vez**. Mostra tempo, dicas, poderes e tentativas restantes (e o nome, se houver). Modal com ✕; fechado, o botão "Dica" vira **Próximo nível**.

### 2.5 Dicas
- **Só estado visível**: gatinhos achados + ✕ do jogador + ✕ vermelhos. A solução **nunca** gera dica (só detecta erros do jogador); nada de eliminação implícita: o que um gatinho achado descarta e ainda não tem ✕ vira a própria dica (técnica 0). Código: `getDeduction` (não recebe a solução) e `getHint` (erros primeiro, depois a dedução).
- 3 toques no botão: **(1) O motivo** (casas de prova com contorno), **(2) O que fazer** (✕ fantasma branco a 40% nas casas que a dica elimina), **(3) Fazer por mim** (marca exatamente as casas fantasma; "Marcar ✕" na técnica 0). Só o 3º conta em `hintsUsed`. Qualquer jogada reinicia o ciclo. Cabeçalhos: O MOTIVO / O QUE FAZER / ERRO; mascote "pensando" (dica) ou "preocupado" (erro). As frases falam de casas **livres**.
- Ordem das técnicas (a primeira que gera algo novo vence): 0 consequência de gatinho → 1 única casa livre (cor/linha/coluna) → 2 cor presa numa linha/coluna → 3 linha/coluna de uma cor só → 4 grupos de N (e pares escondidos) → 5 casa que zera uma cor → 6 tentativa e contradição de profundidade 1 (**só no Expert**). Desempate: distância de Chebyshev à última jogada, depois linha, depois coluna.
- Sem dedução simples: "Não achei uma dedução simples a partir daqui." (sem botão).
- **Erro** (✕ sobre casa de gatinho; checado antes das deduções, para nunca sugerir gatinho com base num ✕ errado), em 3 níveis sem revelar a solução: (1) "Algum ✕ seu está numa casa onde pode haver gatinho. Confira a coluna N."; (2) destaca a casa; (3) botão **Tirar este ✕**. Gatinho fora do lugar: só "Tem algo errado aqui.".
- Desativada com o nível resolvido.

### 2.6 Poder "Revelar gatinho"
- **1 uso por nível** (sem estoque). Revela o gatinho da **cor com mais casas livres**; não gasta tentativa; recomeçar devolve o uso; depois de vencer, não funciona.

### 2.7 Gatinho de brinde
- Só a partir do nível 21: 50% nos níveis 21–30; 60% nos 31–40, −15 pontos a cada 10 níveis, **0 a partir do 71**. Sorteio determinístico por nível. É o gatinho da **maior cor**. Contorno tracejado.

### 2.8 Progressão
- Tamanho/dificuldade/seed dependem só do número do nível (igual em qualquer aparelho).
- **1–30: etapas de 5 níveis**: 5×5, 6×6, 7×7 (Fácil), 8×8 (Médio), 9×9 e 10×10 (Difícil).
- **Depois do 30**: 31–40 Difícil, 41+ Expert; quase tudo 10×10 (múltiplos de 5 são 9×9). Dificuldade **nunca diminui**.
- Classificação: T1–T2 Fácil, T3–T4 Médio, T5–T6 Difícil, T7 Expert; nível que nem T7 resolve é descartado. Tabela de tamanhos: Fácil 5–7, Médio 7–8, Difícil 8–10, Expert 9–10.
- A geração roda num Web Worker; se falhar, cai num nível fixo (a interface nunca trava). Ao abrir um nível, o próximo é pré-carregado em segundo plano **só se for 10×10** e **1 por vez** (poupa bateria); se o pré-carregamento falhar, o nível é gerado de novo ao chegar nele.

### 2.9 Persistência e perfil (só no aparelho; sem conta/servidor)
- `localStorage`: `gatinhos:v1` (partida em andamento) e `gatinhos:progress:v1` (nome, níveis concluídos, nível de retomada, melhores tempos).
- A partida salva **não guarda a solução**; ela é recalculada das cores ao carregar (nível adulterado é descartado). Isso evita espiadas casuais; **não é segredo de verdade** (o jogo roda inteiro no aparelho).
- Vazio/corrompido → padrão (nível 1). Falha ao gravar não derruba o app.
- Começar em outro nível: `?nivel=N` (1–999) ou folha do nome → "Ir para um nível". O app passa a retomar desse nível.
- Nome: opcional, até 20 caracteres, sanitizado.

## 3. Regras de interface e visual (sem teste: conferir no navegador/aparelho)

- **Cabeçalho**: ⟲ (recomeçar) | "Nível N" + "Dificuldade · N×N · tempo" | círculo do nome + símbolos. Chips das 3 regras. Linha do indicador: bolinhas por cor (com a carinha do gatinho quando achada, opacas quando faltam), "N de M gatinhos", "Faltam: …" e as patinhas de tentativas.
- Linha fixa e **discreta** sob o tabuleiro: "1 toque anota ✕ · duplo toque dá um palpite". **Não** mostrar alertas de marca errada (decisão de UX: informar sem escancarar, sem tratar o jogador como bobo).
- **Palpite errado**: fundo levemente escurecido (como modal), patinha grande no centro **rasgada ao meio** por corte irregular + "Palpite errado" e "Restam N tentativas"/"Última tentativa!" (~1,7 s, não bloqueia toques, some sozinho); a patinha do contador balança; vibração curta se houver. Na última tentativa (perde) não há essa animação: o aviso "Sem tentativas" assume.
- **Carregando**: esqueleto animado do tabuleiro (tamanho certo) + gatinho e "Preparando o nível N…" (+ "Tabuleiros grandes demoram um pouquinho." de 9×9 para cima). Botões travados.
- Tabuleiro denso (gap 2px) a partir de 9×9. Animações respeitam `prefers-reduced-motion`. Safe areas respeitadas. Alvos ≥ 44 px.
- Barra de baixo: Desfazer | Dica | Poderes (selo 1/0) | Refazer. Folha de Poderes e folha do nome sobem de baixo (com ✕).
- **PWA**: atualização **discreta** (`registerType: 'prompt'`): procura versão ao abrir/voltar/de hora em hora, baixa em segundo plano e só aplica ao ir para segundo plano ou na próxima abertura; **nunca recarrega no meio da partida**. A versão aparece em letra pequena na folha do nome. Sem aviso na tela do jogo.

## 4. Design (canvas "Capivarando") e como mexer nele

- Link: https://claude.ai/artifact/UK1nZ2S4xEiKBAASnsoEQ6 · slug `dd2a9d9d-c2df-4819-9775-8781ddb6653f`. Páginas: **Telas do jogo** (Jogo interativo, Carregando, Perdeu, SemTentativasFechado, Recomecar, Poderes, Perfil), **Marca** (Main). A nota azul `design-system` guarda as regras de UX e o vocabulário.
- **Ignorar completamente** o quadro/nota "Rascunho pessoal" (capivara), se existir: é rascunho do dono, não é do jogo.
- **Tokens**: Lagoa `#EEF3EC` (fundo), Mata `#2F6B5E` (primária), Tangerina `#D9661A` (ação), Pretinho `#1F1F25` (mascote), Olho verde `#5CC24E`, Barro `#5C3A24` (texto forte). Cores do tabuleiro: Menta `#8FD3C1`, Amarelo `#F4C542`, Coral `#F28C7A`, Roxo `#9B7BD1`, Azul `#8EC5F0`, Verde `#A9D86E`, Marrom `#D9A273`, Rosa `#F2A7C8`, Laranja `#F7A955`, Cinza `#B8C2CC`. Fontes: **Baloo 2** (títulos) e **Nunito** (texto).
- **Mascote**: gatinho preto de olhos verdes (pupilas finas, orelhas com gradiente claro, boca e bigodes claros). O SVG do código (`src/ui/cat.ts`) reproduz o do canvas; mudar um = mudar o outro.
- Botões em pílula, cartões brancos arredondados; ação principal dos modais em Tangerina.
- **O dono edita o canvas à mão. Sempre reler os arquivos (`read`) imediatamente antes de publicar** e editar a cópia lida. (Já houve sobrescrita acidental por publicar a partir de uma cópia desatualizada.) Publicar com `root` e `file_path`, mandando só os arquivos alterados; o índice (`canvas.json`) só quando o layout mudar.
- Ao mudar o jogo: atualizar canvas, README e prints (seção 5).

## 5. Fluxo de trabalho

- Repositório: https://github.com/paulokmatos/gatinhos (público; jogo em https://paulokmatos.github.io/gatinhos/). Stack: TypeScript + Vite + Vitest, PWA (vite-plugin-pwa). Lógica pura em `src/core/`, interface em `src/ui/`, testes em `tests/`.
- Trabalhar em branch + **Pull Request**; **só fazer merge quando o dono pedir** (ele já pediu explicitamente em PRs anteriores). Mensagens de commit terminam com a linha de coautoria definida pelo ambiente.
- **CI** (`.github/workflows/ci.yml`): typecheck + testes → build → deploy no GitHub Pages (só em `main`). **Testes puláveis**: `[skip tests]` no commit, label `skip-tests` no PR ou opção ao disparar manualmente; build/deploy seguem.
- Rodar local: `npm run dev` (porta 5173, rede local) ou `npx vite preview` (build com PWA).
- Imagens do README (`docs/*.png`): geradas com Playwright (`playwright-core` + Chrome do sistema, instalados fora do repo). Regerar quando a interface mudar. A partida salva **não** contém a solução: scripts devem recalculá-la a partir das cores.
- Vocabulário e glossário aprovados pelo dono; **"quadro" não é usado** (é o termo que ele usava para o tabuleiro/nível).

## 6. Pendências conhecidas

- **Testes de interface locais** (Playwright, `npm run test:e2e`; Chrome do sistema, build de produção; projetos "desktop" e "celular" emulado com toque real): toque/✕/desmarcar, duplo toque, arrasto (CA03), dica em 3 passos (CA17), recomeçar, retomar ao recarregar (CA23), nível inteiro até vencer (CA25 emulado), 10×10 sem rolagem (CA24 emulado), nenhuma tarefa longa ≥ 100 ms ao gerar 10×10 (CA09 neste computador), offline (CA22 emulado) e instalabilidade no Chrome (CA21 parcial). Não rodam no CI.
- **Seguem manuais no iPhone de verdade**: CA21 (instalar na tela de início), CA22 (modo avião real), CA23 (matar o app), CA24 (safe areas e cores distinguíveis), CA25 (roteiro completo), CA09 (tempo no aparelho, meta 5 s).
- **Desempenho da geração**: níveis Expert 10×10 podem levar até ~8,5 s no pior caso medido no desktop (média ~0,6 s); meta dos critérios é 2 s no desktop / 5 s no iPhone → otimizar (ex.: filtro mais barato antes do solver humano).
- Opcional não feito: trocar as cores do tabuleiro (só visual) ao recomeçar o nível.
- Ícones PNG do app são desenhos simples gerados por script.
- PR #3 (perfil, confirmação, erro, mascote, PWA discreto, etc.) pode estar aberto: ver `gh pr list`.
