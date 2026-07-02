import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatarData } from '../../core/date-format';
import { Turma } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Spinner } from '../../ui/spinner/spinner';

/** MinhasTurmasPage (smart): lista as turmas do professor. */
@Component({
  selector: 'app-minhas-turmas-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Spinner],
  template: `
    <header class="head">
      <h1 class="title">Minhas turmas</h1>
      <a class="btn-primary nova" routerLink="/turmas/nova">Nova turma</a>
    </header>

    @if (loading()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (turmas().length === 0) {
      <app-card>
        <p class="muted">
          Você ainda não tem turmas. Crie a primeira e o Tichr projeta a grade.
        </p>
      </app-card>
    } @else {
      <div class="lista">
        @for (t of turmas(); track t.id) {
          <app-card>
            <div class="turma">
              <div>
                <h3 class="turma__nome">
                  @if (t.cor) {
                    <span class="dot" [style.background]="t.cor"></span>
                  }
                  {{ t.nome }}
                </h3>
                <span class="badge">
                  {{ t.tipoModalidade === 'MODULO_FECHADO' ? 'Módulo fechado' : 'Grade fixa' }}
                </span>
                @if (t.disciplina) {
                  <span class="disciplina">{{ t.disciplina }}</span>
                }
              </div>
              <div class="turma__meta">
                @if (t.horaInicio && t.horaFim) {
                  <span class="muted">{{ t.horaInicio }}–{{ t.horaFim }}</span>
                }
                <span class="muted">Início: {{ formatarData(t.dataInicio) }}</span>
                @if (t.tipoModalidade === 'MODULO_FECHADO' && t.dataFimPrevista) {
                  <span class="muted">Término: {{ formatarData(t.dataFimPrevista) }}</span>
                }
                @if (t.totalAulas) {
                  <span class="muted">{{ t.totalAulas }} aulas</span>
                }
                <a class="btn-outline editar" [routerLink]="['/turmas', t.id, 'editar']">
                  Editar
                </a>
              </div>
            </div>
          </app-card>
        }
      </div>
    }
  `,
  styles: `
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
    .turma {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .turma__nome {
      margin: 0 0 0.375rem;
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
      margin-left: 0.5rem;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .turma__meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.2rem;
      text-align: right;
      font-size: 0.85rem;
    }
    .editar {
      margin-top: 0.5rem;
      text-decoration: none;
      padding: 0.375rem 0.75rem;
    }
    .muted { color: var(--text-muted); }
  `,
})
export class MinhasTurmasPage {
  private readonly api = inject(TurmaApiService);
  protected readonly formatarData = formatarData;
  protected readonly loading = signal(true);
  protected readonly turmas = signal<Turma[]>([]);

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
