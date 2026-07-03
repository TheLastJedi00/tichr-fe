import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Aluno } from '../../core/models';
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
        <app-xp-bar [xp]="xp()" />
      </app-card>

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
  `,
})
export class StudentDashboardPage {
  private readonly api = inject(TurmaApiService);
  private readonly studentAuth = inject(StudentAuthService);

  protected readonly carregando = signal(true);
  protected readonly nome = signal(this.studentAuth.aluno()?.nome ?? '');
  protected readonly xp = signal(this.studentAuth.aluno()?.xpTotal ?? 0);

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
  }
}
