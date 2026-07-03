import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { formatarData } from '../../core/date-format';
import { Sessao } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Agenda do aluno (somente leitura): próximos dias letivos já recalculados,
 * com feriados/cancelamentos sinalizados.
 */
@Component({
  selector: 'app-student-agenda-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Spinner],
  template: `
    <h1 class="title">Minha agenda</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (proximas().length === 0) {
      <app-card><p class="muted">Nenhuma aula futura na sua grade.</p></app-card>
    } @else {
      <div class="lista">
        @for (s of proximas(); track s.id) {
          <div class="aula" [class.aula--cancelada]="s.status === 'CANCELADA'">
            <div class="aula__esq">
              <span class="aula__n">Aula {{ s.numero }}</span>
              <span class="aula__d">{{ formatarData(s.data) }}</span>
            </div>
            <span class="status status--{{ s.status.toLowerCase() }}">
              {{ s.status === 'CANCELADA' ? 'Sem aula' : 'Aula' }}
            </span>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 800; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .lista { display: flex; flex-direction: column; gap: 0.5rem; }
    .aula {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.9rem 1rem;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
    }
    .aula--cancelada { opacity: 0.7; }
    .aula__esq { display: flex; flex-direction: column; }
    .aula__n { font-weight: 700; }
    .aula__d { color: var(--text-muted); font-size: 0.9rem; }
    .status { font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; }
    .status--agendada, .status--realizada { color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .status--cancelada { color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, transparent); }
    .muted { color: var(--text-muted); margin: 0; }
  `,
})
export class StudentAgendaPage {
  private readonly api = inject(TurmaApiService);
  protected readonly formatarData = formatarData;

  protected readonly carregando = signal(true);
  private readonly sessoes = signal<Sessao[]>([]);

  private readonly hoje = new Date().toISOString().slice(0, 10);

  /** Aulas de hoje em diante, ordenadas por data. */
  protected readonly proximas = computed(() =>
    this.sessoes()
      .filter((s) => s.data >= this.hoje)
      .sort((a, b) => a.data.localeCompare(b.data)),
  );

  constructor() {
    this.api.getMinhaAgenda().subscribe({
      next: (s) => {
        this.sessoes.set(s);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }
}
