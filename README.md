# Tichr — Frontend

> **A agenda que se adapta à sua aula, e não o contrário.**

Aplicação web (Angular) do Tichr — uma ferramenta de agenda **feita de professor para
professor**, que projeta e reorganiza as aulas automaticamente a partir de regras.

---

## O problema

Professores gerenciam o tempo em planilhas engessadas ou cadastrando aula por aula no
calendário. O trabalho é manual e frágil: bastou surgir um feriado, uma reunião ou um
período de férias no meio do caminho e é preciso **remexer tudo à mão** — reposicionar
cada aula seguinte, recalcular quando o curso termina, refazer a grade. E a docência tem
duas realidades bem diferentes:

- **Escola pública / grade contínua** — dias fixos na semana, o ano inteiro.
- **Cursos livres / módulos fechados** — um número exato de encontros, com uma data de
  término que *importa* (e que muda toda vez que uma aula precisa ser remarcada).

Nenhuma agenda comum entende essas duas lógicas — muito menos as reconcilia sozinha.

## A solução

O Tichr é **orientado a regras**. Em vez de cadastrar aulas, o professor descreve a
turma (dias da semana, modalidade, início) e o sistema **projeta as aulas**. Quando um
imprevisto entra no calendário, a grade se reorganiza sozinha:

- **Grade contínua:** um feriado apenas **suspende** a aula do dia — o cronograma das
  demais não muda.
- **Módulo fechado:** um bloqueio **empurra** a aula afetada e todas as seguintes para as
  próximas datas válidas (o "deslizamento"), e a **data de término é recalculada na
  hora**.

O diferencial visível está na **demonstração interativa da landing page** e no
**dashboard**, onde a próxima aula e a agenda refletem qualquer mudança instantaneamente.

---

## O que o produto faz (telas)

| Rota | Tela | Papel |
|---|---|---|
| `/` | **Landing** | Rebranding focado em **gamificação**: hero com mockup do **Tichr Qlick** e um desfile *feature-by-feature* (Qlick, acesso por PIN, ranking/Hall da Fama, equipes, plano de aula e a agenda como apoio), alternando lado no desktop e empilhando no mobile. CTA "Comece grátis agora" → `/cadastro`. Mockups em CSS puro, sem emojis. |
| `/login` | **Login** | Entrada (email/senha) — MVP *invite-only*. Traz o atalho **"Entrar como aluno"** → `/entrar`. |
| `/entrar` | **Entrar como aluno** *(pública)* | Jornada em etapas: busca do **@usuário do professor** (avatar + nome) → turma → **PIN da turma** → nome → **PIN do aluno** (slots dinâmicos 2/6-4 díg). Traz também o **🏆 Hall da Fama**: turmas encerradas com o **ranking final, sem PIN**. |
| `/dashboard` | **Dashboard** | Recepção: saudação por horário, **próxima aula** em destaque, **grade de Acesso Rápido** (espelha o menu lateral, mobile-first) e o gatilho de "Exceção". Enriquecido com o **plano de aula** (contexto/tópico) e o aviso de Qlick. |
| `/agenda` | **Minha Agenda** | Alternância **Calendário** (grade de 5 semanas — dias com aula em **cor de destaque + ícone "i"**, sem nomes de turma; toque abre um **modal com a grade do dia**) e **Detalhado** (**carrossel por dia** Seg–Sex, foco em hoje com *peek* dos vizinhos, grade vertical **Horário → turma / Janela / Intervalo** do ensino regular + aulas modulares da data); a escolha é memorizada. |
| `/plano-aula` | **Plano de Aula** | Escopo geral por disciplina **e** o **quadro modular** (backlog de tópicos + **alocação drag-and-drop** na grade da turma) — tudo no **plano Graduado+** (Estagiário vê cadeado). |
| `/turmas` | **Minhas Turmas** | Centro do fluxo do **ensino regular**. Conta virgem: um **card-botão "Criar Instituição de Ensino"** (passo obrigatório antes das turmas). Com dados: **cards por instituição** que **navegam** para a tela dedicada da escola, e um bloco **"Turmas sem uma instituição de ensino"** para o legado. Instituições são criadas/editadas aqui, em modal com **turnos** (Matutino/Vespertino/Noturno — cada um com horários e recreios próprios e **prévia ao vivo da sua grade**). |
| `/instituicoes/:id/turmas` | **Turmas da escola** | Tela dedicada às turmas de uma instituição (`:id = sem-instituicao` para o legado): filtro **Ativas / Encerradas** + **busca por nome**. O **seletor para mover a turma de escola** aparece só nas turmas **sem instituição** (as que já têm escola trocam ao editar). |
| `/turmas/nova` · `/turmas/:id/editar` | **Nova / Editar turma** | Formulário reativo com modalidade, cor, disciplina e a config de **Pontuação & Gamificação** (liga/desliga, nome da pontuação, rótulos dos botões, ranking on/off). A **Modalidade** é **Ensino Regular** (escola) ou **Módulo fechado**: em *Ensino Regular*, escolhe-se **instituição + turno + nível + ano/série** e a **grade de alocação** (dia × horário) do turno, com os dias derivados das alocações; em *Módulo*, define-se dias/horários/total de aulas. Editar **reprojeta** a agenda. Criar respeita a **cota do plano** (com *upsell* ao estourar). |
| `/turmas/:id` | **Detalhe da turma** | Exibe o **PIN da turma** e uma **barra de progresso** do curso (que segue o nome da pontuação como base coletiva quando ativa). Turmas legadas (PIN 6 díg) mostram um **aviso + modal para migrar aos Smart PINs** (2 díg). Abas: **Agenda**, **Alunos** (cartas + **modal do aluno**; cadastro é recurso do **plano Mestre** — planos inferiores veem bloqueio), **Equipes** (*kanban* + **cargos**) e **Jogos** (Qlicks da turma, com **Adicionar jogo** da biblioteca — N:N). |
| `/turmas/:id/dinamica` | **Nova dinâmica** | Sorteio de **squads**: nº de equipes, papéis/temas em *chips*, e a **roleta** que renderiza os grupos. Recurso do **plano Mestre**. |
| `/jogos` · `/jogos/qlick` | **Jogos / Tichr Qlick** | Vitrine de jogos e a mini-landing do **Tichr Qlick** (quiz ao vivo). Recurso do **plano PhD** (upsell nos inferiores). |
| `/jogos/wor` · `.../novo` · `.../meus` · `.../partida/:id` | **Tichr Wor** | Guerra de castelos PvP: landing interna, **wizard de criação** (arsenal **forjado por IA** — 5 palavras com 3 dicas a partir de uma instrução —, reordenar por drag-and-drop), lista de batalhas e a **tela do projetor** (lobby → jogo, realtime). |
| `/jogos/isolateus` · `.../novo` · `.../editar/:id` · `.../partida/:id` | **Tichr Isolateus** | Dedução social: landing de primeiro uso, **estúdio** das 10 questões (com geração por IA) e o **telão do Comando Central** — auditoria dos pseudônimos no lobby, Barra de Esperança, os 6 setores, o chat de rumores e o card de veredito. Recurso do **plano PhD**. |
| `/aluno/wor` | **Wor (aluno)** | Cliente **mobile-first**: teclado de letras, **Dilema Tático** (atacar/comprar dica), **Risco Heroico**, **modal da Queda da Horda** e animação de dano. Escuta só o próprio castelo (realtime barato). |
| `/jogos/qlick/meus` | **Meus Qlicks** | Lista dos quizzes do professor; **Rodar** pergunta "para qual turma?" quando o Qlick está em várias (N:N). |
| `/jogos/qlick/novo` · `/editar/:id` | **Estúdio do Qlick** | Formulário reativo (FormArray) de perguntas → alternativas, com marcação da correta e duração. |
| `/jogos/qlick/partida/:id` | **Sala do professor** | Comanda a partida em tempo real; o **lobby** exibe o **PIN da turma em tamanho grande** + um **modal de assistência** (grid de alunos com o PIN revelado por toque, em *flip*). Depois: pergunta (timer + revelar), ranking da rodada e pódio. |
| `/planos` | **Assinatura** | Vitrine dos 4 planos com o **plano atual em destaque** e troca de plano (mock). Destino do botão "Fazer upgrade" quando um recurso exige um plano superior. |
| `/configuracoes` | **Hub de Configurações** | Índice da conta: cabeçalho com **avatar + nome** do professor e um menu para **Meu Perfil**, **Meu Plano** e a seção **Legal** (**Termos de Uso** e **Política de Privacidade**). |
| `/configuracoes/perfil` | **Meu Perfil** | **Foto de perfil** (editar → recorte 1:1 → compressão → upload pelo backend), dados (nome, disciplina, bio), **@username** com disponibilidade em tempo real e **trava de 60 dias**, **disciplinas como cards** (modal para renomear/excluir) e **férias globais**. |
| `/configuracoes/plano` | **Meu Plano** | Resumo da assinatura atual (plano, limite, vagas avulsas, features) + **upsell** e atalho de gestão. |
| `/novidades` | **Novidades (Changelog)** *(pública)* | Timeline das versões (Nova feature / Melhoria / Correção), alimentada por `changelog.data.ts` e espelhando o README. Linkada no **rodapé global**. |
| `/termos` · `/privacidade` | **Documentos legais** *(públicas)* | Termos de Uso e Política de Privacidade (foco **LGPD**), a partir de `core/legal.data.ts` e do componente reutilizável `<app-legal-doc>`. Linkados no **rodapé** da landing, no hub de **Configurações** e abertos em **modais** no cadastro. |

### Planos, limites e gating

Ladder de assinatura (fonte única de gating em `core/recursos.ts` +
`core/plano.util.ts`; o backend reforça cada regra):

| Plano | Limite de turmas | Desbloqueia |
| --- | --- | --- |
| **Estagiário** (grátis) | **5** | Agenda + motor de deslizamento |
| **Graduado** | **99** | Plano de aula **geral e modular** (arraste tópicos para as aulas) |
| **Mestre** | **99** | **Cadastro de alunos**, equipes/squads e papéis |
| **PhD** | **99** | Portal do aluno, gamificação (XP/ranking) e jogos (Qlick e Wor) |

O teto de **99 turmas** vale para todos os planos pagos: o **PIN da turma é de 2 dígitos**
(`01`–`99`) e não pode repetir entre turmas ativas — por isso nenhum plano é "ilimitado". O
**indicador de cota** no menu mostra sempre `ativas/99` (ou `/5` no Estagiário) e o
`limiteDoPlano` soma slots avulsos limitando a esse teto. Criar turma respeita a cota (com
*upsell* ao estourar).

**Pagamento real (Abacate Pay).** Assinar ou trocar de plano (e comprar vaga avulsa) passa pela
tela `/checkout`: escolhe-se **PIX** (QR + copia-e-cola, confirmação por *polling*) ou **cartão**
(redireciona para o checkout hospedado). O plano só é liberado **após o pagamento** — nada de
concessão instantânea. Plano **vencido** preserva os dados (turmas, jogos, histórico) e apenas
rebaixa o acesso na interface, com banner e CTA de renovar em **Meu Plano**. Admin é isento.
Cupom de cortesia (`Meu Plano`) segue concedendo sem pagamento.

### Equipes, cargos e gating (aba Equipes)

A aba **Equipes** é um quadro visual, recurso do **plano Mestre** (planos inferiores veem
uma tela de bloqueio que leva a `/planos`):

- **Arrastar-e-soltar:** cada aluno é um card arrastável; o professor cria **equipes**
  (título, descrição e cor de destaque, com um modal de informações no botão "i") e move os
  alunos entre o *pool* "Sem equipe" e as colunas. Um botão **Distribuir** reparte todos de
  forma equilibrada num clique.
- **Cargos (papéis):** o professor cadastra cargos em lote (ex.: "Líder", "Redator") e entra
  no **modo de atribuição** — escolhe um cargo, as colunas **balançam**, os cards dos membros
  **brilham** e um aviso flutuante pede para selecionar os responsáveis. Ao finalizar, cada
  membro exibe os cargos como *bullets* abaixo do nome. Um membro pode ter vários cargos e um
  cargo pode ser dividido entre vários membros.

### Gamificação: exclusiva do plano PhD

Pontuação, ranking e Portal do Aluno são recursos do **plano PhD**. Nos planos inferiores a
UI de pontuação aparece **visível porém travada** (opacidade + cadeado + `cursor:not-allowed`)
e o clique abre um **upsell** que leva a `/planos`; o toggle "Habilitar Portal Gamificado" no
formulário de turma fica **travado em off**. O backend reforça com `403 GAMIFICACAO_LOCKED`.

### Portal do aluno (Plano PhD)

Experiência **isolada** do painel do professor (sem menu lateral, com barra inferior
estilo app), autenticada por **PIN** e com token próprio. O aluno entra pela jornada
`/entrar`: **@usuário do professor → turma → PIN da turma → nome → PIN do aluno** (Smart PINs de
2 díg, ou 6-4 díg em turmas legadas ainda não migradas — o portal adapta os slots).

| Rota | Tela | Papel |
|---|---|---|
| `/entrar` · `/t/:turmaId` | **Login do aluno** *(pública)* | Jornada por `@username` + PIN da turma; `/t/:turmaId` é o atalho legado direto. |
| `/aluno/dashboard` | **Início** | Card **"O que vem por aí"** com o **tópico da próxima aula**; **barra de nível** + **barra de evolução da turma**; o rótulo da pontuação segue o **nome definido na turma** (ex.: "Aura"). A **patente** (Bronze → Platina) é calculada com os **limiares da própria turma**, que chegam no login (`turma.niveis`) — sem eles a barra cairia nos defaults e mostraria um tier diferente do que o professor configurou. |
| `/aluno/agenda` | **Agenda** | Dias letivos com status dinâmico (Concluída / Em andamento / Agendada) e o **tópico** de cada aula ("o que já vimos") — sincronizados do Plano de Aula quando o professor é PhD. |
| `/aluno/ranking` | **Ranking** | Pódio (🥇🥈🥉) da turma, com o **card do próprio aluno destacado**. A aba **some** quando a turma desativa o ranking. |
| `/aluno/qlick` | **Tichr Qlick** | Entra no quiz "de hoje": **lobby animado** (loader temático), alternativas **color-coded A/B/C/D** com feedback de clique (press/scale) e estado de espera, **revelação animada** (correta brilha, erradas em cinza, confete no acerto / shake no erro) e **pódio final** com os pontos somados ao XP. |
| `/aluno/isolateus` | **Tichr Isolateus** | O celular do habitante: registro do **nome de personagem**, o **Despertar** (revelação de papel — Aldeão em azul, Ameaça em verde tóxico), o turno secreto da Ameaça, a defesa do setor com **chat de rumores**, a **Quarentena** (debate + voto) e a **tela hackeada** de quem foi abduzido. |
| `/aluno/manual` | **Manual de Guerra** | Regras completas do **Tichr Wor**, do **Tichr Qlick** e do **Tichr Isolateus** + a **Tabela de Recompensas** (quanto vale cada jogada), para a turma montar estratégia **antes** da partida. |

### Criando jogos e começando a partida (comum aos três jogos)

- **Turma ou disciplina (obrigatório):** ao criar/editar um Qlick, Wor ou Isolateus, o
  professor precisa atribuir **uma ou mais turmas** ou informar uma **disciplina**. Só com a
  disciplina, o jogo vale para **todas** as turmas dela. Quando a turma não usa plano de
  tópicos, um **select "Aula N"** deixa fixar o jogo numa aula específica.
- **Painel enxuto:** no card da próxima aula, aparecem só os jogos **daquela aula** (pelo
  tópico alocado ou pela aula fixada). Jogo sem tópico e sem aula definida **não** polui o
  painel.
- **Cadastro rápido de alunos:** mandar rodar uma partida numa turma **sem alunos** abre, antes
  do lobby, o cadastro em massa (nomes por vírgula/hífen/linha) — cadastra na turma e já segue
  para a partida.
- **IA com saldo do dia:** o botão de gerar conteúdo por IA mostra quantas gerações ainda
  restam no dia (o limite é ajustável pelo admin) em vez de travar sempre no primeiro uso.

### Tichr Qlick: quiz ao vivo em tempo real (Plano PhD)

O **Tichr Qlick** é um quiz estilo Kahoot com estado **sincronizado ao vivo** entre o
professor e todos os alunos. É o primeiro ponto do app a **ler** o Firestore direto no
cliente (ver [arquitetura](#arquitetura--stack)):

- **Estúdio (professor):** monta o quiz num formulário reativo — perguntas, alternativas,
  correta e duração por pergunta. Cada quiz vira um *template* reutilizável.
- **Sala (professor):** ao **Rodar**, abre-se o lobby; conforme os alunos entram, seus nomes
  aparecem na hora. O professor **inicia**, vê a pergunta com **cronômetro**, **revela** a
  resposta certa, avança para a **próxima** e, ao fim, **encerra** no pódio.
- **Portal (aluno):** o card **"Tichr Qlick de hoje"** leva à sala; o aluno se inscreve,
  responde tocando na alternativa (com trava otimista + timer), vê se **acertou** e sua
  colocação, e termina no **pódio** — com os **pontos somados ao XP** do portal.
- **Comando via REST, estado por realtime:** toda escrita vai ao backend (fonte única);
  o cliente só **observa** o documento da partida via `onSnapshot`. A resposta correta
  nunca trafega durante a pergunta.

### Tichr Wor: narração ao vivo (Action Cards)

As jogadas de impacto da batalha são narradas **ao mesmo tempo em todas as telas** — no
celular de cada aluno e no telão — para que quem está fora do turno não perca o que
aconteceu:

- **Os gatilhos:** ataque ao castelo rival, Risco Heroico bem-sucedido (cura), Dano Crítico
  (arriscou e errou), Usurpação (a Horda roubou o castelo do líder) e a compra de dica.
- **A interrupção:** o card ocupa o centro da tela por **3 segundos**, com os inputs
  **travados** — e o **cronômetro não corre** nesse intervalo (o backend nasce a rodada 3s à
  frente, então a equipe da vez não é punida pela narração).
- **Ataque é da equipe:** o dano nasce da votação da rodada inteira, então o card nomeia a
  **equipe**. Risco Heroico, Dano Crítico e Usurpação nomeiam o **aluno** — são individuais.

### Tichr Isolateus: dedução social sobre a sua matéria (Plano PhD)

A turma vira uma **vila isolada** no extremo norte, invadida por uma ameaça que se esconde
entre os próprios alunos. A cada noite o infiltrado **sabota um setor** ou **abduz um
morador** — e a única defesa é a turma **acertar a questão da sua aula**. Errar derruba a
**Barra de Esperança**; acertar salva o setor. O jogo é o embrulho; o conteúdo cobrado é o seu.

- **O Voto de Silêncio:** ninguém joga com o nome real. Cada aluno entra com um nome de
  personagem, e no lobby o professor **troca o apelido** (toca no nome) ou **veta** (o aluno
  volta ao registro) — aprovar é implícito, um fluxo de aprovação um-a-um travaria a sala.
  Depois do Despertar o apelido fica fixo: o vínculo aluno↔personagem é apagado de propósito.
- **A Névoa de Guerra:** em turmas pequenas, habitantes virtuais preenchem a vila para o
  infiltrado ter onde se esconder. Os alunos **não conseguem distingui-los dos reais** — nem
  inspecionando o app: o documento que o cliente escuta em tempo real é cego de propósito
  (sem o papel de ninguém, sem marca de NPC, sem a alternativa correta, e **sem placar ao
  vivo** — um ranking parcial denunciaria quem é real). O papel de cada aluno chega por uma
  rota autenticada, recortada por pessoa.
- **A Guerra de Frequências:** durante a questão corre um **chat de rumores**. O infiltrado
  sabe a resposta certa e transmite um argumento falso **assinado por outro habitante**.
  Quem foi abduzido não sai do jogo: segue respondendo (e pontuando) numa **tela hackeada**,
  de onde manda **Sinais de Rádio** anônimos para tentar salvar a vila.
- **A Quarentena:** um debate cronometrado seguido de votação no suspeito, disponível
  **depois de cada noite** (uma por rodada — a vila não emenda acusações até prender todo
  mundo). Quem já se decidiu **pula o debate**; se todos pularem, a votação começa na hora.
  Prendeu a ameaça, a vila vence; prendeu um inocente, a Esperança despenca — e a identidade
  do preso **continua em segredo**.
- **As 10 questões** são escritas pelo professor ou **geradas por IA** a partir da disciplina
  e do tópico (1×/dia, com cota própria — não consome a do Qlick nem a do Wor).

### Transparência das regras e da economia de XP

As regras e a **Tabela de Recompensas** dos três jogos vivem numa **fonte única**
(`core/regras-jogo.data.ts`, espelhando as constantes do backend) e aparecem em três
lugares: nas **landings** dos jogos, no botão **"Regras e Pontuações"** acima da lista de
batalhas/Qlicks do professor, e no **Manual de Guerra** do aluno. No Wor a tabela deixa
explícito que as jogadas rendem **pontos de combate**, e que os pontos só viram XP **ao fim
da partida** (campeã com o valor cheio, demais com metade).

Recursos transversais: **modal global de erro** (toda falha de rede vira um aviso
claro — exceto a cota e a **trava de @username**, tratadas *inline*), **estados de carregamento**
consistentes, **tema claro/escuro** nativo, **cores por turma**, o **indicador de cota** no menu
lateral, o **card de upsell** ao atingir o limite do plano, o selo **Beta** no header
(aviso de que recursos experimentais podem conter bugs e perder dados) e o **rodapé global**
(autoria, GitHub e âncora para as Novidades). O menu lateral inclui **"Plano de Aula"**
(com cadeado + upsell para o Estagiário).

### Foto de perfil, mídia e trava de identificador

- **Avatar:** ao trocar a foto, o Angular abre um **modal de recorte 1:1**
  (`ngx-image-cropper`), **comprime** silenciosamente para ~50KB / 250px
  (`browser-image-compression`) e envia o micro-arquivo por **multipart ao backend**
  (`POST /profile/avatar`). O upload é **server-side**: o cliente não mantém sessão do
  Firebase Auth, então o Storage nega escrita anônima — quem grava é o backend, via Admin
  SDK, que devolve o perfil já com o `avatarUrl` novo. O `<app-avatar>` mostra a foto ou um
  **placeholder** com as iniciais. As regras do Storage/Firestore (`storage.rules`,
  `firestore.rules`) negam escrita ao cliente e têm **deploy manual** (`firebase deploy`).
- **Trava de @username:** o handle só troca a cada **60 dias**; dentro do período o campo fica
  **desabilitado** com a microcópia "Você poderá alterar… em X dias" (o backend responde
  `409 USERNAME_COOLDOWN`).

### Cadastro, onboarding e tutoriais

- **Cadastro com plano e aceite legal:** a tela `/cadastro` é um **formulário reativo** com
  **Nome, E-mail e Senha**, botão **"← Voltar ao site"** e o **card do plano** escolhido na
  landing (via `?plano=`), trocável por **modal**. O **cupom** aparece só nos planos pagos; o
  **aceite dos Termos de Uso e da Política de Privacidade** (dois checkboxes que abrem os
  documentos em **modais**) é obrigatório — o botão **"Criar Conta"** só libera com o form
  válido e ambos marcados. Ao criar (`POST /auth/signup` com nome + aceites, plano Estagiário)
  o usuário já é autenticado; em seguida aplica o **cupom** ou faz o **upgrade** do plano
  escolhido e cai em **`/verificar-email`**.
- **Confirmação de e-mail:** a conta nasce **sem e-mail confirmado** e o painel fica travado
  até o clique no link (o backend responde `403 EMAIL_NAO_VERIFICADO` e o interceptor traz de
  volta para a tela de espera). A tela consulta o estado sozinha a cada 5s e tem botão de
  **reenviar**; ao confirmar, **renova a sessão e segue direto** — sem pedir novo login,
  porque o token novo já nasce verificado.
- **Soft-block de perfil:** enquanto faltar **nome, @username ou foto**, o painel exibe o
  `<app-onboarding-card>` em destaque ("Falta pouco!") com um checklist e o atalho para
  concluir o perfil.
- **Tutoriais de primeiro acesso:** na primeira visita a `/dashboard`, `/agenda`, `/turmas`
  ou `/jogos`, o `DashboardLayout` escurece o fundo e mostra o `<app-tutorial-overlay>` com
  uma dica rápida e o "primeiro passo" (marca como visto no `localStorage`; respeita
  `prefers-reduced-motion`).

### Conta e segurança (Configurações → Segurança)

- **E-mail de acesso:** mostra o e-mail atual com selo **Confirmado**. Ao alterar, um modal
  pede o **novo e-mail + a senha atual** (reautenticação, mesma UX do card de excluir conta).
  A troca é em **duas etapas**: o link vai para a caixa **nova** e o e-mail atual **continua
  valendo até o clique**. O card avisa que será preciso **entrar de novo depois de confirmar**
  — o Firebase revoga a sessão ao completar a troca, e sem o aviso o logout pareceria um bug.
- **Senha:** "Alterar" dispara o mesmo link de redefinição da tela pública para o e-mail da
  conta, em vez de um formulário de troca autenticada.
- **Esqueci minha senha** (`/recuperar-senha`, pública): um campo, e a mensagem de sucesso é
  **genérica de propósito** — *"Se o e-mail estiver cadastrado, as instruções foram enviadas"*.
  Confirmar se a conta existe transformaria a tela num oráculo de quem usa o Tichr.
- **Sessão que não expira no meio da aula:** o ID token dura ~1h; o interceptor **renova**
  sozinho no primeiro 401 e refaz a requisição, em vez de jogar o professor no `/login`. O
  refresh vive num **cookie `HttpOnly`** — fora do alcance do JavaScript.
- Nada disso afeta o **aluno**: ele entra por PIN, não tem e-mail e sua sessão não se renova.

### Painel Administrativo (backoffice — só admins)

- Atalho **"Painel Admin"** nas Configurações, exibido só quando o perfil é admin (o
  `adminGuard` confirma pelo `GET /admin/ping`). Rotas isoladas `/admin`, `/admin/usuarios`,
  `/admin/cupons`, `/admin/feedbacks` e `/admin/prompts`.
- **Dashboard** com métricas (total, ativos, distribuição por plano); **CRM** com busca de
  professores e uso (turmas/alunos/Qlicks) e um modal de ações (redefinir senha, limpar dados,
  desativar/excluir, override de plano, conceder/revogar admin); **Cupons** (CRUD);
  **Feedbacks** (caixa de entrada dos relatos dos professores — ver [Feedback e
  suporte](#feedback-e-suporte)).
- **Governança de IA** (`/admin/prompts`): edita o *prompt* que instrui a IA de cada jogo
  (salvo no banco, sem novo deploy — dá para restaurar o padrão) e ajusta o **limite global de
  gerações por dia**. Some daí a manutenção do conteúdo gerado sem tocar no código.
- **Resgate de cupom** em "Meu Plano": o professor digita o código e ganha desconto/meses
  grátis (`POST /checkout/cupom`).

### Vitrine técnica (`/tecnologia`, pública)

- Página de **portfólio de engenharia** no rodapé público, ao lado de "O que há de novo?".
  É a única página cujo público não é professor: existe para um recrutador ou Tech Lead
  entender a arquitetura sem clonar o repositório.
- **Sai do design system de propósito** (precedente: a landing) — escura sempre, sem reagir
  ao `data-theme`, com tokens `--vt-*` escopados no `:host` da página, que **herdam** para os
  blocos filhos. Nada migra para o `styles.scss`.
- **Sem biblioteca de diagrama:** SVG inline escrito à mão. Embarcar centenas de kB para
  desenhar cinco caixas numa página cujo argumento é engenharia seria a contradição perfeita.
- As três cores são uma **legenda**, não decoração: verde = leitura direta, azul = escrita
  pelo juiz, laranja = selado. Valem igual em todos os diagramas.
- Conteúdo em **nomes de módulo, fluxos e decisões** — sem contagens (endpoints, linhas,
  cobertura) que ficariam erradas no primeiro commit seguinte.
- Limitação conhecida: o `<title>` da aba é o global do app. *Link preview* decente exigiria
  SSR ou pré-render, que é outra spec.

### Feedback e suporte

- **Botão "Enviar feedback"** no menu, disponível de qualquer tela do painel (acima de "Sair
  da conta"). Abre um modal com **categoria** (Relato de Bug, Sugestão de Melhoria, Dúvida
  Técnica, Elogio) e a mensagem; o botão só habilita com os dois preenchidos.
- **Contexto invisível:** o professor não precisa dizer onde estava nem qual aparelho usa — a
  **rota** e o **navegador** vão junto, lidos no clique de enviar. A identidade **não** é
  anexada pelo cliente: o backend a resolve pelo token (dado do cliente é spoofável).
- Não é um FAB: `nav-links.ts` é a fonte única do menu e todo item de lá é uma **rota** —
  feedback é modal. O botão mora no `mobile-menu`, que já é o dono do estado do drawer.
- **Triagem** em `/admin/feedbacks` (só admins): lista com **badges** de categoria e status,
  detalhe com o relato completo e os metadados, três botões de status e uma **nota interna**
  (invisível para o professor). A tela tem **botão "Atualizar"** em vez de tempo real —
  a coleção é privada e não é lida pelo cliente (ver o README do backend).

### Feedback de carregamento e performance

- **Skeleton screens:** listas (Minhas Turmas, Meus Qlicks) renderizam **silhuetas com shimmer**
  no lugar de uma tela em branco durante o `GET`.
- **UI-blocking em submits:** ao salvar, o formulário inteiro **esmaece** e ganha um *overlay*
  com spinner (`<app-form-blocker>`), cortando cliques duplos.
- **Paralelismo:** o painel consome um **agregador (BFF `GET /home`)** que devolve perfil +
  turmas num único roundtrip, combinado com as sessões via **`forkJoin`** — fim do efeito cascata.

---

## Como funciona (visão do usuário)

1. O professor entra e **completa o perfil** (nome, disciplinas/competências).
2. Cria uma **turma**: escolhe a modalidade, os dias, a cor e — se for módulo — o total
   de aulas. O Tichr projeta toda a agenda na hora.
3. Acompanha no **Dashboard** qual é a próxima aula e navega para a **Agenda** para ver o
   mês inteiro.
4. Quando surge um imprevisto, lança uma **exceção** (data pontual) ou um **período de
   férias** (intervalo, global ou de uma turma específica). A agenda **se reorganiza
   automaticamente** e, nos módulos, a data de término é recalculada.
5. Ao **criar turmas além do limite do plano**, o backend responde `403 LIMIT_REACHED` e a
   tela troca o formulário pelo **card de upsell** — comprar vaga avulsa ou subir de nível
   — e **retenta o cadastro** automaticamente. O consumo aparece no **indicador de cota**.
6. Na turma, cadastra a **lista de chamada** (nomes em lote). Cada aluno é uma **carta**;
   clicar abre o **modal do aluno** — PIN do aluno, editar nome, excluir e pontuar com os
   **rótulos que ele mesmo escolheu** (ex.: "Moggar" / "Punir"). A pontuação e o ranking
   podem ser **ligados ou desligados** por turma. Uma **barra de progresso** acompanha as
   aulas concluídas (e vira a base coletiva quando há pontuação).
7. Na aba **Equipes** (plano Mestre), monta as equipes **arrastando** os alunos ou pelo
   botão **Distribuir**, e atribui **cargos** aos membros no modo de atribuição animado.
   Para dinâmicas rápidas, ainda pode usar a **roleta** de sorteio de squads.
8. Ao tentar um recurso de um plano superior (equipes = Mestre; gamificação = PhD), é levado
   ao **painel de planos** (`/planos`) para **fazer upgrade** — a troca reflete na hora (mock).
9. No **Plano PhD**, o professor define seu **@username** e o **PIN da turma**; os alunos
   entram no **portal** por essa jornada (`@username → turma → PIN turma → nome → PIN aluno`)
   para acompanhar a agenda, o próprio nível (com o nome de pontuação da turma), a **evolução
   da turma** e o **ranking**.

---

## Arquitetura & stack

> A versão navegável desta seção é a **[Vitrine técnica](#vitrine-técnica-tecnologia-pública)**
> (`/tecnologia`), com os diagramas do fluxo de dados.

- **Angular 20** *standalone* + **Signals** (estado reativo, sem NgRx). Componentes
  *OnPush*. **Angular CDK** (`@angular/cdk/drag-drop`) sustenta o quadro de equipes.
- **Gating por plano:** um mapa único (`core/recursos.ts` + `planoAtendeMinimo`) liga cada
  recurso ao plano mínimo; um `planoGuard` redireciona rotas premium para `/planos` e a aba
  Equipes mostra `app-recurso-bloqueado` *inline* quando o plano não alcança.
- **Smart vs. Dumb:** as *Pages* detêm estado e chamam os serviços; os componentes de UI
  (`app-card`, `app-icon`, `app-modal`, `app-spinner`, `app-turma-form`, …) só recebem
  `@Input` e emitem `@Output`.
- **Design system flat:** fonte **Inter**, paleta *Slate/Azul* via **CSS Variables**
  (claro/escuro), bordas sólidas, sem gradientes nem sombras esfumaçadas. Classes globais
  `.tichr-input`, `.btn-primary`, `.btn-outline` no `styles.scss`.
- **Backend como fonte, Firebase só-leitura no Qlick:** o app fala com a **API do backend**,
  que é o dono das credenciais e o **intermediário do login** — toda **escrita** passa por
  ela. A **única** exceção é o **Tichr Qlick**, que reintroduz o **Firebase JS SDK apenas
  para leitura em tempo real**: o `RealtimeService` (`initializeApp` + `getFirestore`)
  escuta o documento da partida via `onSnapshot`, enquanto os comandos continuam indo por
  REST (CQRS). A `apiKey` web fica no `environment` — é **pública por design** e as
  `firestore.rules` liberam só a leitura de `qlick_partidas`. O `AuthService` guarda o token
  no `localStorage`; um `HttpInterceptor` injeta o `Bearer` e trata `401` (→ `/login`); um
  segundo interceptor abre o **modal global de erro** para as demais falhas. Um *route
  guard* protege as telas do painel.
- **Dois mundos de sessão:** professor (`AuthService`) e aluno (`StudentAuthService`)
  têm **tokens separados** no `localStorage`. O interceptor de auth escolhe qual `Bearer`
  enviar e roteia o `401` para o login certo (`/login` ou `/t/:turmaId`); um `studentGuard`
  protege as rotas `/aluno/*`. O portal do aluno usa o `StudentLayout` (moldura própria).
- **Ambientes:** `src/environments/environment.ts` (produção → API na Vercel) e
  `environment.development.ts` (dev → `http://localhost:3000`), trocados por
  `fileReplacements` no build.

```
src/app/
  core/        # serviços (api, auth, student-auth, profile, quota, tema, realtime → Firestore onSnapshot), guards (auth, plano), interceptors, models, dados de planos/recursos, status-sessao (status dinâmico)
  ui/          # componentes burros (card, icon, modal, spinner, quota-tracker, upsell-card, chips-input, xp-bar, aluno-card, equipe-coluna, equipe-form, recurso-bloqueado, beta-badge…)
  pages/       # telas smart do painel (turma-detalhe, planos, jogos/qlick…) + portal do aluno (student-entrar, -login, -dashboard, -agenda, -ranking, -qlick…)
  layout/      # molduras: dashboard-layout (painel) e student-layout (portal do aluno)
```

O design de UI também reúne peças reutilizáveis dessas features: `app-quota-tracker`
(consumo de cota), `app-upsell-card`, `app-recurso-bloqueado` (bloqueio de plano),
`app-chips-input` (entradas em *chips* via Enter), `app-xp-bar` (nível + progresso
animado), `app-aluno-card` (card arrastável com cargos), `app-equipe-coluna`,
`app-equipe-form` e `app-beta-badge`.

---

## Marca

Azul da marca: **`#2563eb`**, fixo. Ele **não** acompanha o `--primary` (que muda de tom no
tema escuro) — é a constante que torna a marca reconhecível.

Dois componentes são a **fonte única**; nenhuma tela desenha a marca por conta própria:

```html
<app-logo />                             <!-- lockup (símbolo + "Tichr"), 32px -->
<app-logo [size]="30" />                 <!-- header -->
<app-logo variant="mark" />              <!-- só o símbolo -->

<app-game-logo game="qlick" [size]="56" />   <!-- qlick | wor | isolateus -->
```

O padrão é o **lockup**, não o símbolo sozinho: é a repetição do par símbolo+nome que ensina
o usuário a reconhecer o símbolo isolado depois. A palavra "Tichr" é texto e acompanha o
`currentColor` do contexto — clareia sobre superfície escura e escurece sobre clara sozinha.

### Variante única: o tile é autossuficiente

O símbolo é um tile com **campo em gradiente** (`#2563eb → #153885`) e glifo branco com folga
da borda. A silhueta é do próprio tile, então a marca recorta em qualquer superfície — clara
ou escura — com **uma variante só**. É o mesmo princípio dos logos dos jogos, e por isso não
há mais o par claro/escuro nem os tokens `--logo-field` / `--logo-glyph` que a marca antiga
(glifo "T" sangrando até a borda) exigia.

### Logos dos jogos: mesma lógica

| Jogo | Campo |
| --- | --- |
| Qlick | `#2563eb` (azul da marca) |
| Wor | `#b45309` |
| Isolateus | `#84cc16` |

Aqui o campo é colorido e sólido e o glifo **não** encosta na borda: a silhueta se sustenta
em qualquer fundo. O contorno branco é só uma keyline — recorta o tile no escuro e some no
claro, sem prejuízo. Uma variante resolve os dois temas.

⚠️ Os retângulos de contorno dependem de `fill="none"`. Sem isso o SVG cai para preto e o
traço cobre o campo inteiro. No componente o `fill="none"` está explícito em cada forma só de
traço, além de na raiz.

### Ícones (favicon, PWA, iOS)

`favicon.svg`, `favicon.ico` (16/32/48) e `brand/icon-*.png` usam a marca com o tile
arredondado, direto do símbolo — o glifo já tem folga da borda, então não precisa de ajuste
óptico. O campo em gradiente dispensa o par claro/escuro em qualquer aba.

O `icon-maskable-512` e o `apple-touch-icon` são **full-bleed e sem cantos arredondados de
propósito**: o sistema operacional aplica a própria máscara, e arredondar aqui daria canto
duplo. No *maskable* o glifo ainda encolhe (~76%) para caber na **zona segura** do recorte do
SO. O card **Open Graph** (`brand/og-image.png`, 1200×630) é o que aparece quando alguém
compartilha o link — o `og:image` precisa de URL absoluta, senão WhatsApp e X não renderizam.

Os binários (`.ico`, `.png`) são gerados a partir do próprio símbolo; para regerá-los depois
de mudar a marca, renderize o SVG de `brand/tichr-mark.svg` nos tamanhos acima.

### Regras de uso

- **Respiro** de no mínimo 30% do lado do símbolo em volta (o componente já reserva no `gap`).
- **Tamanho mínimo** do lockup: símbolo a 20px. Abaixo disso, use `variant="mark"`.
- Não recolorir, girar, esticar nem aplicar sombra. Não trocar o azul pelo `--primary`.
- **Logo ≠ ícone.** Use a logo do jogo só onde ele aparece *como produto* (vitrine de Jogos,
  hero da mini-landing, cards da landing). Em uso funcional inline — chips, botões, rótulos de
  equipe — continue com o `<app-icon>`. Logo repetido em toda posição vira ruído e perde força.

---

## Rodando

```bash
npm install
npm start                       # dev (localhost:4200) → API em localhost:3000
npm run build                   # produção → API na Vercel
```

> O backend precisa estar no ar (localhost:3000 em dev) para login e dados. Veja o
> `README` do `tichr-be` para a estrutura de dados, endpoints e as regras do motor de
> agendamento.
