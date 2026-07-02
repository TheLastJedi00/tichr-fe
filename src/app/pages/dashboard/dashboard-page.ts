import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TurmaApiService } from '../../core/turma-api.service';
import { Sessao } from '../../core/models';

/**
 * DashboardPage (Smart Component): busca as sessoes da agenda,
 * gerencia loading/erro e detem o estado para a UI.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="title">Minha Agenda</h1>

    @if (loading()) {
      <p class="muted">Carregando sua agenda…</p>
    } @else if (error()) {
      <p class="error">{{ error() }}</p>
    } @else if (sessoes().length === 0) {
      <p class="muted">Nenhuma aula agendada ainda.</p>
    } @else {
      <p class="muted">{{ sessoes().length }} aula(s) na sua agenda.</p>
    }
  `,
  styles: `
    .title {
      margin: 0 0 1rem;
      font-size: 1.5rem;
      font-weight: 700;
    }
    .muted {
      color: var(--text-muted);
    }
    .error {
      color: var(--danger);
    }
  `,
})
export class DashboardPage {
  private readonly api = inject(TurmaApiService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly sessoes = signal<Sessao[]>([]);

  constructor() {
    this.carregar();
  }

  carregar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getSessoesSemana().subscribe({
      next: (sessoes) => {
        this.sessoes.set(sessoes);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar sua agenda.');
        this.loading.set(false);
      },
    });
  }
}
