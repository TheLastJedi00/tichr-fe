import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatarData } from '../../core/date-format';
import { Turma } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { turmaContaComoAtiva } from '../../core/plano.util';
import { Card } from '../../ui/card/card';
import { Modal } from '../../ui/modal/modal';
import { Skeleton } from '../../ui/skeleton/skeleton';

/** MinhasTurmasPage (smart): lista as turmas do professor. */
@Component({
  selector: 'app-minhas-turmas-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Skeleton, Modal],
  template: `
    <header class="head">
      <h1 class="title">Minhas turmas</h1>
      <a class="btn-primary nova" routerLink="/turmas/nova">Nova turma</a>
    </header>

    @if (loading()) {
      <div class="lista">
        @for (i of [1, 2, 3]; track i) {
          <app-card>
            <div class="sk-turma">
              <app-skeleton width="55%" height="1.15rem" />
              <app-skeleton width="40%" height="0.85rem" />
              <app-skeleton width="70%" height="0.85rem" />
            </div>
          </app-card>
        }
      </div>
    } @else if (turmas().length === 0) {
      <app-card>
        <p class="muted">
          Você ainda não tem turmas. Crie a primeira e o Tichr projeta a grade.
        </p>
      </app-card>
    } @else {
      <div class="abas">
        <button type="button" class="aba" [class.aba--on]="aba() === 'ativas'" (click)="aba.set('ativas')">
          Ativas ({{ ativas().length }})
        </button>
        <button type="button" class="aba" [class.aba--on]="aba() === 'encerradas'" (click)="aba.set('encerradas')">
          Encerradas ({{ encerradas().length }})
        </button>
      </div>

      @if (turmasFiltradas().length === 0) {
        <app-card>
          <p class="muted">
            {{ aba() === 'ativas' ? 'Nenhuma turma ativa no momento.' : 'Nenhuma turma encerrada ainda.' }}
          </p>
        </app-card>
      }

      <div class="lista">
        @for (t of turmasFiltradas(); track t.id) {
          <app-card>
            <div class="turma">
              <div class="turma__top">
                <div class="turma__id">
                  <h3 class="turma__nome">
                    @if (t.cor) {
                      <span class="dot" [style.background]="t.cor"></span>
                    }
                    {{ t.nome }}
                    @if (aba() === 'encerradas') {
                      <span class="badge badge--fim">Encerrada</span>
                    }
                  </h3>
                  <div class="turma__tags">
                    <span class="badge">
                      {{ t.tipoModalidade === 'MODULO_FECHADO' ? 'Módulo fechado' : 'Grade fixa' }}
                    </span>
                    @if (t.disciplina) {
                      <span class="disciplina">{{ t.disciplina }}</span>
                    }
                  </div>
                </div>
                <div class="acoes">
                  <a class="btn-outline editar" [routerLink]="['/turmas', t.id]">
                    {{ aba() === 'encerradas' ? 'Ver' : 'Gerenciar' }}
                  </a>
                  @if (aba() === 'ativas') {
                    <a class="btn-outline editar" [routerLink]="['/turmas', t.id, 'editar']">Editar</a>
                    <button class="btn-outline editar encerrar" type="button" (click)="encerrarAlvo.set(t)">
                      Encerrar
                    </button>
                  }
                </div>
              </div>
              <div class="turma__meta">
                @if (t.horaInicio && t.horaFim) {
                  <span>{{ t.horaInicio }}–{{ t.horaFim }}</span>
                }
                <span>Início {{ formatarData(t.dataInicio) }}</span>
                @if (t.tipoModalidade === 'MODULO_FECHADO' && t.dataFimPrevista) {
                  <span>Término {{ formatarData(t.dataFimPrevista) }}</span>
                }
                @if (t.totalAulas) {
                  <span>{{ t.totalAulas }} aulas</span>
                }
              </div>
            </div>
          </app-card>
        }
      </div>
    }

    <app-modal
      [open]="encerrarAlvo() !== null"
      title="Encerrar turma"
      (close)="encerrando() || encerrarAlvo.set(null)"
    >
      <p class="muted">
        Encerrar <strong>{{ encerrarAlvo()?.nome }}</strong>? Ela vira somente leitura (sem novos
        jogos ou alunos) e vai para o <strong>Hall da Fama</strong>. O PIN de 2 dígitos volta ao pool.
      </p>
      <div modal-actions>
        <button class="btn-outline" type="button" [disabled]="encerrando()" (click)="encerrarAlvo.set(null)">
          Cancelar
        </button>
        <button class="btn-danger" type="button" [disabled]="encerrando()" (click)="encerrar()">
          {{ encerrando() ? 'Encerrando…' : 'Encerrar turma' }}
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .abas { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .aba {
      font: inherit; font-weight: 700; cursor: pointer;
      padding: 0.5rem 0.9rem; border-radius: 999px;
      border: 1px solid var(--border); background: var(--surface); color: var(--text-muted);
    }
    .aba--on { color: var(--primary-contrast); background: var(--primary); border-color: var(--primary); }
    .badge--fim { background: color-mix(in srgb, var(--text-muted) 18%, transparent); color: var(--text-muted); }
    .encerrar { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 45%, var(--border)); }
    .encerrar:hover { background: color-mix(in srgb, var(--danger) 10%, transparent); }
    .btn-danger {
      padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 700;
      color: #fff; background: var(--danger); border: 1px solid var(--danger);
    }
    .btn-danger:disabled { opacity: 0.6; cursor: default; }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .title { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .nova { text-decoration: none; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .lista { display: flex; flex-direction: column; gap: 0.75rem; }
    .sk-turma { display: flex; flex-direction: column; gap: 0.6rem; }
    .turma {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .turma__top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem 1rem;
      flex-wrap: wrap;
    }
    .turma__id { min-width: 0; }
    .turma__nome {
      margin: 0 0 0.5rem;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      display: inline-block;
      flex: 0 0 auto;
    }
    .turma__tags {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      border: 1px solid var(--primary);
      color: var(--primary);
    }
    .disciplina {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .turma__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem 1rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .acoes {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }
    .editar {
      text-decoration: none;
      padding: 0.4rem 0.8rem;
      white-space: nowrap;
    }
    .muted { color: var(--text-muted); }
  `,
})
export class MinhasTurmasPage {
  private readonly api = inject(TurmaApiService);
  protected readonly formatarData = formatarData;
  protected readonly loading = signal(true);
  protected readonly turmas = signal<Turma[]>([]);

  protected readonly aba = signal<'ativas' | 'encerradas'>('ativas');
  protected readonly ativas = computed(() =>
    this.turmas().filter((t) => turmaContaComoAtiva(t)),
  );
  protected readonly encerradas = computed(() =>
    this.turmas().filter((t) => !turmaContaComoAtiva(t)),
  );
  protected readonly turmasFiltradas = computed(() =>
    this.aba() === 'ativas' ? this.ativas() : this.encerradas(),
  );

  // Encerrar turma
  protected readonly encerrarAlvo = signal<Turma | null>(null);
  protected readonly encerrando = signal(false);

  constructor() {
    this.api.getTurmas().subscribe({
      next: (t) => {
        this.turmas.set(t);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected encerrar(): void {
    const alvo = this.encerrarAlvo();
    if (!alvo) return;
    this.encerrando.set(true);
    this.api.encerrarTurma(alvo.id).subscribe({
      next: (t) => {
        this.turmas.update((lista) => lista.map((x) => (x.id === t.id ? t : x)));
        this.encerrando.set(false);
        this.encerrarAlvo.set(null);
        this.aba.set('encerradas');
      },
      error: () => this.encerrando.set(false),
    });
  }
}
