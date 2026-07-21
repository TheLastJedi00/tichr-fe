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
import { turmaContaComoAtiva } from '../../core/plano.util';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Skeleton } from '../../ui/skeleton/skeleton';
import { InstituicaoModal } from './instituicao-modal';

/** Grupo de turmas na tela: uma instituição (ou o bloco de legado sem escola). */
interface Grupo {
  id: string; // id da instituição, ou '' para o bloco legado
  nome: string;
  instituicao: Instituicao | null;
  turmas: Turma[];
}

/**
 * MinhasTurmasPage (smart): centro do fluxo do ensino regular. Sem dados, orienta
 * a criar a **Instituição** primeiro (passo obrigatório). Com dados, agrupa as
 * turmas em **cards por instituição** (+ um bloco "Turmas sem uma instituição de
 * ensino" para o legado), que expandem para listar as turmas.
 */
@Component({
  selector: 'app-minhas-turmas-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Icon, Skeleton, InstituicaoModal],
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
      <div class="lista">
        @for (i of [1, 2, 3]; track i) {
          <app-card>
            <div class="sk-turma">
              <app-skeleton width="55%" height="1.15rem" />
              <app-skeleton width="40%" height="0.85rem" />
            </div>
          </app-card>
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
        @for (g of grupos(); track g.id) {
          <section class="grupo" [class.grupo--legado]="!g.instituicao">
            <button
              type="button"
              class="grupo__head"
              [attr.aria-expanded]="expandido() === g.id"
              (click)="alternar(g.id)"
            >
              <span class="grupo__ic">
                <app-icon [name]="g.instituicao ? 'building' : 'alert'" [size]="22" />
              </span>
              <span class="grupo__txt">
                <strong>{{ g.nome }}</strong>
                <small>{{ g.turmas.length }} {{ g.turmas.length === 1 ? 'turma' : 'turmas' }}</small>
              </span>
              @if (g.instituicao) {
                <span
                  class="grupo__editar"
                  role="button"
                  tabindex="0"
                  (click)="abrirEditarInstituicao(g.instituicao, $event)"
                  (keydown.enter)="abrirEditarInstituicao(g.instituicao, $event)"
                  title="Editar instituição"
                >
                  <app-icon name="settings" [size]="18" />
                </span>
              }
              <span class="grupo__go" [class.is-open]="expandido() === g.id" aria-hidden="true">›</span>
            </button>

            @if (expandido() === g.id) {
              <div class="grupo__corpo">
                @if (g.turmas.length === 0) {
                  <p class="muted vazio">Nenhuma turma nesta instituição ainda.</p>
                } @else {
                  <div class="lista">
                    @for (t of g.turmas; track t.id) {
                      <a class="turma" [routerLink]="['/turmas', t.id]">
                        <span class="turma__body">
                          <span class="turma__nome">
                            @if (t.cor) { <span class="dot" [style.background]="t.cor"></span> }
                            {{ t.nome }}
                            @if (!contaAtiva(t)) { <span class="badge badge--fim">Encerrada</span> }
                          </span>
                          <span class="turma__meta">
                            <span class="badge">
                              {{ t.tipoModalidade === 'MODULO_FECHADO' ? 'Módulo fechado' : 'Ensino Regular' }}
                            </span>
                            @if (t.anoSerie) { <span class="turma__disc">{{ t.anoSerie }}</span> }
                            @else if (t.disciplina) { <span class="turma__disc">{{ t.disciplina }}</span> }
                          </span>
                        </span>
                        <span class="turma__go" aria-hidden="true">›</span>
                      </a>
                    }
                  </div>
                }
                @if (g.instituicao) {
                  <a class="btn-outline add-turma" routerLink="/turmas/nova">
                    <app-icon name="plus" [size]="16" /> Nova turma nesta escola
                  </a>
                }
              </div>
            }
          </section>
        }
      </div>
    }

    <app-instituicao-modal
      [open]="modalAberto()"
      [instituicao]="editando()"
      (salvo)="aoSalvarInstituicao($event)"
      (fechar)="modalAberto.set(false)"
    />
  `,
  styles: `
    .head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .head__acoes { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .title { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .nova { text-decoration: none; }
    .btn-outline { display: inline-flex; align-items: center; gap: 0.4rem; }
    .lista { display: flex; flex-direction: column; gap: 0.75rem; }
    .sk-turma { display: flex; flex-direction: column; gap: 0.6rem; }
    .muted { color: var(--text-muted); }
    .vazio { margin: 0.25rem 0; }

    /* ===== Estado vazio (CTA obrigatório) ===== */
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

    /* ===== Grupos (instituições) ===== */
    .grupos { display: grid; gap: 0.75rem; }
    .grupo { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); overflow: hidden; }
    .grupo--legado { border-style: dashed; }
    .grupo__head {
      width: 100%; display: flex; align-items: center; gap: 0.75rem;
      padding: 0.95rem 1.1rem; background: none; border: none; color: inherit; cursor: pointer; font: inherit; text-align: left;
    }
    .grupo__head:hover { background: var(--surface-alt); }
    .grupo__ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); flex: 0 0 auto; }
    .grupo--legado .grupo__ic { background: color-mix(in srgb, var(--warning) 16%, transparent); color: color-mix(in srgb, var(--warning) 65%, var(--text)); }
    .grupo__txt { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; flex: 1; }
    .grupo__txt strong { font-size: 1.05rem; }
    .grupo__txt small { color: var(--text-muted); font-size: 0.82rem; }
    .grupo__editar { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; color: var(--text-muted); flex: 0 0 auto; }
    .grupo__editar:hover { color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent); }
    .grupo__go { font-size: 1.5rem; line-height: 1; color: var(--text-muted); transition: transform 0.15s ease; flex: 0 0 auto; }
    .grupo__go.is-open { transform: rotate(90deg); }
    .grupo__corpo { padding: 0 1.1rem 1.1rem; display: grid; gap: 0.75rem; }
    .add-turma { width: fit-content; text-decoration: none; }

    /* ===== Turma ===== */
    .turma { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; border-radius: var(--radius); background: var(--surface-alt); border: 1px solid var(--border); text-decoration: none; color: inherit; }
    .turma:hover { border-color: var(--primary); }
    .turma__body { display: flex; flex-direction: column; align-items: flex-start; gap: 0.35rem; min-width: 0; flex: 1; }
    .turma__nome { font-size: 1.05rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.4rem; max-width: 100%; flex-wrap: wrap; }
    .turma__meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .turma__disc { color: var(--text-muted); font-size: 0.85rem; overflow-wrap: anywhere; }
    .dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; flex: 0 0 auto; }
    .badge { font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 999px; border: 1px solid var(--primary); color: var(--primary); }
    .badge--fim { background: color-mix(in srgb, var(--text-muted) 18%, transparent); color: var(--text-muted); border-color: transparent; }
    .turma__go { flex: 0 0 auto; font-size: 1.4rem; line-height: 1; color: var(--text-muted); }
    app-instituicao-modal { display: contents; }
  `,
})
export class MinhasTurmasPage {
  private readonly api = inject(TurmaApiService);
  private readonly instApi = inject(InstituicaoApiService);

  protected readonly loading = signal(true);
  protected readonly turmas = signal<Turma[]>([]);
  protected readonly instituicoes = signal<Instituicao[]>([]);
  protected readonly expandido = signal<string | null>(null);
  protected readonly modalAberto = signal(false);
  protected readonly editando = signal<Instituicao | null>(null);

  protected readonly semDados = computed(
    () => this.instituicoes().length === 0 && this.turmas().length === 0,
  );

  protected contaAtiva(t: Turma): boolean {
    return turmaContaComoAtiva(t);
  }

  /** Cards agrupadores: um por instituição + o bloco de legado (sem escola). */
  protected readonly grupos = computed<Grupo[]>(() => {
    const turmas = this.turmas();
    const idsInst = new Set(this.instituicoes().map((i) => i.id));
    const grupos: Grupo[] = this.instituicoes().map((inst) => ({
      id: inst.id,
      nome: inst.nome,
      instituicao: inst,
      turmas: turmas.filter((t) => t.instituicaoId === inst.id),
    }));
    // Legado / sem escola: turmas sem instituição (ou apontando p/ uma removida).
    const semEscola = turmas.filter(
      (t) => !t.instituicaoId || !idsInst.has(t.instituicaoId),
    );
    if (semEscola.length) {
      grupos.push({
        id: '',
        nome: 'Turmas sem uma instituição de ensino',
        instituicao: null,
        turmas: semEscola,
      });
    }
    return grupos;
  });

  protected alternar(id: string): void {
    this.expandido.set(this.expandido() === id ? null : id);
  }

  protected abrirCriarInstituicao(): void {
    this.editando.set(null);
    this.modalAberto.set(true);
  }

  protected abrirEditarInstituicao(inst: Instituicao, ev: Event): void {
    ev.stopPropagation();
    this.editando.set(inst);
    this.modalAberto.set(true);
  }

  protected aoSalvarInstituicao(inst: Instituicao): void {
    this.modalAberto.set(false);
    this.expandido.set(inst.id);
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
        // Abre o primeiro grupo por padrão para não deixar a tela "fechada".
        if (this.expandido() === null) {
          this.expandido.set(instituicoes[0]?.id ?? (turmas.length ? '' : null));
        }
      },
      error: () => this.loading.set(false),
    });
  }

  constructor() {
    this.carregar();
  }
}
