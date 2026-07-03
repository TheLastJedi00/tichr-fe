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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatarData } from '../../core/date-format';
import { Aluno, CriarEquipePayload, Equipe, Sessao, Turma } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { AlunoCard } from '../../ui/aluno-card/aluno-card';
import { Card } from '../../ui/card/card';
import { EquipeColuna } from '../../ui/equipe-coluna/equipe-coluna';
import { EquipeForm } from '../../ui/equipe-form/equipe-form';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';

type Aba = 'agenda' | 'alunos';

/**
 * Detalhe da turma com abas "Agenda" e "Alunos". A aba de alunos e um quadro
 * de equipes com arrastar-e-soltar: pool "Sem equipe" + uma coluna por equipe.
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
      </nav>

      @if (aba() === 'agenda') {
        @if (sessoes().length === 0) {
          <app-card><p class="muted">Nenhuma aula projetada.</p></app-card>
        } @else {
          <div class="sessoes">
            @for (s of sessoes(); track s.id) {
              <app-card>
                <div class="sessao">
                  <span class="sessao__n">Aula {{ s.numero }}</span>
                  <span class="sessao__d">{{ formatarData(s.data) }}</span>
                  <span class="status status--{{ s.status.toLowerCase() }}">
                    {{ s.status }}
                  </span>
                </div>
              </app-card>
            }
          </div>
        }
      } @else {
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

          <div class="acoes">
            <button class="btn-outline" type="button" (click)="abrirNova()">
              <app-icon name="plus" [size]="16" /> Nova equipe
            </button>
            <button
              class="btn-primary"
              type="button"
              [disabled]="equipes().length === 0 || distribuindo()"
              [title]="
                equipes().length === 0 ? 'Crie ao menos uma equipe' : ''
              "
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

        <div class="board" cdkDropListGroup>
          <section class="pool">
            <header class="pool__head">
              <h3 class="pool__titulo">Sem equipe</h3>
              <span class="pool__contagem">{{ semEquipe().length }}</span>
            </header>
            <div
              class="dropzone"
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
                  (darXp)="darXp(a, $event)"
                  (remover)="remover(a)"
                />
              } @empty {
                <p class="hint">Todos os alunos estão em equipes.</p>
              }
            </div>
          </section>

          @for (e of equipes(); track e.id) {
            <app-equipe-coluna
              [equipe]="e"
              [total]="daEquipe(e.id).length"
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
                (cdkDropListDropped)="soltar($event, e.id)"
              >
                @for (a of daEquipe(e.id); track a.id) {
                  <app-aluno-card
                    cdkDrag
                    [aluno]="a"
                    (darXp)="darXp(a, $event)"
                    (remover)="remover(a)"
                  />
                } @empty {
                  <p class="hint">Solte alunos aqui.</p>
                }
              </div>
            </app-equipe-coluna>
          }
        </div>

        @if (alunos().length === 0) {
          <p class="muted vazio">
            Nenhum aluno ainda. Adicione nomes acima para montar as equipes.
          </p>
        }
      }

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
          <p class="info__desc">
            {{ e.descricao || 'Sem descrição.' }}
          </p>
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
      padding: 0.6rem 1rem;
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
    .status--realizada { color: var(--success); background: color-mix(in srgb, var(--success) 12%, transparent); }
    .add { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .add .tichr-input { flex: 1 1 240px; }
    .acoes { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .vazio { margin: 1rem 0 0; }
    .muted { color: var(--text-muted); }
    .hint { color: var(--text-muted); font-size: 0.85rem; margin: 0.25rem 0; }

    .info { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
    .info__cor { width: 24px; height: 24px; border-radius: 6px; border: 1px solid var(--border); }
    .info__cortxt { font-variant-numeric: tabular-nums; color: var(--text-muted); font-size: 0.85rem; }
    .info__desc { margin: 0; color: var(--text); white-space: pre-wrap; }

    .board {
      margin-top: 1rem;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.75rem;
      align-items: start;
    }
    .pool {
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
    .dropzone {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      padding: 0.5rem 0.6rem 0.7rem;
      min-height: 3rem;
    }
    .pool .dropzone { padding-top: 0; }

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
  protected readonly formatarData = formatarData;

  protected readonly turmaId = this.route.snapshot.paramMap.get('id')!;
  protected readonly aba = signal<Aba>('agenda');
  protected readonly carregando = signal(true);
  protected readonly turma = signal<Turma | null>(null);
  protected readonly alunos = signal<Aluno[]>([]);
  protected readonly equipes = signal<Equipe[]>([]);
  protected readonly entrada = signal('');
  protected readonly salvando = signal(false);

  // Estado do modal de equipe.
  protected readonly formOpen = signal(false);
  protected readonly editando = signal<Equipe | null>(null);
  protected readonly salvandoEquipe = signal(false);
  protected readonly infoEquipe = signal<Equipe | null>(null);
  protected readonly distribuindo = signal(false);

  private readonly todasSessoes = signal<Sessao[]>([]);
  protected readonly sessoes = computed(() =>
    this.todasSessoes()
      .filter((s) => s.turmaId === this.turmaId)
      .sort((a, b) => a.numero - b.numero),
  );

  protected readonly semEquipe = computed(() =>
    this.alunos().filter((a) => !a.equipeId),
  );

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

  /** Ferramenta rápida de XP: pontua o aluno com um clique. */
  protected darXp(aluno: Aluno, pontos: number): void {
    this.api.darXp(this.turmaId, aluno.id, pontos).subscribe((res) => {
      this.alunos.update((atual) =>
        atual.map((a) => (a.id === aluno.id ? { ...a, xpTotal: res.xpTotal } : a)),
      );
    });
  }

  // ===== Drag & drop =====

  /** Persiste o movimento de um card entre pool/equipes (otimista + rollback). */
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

  /** Distribui os alunos pelas equipes de forma balanceada (backend). */
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

  /** Do modal de informações, salta para a edição da equipe. */
  protected editarDaInfo(): void {
    this.editando.set(this.infoEquipe());
    this.infoEquipe.set(null);
    this.formOpen.set(true);
  }
}
