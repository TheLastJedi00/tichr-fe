import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatarData } from '../../core/date-format';
import { Aluno, Sessao, Turma } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

type Aba = 'agenda' | 'alunos';

/**
 * Detalhe da turma com navegacao em abas: "Agenda" (sessoes projetadas) e
 * "Alunos" (lista de chamada + porta de entrada para as dinamicas).
 */
@Component({
  selector: 'app-turma-detalhe-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Icon, Spinner],
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

          @if (alunos().length === 0) {
            <p class="muted vazio">
              Nenhum aluno ainda. Cadastre a turma para montar dinâmicas.
            </p>
          } @else {
            <ul class="roster">
              @for (a of alunos(); track a.id) {
                <li class="roster__item">
                  <span class="roster__nome">{{ a.nome }}</span>
                  <span class="roster__xp">{{ a.xpTotal ?? 0 }} XP</span>
                  <div class="roster__xpacts">
                    <button
                      class="xpbtn xpbtn--add"
                      type="button"
                      (click)="darXp(a, 50)"
                    >
                      +50
                    </button>
                    <button
                      class="xpbtn xpbtn--sub"
                      type="button"
                      (click)="darXp(a, -20)"
                    >
                      -20
                    </button>
                  </div>
                  <button
                    class="remover"
                    type="button"
                    aria-label="Remover aluno"
                    (click)="remover(a)"
                  >
                    <app-icon name="close" [size]="16" />
                  </button>
                </li>
              }
            </ul>

            <a class="btn-primary sortear" [routerLink]="['/turmas', t.id, 'dinamica']">
              <app-icon name="users" [size]="18" /> Sortear grupos
            </a>
          }
        </app-card>
      }
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
    .add { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .add .tichr-input { flex: 1 1 240px; }
    .vazio { margin: 0; }
    .roster { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
    .roster__item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 0.75rem;
      border-radius: var(--radius);
      background: var(--surface-alt);
    }
    .roster__nome { flex: 1; }
    .roster__xp {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      font-size: 0.85rem;
      color: var(--primary);
      min-width: 3.5rem;
      text-align: right;
    }
    .roster__xpacts { display: flex; gap: 0.3rem; }
    .xpbtn {
      font: inherit;
      font-weight: 700;
      font-size: 0.8rem;
      padding: 0.25rem 0.5rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface);
      cursor: pointer;
    }
    .xpbtn--add { color: var(--success); border-color: var(--success); }
    .xpbtn--sub { color: var(--danger); border-color: var(--danger); }
    .remover {
      display: inline-flex;
      color: var(--text-muted);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.15rem;
    }
    .remover:hover { color: var(--danger); }
    .sortear { margin-top: 1rem; text-decoration: none; }
    .muted { color: var(--text-muted); }
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
  protected readonly entrada = signal('');
  protected readonly salvando = signal(false);

  private readonly todasSessoes = signal<Sessao[]>([]);
  protected readonly sessoes = computed(() =>
    this.todasSessoes()
      .filter((s) => s.turmaId === this.turmaId)
      .sort((a, b) => a.numero - b.numero),
  );

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
        atual.map((a) =>
          a.id === aluno.id ? { ...a, xpTotal: res.xpTotal } : a,
        ),
      );
    });
  }
}
