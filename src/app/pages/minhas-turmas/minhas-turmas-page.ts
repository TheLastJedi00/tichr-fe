import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InstituicaoApiService } from '../../core/instituicao-api.service';
import { Instituicao, Turma } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { Icon } from '../../ui/icon/icon';
import { Skeleton } from '../../ui/skeleton/skeleton';
import { InstituicaoModal } from './instituicao-modal';

/** Card agrupador na tela: uma instituição (ou o bloco de legado sem escola). */
interface Grupo {
  rota: string; // id da instituição, ou 'sem-instituicao'
  nome: string;
  instituicao: Instituicao | null;
  qtd: number;
}

/**
 * MinhasTurmasPage (smart): centro do fluxo do ensino regular. Sem dados, orienta
 * a criar a **Instituição** primeiro (passo obrigatório). Com dados, mostra
 * **cards por instituição** (+ um bloco "Turmas sem uma instituição de ensino"
 * para o legado) que **navegam** para a rota dedicada com as turmas da escola.
 */
@Component({
  selector: 'app-minhas-turmas-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Skeleton, InstituicaoModal],
  template: `
    <header class="head">
      <h1 class="title">Minhas turmas</h1>
      @if (!semDados()) {
        <div class="head__acoes">
          <button class="btn-outline" type="button" (click)="abrirCriarInstituicao()">
            <app-icon name="building" [size]="16" /> Nova instituição
          </button>
          <a class="btn-primary nova" routerLink="/turmas/nova">Nova turma</a>
        </div>
      }
    </header>

    @if (loading()) {
      <div class="grupos">
        @for (i of [1, 2, 3]; track i) {
          <app-skeleton height="72px" />
        }
      </div>
    } @else if (semDados()) {
      <!-- Conta virgem: instituição é o passo obrigatório antes das turmas -->
      <button type="button" class="empty-cta" (click)="abrirCriarInstituicao()">
        <span class="empty-cta__ic"><app-icon name="building" [size]="44" /></span>
        <strong class="empty-cta__t">Criar Instituição de Ensino</strong>
        <span class="empty-cta__d">
          Antes de cadastrar turmas, crie a escola. O Tichr monta a grade de
          horários (1º Horário, Intervalo, …) automaticamente.
        </span>
      </button>
    } @else {
      <div class="grupos">
        @for (g of grupos(); track g.rota) {
          <div class="grupo" [class.grupo--legado]="!g.instituicao">
            <a class="grupo__head" [routerLink]="['/instituicoes', g.rota, 'turmas']">
              <span class="grupo__ic">
                <app-icon [name]="g.instituicao ? 'building' : 'alert'" [size]="22" />
              </span>
              <span class="grupo__txt">
                <strong>{{ g.nome }}</strong>
                <small>{{ g.qtd }} {{ g.qtd === 1 ? 'turma' : 'turmas' }}</small>
              </span>
              <span class="grupo__go" aria-hidden="true">›</span>
            </a>
            @if (g.instituicao) {
              <button
                type="button"
                class="grupo__editar"
                (click)="abrirEditarInstituicao(g.instituicao)"
                title="Editar instituição"
                aria-label="Editar instituição"
              >
                <app-icon name="settings" [size]="18" />
              </button>
            }
          </div>
        }
      </div>
    }

    <app-instituicao-modal
      [open]="modalAberto()"
      [instituicao]="editando()"
      (salvo)="aoSalvarInstituicao()"
      (fechar)="modalAberto.set(false)"
    />
  `,
  styles: `
    .head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .head__acoes { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .title { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .nova { text-decoration: none; }
    .btn-outline { display: inline-flex; align-items: center; gap: 0.4rem; }

    .empty-cta {
      width: 100%;
      display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
      padding: 2.5rem 1.25rem;
      background: var(--surface);
      border: 2px dashed color-mix(in srgb, var(--primary) 45%, var(--border));
      border-radius: var(--radius);
      color: inherit; cursor: pointer; text-align: center; font: inherit;
      transition: border-color 0.15s ease, transform 0.08s ease;
    }
    .empty-cta:hover { border-color: var(--primary); }
    .empty-cta:active { transform: translateY(1px); }
    .empty-cta__ic { display: grid; place-items: center; width: 80px; height: 80px; border-radius: 20px; color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .empty-cta__t { font-size: 1.25rem; font-weight: 800; }
    .empty-cta__d { max-width: 32rem; color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; }

    .grupos { display: grid; gap: 0.75rem; }
    .grupo { display: flex; align-items: stretch; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); overflow: hidden; }
    .grupo:hover { border-color: var(--primary); }
    .grupo--legado { border-style: dashed; }
    .grupo__head { flex: 1; display: flex; align-items: center; gap: 0.75rem; padding: 0.95rem 1.1rem; text-decoration: none; color: inherit; min-width: 0; }
    .grupo__ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); flex: 0 0 auto; }
    .grupo--legado .grupo__ic { background: color-mix(in srgb, var(--warning) 16%, transparent); color: color-mix(in srgb, var(--warning) 65%, var(--text)); }
    .grupo__txt { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; flex: 1; }
    .grupo__txt strong { font-size: 1.05rem; }
    .grupo__txt small { color: var(--text-muted); font-size: 0.82rem; }
    .grupo__go { font-size: 1.5rem; line-height: 1; color: var(--text-muted); flex: 0 0 auto; }
    .grupo__editar { display: inline-grid; place-items: center; width: 46px; border: none; border-left: 1px solid var(--border); background: none; color: var(--text-muted); cursor: pointer; flex: 0 0 auto; }
    .grupo__editar:hover { color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); }
    app-instituicao-modal { display: contents; }
  `,
})
export class MinhasTurmasPage {
  private readonly api = inject(TurmaApiService);
  private readonly instApi = inject(InstituicaoApiService);

  protected readonly loading = signal(true);
  protected readonly turmas = signal<Turma[]>([]);
  protected readonly instituicoes = signal<Instituicao[]>([]);
  protected readonly modalAberto = signal(false);
  protected readonly editando = signal<Instituicao | null>(null);

  protected readonly semDados = computed(
    () => this.instituicoes().length === 0 && this.turmas().length === 0,
  );

  /** Cards agrupadores: um por instituição + o bloco de legado (sem escola). */
  protected readonly grupos = computed<Grupo[]>(() => {
    const turmas = this.turmas();
    const idsInst = new Set(this.instituicoes().map((i) => i.id));
    const grupos: Grupo[] = this.instituicoes().map((inst) => ({
      rota: inst.id,
      nome: inst.nome,
      instituicao: inst,
      qtd: turmas.filter((t) => t.instituicaoId === inst.id).length,
    }));
    const semEscola = turmas.filter(
      (t) => !t.instituicaoId || !idsInst.has(t.instituicaoId),
    );
    if (semEscola.length) {
      grupos.push({
        rota: 'sem-instituicao',
        nome: 'Turmas sem uma instituição de ensino',
        instituicao: null,
        qtd: semEscola.length,
      });
    }
    return grupos;
  });

  protected abrirCriarInstituicao(): void {
    this.editando.set(null);
    this.modalAberto.set(true);
  }

  protected abrirEditarInstituicao(inst: Instituicao): void {
    this.editando.set(inst);
    this.modalAberto.set(true);
  }

  protected aoSalvarInstituicao(): void {
    this.modalAberto.set(false);
    this.carregar();
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
