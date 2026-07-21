import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { InstituicaoApiService } from '../../core/instituicao-api.service';
import { Instituicao, Turma } from '../../core/models';
import { turmaContaComoAtiva } from '../../core/plano.util';
import { TurmaApiService } from '../../core/turma-api.service';
import { Icon } from '../../ui/icon/icon';
import { Skeleton } from '../../ui/skeleton/skeleton';

const SEM = 'sem-instituicao';

/**
 * Turmas de uma instituição (rota dedicada `instituicoes/:id/turmas`, ou
 * `:id = sem-instituicao` para o legado). Filtro por **Ativas / Encerradas** e
 * **busca por nome**, e um select por turma para **movê-la de escola**.
 */
@Component({
  selector: 'app-instituicao-turmas-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Skeleton],
  template: `
    <a class="voltar" routerLink="/turmas">‹ Minhas turmas</a>

    <header class="head">
      <h1 class="title">
        <app-icon [name]="ehSem() ? 'alert' : 'building'" [size]="22" />
        {{ titulo() }}
      </h1>
      <a class="btn-primary nova" routerLink="/turmas/nova">Nova turma</a>
    </header>

    @if (loading()) {
      <div class="lista"><app-skeleton height="72px" /><app-skeleton height="72px" /></div>
    } @else {
      <div class="filtros">
        <div class="abas">
          <button type="button" class="aba" [class.aba--on]="aba() === 'ativas'" (click)="aba.set('ativas')">
            Ativas ({{ ativas().length }})
          </button>
          <button type="button" class="aba" [class.aba--on]="aba() === 'encerradas'" (click)="aba.set('encerradas')">
            Encerradas ({{ encerradas().length }})
          </button>
        </div>
        <input
          class="tichr-input busca"
          type="search"
          placeholder="Buscar por nome…"
          [value]="busca()"
          (input)="busca.set($any($event.target).value)"
        />
      </div>

      @if (visiveis().length === 0) {
        <p class="muted">Nenhuma turma encontrada.</p>
      } @else {
        <div class="lista">
          @for (t of visiveis(); track t.id) {
            <div class="turma">
              <a class="turma__body" [routerLink]="['/turmas', t.id]">
                <span class="turma__nome">
                  @if (t.cor) { <span class="dot" [style.background]="t.cor"></span> }
                  {{ t.nome }}
                  @if (!ativa(t)) { <span class="badge badge--fim">Encerrada</span> }
                </span>
                <span class="turma__meta">
                  <span class="badge">{{ t.tipoModalidade === 'MODULO_FECHADO' ? 'Módulo fechado' : 'Ensino Regular' }}</span>
                  @if (t.anoSerie) { <span class="turma__disc">{{ t.anoSerie }}</span> }
                  @else if (t.disciplina) { <span class="turma__disc">{{ t.disciplina }}</span> }
                </span>
              </a>
              <label class="mover">
                <span class="mover__lbl">Escola</span>
                <select
                  class="tichr-input"
                  [value]="t.instituicaoId || ''"
                  [disabled]="movendo() === t.id"
                  (change)="mover(t, $any($event.target).value)"
                >
                  <option value="">Sem instituição</option>
                  @for (i of instituicoes(); track i.id) {
                    <option [value]="i.id">{{ i.nome }}</option>
                  }
                </select>
              </label>
            </div>
          }
        </div>
      }
    }
  `,
  styles: `
    .voltar { display: inline-block; margin-bottom: 0.75rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .title { margin: 0; font-size: 1.4rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.5rem; }
    .nova { text-decoration: none; }
    .filtros { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .abas { display: flex; gap: 0.5rem; }
    .aba { font: inherit; font-weight: 700; cursor: pointer; padding: 0.5rem 0.9rem; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); }
    .aba--on { color: var(--primary-contrast); background: var(--primary); border-color: var(--primary); }
    .busca { max-width: 16rem; }
    .muted { color: var(--text-muted); }
    .lista { display: grid; gap: 0.75rem; }
    .turma { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); flex-wrap: wrap; }
    .turma__body { display: flex; flex-direction: column; align-items: flex-start; gap: 0.35rem; min-width: 0; flex: 1; text-decoration: none; color: inherit; }
    .turma__body:hover .turma__nome { color: var(--primary); }
    .turma__nome { font-size: 1.05rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
    .turma__meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .turma__disc { color: var(--text-muted); font-size: 0.85rem; }
    .dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; flex: 0 0 auto; }
    .badge { font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 999px; border: 1px solid var(--primary); color: var(--primary); }
    .badge--fim { background: color-mix(in srgb, var(--text-muted) 18%, transparent); color: var(--text-muted); border-color: transparent; }
    .mover { display: flex; flex-direction: column; gap: 0.2rem; }
    .mover__lbl { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); }
    .mover select { min-width: 11rem; }
  `,
})
export class InstituicaoTurmasPage {
  private readonly api = inject(TurmaApiService);
  private readonly instApi = inject(InstituicaoApiService);
  private readonly route = inject(ActivatedRoute);

  private readonly paramId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id') ?? SEM)),
    { initialValue: SEM },
  );
  protected readonly ehSem = computed(() => this.paramId() === SEM);

  protected readonly loading = signal(true);
  protected readonly turmas = signal<Turma[]>([]);
  protected readonly instituicoes = signal<Instituicao[]>([]);
  protected readonly aba = signal<'ativas' | 'encerradas'>('ativas');
  protected readonly busca = signal('');
  protected readonly movendo = signal<string | null>(null);

  protected ativa(t: Turma): boolean {
    return turmaContaComoAtiva(t);
  }

  protected readonly titulo = computed(() => {
    if (this.ehSem()) return 'Turmas sem uma instituição de ensino';
    return (
      this.instituicoes().find((i) => i.id === this.paramId())?.nome ?? 'Turmas'
    );
  });

  /** Turmas desta instituição (ou as sem escola, no modo legado). */
  private readonly daInstituicao = computed<Turma[]>(() => {
    const id = this.paramId();
    const idsInst = new Set(this.instituicoes().map((i) => i.id));
    if (this.ehSem()) {
      return this.turmas().filter(
        (t) => !t.instituicaoId || !idsInst.has(t.instituicaoId),
      );
    }
    return this.turmas().filter((t) => t.instituicaoId === id);
  });

  protected readonly ativas = computed(() =>
    this.daInstituicao().filter((t) => this.ativa(t)),
  );
  protected readonly encerradas = computed(() =>
    this.daInstituicao().filter((t) => !this.ativa(t)),
  );

  /** Aplica aba + busca por nome. */
  protected readonly visiveis = computed<Turma[]>(() => {
    const base = this.aba() === 'ativas' ? this.ativas() : this.encerradas();
    const q = this.busca().trim().toLowerCase();
    return q ? base.filter((t) => t.nome.toLowerCase().includes(q)) : base;
  });

  protected mover(t: Turma, instituicaoId: string): void {
    if ((t.instituicaoId || '') === instituicaoId) return;
    this.movendo.set(t.id);
    this.api.moverTurmaInstituicao(t.id, instituicaoId).subscribe({
      next: () => {
        this.movendo.set(null);
        this.carregar();
      },
      error: () => this.movendo.set(null),
    });
  }

  private carregar(): void {
    forkJoin({
      turmas: this.api.getTurmas(),
      instituicoes: this.instApi.getInstituicoes(),
    }).subscribe({
      next: ({ turmas, instituicoes }) => {
        this.turmas.set(turmas);
        this.instituicoes.set(instituicoes);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  constructor() {
    this.carregar();
  }
}
