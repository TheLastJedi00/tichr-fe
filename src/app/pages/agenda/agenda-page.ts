import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { hojeISO } from '../../core/greeting';
import { Sessao } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { Spinner } from '../../ui/spinner/spinner';

interface DiaCal {
  iso: string;
  dia: number;
  sessoes: Sessao[];
  hoje: boolean;
}

const CABECALHOS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function toISO(dt: Date): string {
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}
function addDays(iso: string, n: number): string {
  const dt = parse(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return toISO(dt);
}
/** Domingo da semana da data. */
function domingo(iso: string): string {
  return addDays(iso, -parse(iso).getUTCDay());
}

/**
 * AgendaPage (smart): visão em grid semanal/mensal das aulas.
 */
@Component({
  selector: 'app-agenda-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Spinner],
  template: `
    <h1 class="title">Minha Agenda</h1>

    @if (loading()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <div class="grid-wrap">
        <div class="grid cabecalho">
          @for (c of cabecalhos; track $index) {
            <div class="col-head">{{ c }}</div>
          }
        </div>
        @for (semana of semanas(); track semana[0].iso) {
          <div class="grid">
            @for (dia of semana; track dia.iso) {
              <div class="cell" [class.tem-aula]="dia.sessoes.length" [class.hoje]="dia.hoje">
                <span class="cell__dia">{{ dia.dia }}</span>
                @for (s of dia.sessoes; track s.id) {
                  <span
                    class="badge"
                    [class.badge--cancelada]="s.status === 'CANCELADA'"
                  >Aula {{ s.numero }}</span>
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .grid-wrap { overflow-x: auto; }
    .grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(44px, 1fr));
      gap: 4px;
    }
    .grid + .grid { margin-top: 4px; }
    .col-head {
      text-align: center;
      font-weight: 700;
      color: var(--text-muted);
      padding: 0.375rem 0;
    }
    .cell {
      min-height: 68px;
      padding: 0.375rem;
      background: var(--surface-alt);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .cell.tem-aula {
      background: var(--surface);
      border-color: var(--primary);
    }
    .cell.hoje {
      outline: 2px solid var(--primary);
      outline-offset: -1px;
    }
    .cell__dia { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .cell.hoje .cell__dia { color: var(--primary); }
    .badge {
      display: block;
      margin-top: 0.25rem;
      padding: 0.1rem 0.3rem;
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--primary-contrast);
      background: var(--primary);
      border-radius: 4px;
      white-space: nowrap;
    }
    .badge--cancelada {
      background: var(--danger);
      text-decoration: line-through;
    }
  `,
})
export class AgendaPage {
  private readonly api = inject(TurmaApiService);
  protected readonly cabecalhos = CABECALHOS;
  protected readonly loading = signal(true);
  protected readonly sessoes = signal<Sessao[]>([]);

  protected readonly semanas = computed<DiaCal[][]>(() => {
    const hoje = hojeISO(new Date());
    const datas = this.sessoes().map((s) => s.data).sort();
    const inicio = domingo(datas[0] ?? hoje);
    const fim = datas[datas.length - 1] ?? hoje;

    const porData = new Map<string, Sessao[]>();
    for (const s of this.sessoes()) {
      porData.set(s.data, [...(porData.get(s.data) ?? []), s]);
    }

    const semanas: DiaCal[][] = [];
    let cursor = inicio;
    // vai ate cobrir a semana da ultima aula (ou 6 semanas se vazio)
    const limite = addDays(fim, 6);
    while (cursor <= limite && semanas.length < 12) {
      const semana: DiaCal[] = [];
      for (let i = 0; i < 7; i++) {
        semana.push({
          iso: cursor,
          dia: parse(cursor).getUTCDate(),
          sessoes: porData.get(cursor) ?? [],
          hoje: cursor === hoje,
        });
        cursor = addDays(cursor, 1);
      }
      semanas.push(semana);
    }
    return semanas;
  });

  constructor() {
    this.api.getSessoesSemana().subscribe({
      next: (s) => {
        this.sessoes.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
