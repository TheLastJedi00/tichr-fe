import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Aluno, ProgressoTurma } from '../../core/models';
import { StudentAuthService } from '../../core/student-auth.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';
import { XpBar } from '../../ui/xp-bar/xp-bar';

/** Dashboard do aluno: saudação + barra de XP/nível + atalhos. */
@Component({
  selector: 'app-student-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Icon, Spinner, XpBar],
  template: `
    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <h1 class="ola">Olá, {{ nome() }} 👋</h1>

      <app-card>
        <app-xp-bar [xp]="xp()" [unidade]="nomePontuacao()" />
      </app-card>

      @if (progresso(); as p) {
        <app-card>
          <div class="evolucao">
            <div class="evolucao__top">
              <span class="evolucao__tit">Evolução da turma</span>
              <span class="evolucao__pct">{{ p.pct }}%</span>
            </div>
            <div class="trilho"><div class="trilho__fill" [style.width.%]="p.pct"></div></div>
            <span class="evolucao__sub">{{ p.concluidas }} de {{ p.total }} aulas concluídas</span>
          </div>
        </app-card>
      }

      <div class="atalhos">
        <a class="atalho" routerLink="/aluno/agenda">
          <app-icon name="calendar" [size]="24" />
          <span>Minha agenda</span>
        </a>
        <a class="atalho" routerLink="/aluno/ranking">
          <app-icon name="trophy" [size]="24" />
          <span>Ranking da turma</span>
        </a>
      </div>
    }
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .ola { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 800; }
    .atalhos {
      margin-top: 1rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .atalho {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.25rem 1rem;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--primary);
      font-weight: 600;
      text-align: center;
    }
    .atalho:hover { border-color: var(--primary); }
    .evolucao__top { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.4rem; }
    .evolucao__tit { font-weight: 700; }
    .evolucao__pct { font-weight: 800; color: var(--primary); font-variant-numeric: tabular-nums; }
    .trilho { height: 12px; border-radius: 999px; background: var(--surface-alt); overflow: hidden; }
    .trilho__fill { height: 100%; border-radius: 999px; background: var(--primary); transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
    .evolucao__sub { display: block; margin-top: 0.4rem; font-size: 0.85rem; color: var(--text-muted); }
  `,
})
export class StudentDashboardPage {
  private readonly api = inject(TurmaApiService);
  private readonly studentAuth = inject(StudentAuthService);

  protected readonly carregando = signal(true);
  protected readonly nome = signal(this.studentAuth.aluno()?.nome ?? '');
  protected readonly xp = signal(this.studentAuth.aluno()?.xpTotal ?? 0);
  protected readonly nomePontuacao = this.studentAuth.nomePontuacao;
  protected readonly progresso = signal<ProgressoTurma | null>(null);

  constructor() {
    // Recarrega o perfil para refletir o XP mais recente.
    this.api.getMeuPerfil().subscribe({
      next: (aluno: Aluno) => {
        this.nome.set(aluno.nome);
        this.xp.set(aluno.xpTotal ?? 0);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
    this.api.getMeuProgresso().subscribe({
      next: (p) => this.progresso.set(p),
      error: () => {},
    });
  }
}
