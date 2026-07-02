import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { ThemeService } from '../../core/theme.service';
import { IconButton } from '../icon-button/icon-button';

/**
 * Cabecalho fixo: logo, troca de tema e botao de menu (hamburguer).
 * A logica de abrir/fechar o menu fica no layout — o header apenas emite.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconButton],
  template: `
    <header class="header">
      <a class="header__logo" href="/">Tichr</a>

      <div class="header__actions">
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
    .header__logo {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text);
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
  readonly toggleMenu = output<void>();
}
