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
| `/agenda` | **Minha Agenda** | Alternância **Calendário** (grade de 7 colunas, semana atual + 4) e **Detalhado** (próximos 15 dias por turnos Manhã/Tarde/Noite); a escolha é memorizada. |
| `/plano-aula` | **Plano de Aula** | Escopo geral por disciplina (Graduado) e, no plano Mestre, **backlog de tópicos** + **quadro de alocação drag-and-drop** na grade da turma. Recurso do **plano Graduado+** (Estagiário vê cadeado). |
| `/turmas` | **Minhas Turmas** | Lista das turmas em abas **Ativas** / **Encerradas**, com a ação **Encerrar turma** (vira somente leitura e vai para o Hall da Fama). |
| `/turmas/nova` · `/turmas/:id/editar` | **Nova / Editar turma** | Formulário reativo com dias, modalidade, cor, disciplina, horários e a config de **Pontuação & Gamificação** (liga/desliga, nome da pontuação, rótulos dos botões, ranking on/off). Editar **reprojeta** a agenda. Criar respeita a **cota do plano** (com *upsell* ao estourar). |
| `/turmas/:id` | **Detalhe da turma** | Exibe o **PIN da turma** e uma **barra de progresso** do curso (que segue o nome da pontuação como base coletiva quando ativa). Turmas legadas (PIN 6 díg) mostram um **aviso + modal para migrar aos Smart PINs** (2 díg). Abas: **Agenda**, **Alunos** (cartas + **modal do aluno**), **Equipes** (*kanban* + **cargos**) e **Jogos** (Qlicks da turma, com **Adicionar jogo** da biblioteca — N:N). |
| `/turmas/:id/dinamica` | **Nova dinâmica** | Sorteio de **squads**: nº de equipes, papéis/temas em *chips*, e a **roleta** que renderiza os grupos. Recurso do **plano Mestre**. |
| `/jogos` · `/jogos/qlick` | **Jogos / Tichr Qlick** | Vitrine de jogos e a mini-landing do **Tichr Qlick** (quiz ao vivo). Recurso do **plano PhD** (upsell nos inferiores). |
| `/jogos/wor` · `.../novo` · `.../meus` · `.../partida/:id` | **Tichr Wor** | Guerra de castelos PvP: landing interna, **wizard de criação** (arsenal + **dicas por IA**, reordenar por drag-and-drop), lista de batalhas e a **tela do projetor** (lobby → jogo, realtime). |
| `/aluno/wor` | **Wor (aluno)** | Cliente **mobile-first**: teclado de letras, **Dilema Tático** (atacar/comprar dica), **Risco Heroico**, **modal da Queda da Horda** e animação de dano. Escuta só o próprio castelo (realtime barato). |
| `/jogos/qlick/meus` | **Meus Qlicks** | Lista dos quizzes do professor; **Rodar** pergunta "para qual turma?" quando o Qlick está em várias (N:N). |
| `/jogos/qlick/novo` · `/editar/:id` | **Estúdio do Qlick** | Formulário reativo (FormArray) de perguntas → alternativas, com marcação da correta e duração. |
| `/jogos/qlick/partida/:id` | **Sala do professor** | Comanda a partida em tempo real; o **lobby** exibe o **PIN da turma em tamanho grande** + um **modal de assistência** (grid de alunos com o PIN revelado por toque, em *flip*). Depois: pergunta (timer + revelar), ranking da rodada e pódio. |
| `/planos` | **Assinatura** | Vitrine dos 4 planos com o **plano atual em destaque** e troca de plano (mock). Destino do botão "Fazer upgrade" quando um recurso exige um plano superior. |
| `/configuracoes` | **Hub de Configurações** | Índice da conta: cabeçalho com **avatar + nome** do professor e um menu para **Meu Perfil** e **Meu Plano**. |
| `/configuracoes/perfil` | **Meu Perfil** | **Foto de perfil** (editar → recorte 1:1 → compressão → upload ao Firebase Storage), dados (nome, disciplina, bio), **@username** com disponibilidade em tempo real e **trava de 60 dias**, **disciplinas como cards** (modal para renomear/excluir) e **férias globais**. |
| `/configuracoes/plano` | **Meu Plano** | Resumo da assinatura atual (plano, limite, vagas avulsas, features) + **upsell** e atalho de gestão. |
| `/novidades` | **Novidades (Changelog)** *(pública)* | Timeline das versões (Nova feature / Melhoria / Correção), alimentada por `changelog.data.ts` e espelhando o README. Linkada no **rodapé global**. |

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
| `/aluno/dashboard` | **Início** | Card **"O que vem por aí"** com o **tópico da próxima aula**; **barra de nível** (Prata → Diamante) + **barra de evolução da turma**; o rótulo da pontuação segue o **nome definido na turma** (ex.: "Aura"). |
| `/aluno/agenda` | **Agenda** | Dias letivos com status dinâmico (Concluída / Em andamento / Agendada) e o **tópico** de cada aula ("o que já vimos") — sincronizados do Plano de Aula quando o professor é PhD. |
| `/aluno/ranking` | **Ranking** | Pódio (🥇🥈🥉) da turma, com o **card do próprio aluno destacado**. A aba **some** quando a turma desativa o ranking. |
| `/aluno/qlick` | **Tichr Qlick** | Entra no quiz "de hoje": **lobby animado** (loader temático), alternativas **color-coded A/B/C/D** com feedback de clique (press/scale) e estado de espera, **revelação animada** (correta brilha, erradas em cinza, confete no acerto / shake no erro) e **pódio final** com os pontos somados ao XP. |

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

Recursos transversais: **modal global de erro** (toda falha de rede vira um aviso
claro — exceto a cota e a **trava de @username**, tratadas *inline*), **estados de carregamento**
consistentes, **tema claro/escuro** nativo, **cores por turma**, o **indicador de cota** no menu
lateral, o **card de upsell** ao atingir o limite do plano, o selo **Beta** no header
(aviso de que recursos experimentais podem conter bugs e perder dados) e o **rodapé global**
(autoria, GitHub e âncora para as Novidades). O menu lateral inclui **"Plano de Aula"**
(com cadeado + upsell para o Estagiário).

### Foto de perfil, mídia e trava de identificador

- **Avatar (client-side):** ao trocar a foto, o Angular abre um **modal de recorte 1:1**
  (`ngx-image-cropper`), **comprime** silenciosamente para ~50KB / 250px
  (`browser-image-compression`), sobe o micro-arquivo direto ao **Firebase Storage** e envia
  a **URL** ao backend (`PATCH /profile`). O `<app-avatar>` mostra a foto ou um **placeholder**
  com as iniciais. As **regras do Storage** (`storage.rules`) e do Firestore são publicadas por
  um **workflow do GitHub** a cada merge na `main`.
- **Trava de @username:** o handle só troca a cada **60 dias**; dentro do período o campo fica
  **desabilitado** com a microcópia "Você poderá alterar… em X dias" (o backend responde
  `409 USERNAME_COOLDOWN`).

### Cadastro, onboarding e tutoriais

- **Cadastro frictionless:** os CTAs "Começar grátis" levam à tela `/cadastro` (e-mail, senha
  e confirmação). Ao criar a conta (`POST /auth/signup`, plano Estagiário) o usuário já é
  autenticado e cai direto no painel.
- **Soft-block de perfil:** enquanto faltar **nome, @username ou foto**, o painel exibe o
  `<app-onboarding-card>` em destaque ("Falta pouco!") com um checklist e o atalho para
  concluir o perfil.
- **Tutoriais de primeiro acesso:** na primeira visita a `/dashboard`, `/agenda`, `/turmas`
  ou `/jogos`, o `DashboardLayout` escurece o fundo e mostra o `<app-tutorial-overlay>` com
  uma dica rápida e o "primeiro passo" (marca como visto no `localStorage`; respeita
  `prefers-reduced-motion`).

### Painel Administrativo (backoffice — só admins)

- Atalho **"Painel Admin"** nas Configurações, exibido só quando o perfil é admin (o
  `adminGuard` confirma pelo `GET /admin/ping`). Rotas isoladas `/admin`, `/admin/usuarios`
  e `/admin/cupons`.
- **Dashboard** com métricas (total, ativos, distribuição por plano); **CRM** com busca de
  professores e uso (turmas/alunos/Qlicks) e um modal de ações (redefinir senha, limpar dados,
  desativar/excluir, override de plano, conceder/revogar admin); **Cupons** (CRUD).
- **Resgate de cupom** em "Meu Plano": o professor digita o código e ganha desconto/meses
  grátis (`POST /checkout/cupom`).

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

## Rodando

```bash
npm install
npm start                       # dev (localhost:4200) → API em localhost:3000
npm run build                   # produção → API na Vercel
```

> O backend precisa estar no ar (localhost:3000 em dev) para login e dados. Veja o
> `README` do `tichr-be` para a estrutura de dados, endpoints e as regras do motor de
> agendamento.
