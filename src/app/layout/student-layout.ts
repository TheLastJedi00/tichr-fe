import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StudentAuthService } from '../core/student-auth.service';
import { ThemeService } from '../core/theme.service';
import { Icon, IconName } from '../ui/icon/icon';
import { Logo } from '../ui/logo/logo';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
}

/**
 * Moldura do Portal do Aluno (Plano PhD): experiência isolada do painel do
 * professor — sem menu lateral, com barra de navegação inferior estilo app.
 */
@Component({
  selector: 'app-student-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Logo],
  template: `
    <header class="topo">
      <app-logo class="topo__marca" [size]="28" [onDark]="true" />
      <div class="topo__acoes">
        <button
          class="tema"
          type="button"
          [attr.aria-label]="theme.theme() === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'"
          (click)="theme.toggle()"
        >
          <app-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="18" />
        </button>
        <button class="sair" type="button" (click)="sair()">Sair</button>
      </div>
    </header>

    <main class="conteudo">
      <router-outlet />
    </main>

    <nav class="tabbar">
      @for (item of nav(); track item.path) {
        <a
          class="tabbar__item"
          [routerLink]="item.path"
          routerLinkActive="is-active"
        >
          <app-icon [name]="item.icon" [size]="22" />
          <span>{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      padding-bottom: 4.5rem;
      background: var(--bg);
    }
    .topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: linear-gradient(130deg, #0b1120, #1e3a8a);
      color: #fff;
    }
    /* O lockup herda o #fff do header em gradiente; o símbolo continua invariante. */
    .topo__marca { display: inline-flex; }
    .topo__acoes { display: flex; align-items: center; gap: 0.6rem; }
    .tema {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      color: #fff;
      background: rgba(255, 255, 255, 0.15);
      border: none;
      border-radius: 999px;
      cursor: pointer;
    }
    .sair {
      font: inherit;
      font-weight: 600;
      color: #fff;
      background: rgba(255, 255, 255, 0.15);
      border: none;
      border-radius: 999px;
      padding: 0.35rem 0.9rem;
      cursor: pointer;
    }
    .conteudo {
      max-width: 620px;
      margin: 0 auto;
      padding: 1.25rem 1rem;
    }
    .tabbar {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      justify-content: space-around;
      background: var(--surface);
      border-top: 1px solid var(--border);
      padding: 0.4rem 0 0.5rem;
      z-index: 40;
    }
    .tabbar__item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-muted);
      padding: 0.25rem 0.75rem;
    }
    .tabbar__item.is-active { color: var(--primary); }
  `,
})
export class StudentLayout {
  private readonly studentAuth = inject(StudentAuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);

  /** Ranking some da barra quando a turma o desativa. */
  protected readonly nav = computed<NavItem[]>(() => [
    { label: 'Início', path: '/aluno/dashboard', icon: 'home' },
    { label: 'Agenda', path: '/aluno/agenda', icon: 'calendar' },
    // O Tichr Wor (como o Qlick) é descoberto por um card no painel, não por aba.
    ...(this.studentAuth.rankingAtivo()
      ? [{ label: 'Ranking', path: '/aluno/ranking', icon: 'trophy' as IconName }]
      : []),
    { label: 'Manual', path: '/aluno/manual', icon: 'scroll' },
  ]);

  protected sair(): void {
    const turmaId = this.studentAuth.turmaId();
    this.studentAuth.logout();
    void this.router.navigateByUrl(turmaId ? `/t/${turmaId}` : '/');
  }
}
