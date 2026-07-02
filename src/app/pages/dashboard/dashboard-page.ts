import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatarData } from '../../core/date-format';
import { dataPorExtenso, saudacaoPorHora } from '../../core/greeting';
import { CriarExcecaoPayload, Sessao } from '../../core/models';
import { ProfileService } from '../../core/profile.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { IconButton } from '../../ui/icon-button/icon-button';
import { Spinner } from '../../ui/spinner/spinner';
import { ExcecaoModal } from './excecao-modal';

interface GrupoDia {
  data: string;
  label: string;
  itens: Sessao[];
}

/**
 * DashboardPage (Smart Component): tela de recepção. Saudação personalizada,
 * contexto de tempo e foco na próxima aula.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, IconButton, Spinner, ExcecaoModal],
  template: `
    <header class="greeting">
      <h1>Olá, {{ saudacao }}{{ nome() ? ', ' + nome() : '' }}!</h1>
      <p class="data">Hoje é {{ dataHoje }}.</p>
    </header>

    <div class="actions">
      <a class="btn-outline" routerLink="/turmas/nova">Nova turma</a>
      <app-icon-button name="alert" variant="primary" (clicked)="abrirExcecao()">
        Exceção
      </app-icon-button>
    </div>

    @if (loading()) {
      <div class="loading">
        <app-spinner [size]="32" />
        <span class="muted">Carregando sua agenda…</span>
      </div>
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

    <app-excecao-modal
      [open]="excecaoAberta()"
      [loading]="salvandoExcecao()"
      (confirmar)="salvarExcecao($event)"
      (fechar)="excecaoAberta.set(false)"
    />
  `,
  styles: `
    .greeting {
      margin-bottom: 1.25rem;
    }
    .greeting h1 {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .greeting .data {
      margin: 0.25rem 0 0;
      color: var(--text-muted);
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
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
    .badge--agendada { color: var(--primary); border-color: var(--primary); }
    .badge--cancelada { color: var(--danger); border-color: var(--danger); }
    .badge--realizada { color: var(--success); border-color: var(--success); }
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 3rem 0;
      color: var(--primary);
    }
    .muted { color: var(--text-muted); }
    .empty { margin: 0; }
  `,
})
export class DashboardPage {
  private readonly api = inject(TurmaApiService);
  private readonly profileService = inject(ProfileService);

  private readonly agora = new Date();
  protected readonly saudacao = saudacaoPorHora(this.agora);
  protected readonly dataHoje = dataPorExtenso(this.agora);
  protected readonly nome = this.profileService.nome;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly sessoes = signal<Sessao[]>([]);
  protected readonly excecaoAberta = signal(false);
  protected readonly salvandoExcecao = signal(false);

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
    this.profileService.load().subscribe({ error: () => {} });
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
      error: () => this.loading.set(false),
    });
  }

  protected abrirExcecao(): void {
    this.excecaoAberta.set(true);
  }

  protected salvarExcecao(payload: CriarExcecaoPayload): void {
    this.salvandoExcecao.set(true);
    this.api.criarExcecao(payload).subscribe({
      next: () => {
        this.salvandoExcecao.set(false);
        this.excecaoAberta.set(false);
        this.carregar();
      },
      error: () => {
        this.salvandoExcecao.set(false);
        this.excecaoAberta.set(false);
      },
    });
  }
}
