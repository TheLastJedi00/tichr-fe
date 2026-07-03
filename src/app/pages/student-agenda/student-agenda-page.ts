import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { formatarData } from '../../core/date-format';
import { Sessao } from '../../core/models';
import { statusVisual, StatusVisual } from '../../core/status-sessao';
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
              @if (topicoDe(s.numero); as t) {
                <span class="aula__topico">{{ t }}</span>
              }
            </div>
            <span class="status status--{{ statusAula(s).toLowerCase() }}">
              {{ rotulo(statusAula(s)) }}
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
    .aula__esq { display: flex; flex-direction: column; gap: 0.15rem; }
    .aula__n { font-weight: 700; }
    .aula__d { color: var(--text-muted); font-size: 0.9rem; }
    .aula__topico {
      margin-top: 0.15rem; align-self: flex-start;
      font-size: 0.78rem; font-weight: 700;
      color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent);
      padding: 0.12rem 0.5rem; border-radius: 999px;
    }
    .status { font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; }
    .status--agendada { color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .status--concluida { color: var(--text-muted); background: var(--surface-alt); }
    .status--em_andamento {
      color: var(--success);
      background: color-mix(in srgb, var(--success) 15%, transparent);
      animation: pulso 1.4s ease-in-out infinite;
    }
    @keyframes pulso {
      0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--success) 0%, transparent); }
      50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--success) 30%, transparent); }
    }
    @media (prefers-reduced-motion: reduce) { .status--em_andamento { animation: none; } }
    .status--cancelada { color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, transparent); }
    .muted { color: var(--text-muted); margin: 0; }
  `,
})
export class StudentAgendaPage {
  private readonly api = inject(TurmaApiService);
  protected readonly formatarData = formatarData;

  protected readonly carregando = signal(true);
  private readonly sessoes = signal<Sessao[]>([]);
  private readonly topicos = signal<Map<number, string>>(new Map());

  private readonly hoje = new Date().toISOString().slice(0, 10);

  /** Aulas de hoje em diante + aulas passadas que têm tópico ("já vimos"). */
  protected readonly proximas = computed(() =>
    this.sessoes()
      .filter((s) => s.data >= this.hoje || this.topicos().has(s.numero))
      .sort((a, b) => a.data.localeCompare(b.data)),
  );

  /** Tópico alocado a uma aula (por número), se houver. */
  protected topicoDe(numero: number): string | undefined {
    return this.topicos().get(numero);
  }

  protected statusAula(s: Sessao): StatusVisual {
    return statusVisual(s);
  }

  /** Rótulo amigável para o aluno (cancelada vira "Sem aula"). */
  protected rotulo(status: StatusVisual): string {
    return {
      CONCLUIDA: 'Concluída',
      EM_ANDAMENTO: 'Em andamento',
      AGENDADA: 'Aula',
      CANCELADA: 'Sem aula',
    }[status];
  }

  constructor() {
    this.api.getMinhaAgenda().subscribe({
      next: (s) => {
        this.sessoes.set(s);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
    // Tópicos do plano de aula (só vêm preenchidos se o professor for PhD).
    this.api.getMeuPlano().subscribe({
      next: (r) =>
        this.topicos.set(new Map(r.topicos.map((t) => [t.numeroAula, t.topico]))),
      error: () => {},
    });
  }
}
