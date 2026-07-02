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
| `/turmas/nova` · `/turmas/:id/editar` | **Nova / Editar turma** | Formulário reativo com dias, modalidade, cor, disciplina, horários. Editar **reprojeta** a agenda. |
| `/configuracoes` | **Configurações** | Perfil (nome, disciplina, bio, competências) + **períodos de férias globais**. |

Recursos transversais: **modal global de erro** (toda falha de rede vira um aviso
claro), **estados de carregamento** consistentes, **tema claro/escuro** nativo, e
**cores por turma** dando identidade ao calendário.

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
- **Ambientes:** `src/environments/environment.ts` (produção → API na Vercel) e
  `environment.development.ts` (dev → `http://localhost:3000`), trocados por
  `fileReplacements` no build.

```
src/app/
  core/        # serviços (api, auth, profile, tema), interceptors, models, helpers
  ui/          # componentes burros reutilizáveis (card, icon, modal, spinner, header, menu…)
  pages/       # telas smart (landing, login, dashboard, agenda, turmas, configuracoes…)
  layout/      # moldura do painel (header + menu + <router-outlet>)
```

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
