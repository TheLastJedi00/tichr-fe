import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatarData } from '../../core/date-format';
import { Sessao } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { IconButton } from '../../ui/icon-button/icon-button';

interface GrupoDia {
  data: string;
  label: string;
  itens: Sessao[];
}

/**
 * DashboardPage (Smart Component): busca as sessoes da agenda,
 * gerencia loading/erro e detem o estado para a UI.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, IconButton],
  template: `
    <header class="page-head">
      <h1 class="title">Minha Agenda</h1>
      <div class="actions">
        <a class="btn-outline" routerLink="/turmas/nova">Nova turma</a>
        <app-icon-button name="alert" variant="primary" (clicked)="abrirExcecao()">
          Exceção
        </app-icon-button>
      </div>
    </header>

    @if (loading()) {
      <p class="muted">Carregando sua agenda…</p>
    } @else if (error()) {
      <p class="error">{{ error() }}</p>
    } @else if (grupos().length === 0) {
      <app-card>
        <p class="muted empty">
          Nenhuma aula agendada ainda. Crie uma turma para o Tichr projetar sua
          grade.
        </p>
      </app-card>
    } @else {
      <div class="lista">
        @for (grupo of grupos(); track grupo.data) {
          <app-card [title]="grupo.label">
            @for (sessao of grupo.itens; track sessao.id) {
              <div class="sessao" [class.cancelada]="sessao.status === 'CANCELADA'">
                <span class="sessao__num">Aula {{ sessao.numero }}</span>
                <span class="badge" [class]="'badge--' + sessao.status.toLowerCase()">
                  {{ sessao.status }}
                </span>
              </div>
            }
          </app-card>
        }
      </div>
    }
  `,
  styles: `
    .page-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .lista {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .sessao {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0;
    }
    .sessao + .sessao {
      border-top: 1px solid var(--border);
    }
    .sessao.cancelada .sessao__num {
      text-decoration: line-through;
      color: var(--text-muted);
    }
    .sessao__num {
      font-weight: 600;
    }
    .badge {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      color: var(--text-muted);
    }
    .badge--agendada {
      color: var(--primary);
      border-color: var(--primary);
    }
    .badge--cancelada {
      color: var(--danger);
      border-color: var(--danger);
    }
    .badge--realizada {
      color: var(--success);
      border-color: var(--success);
    }
    .muted {
      color: var(--text-muted);
    }
    .empty {
      margin: 0;
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
  protected readonly excecaoAberta = signal(false);

  protected readonly grupos = computed<GrupoDia[]>(() => {
    const mapa = new Map<string, Sessao[]>();
    for (const sessao of this.sessoes()) {
      const lista = mapa.get(sessao.data) ?? [];
      lista.push(sessao);
      mapa.set(sessao.data, lista);
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, itens]) => ({
        data,
        label: formatarData(data),
        itens: itens.sort((x, y) => x.numero - y.numero),
      }));
  });

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

  protected abrirExcecao(): void {
    this.excecaoAberta.set(true);
  }
}
