import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatarData } from '../../core/date-format';
import {
  Aluno,
  Cargo,
  CriarEquipePayload,
  Equipe,
  ProgressoTurma,
  Qlick,
  Sessao,
  Turma,
} from '../../core/models';
import { planoAtendeMinimo, podeGamificar } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { ROTULO_STATUS, statusVisual } from '../../core/status-sessao';
import { TurmaApiService } from '../../core/turma-api.service';
import { AlunoCard } from '../../ui/aluno-card/aluno-card';
import { Card } from '../../ui/card/card';
import { EquipeColuna } from '../../ui/equipe-coluna/equipe-coluna';
import { EquipeForm } from '../../ui/equipe-form/equipe-form';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { RecursoBloqueado } from '../../ui/recurso-bloqueado/recurso-bloqueado';
import { Spinner } from '../../ui/spinner/spinner';

type Aba = 'agenda' | 'alunos' | 'equipes' | 'jogos';
type Ordenacao = 'nome' | 'pontuacao';

/**
 * Detalhe da turma em 3 abas independentes: "Agenda" (sessões), "Alunos"
 * (lista + pontuação) e "Equipes" (quadro drag & drop, gate do plano Mestre).
 */
@Component({
  selector: 'app-turma-detalhe-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Card,
    Icon,
    Spinner,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    AlunoCard,
    EquipeColuna,
    EquipeForm,
    Modal,
    RecursoBloqueado,
  ],
  template: `
    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (turma(); as t) {
      <header class="head">
        <h1 class="title">
          @if (t.cor) {
            <span class="dot" [style.background]="t.cor"></span>
          }
          {{ t.nome }}
        </h1>
        <a class="btn-outline" [routerLink]="['/turmas', t.id, 'editar']">Editar</a>
      </header>

      @if (t.pinTurma) {
        <p class="pinturma">
          PIN da turma: <strong>{{ t.pinTurma }}</strong>
          <span class="pinturma__hint">— os alunos usam para entrar no portal</span>
        </p>
      }

      @if (pinLegado()) {
        <div class="migrar-aviso">
          <div class="migrar-aviso__txt">
            <strong>PIN antigo detectado</strong>
            <span>Esta turma ainda usa PINs de 6 dígitos. Atualize para os Smart PINs de 2 dígitos do Tichr Qlick — mais fáceis para os alunos digitarem em aula.</span>
          </div>
          <button class="btn-primary" type="button" (click)="migrarAberto.set(true)">
            Atualizar PINs
          </button>
        </div>
      }

      @if (progresso(); as p) {
        <div class="prog">
          <div class="prog__top">
            <span class="prog__tit">
              {{ cfg().pontuacaoAtiva ? cfg().nomePontuacao + ' da turma' : 'Progresso do curso' }}
            </span>
            <span class="prog__val">
              @if (cfg().pontuacaoAtiva) {
                {{ p.pontuacaoBase }} {{ cfg().nomePontuacao }}
              } @else {
                {{ p.pct }}%
              }
            </span>
          </div>
          <div class="trilho"><div class="trilho__fill" [style.width.%]="p.pct"></div></div>
          <span class="prog__sub">
            {{ p.concluidas }} de {{ p.total }} aulas concluídas
            @if (cfg().pontuacaoAtiva) { · base coletiva pelo andamento do curso }
          </span>
        </div>
      }

      <nav class="tabs">
        <button
          class="tab"
          [class.tab--active]="aba() === 'agenda'"
          type="button"
          (click)="aba.set('agenda')"
        >
          Agenda
        </button>
        <button
          class="tab"
          [class.tab--active]="aba() === 'alunos'"
          type="button"
          (click)="aba.set('alunos')"
        >
          Alunos ({{ alunos().length }})
        </button>
        <button
          class="tab"
          [class.tab--active]="aba() === 'equipes'"
          type="button"
          (click)="aba.set('equipes')"
        >
          Equipes ({{ equipes().length }})
        </button>
        <button
          class="tab"
          [class.tab--active]="aba() === 'jogos'"
          type="button"
          (click)="aba.set('jogos')"
        >
          Jogos ({{ qlicksDaTurma().length }})
        </button>
      </nav>

      @switch (aba()) {
        @case ('agenda') {
          @if (sessoes().length === 0) {
            <app-card><p class="muted">Nenhuma aula projetada.</p></app-card>
          } @else {
            <div class="sessoes">
              @for (s of sessoes(); track s.id) {
                <app-card>
                  <div class="sessao">
                    <span class="sessao__n">Aula {{ s.numero }}</span>
                    <span class="sessao__d">{{ formatarData(s.data) }}</span>
                    <span class="status status--{{ statusAula(s).toLowerCase() }}">
                      {{ rotuloStatus[statusAula(s)] }}
                    </span>
                  </div>
                </app-card>
              }
            </div>
          }
        }

        @case ('alunos') {
          <app-card>
            <form class="add" (submit)="$event.preventDefault(); adicionar()">
              <input
                class="tichr-input"
                placeholder="Nomes separados por vírgula ou quebra de linha"
                [value]="entrada()"
                (input)="entrada.set($any($event.target).value)"
              />
              <button class="btn-primary" type="submit" [disabled]="salvando()">
                Adicionar
              </button>
            </form>

            @if (alunos().length === 0) {
              <p class="muted vazio">Nenhum aluno ainda. Adicione nomes acima.</p>
            } @else {
              <div class="ordenar">
                <span class="ordenar__label">Ordenar por</span>
                <button
                  class="seg"
                  [class.seg--on]="ordenacao() === 'nome'"
                  type="button"
                  (click)="ordenacao.set('nome')"
                >
                  Nome
                </button>
                @if (cfg().pontuacaoAtiva) {
                  <button
                    class="seg"
                    [class.seg--on]="ordenacao() === 'pontuacao'"
                    type="button"
                    (click)="ordenacao.set('pontuacao')"
                  >
                    {{ cfg().nomePontuacao }}
                  </button>
                }
              </div>

              <ul class="lista">
                @for (a of alunosOrdenados(); track a.id) {
                  <li class="lista__item">
                    <button
                      class="lista__click"
                      type="button"
                      (click)="abrirDetalhe(a)"
                    >
                      <span class="lista__avatar"><app-icon name="user" [size]="18" /></span>
                      <span class="lista__nome">{{ a.nome }}</span>
                      @if (cfg().pontuacaoAtiva) {
                        <span class="lista__xp">
                          {{ a.xpTotal ?? 0 }} {{ cfg().nomePontuacao }}
                        </span>
                      }
                    </button>
                  </li>
                }
              </ul>
            }
          </app-card>
        }

        @case ('equipes') {
          @if (podeGerenciar()) {
            <div class="stack">
            <app-card>
              <div class="acoes">
                <button class="btn-outline" type="button" (click)="abrirNova()">
                  <app-icon name="plus" [size]="16" /> Nova equipe
                </button>
                <button
                  class="btn-primary"
                  type="button"
                  [disabled]="equipes().length === 0 || distribuindo()"
                  (click)="distribuir()"
                >
                  <app-icon name="users" [size]="16" />
                  {{ distribuindo() ? 'Distribuindo…' : 'Distribuir' }}
                </button>
              </div>
              @if (equipes().length === 0) {
                <p class="hint">Crie ao menos uma equipe para distribuir os alunos.</p>
              }
            </app-card>

            <app-card>
              <form class="add" (submit)="$event.preventDefault(); adicionarCargo()">
                <input
                  class="tichr-input"
                  placeholder="Cargos separados por vírgula (ex: Líder, Redator)"
                  [value]="entradaCargo()"
                  (input)="entradaCargo.set($any($event.target).value)"
                />
                <button class="btn-outline" type="submit" [disabled]="salvandoCargo()">
                  Adicionar
                </button>
              </form>
              @if (cargos().length) {
                <div class="cargos-chips">
                  @for (c of cargos(); track c.id) {
                    <span class="chip">
                      {{ c.nome }}
                      <button
                        type="button"
                        class="chip__x"
                        aria-label="Remover cargo"
                        (click)="removerCargo(c)"
                      >×</button>
                    </span>
                  }
                </div>
                <button
                  class="btn-primary"
                  type="button"
                  [disabled]="!!atribuindo()"
                  (click)="abrirAtribuicao()"
                >
                  Atribuir cargos
                </button>
              } @else {
                <p class="hint">Cadastre cargos para atribuí-los aos membros das equipes.</p>
              }
            </app-card>

            <div cdkDropListGroup>
              <section class="pool">
                <header class="pool__head">
                  <h3 class="pool__titulo">Sem equipe</h3>
                  <span class="pool__contagem">{{ semEquipe().length }}</span>
                </header>
                <div
                  class="pool__list"
                  cdkDropList
                  id="pool"
                  role="list"
                  aria-label="Alunos sem equipe"
                  [cdkDropListData]="semEquipe()"
                  (cdkDropListDropped)="soltar($event, null)"
                >
                  @for (a of semEquipe(); track a.id) {
                    <app-aluno-card
                      cdkDrag
                      [aluno]="a"
                      [mostrarPontuacao]="false"
                      [cargos]="cargosDoAluno(a)"
                    />
                  } @empty {
                    <p class="hint">Todos os alunos estão em equipes.</p>
                  }
                </div>
              </section>

              <div class="board">
                @for (e of equipes(); track e.id) {
                  <app-equipe-coluna
                    [equipe]="e"
                    [total]="daEquipe(e.id).length"
                    [balancando]="!!atribuindo()"
                    (info)="abrirInfo(e)"
                    (excluir)="excluir(e)"
                  >
                    <div
                      class="dropzone"
                      cdkDropList
                      role="list"
                      [id]="e.id"
                      [attr.aria-label]="'Equipe ' + e.titulo"
                      [cdkDropListData]="daEquipe(e.id)"
                      [cdkDropListDisabled]="!!atribuindo()"
                      (cdkDropListDropped)="soltar($event, e.id)"
                    >
                      @for (a of daEquipe(e.id); track a.id) {
                        <app-aluno-card
                          cdkDrag
                          [aluno]="a"
                          [mostrarPontuacao]="false"
                          [cargos]="cargosDoAluno(a)"
                          [modoAtribuicao]="!!atribuindo()"
                          [selecionado]="selecionados().has(a.id)"
                          (toggle)="toggleMembro(a)"
                        />
                      } @empty {
                        <p class="hint">Solte alunos aqui.</p>
                      }
                    </div>
                  </app-equipe-coluna>
                }
              </div>

              @if (equipes().length === 0) {
                <p class="muted vazio">Nenhuma equipe ainda. Clique em "Nova equipe".</p>
              }
            </div>
            </div>
          } @else {
            <app-recurso-bloqueado
              recurso="Gestão de equipes"
              planoNecessario="Mestre"
              (upgrade)="irParaPlanos()"
            />
          }
        }

        @case ('jogos') {
          @if (qlicksDaTurma().length > 0) {
            <div class="jogos">
              @for (q of qlicksDaTurma(); track q.id) {
                <app-card>
                  <div class="jogo">
                    <div class="jogo__info">
                      <strong class="jogo__tit">{{ q.titulo }}</strong>
                      <span class="jogo__meta">
                        {{ q.perguntas.length }} perguntas · {{ q.duracaoSegundos }}s/questão
                      </span>
                    </div>
                    <button
                      class="btn-primary btn-sm"
                      type="button"
                      [disabled]="rodandoQlick()"
                      (click)="rodarQlick(q)"
                    >
                      Rodar
                    </button>
                  </div>
                </app-card>
              }
              <button class="btn-outline ver-qlicks" type="button" (click)="addJogoAberto.set(true)">
                Adicionar jogo
              </button>
              <a class="btn-outline ver-qlicks" routerLink="/jogos/qlick">
                Gerenciar todos os Qlicks
              </a>
            </div>
          } @else {
            <app-card>
              <div class="jogos-vazio">
                <span class="jogos-vazio__ic"><app-icon name="game" [size]="30" /></span>
                <h3>Nenhum jogo nesta turma</h3>
                <p class="muted">
                  Crie um <strong>Tichr Qlick</strong> — quiz ao vivo — e vincule a esta
                  turma para rodar em aula.
                </p>
                <a class="btn-primary ir-jogos" routerLink="/jogos/qlick">
                  Ir para o Tichr Qlick
                </a>
                @if (qlicksDisponiveis().length) {
                  <button class="btn-outline ir-jogos" type="button" (click)="addJogoAberto.set(true)">
                    Adicionar da biblioteca
                  </button>
                }
              </div>
            </app-card>
          }
        }
      }

      <app-modal
        [open]="addJogoAberto()"
        title="Adicionar jogo"
        (close)="atribuindoJogo() || addJogoAberto.set(false)"
      >
        @if (qlicksDisponiveis().length) {
          <p class="muted">Escolha um Qlick da sua biblioteca para atribuir a esta turma:</p>
          <div class="add-jogos">
            @for (q of qlicksDisponiveis(); track q.id) {
              <button class="add-jogo" type="button" [disabled]="atribuindoJogo()" (click)="adicionarJogo(q)">
                <strong>{{ q.titulo }}</strong>
                <small>{{ q.perguntas.length }} perguntas</small>
              </button>
            }
          </div>
        } @else {
          <p class="muted">Todos os seus Qlicks já estão nesta turma.</p>
        }
        <div modal-actions>
          <button class="btn-outline" type="button" [disabled]="atribuindoJogo()" (click)="addJogoAberto.set(false)">
            Fechar
          </button>
        </div>
      </app-modal>

      <app-equipe-form
        [open]="formOpen()"
        [initial]="editando()"
        [submitting]="salvandoEquipe()"
        (save)="salvarEquipe($event)"
        (close)="formOpen.set(false)"
      />

      <app-modal
        [open]="!!infoEquipe()"
        [title]="infoEquipe()?.titulo ?? ''"
        (close)="infoEquipe.set(null)"
      >
        @if (infoEquipe(); as e) {
          <div class="info">
            <span class="info__cor" [style.background]="e.cor"></span>
            <span class="info__cortxt">{{ e.cor }}</span>
          </div>
          <p class="info__desc">{{ e.descricao || 'Sem descrição.' }}</p>
        }
        <div modal-actions>
          <button class="btn-outline" type="button" (click)="infoEquipe.set(null)">
            Fechar
          </button>
          <button class="btn-primary" type="button" (click)="editarDaInfo()">
            Editar
          </button>
        </div>
      </app-modal>

      <app-modal
        [open]="!!detalhe()"
        [title]="detalhe()?.nome ?? 'Aluno'"
        (close)="fecharDetalhe()"
      >
        @if (detalhe(); as a) {
          @if (a.pinAcesso) {
            <div class="pinbox">
              <span class="pinbox__lbl">PIN do aluno</span>
              <strong class="pinbox__val">{{ a.pinAcesso }}</strong>
            </div>
          }

          <label class="campo">
            <span>Nome</span>
            <div class="linha">
              <input
                class="tichr-input"
                [value]="nomeEdit()"
                (input)="nomeEdit.set($any($event.target).value)"
              />
              <button
                class="btn-outline"
                type="button"
                [disabled]="salvandoNome() || !nomeEdit().trim()"
                (click)="salvarNome()"
              >
                Salvar
              </button>
            </div>
          </label>

          @if (cfg().pontuacaoAtiva) {
            <div class="secao">
              <div class="secao__top">
                <span>{{ cfg().nomePontuacao }}: <strong>{{ a.xpTotal ?? 0 }}</strong></span>
                @if (!podePontuar()) { <app-icon name="lock" [size]="15" /> }
              </div>
              @if (podePontuar()) {
                <div class="linha">
                  <input
                    class="tichr-input qtd"
                    type="number"
                    min="1"
                    [value]="qtd()"
                    (input)="qtd.set(+$any($event.target).value)"
                  />
                  <button class="btn-outline" type="button" [disabled]="pontuandoBusy()" (click)="aplicarPontos(-1)">
                    {{ cfg().rotuloRemover }}
                  </button>
                  <button class="btn-primary" type="button" [disabled]="pontuandoBusy()" (click)="aplicarPontos(1)">
                    {{ cfg().rotuloAdicionar }}
                  </button>
                </div>
              } @else {
                <button class="btn-primary" type="button" (click)="upsellGamificacao.set(true)">
                  Desbloquear com o plano PhD
                </button>
              }
            </div>
          }
        }
        <div modal-actions>
          <button class="btn-outline danger" type="button" (click)="excluirDoDetalhe()">
            Excluir aluno
          </button>
          <button class="btn-primary" type="button" (click)="fecharDetalhe()">
            Fechar
          </button>
        </div>
      </app-modal>

      <app-modal
        [open]="upsellGamificacao()"
        title="Recurso do plano PhD"
        (close)="upsellGamificacao.set(false)"
      >
        <p class="muted">
          A <strong>pontuação e o Portal do Aluno</strong> (XP, ranking e
          gamificação) fazem parte do plano <strong>PhD</strong>. Faça upgrade
          para engajar sua turma.
        </p>
        <div modal-actions>
          <button class="btn-outline" type="button" (click)="upsellGamificacao.set(false)">
            Agora não
          </button>
          <button class="btn-primary" type="button" (click)="irParaPlanosGamificacao()">
            Fazer upgrade
          </button>
        </div>
      </app-modal>

      <app-modal
        [open]="modalCargos()"
        title="Atribuir cargo"
        (close)="modalCargos.set(false)"
      >
        <p class="muted">Escolha o cargo que você quer atribuir aos membros:</p>
        <div class="cargos-escolha">
          @for (c of cargos(); track c.id) {
            <button class="cargo-op" type="button" (click)="escolherCargo(c)">
              {{ c.nome }}
            </button>
          }
        </div>
        <div modal-actions>
          <button class="btn-outline" type="button" (click)="modalCargos.set(false)">
            Cancelar
          </button>
        </div>
      </app-modal>

      @if (atribuindo(); as cargo) {
        <div class="toast" role="status">
          <span class="toast__msg">
            Selecione os membros responsáveis por <strong>{{ cargo.nome }}</strong>
          </span>
          <div class="toast__acoes">
            <button class="btn-outline" type="button" (click)="cancelarAtribuicao()">
              Cancelar
            </button>
            <button
              class="btn-primary"
              type="button"
              [disabled]="finalizando()"
              (click)="finalizarAtribuicao()"
            >
              {{ finalizando() ? 'Salvando…' : 'Finalizar atribuição' }}
            </button>
          </div>
        </div>
      }

      <app-modal
        [open]="migrarAberto()"
        title="Atualizar PINs da turma"
        (close)="migrando() || migrarAberto.set(false)"
      >
        <p class="muted">
          Vamos gerar um novo <strong>PIN curto (2 dígitos)</strong> para a turma e redistribuir os
          PINs dos alunos (01, 02, 03…). Os PINs antigos deixarão de funcionar — avise seus alunos
          dos novos após a atualização.
        </p>
        <div modal-actions>
          <button class="btn-outline" type="button" [disabled]="migrando()" (click)="migrarAberto.set(false)">
            Cancelar
          </button>
          <button class="btn-primary" type="button" [disabled]="migrando()" (click)="migrarPins()">
            {{ migrando() ? 'Atualizando…' : 'Atualizar agora' }}
          </button>
        </div>
      </app-modal>
    } @else {
      <app-card><p class="muted">Turma não encontrada.</p></app-card>
    }
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .title { margin: 0; font-size: 1.5rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
    .dot { width: 12px; height: 12px; border-radius: 999px; display: inline-block; }
    .tabs {
      display: flex;
      gap: 0.25rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    .tab {
      padding: 0.6rem 0.9rem;
      font: inherit;
      font-weight: 600;
      color: var(--text-muted);
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
    }
    .tab--active { color: var(--primary); border-bottom-color: var(--primary); }
    .sessoes { display: flex; flex-direction: column; gap: 0.5rem; }
    .sessao { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
    .sessao__n { font-weight: 600; }
    .sessao__d { color: var(--text-muted); font-variant-numeric: tabular-nums; margin-left: auto; margin-right: 0.75rem; }
    .status { font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; }
    .status--agendada { color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .status--cancelada { color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, transparent); }
    .status--concluida { color: var(--text-muted); background: var(--surface-alt); }
    .status--em_andamento {
      color: var(--success);
      background: color-mix(in srgb, var(--success) 15%, transparent);
      animation: pulso 1.4s ease-in-out infinite;
    }
    @keyframes pulso {
      0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--success) 0%, transparent); }
      50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--success) 30%, transparent); }
    }
    @media (prefers-reduced-motion: reduce) {
      .status--em_andamento { animation: none; }
    }
    .add { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .add .tichr-input { flex: 1 1 240px; }
    .acoes { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .vazio { margin: 1rem 0 0; }
    .muted { color: var(--text-muted); }
    .hint { color: var(--text-muted); font-size: 0.85rem; margin: 0.25rem 0; }

    /* ===== Aba Alunos ===== */
    .ordenar { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .ordenar__label { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
    .seg {
      font: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      cursor: pointer;
    }
    .seg--on { color: var(--primary-contrast); background: var(--primary); border-color: var(--primary); }
    .lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
    .lista__item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      border-radius: var(--radius);
      background: var(--surface-alt);
    }
    .lista__click {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      min-width: 0;
      padding: 0.6rem 0.75rem;
      font: inherit;
      text-align: left;
      background: none;
      border: none;
      cursor: pointer;
      color: inherit;
    }
    .lista__click--lock { opacity: 0.6; cursor: not-allowed; }
    .lista__click--lock .lista__xp { color: var(--text-muted); }
    .lista__nome { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lista__xp {
      flex: 0 0 auto;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      font-size: 0.85rem;
      color: var(--primary);
    }
    .remover {
      display: inline-flex;
      color: var(--text-muted);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
    }
    .remover:hover { color: var(--danger); }
    .pontos { margin: 0 0 0.75rem; font-size: 1.1rem; }
    .campo { display: block; }
    .campo > span { display: block; margin-bottom: 0.35rem; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }

    .lista__avatar { display: inline-flex; flex: 0 0 auto; color: var(--text-muted); }
    .pinturma { margin: -0.25rem 0 0.75rem; font-size: 0.9rem; }
    .pinturma strong { font-variant-numeric: tabular-nums; letter-spacing: 0.08em; }
    .pinturma__hint { color: var(--text-muted); }
    .migrar-aviso {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      flex-wrap: wrap; margin: 0 0 1rem;
      padding: 0.75rem 0.9rem; border-radius: var(--radius);
      border: 1px solid color-mix(in srgb, #f59e0b 55%, var(--border));
      background: color-mix(in srgb, #f59e0b 12%, transparent);
    }
    .migrar-aviso__txt { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
    .migrar-aviso__txt strong { font-weight: 800; }
    .migrar-aviso__txt span { font-size: 0.85rem; color: var(--text-muted); }
    .migrar-aviso .btn-primary { white-space: nowrap; }
    .prog {
      margin-bottom: 1rem; padding: 0.8rem 0.9rem;
      border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface);
    }
    .prog__top { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; }
    .prog__tit { font-weight: 700; }
    .prog__val { font-weight: 800; color: var(--primary); font-variant-numeric: tabular-nums; }
    .prog .trilho { height: 12px; border-radius: 999px; background: var(--surface-alt); overflow: hidden; }
    .prog .trilho__fill { height: 100%; border-radius: 999px; background: var(--primary); transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
    .prog__sub { display: block; margin-top: 0.4rem; font-size: 0.82rem; color: var(--text-muted); }
    .pinbox {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      padding: 0.6rem 0.8rem; border-radius: var(--radius);
      background: var(--surface-alt); margin-bottom: 0.9rem;
    }
    .pinbox__lbl { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
    .pinbox__val { font-size: 1.3rem; font-variant-numeric: tabular-nums; letter-spacing: 0.12em; }
    .linha { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .linha .tichr-input { flex: 1; min-width: 140px; }
    .linha .qtd { max-width: 92px; flex: 0 0 auto; }
    .secao { margin-top: 1rem; padding-top: 0.9rem; border-top: 1px solid var(--border); }
    .secao__top { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem; }
    .danger { color: var(--danger); border-color: var(--danger); }

    /* ===== Aba Equipes ===== */
    .stack { display: flex; flex-direction: column; gap: 0.75rem; }
    .pool {
      margin-bottom: 0.75rem;
      border: 1px dashed var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .pool__head {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 0.6rem 0.4rem;
    }
    .pool__titulo { margin: 0; font-size: 1rem; font-weight: 700; flex: 1; }
    .pool__contagem {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      background: var(--surface-alt);
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
    }
    .pool__list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      padding: 0.25rem 0.6rem 0.7rem;
      min-height: 3rem;
    }
    .pool__list app-aluno-card { flex: 0 1 200px; }

    .board {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.75rem;
      align-items: stretch;
    }
    .dropzone {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-height: 3rem;
      height: 100%;
    }

    /* ===== Modais ===== */
    .info { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
    .info__cor { width: 24px; height: 24px; border-radius: 6px; border: 1px solid var(--border); }
    .info__cortxt { font-variant-numeric: tabular-nums; color: var(--text-muted); font-size: 0.85rem; }
    .info__desc { margin: 0; color: var(--text); white-space: pre-wrap; }

    /* ===== Cargos ===== */
    .cargos-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.3rem 0.625rem;
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      border-radius: 999px;
    }
    .chip__x { border: none; background: none; color: inherit; font-size: 1rem; line-height: 1; cursor: pointer; padding: 0; }
    .cargos-escolha { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
    .cargo-op {
      font: inherit;
      font-weight: 600;
      padding: 0.5rem 0.9rem;
      border-radius: 999px;
      border: 1px solid var(--primary);
      color: var(--primary);
      background: var(--surface);
      cursor: pointer;
    }
    .cargo-op:hover { color: var(--primary-contrast); background: var(--primary); }

    /* ===== Toast flutuante acima do header ===== */
    .toast {
      position: fixed;
      top: 0.75rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 200;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
      max-width: calc(100vw - 1.5rem);
      padding: 0.6rem 0.9rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      box-shadow: 4px 4px 0 var(--border);
    }
    .toast__msg { font-size: 0.9rem; }
    .toast__acoes { display: flex; gap: 0.5rem; }
    .toast .btn-primary, .toast .btn-outline { padding: 0.35rem 0.8rem; }

    /* ===== Aba Jogos ===== */
    .jogos { display: flex; flex-direction: column; gap: 0.75rem; }
    .jogo { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .jogo__tit { display: block; font-size: 1.05rem; }
    .jogo__meta { color: var(--text-muted); font-size: 0.85rem; }
    .jogo .btn-sm { font-size: 0.85rem; padding: 0.4rem 0.9rem; }
    .ver-qlicks { text-decoration: none; align-self: flex-start; }
    .add-jogos { display: grid; gap: 0.5rem; }
    .add-jogo {
      display: flex; flex-direction: column; gap: 0.15rem; text-align: left; cursor: pointer;
      padding: 0.7rem 0.9rem; border-radius: 12px;
      border: 1px solid var(--border); background: var(--surface); color: inherit;
    }
    .add-jogo:hover:not(:disabled) { border-color: var(--primary); }
    .add-jogo small { color: var(--text-muted); }
    .jogos-vazio { text-align: center; padding: 1rem 0; }
    .jogos-vazio__ic { display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; border-radius: 16px; color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .jogos-vazio h3 { margin: 0.75rem 0 0.35rem; font-size: 1.15rem; }
    .jogos-vazio .muted { margin: 0 auto 1.1rem; max-width: 24rem; }
    .ir-jogos { text-decoration: none; }

    /* ===== Drag & drop ===== */
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: var(--radius);
      box-shadow: 4px 4px 0 var(--border);
    }
    .cdk-drag-placeholder { opacity: 0.4; }
    .cdk-drop-list-dragging .cdk-drag { transition: transform 150ms ease; }
    @media (prefers-reduced-motion: reduce) {
      .cdk-drag, .cdk-drag-animating { transition: none !important; }
    }
  `,
})
export class TurmaDetalhePage {
  private readonly api = inject(TurmaApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  protected readonly formatarData = formatarData;

  protected readonly rotuloStatus = ROTULO_STATUS;
  protected readonly turmaId = this.route.snapshot.paramMap.get('id')!;
  protected readonly aba = signal<Aba>('agenda');
  protected readonly carregando = signal(true);
  protected readonly turma = signal<Turma | null>(null);
  protected readonly alunos = signal<Aluno[]>([]);
  protected readonly equipes = signal<Equipe[]>([]);

  // Smart PINs: turma legada = PIN da sala com != 2 dígitos (6 díg antigo).
  protected readonly pinLegado = computed(() => {
    const p = this.turma()?.pinTurma;
    return !!p && p.length !== 2;
  });
  protected readonly migrarAberto = signal(false);
  protected readonly migrando = signal(false);
  protected readonly entrada = signal('');
  protected readonly salvando = signal(false);
  protected readonly ordenacao = signal<Ordenacao>('nome');
  protected readonly progresso = signal<ProgressoTurma | null>(null);

  // Aba Jogos: Qlicks do professor (PhD) filtrados por esta turma.
  protected readonly qlicks = signal<Qlick[]>([]);
  protected readonly rodandoQlick = signal(false);
  protected readonly qlicksDaTurma = computed(() =>
    this.qlicks().filter((q) => this.qlickNaTurma(q)),
  );
  /** Qlicks da biblioteca ainda NÃO atribuídos a esta turma (para "Adicionar Jogo"). */
  protected readonly qlicksDisponiveis = computed(() =>
    this.qlicks().filter((q) => !this.qlickNaTurma(q)),
  );
  protected readonly addJogoAberto = signal(false);
  protected readonly atribuindoJogo = signal(false);

  private qlickNaTurma(q: Qlick): boolean {
    return q.turmaId === this.turmaId || (q.turmaIds ?? []).includes(this.turmaId);
  }

  // Modais de equipe.
  protected readonly formOpen = signal(false);
  protected readonly editando = signal<Equipe | null>(null);
  protected readonly salvandoEquipe = signal(false);
  protected readonly infoEquipe = signal<Equipe | null>(null);
  protected readonly distribuindo = signal(false);

  // Modal de detalhe do aluno.
  protected readonly detalhe = signal<Aluno | null>(null);
  protected readonly nomeEdit = signal('');
  protected readonly salvandoNome = signal(false);
  protected readonly qtd = signal(10);
  protected readonly pontuandoBusy = signal(false);

  // Cargos e modo de atribuição.
  protected readonly cargos = signal<Cargo[]>([]);
  protected readonly entradaCargo = signal('');
  protected readonly salvandoCargo = signal(false);
  protected readonly modalCargos = signal(false);
  protected readonly atribuindo = signal<Cargo | null>(null);
  protected readonly selecionados = signal<Set<string>>(new Set());
  protected readonly finalizando = signal(false);

  /** Gestão de equipes exige o plano Mestre (gate da aba Equipes). */
  protected readonly podeGerenciar = computed(() =>
    planoAtendeMinimo(this.profileService.profile()?.planoAtual, 'MESTRE'),
  );

  /** Pontuação/gamificação é exclusiva do plano PhD. */
  protected readonly podePontuar = computed(() =>
    podeGamificar(this.profileService.profile()?.planoAtual),
  );
  protected readonly upsellGamificacao = signal(false);

  /** Config de pontuação da turma com defaults aplicados. */
  protected readonly cfg = computed(() => {
    const t = this.turma();
    return {
      pontuacaoAtiva: t?.pontuacaoAtiva ?? true,
      nomePontuacao: t?.nomePontuacao?.trim() || 'XP',
      rankingAtivo: t?.rankingAtivo ?? true,
      rotuloAdicionar: t?.rotuloAdicionar?.trim() || 'Adicionar',
      rotuloRemover: t?.rotuloRemover?.trim() || 'Remover',
    };
  });

  private readonly todasSessoes = signal<Sessao[]>([]);
  protected readonly sessoes = computed(() =>
    this.todasSessoes()
      .filter((s) => s.turmaId === this.turmaId)
      .sort((a, b) => a.numero - b.numero),
  );

  protected readonly semEquipe = computed(() =>
    this.alunos().filter((a) => !a.equipeId),
  );

  protected readonly alunosOrdenados = computed(() => {
    const lista = [...this.alunos()];
    return this.ordenacao() === 'pontuacao'
      ? lista.sort((a, b) => (b.xpTotal ?? 0) - (a.xpTotal ?? 0))
      : lista.sort((a, b) => a.nome.localeCompare(b.nome));
  });

  /** Status visual (derivado) de uma sessão, usando os horários da turma. */
  protected statusAula(s: Sessao) {
    const t = this.turma();
    return statusVisual(s, t?.horaInicio, t?.horaFim);
  }

  /** Alunos de uma equipe (recalculado a partir do signal de alunos). */
  protected daEquipe(equipeId: string): Aluno[] {
    return this.alunos().filter((a) => a.equipeId === equipeId);
  }

  constructor() {
    this.api.getTurma(this.turmaId).subscribe({
      next: (t) => {
        this.turma.set(t);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
    this.api.getSessoesSemana().subscribe((s) => this.todasSessoes.set(s));
    this.api.getAlunos(this.turmaId).subscribe((a) => this.alunos.set(a));
    this.api.getEquipes(this.turmaId).subscribe((e) => this.equipes.set(e));
    this.api.getCargos(this.turmaId).subscribe((c) => this.cargos.set(c));
    this.api.getProgressoTurma(this.turmaId).subscribe({
      next: (p) => this.progresso.set(p),
      error: () => {},
    });
    // Qlicks só existem no PhD — evita 403 (e o modal global de erro) fora dele.
    const carregarQlicks = () => {
      if (podeGamificar(this.profileService.profile()?.planoAtual)) {
        this.api.getQlicks().subscribe({
          next: (q) => this.qlicks.set(q),
          error: () => {},
        });
      }
    };
    if (this.profileService.profile()) {
      carregarQlicks();
    } else {
      this.profileService.load().subscribe({
        next: carregarQlicks,
        error: () => {},
      });
    }
  }

  /** Cria a partida a partir de um Qlick e vai para a sala do professor. */
  protected rodarQlick(q: Qlick): void {
    this.rodandoQlick.set(true);
    // No painel da turma a turma é implícita — sem perguntar "para qual turma?".
    this.api.criarPartida(q.id, this.turmaId).subscribe({
      next: (p) => this.router.navigate(['/jogos/qlick/partida', p.id]),
      error: () => this.rodandoQlick.set(false),
    });
  }

  /** Atribui um Qlick da biblioteca a esta turma (N:N) e atualiza a lista. */
  protected adicionarJogo(q: Qlick): void {
    const atuais = q.turmaIds ?? (q.turmaId ? [q.turmaId] : []);
    const turmaIds = [...new Set([...atuais, this.turmaId])];
    this.atribuindoJogo.set(true);
    this.api.atribuirTurmasQlick(q.id, turmaIds).subscribe({
      next: () => {
        this.api.getQlicks().subscribe((qs) => {
          this.qlicks.set(qs);
          this.atribuindoJogo.set(false);
          this.addJogoAberto.set(false);
        });
      },
      error: () => this.atribuindoJogo.set(false),
    });
  }

  /** Cargos atribuídos a um aluno (para os bullets do card). */
  protected cargosDoAluno(aluno: Aluno): Cargo[] {
    const ids = aluno.cargoIds ?? [];
    return ids.length ? this.cargos().filter((c) => ids.includes(c.id)) : [];
  }

  /** Do bloqueio da aba, conduz ao painel de planos com o contexto do recurso. */
  protected irParaPlanos(): void {
    this.router.navigate(['/planos'], {
      queryParams: { recurso: 'GESTAO_EQUIPES' },
    });
  }

  protected adicionar(): void {
    const nomes = this.entrada()
      .split(/[,\n]/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (nomes.length === 0) {
      return;
    }
    this.salvando.set(true);
    this.api.adicionarAlunos(this.turmaId, nomes).subscribe({
      next: (novos) => {
        this.alunos.update((atual) => [...atual, ...novos]);
        this.entrada.set('');
        this.salvando.set(false);
      },
      error: () => this.salvando.set(false),
    });
  }

  protected remover(aluno: Aluno): void {
    this.api.removerAluno(this.turmaId, aluno.id).subscribe(() => {
      this.alunos.update((atual) => atual.filter((a) => a.id !== aluno.id));
    });
  }

  // ===== Pontuação =====

  /** Abre o modal de detalhe do aluno (PIN, editar nome, excluir, pontuar). */
  protected abrirDetalhe(aluno: Aluno): void {
    this.detalhe.set(aluno);
    this.nomeEdit.set(aluno.nome);
  }

  protected fecharDetalhe(): void {
    this.detalhe.set(null);
  }

  /** Salva o novo nome do aluno em foco. */
  protected salvarNome(): void {
    const alvo = this.detalhe();
    const nome = this.nomeEdit().trim();
    if (!alvo || !nome || nome === alvo.nome) {
      return;
    }
    this.salvandoNome.set(true);
    this.api.editarAluno(this.turmaId, alvo.id, nome).subscribe({
      next: (atualizado) => {
        this.alunos.update((atual) =>
          atual.map((a) => (a.id === alvo.id ? { ...a, nome: atualizado.nome } : a)),
        );
        this.detalhe.update((a) => (a ? { ...a, nome: atualizado.nome } : a));
        this.salvandoNome.set(false);
      },
      error: () => this.salvandoNome.set(false),
    });
  }

  /** Exclui o aluno em foco (com confirmação) e fecha o modal. */
  protected excluirDoDetalhe(): void {
    const alvo = this.detalhe();
    if (!alvo || !confirm(`Excluir o aluno "${alvo.nome}"?`)) {
      return;
    }
    this.remover(alvo);
    this.fecharDetalhe();
  }

  protected irParaPlanosGamificacao(): void {
    this.upsellGamificacao.set(false);
    this.router.navigate(['/planos'], {
      queryParams: { recurso: 'GAMIFICACAO' },
    });
  }

  /** Aplica +/- a quantidade ao aluno em foco e mantém o modal aberto. */
  protected aplicarPontos(sinal: 1 | -1): void {
    const alvo = this.detalhe();
    const qtd = Math.abs(Math.trunc(this.qtd()));
    if (!alvo || qtd <= 0) {
      return;
    }
    this.pontuandoBusy.set(true);
    this.api.darXp(this.turmaId, alvo.id, sinal * qtd).subscribe({
      next: (res) => {
        this.alunos.update((atual) =>
          atual.map((a) =>
            a.id === alvo.id ? { ...a, xpTotal: res.xpTotal } : a,
          ),
        );
        this.detalhe.update((a) => (a ? { ...a, xpTotal: res.xpTotal } : a));
        this.pontuandoBusy.set(false);
      },
      error: () => this.pontuandoBusy.set(false),
    });
  }

  // ===== Drag & drop =====

  protected soltar(event: CdkDragDrop<Aluno[]>, equipeId: string | null): void {
    if (event.previousContainer === event.container) {
      return;
    }
    const aluno = event.previousContainer.data[event.previousIndex];
    const anterior = aluno.equipeId ?? null;
    this.aplicarEquipe(aluno.id, equipeId);
    this.api.definirEquipeDoAluno(this.turmaId, aluno.id, equipeId).subscribe({
      error: () => this.aplicarEquipe(aluno.id, anterior),
    });
  }

  private aplicarEquipe(alunoId: string, equipeId: string | null): void {
    this.alunos.update((atual) =>
      atual.map((a) => (a.id === alunoId ? { ...a, equipeId } : a)),
    );
  }

  // ===== Cargos e atribuição =====

  protected adicionarCargo(): void {
    const nomes = this.entradaCargo()
      .split(/[,\n]/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (nomes.length === 0) {
      return;
    }
    this.salvandoCargo.set(true);
    this.api.adicionarCargos(this.turmaId, nomes).subscribe({
      next: (novos) => {
        this.cargos.update((atual) => [...atual, ...novos]);
        this.entradaCargo.set('');
        this.salvandoCargo.set(false);
      },
      error: () => this.salvandoCargo.set(false),
    });
  }

  protected removerCargo(cargo: Cargo): void {
    this.api.removerCargo(this.turmaId, cargo.id).subscribe(() => {
      this.cargos.update((atual) => atual.filter((c) => c.id !== cargo.id));
      this.alunos.update((atual) =>
        atual.map((a) =>
          a.cargoIds?.includes(cargo.id)
            ? { ...a, cargoIds: a.cargoIds.filter((id) => id !== cargo.id) }
            : a,
        ),
      );
    });
  }

  /** Abre o modal para o professor escolher qual cargo vai atribuir. */
  protected abrirAtribuicao(): void {
    if (this.cargos().length > 0) {
      this.modalCargos.set(true);
    }
  }

  /** Escolhe um cargo e entra no modo de atribuição (colunas balançam). */
  protected escolherCargo(cargo: Cargo): void {
    this.modalCargos.set(false);
    this.atribuindo.set(cargo);
    this.selecionados.set(
      new Set(
        this.alunos()
          .filter((a) => a.cargoIds?.includes(cargo.id))
          .map((a) => a.id),
      ),
    );
  }

  /** (Des)marca um membro para o cargo em foco. */
  protected toggleMembro(aluno: Aluno): void {
    const set = new Set(this.selecionados());
    set.has(aluno.id) ? set.delete(aluno.id) : set.add(aluno.id);
    this.selecionados.set(set);
  }

  protected cancelarAtribuicao(): void {
    this.atribuindo.set(null);
    this.selecionados.set(new Set());
  }

  /** Migra a turma para os Smart PINs e atualiza o PIN da sala + dos alunos. */
  protected migrarPins(): void {
    const t = this.turma();
    if (!t) {
      return;
    }
    this.migrando.set(true);
    this.api.migrarPins(t.id).subscribe({
      next: ({ turma, alunos }) => {
        this.turma.set(turma);
        this.alunos.set(alunos);
        this.migrando.set(false);
        this.migrarAberto.set(false);
      },
      error: () => this.migrando.set(false),
    });
  }

  protected finalizarAtribuicao(): void {
    const cargo = this.atribuindo();
    if (!cargo) {
      return;
    }
    this.finalizando.set(true);
    this.api
      .atribuirCargo(this.turmaId, cargo.id, [...this.selecionados()])
      .subscribe({
        next: (alunos) => {
          this.alunos.set(alunos);
          this.finalizando.set(false);
          this.cancelarAtribuicao();
        },
        error: () => this.finalizando.set(false),
      });
  }

  // ===== CRUD de equipes =====

  protected abrirNova(): void {
    this.editando.set(null);
    this.formOpen.set(true);
  }

  protected salvarEquipe(payload: CriarEquipePayload): void {
    this.salvandoEquipe.set(true);
    const alvo = this.editando();
    const req = alvo
      ? this.api.atualizarEquipe(this.turmaId, alvo.id, payload)
      : this.api.criarEquipe(this.turmaId, payload);
    req.subscribe({
      next: (equipe) => {
        this.equipes.update((atual) =>
          alvo
            ? atual.map((e) => (e.id === equipe.id ? equipe : e))
            : [...atual, equipe],
        );
        this.salvandoEquipe.set(false);
        this.formOpen.set(false);
      },
      error: () => this.salvandoEquipe.set(false),
    });
  }

  protected excluir(equipe: Equipe): void {
    if (!confirm(`Excluir a equipe "${equipe.titulo}"? Os alunos voltam ao pool.`)) {
      return;
    }
    this.api.removerEquipe(this.turmaId, equipe.id).subscribe(() => {
      this.equipes.update((atual) => atual.filter((e) => e.id !== equipe.id));
      this.alunos.update((atual) =>
        atual.map((a) => (a.equipeId === equipe.id ? { ...a, equipeId: null } : a)),
      );
    });
  }

  protected distribuir(): void {
    if (this.equipes().length === 0) {
      return;
    }
    const jaPosicionados = this.alunos().some((a) => a.equipeId);
    if (
      jaPosicionados &&
      !confirm('Redistribuir vai reorganizar todos os alunos. Continuar?')
    ) {
      return;
    }
    this.distribuindo.set(true);
    this.api.distribuirEquipes(this.turmaId).subscribe({
      next: (alunos) => {
        this.alunos.set(alunos);
        this.distribuindo.set(false);
      },
      error: () => this.distribuindo.set(false),
    });
  }

  protected abrirInfo(equipe: Equipe): void {
    this.infoEquipe.set(equipe);
  }

  protected editarDaInfo(): void {
    this.editando.set(this.infoEquipe());
    this.infoEquipe.set(null);
    this.formOpen.set(true);
  }
}
