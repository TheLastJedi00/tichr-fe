import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { BetaBadge } from '../beta-badge/beta-badge';
import { IconButton } from '../icon-button/icon-button';
import { Logo } from '../logo/logo';

/**
 * Cabecalho fixo: logo, troca de tema e botao de menu (hamburguer).
 * A logica de abrir/fechar o menu fica no layout — o header apenas emite.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconButton, BetaBadge, RouterLink, Logo],
  template: `
    <header class="header">
      <a class="header__logo" [routerLink]="auth.isAuthenticated() ? '/dashboard' : '/'">
        <app-logo [size]="30" />
      </a>

      <div class="header__actions">
        <app-beta-badge />
        <app-icon-button
          [name]="theme.theme() === 'dark' ? 'sun' : 'moon'"
          variant="ghost"
          ariaLabel="Alternar tema"
          (clicked)="theme.toggle()"
        />
        <app-icon-button
          name="menu"
          variant="ghost"
          ariaLabel="Abrir menu"
          (clicked)="toggleMenu.emit()"
        />
      </div>
    </header>
  `,
  styles: `
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 60px;
      padding: 0 1rem;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    /* Âncora fixa da marca: mesmo canto, mesmo tamanho, em toda tela do painel. */
    .header__logo {
      display: inline-flex;
      color: var(--text);
      border-radius: var(--radius);
    }
    .header__logo:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 4px;
    }
    .header__actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
  `,
})
export class Header {
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);
  readonly toggleMenu = output<void>();
}
