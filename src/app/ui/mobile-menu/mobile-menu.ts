import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, IconName } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';

interface MenuLink {
  label: string;
  path: string;
  icon: IconName;
}

/**
 * Menu de navegacao (drawer/overlay) acionado pelo header.
 * O estado aberto/fechado e controlado pelo layout via [open].
 */
@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon, IconButton],
  template: `
    @if (open()) {
      <div class="overlay" (click)="close.emit()">
        <nav class="drawer" (click)="$event.stopPropagation()">
          <div class="drawer__head">
            <span class="drawer__title">Menu</span>
            <app-icon-button
              name="close"
              variant="ghost"
              ariaLabel="Fechar menu"
              (clicked)="close.emit()"
            />
          </div>

          <ul class="drawer__list">
            @for (link of links; track link.path) {
              <li>
                <a
                  class="drawer__link"
                  [routerLink]="link.path"
                  routerLinkActive="is-active"
                  (click)="close.emit()"
                >
                  <app-icon [name]="link.icon" [size]="18" />
                  {{ link.label }}
                </a>
              </li>
            }
          </ul>
        </nav>
      </div>
    }
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      z-index: 50;
    }
    .drawer {
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      width: min(280px, 80vw);
      background: var(--surface);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
    }
    .drawer__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    .drawer__title {
      font-weight: 700;
    }
    .drawer__list {
      list-style: none;
      margin: 0;
      padding: 0.5rem;
    }
    .drawer__link {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.75rem;
      border-radius: var(--radius);
      color: var(--text);
      font-weight: 500;
    }
    .drawer__link:hover {
      background: var(--surface-alt);
    }
    .drawer__link.is-active {
      color: var(--primary);
      background: var(--surface-alt);
    }
  `,
})
export class MobileMenu {
  readonly open = input(false);
  readonly close = output<void>();

  protected readonly links: MenuLink[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'home' },
    { label: 'Minha Agenda', path: '/agenda', icon: 'calendar' },
    { label: 'Minhas Turmas', path: '/turmas', icon: 'building' },
    { label: 'Configurações', path: '/configuracoes', icon: 'settings' },
  ];
}
