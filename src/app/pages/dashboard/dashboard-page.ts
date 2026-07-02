import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatarData } from '../../core/date-format';
import { dataPorExtenso, hojeISO, saudacaoPorHora } from '../../core/greeting';
import { CriarExcecaoPayload, Sessao } from '../../core/models';
import { ProfileService } from '../../core/profile.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { IconButton } from '../../ui/icon-button/icon-button';
import { Spinner } from '../../ui/spinner/spinner';
import { ExcecaoModal } from './excecao-modal';

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

    @if (mostrarOnboarding()) {
      <app-card>
        <div class="onboarding">
          <h3>Que bom ter você por aqui! 👋</h3>
          <p class="muted">
            Para deixarmos a casa com a sua cara, que tal configurar seu perfil?
          </p>
          <a class="btn-primary" routerLink="/configuracoes">Completar meu perfil</a>
        </div>
      </app-card>
    }

    @if (loading()) {
      <div class="loading">
        <app-spinner [size]="32" />
        <span class="muted">Carregando sua agenda…</span>
      </div>
    } @else {
      @if (proxima(); as p) {
        <app-card title="Próxima aula">
          <div class="proxima">
            <span class="proxima__data">{{ formatarData(p.data) }}</span>
            <span class="proxima__num">Aula {{ p.numero }}</span>
          </div>
        </app-card>
      } @else {
        <app-card>
          <p class="muted empty">
            Nenhuma aula agendada. Crie uma turma para o Tichr projetar sua grade.
          </p>
        </app-card>
      }

      <a class="btn-outline ver-agenda" routerLink="/agenda">Ver agenda completa</a>
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
    .proxima {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .proxima__data {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--primary);
    }
    .proxima__num {
      font-weight: 600;
      color: var(--text-muted);
    }
    .ver-agenda {
      display: inline-flex;
      margin-top: 0.875rem;
      text-decoration: none;
    }
    .onboarding h3 {
      margin: 0 0 0.375rem;
      font-size: 1.1rem;
    }
    .onboarding p {
      margin: 0 0 1rem;
    }
    .onboarding .btn-primary {
      text-decoration: none;
    }
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
  protected readonly perfilCarregado = signal(false);
  protected readonly mostrarOnboarding = computed(
    () => this.perfilCarregado() && !this.nome(),
  );

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly sessoes = signal<Sessao[]>([]);
  protected readonly excecaoAberta = signal(false);
  protected readonly salvandoExcecao = signal(false);

  protected readonly formatarData = formatarData;

  /** Próxima aula AGENDADA a partir de hoje (a mais próxima). */
  protected readonly proxima = computed<Sessao | null>(() => {
    const hoje = hojeISO(this.agora);
    return (
      this.sessoes()
        .filter((s) => s.status === 'AGENDADA' && s.data >= hoje)
        .sort((a, b) => a.data.localeCompare(b.data) || a.numero - b.numero)[0] ??
      null
    );
  });

  constructor() {
    this.profileService.load().subscribe({
      next: () => this.perfilCarregado.set(true),
      error: () => this.perfilCarregado.set(true),
    });
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
