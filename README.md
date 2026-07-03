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
| `/` | **Landing** | Explica o conceito com uma demo interativa do deslizamento; CTA de acesso beta e login. |
| `/login` | **Login** | Entrada (email/senha) — MVP *invite-only*, sem cadastro aberto. |
| `/dashboard` | **Dashboard** | Recepção: saudação por horário, **próxima aula** em destaque (com turma, cor e horário), onboarding no primeiro acesso, e o gatilho de "Exceção". |
| `/agenda` | **Minha Agenda** | Calendário em **grid de 7 colunas**; cada aula é um *badge* na cor da turma. Clicar num dia abre os detalhes. |
| `/turmas` | **Minhas Turmas** | Lista das turmas (nome, cor, disciplina, modalidade, horário, término). |
| `/turmas/nova` · `/turmas/:id/editar` | **Nova / Editar turma** | Formulário reativo com dias, modalidade, cor, disciplina, horários. Editar **reprojeta** a agenda. Criar respeita a **cota do plano** (com *upsell* ao estourar). |
| `/turmas/:id` | **Detalhe da turma** | Abas **Agenda** (sessões) e **Alunos** (lista de chamada + *Quick XP* + porta de entrada das dinâmicas). |
| `/turmas/:id/dinamica` | **Nova dinâmica** | Sorteio de **squads**: nº de equipes, papéis/temas em *chips*, e a **roleta** que renderiza os grupos. |
| `/configuracoes` | **Configurações** | Perfil (nome, disciplina, bio, competências) + **períodos de férias globais**. |

### Portal do aluno (Plano PhD)

Experiência **isolada** do painel do professor (sem menu lateral, com barra inferior
estilo app), autenticada por **PIN** e com token próprio.

| Rota | Tela | Papel |
|---|---|---|
| `/t/:turmaId` | **Login do aluno** *(pública)* | Saudação da turma, seleção do próprio nome e **teclado numérico** para os 4 dígitos do PIN. |
| `/aluno/dashboard` | **Início** | Saudação + **barra de XP/nível** animada (Prata → Diamante). |
| `/aluno/agenda` | **Agenda** | Próximos dias letivos e feriados, **já recalculados**, somente leitura. |
| `/aluno/ranking` | **Ranking** | Pódio (🥇🥈🥉) da turma, com o **card do próprio aluno destacado**. |

Recursos transversais: **modal global de erro** (toda falha de rede vira um aviso
claro — exceto a cota, tratada *inline*), **estados de carregamento** consistentes,
**tema claro/escuro** nativo, **cores por turma**, o **indicador de cota** no menu
lateral e o **card de upsell** ao atingir o limite do plano.

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
6. Na turma, cadastra a **lista de chamada** (nomes em lote) e monta **dinâmicas de
   grupos**: define equipes, papéis e temas e roda a **roleta** que sorteia os squads.
7. No **Plano PhD**, distribui **XP** com um clique (*Quick XP*) e os alunos entram no
   **portal** por PIN para acompanhar a agenda, o próprio nível e o **ranking** da turma.

---

## Arquitetura & stack

- **Angular 20** *standalone* + **Signals** (estado reativo, sem NgRx). Componentes
  *OnPush*.
- **Smart vs. Dumb:** as *Pages* detêm estado e chamam os serviços; os componentes de UI
  (`app-card`, `app-icon`, `app-modal`, `app-spinner`, `app-turma-form`, …) só recebem
  `@Input` e emitem `@Output`.
- **Design system flat:** fonte **Inter**, paleta *Slate/Azul* via **CSS Variables**
  (claro/escuro), bordas sólidas, sem gradientes nem sombras esfumaçadas. Classes globais
  `.tichr-input`, `.btn-primary`, `.btn-outline` no `styles.scss`.
- **Sem Firebase no frontend:** o app fala apenas com a **API do backend**, que é o dono
  das credenciais e o **intermediário do login**. O `AuthService` guarda o token no
  `localStorage`; um `HttpInterceptor` injeta o `Bearer` e trata `401` (→ `/login`); um
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
  core/        # serviços (api, auth, student-auth, profile, quota, tema), interceptors, models, helpers
  ui/          # componentes burros (card, icon, modal, spinner, quota-tracker, upsell-card, chips-input, xp-bar…)
  pages/       # telas smart do painel + portal do aluno (student-login, student-dashboard, -agenda, -ranking…)
  layout/      # molduras: dashboard-layout (painel) e student-layout (portal do aluno)
```

O design de UI também reúne peças reutilizáveis dessas features: `app-quota-tracker`
(consumo de cota), `app-upsell-card`, `app-chips-input` (entradas em *chips* via Enter) e
`app-xp-bar` (nível + progresso animado).

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
