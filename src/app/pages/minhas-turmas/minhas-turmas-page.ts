import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Turma } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { turmaContaComoAtiva } from '../../core/plano.util';
import { Card } from '../../ui/card/card';
import { Skeleton } from '../../ui/skeleton/skeleton';

/** MinhasTurmasPage (smart): lista as turmas do professor. */
@Component({
  selector: 'app-minhas-turmas-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Skeleton],
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
          <a class="turma" [routerLink]="['/turmas', t.id]">
            <span class="turma__nome">
              @if (t.cor) {
                <span class="dot" [style.background]="t.cor"></span>
              }
              {{ t.nome }}
            </span>
            <span class="turma__tags">
              <span class="badge">
                {{ t.tipoModalidade === 'MODULO_FECHADO' ? 'Módulo fechado' : 'Grade fixa' }}
              </span>
              @if (t.disciplina) {
                <span class="disciplina">{{ t.disciplina }}</span>
              }
              @if (aba() === 'encerradas') {
                <span class="badge badge--fim">Encerrada</span>
              }
            </span>
            <span class="turma__go" aria-hidden="true">›</span>
          </a>
        }
      </div>
    }
  `,
  styles: `
    .abas { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .aba {
      font: inherit; font-weight: 700; cursor: pointer;
      padding: 0.5rem 0.9rem; border-radius: 999px;
      border: 1px solid var(--border); background: var(--surface); color: var(--text-muted);
    }
    .aba--on { color: var(--primary-contrast); background: var(--primary); border-color: var(--primary); }
    .badge--fim { background: color-mix(in srgb, var(--text-muted) 18%, transparent); color: var(--text-muted); border-color: transparent; }
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
      align-items: center;
      flex-wrap: wrap;
      gap: 0.4rem 0.9rem;
      padding: 0.95rem 1.1rem;
      border-radius: var(--radius);
      background: var(--surface);
      border: 1px solid var(--border);
      text-decoration: none;
      color: inherit;
    }
    .turma:hover { border-color: var(--primary); }
    .turma__nome {
      font-size: 1.1rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
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
    .turma__go { margin-left: auto; font-size: 1.4rem; line-height: 1; color: var(--text-muted); }
    .muted { color: var(--text-muted); }
  `,
})
export class MinhasTurmasPage {
  private readonly api = inject(TurmaApiService);
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

  constructor() {
    this.api.getTurmas().subscribe({
      next: (t) => {
        this.turmas.set(t);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
