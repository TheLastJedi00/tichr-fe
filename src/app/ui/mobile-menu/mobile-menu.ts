import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { planoAtendeMinimo } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { Icon, IconName } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { QuotaTracker } from '../quota-tracker/quota-tracker';

interface MenuLink {
  label: string;
  path: string;
  icon: IconName;
  locked?: boolean;
  query?: Record<string, string>;
}

/**
 * Menu de navegacao (drawer/overlay) acionado pelo header.
 * O estado aberto/fechado e controlado pelo layout via [open].
 */
@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon, IconButton, QuotaTracker],
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
            @for (link of links(); track link.label) {
              <li>
                <a
                  class="drawer__link"
                  [routerLink]="link.path"
                  [queryParams]="link.query ?? null"
                  routerLinkActive="is-active"
                  (click)="close.emit()"
                >
                  <app-icon [name]="link.icon" [size]="18" />
                  {{ link.label }}
                  @if (link.locked) {
                    <app-icon class="drawer__lock" name="lock" [size]="15" />
                  }
                </a>
              </li>
            }
          </ul>

          <app-quota-tracker class="drawer__quota" />
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
    .drawer__quota {
      margin-top: auto;
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
    .drawer__lock { margin-left: auto; color: var(--text-muted); }
  `,
})
export class MobileMenu {
  private readonly profileService = inject(ProfileService);
  readonly open = input(false);
  readonly close = output<void>();

  /** Plano de Aula exige Graduado; Estagiário vê cadeado e vai ao upsell. */
  protected readonly links = computed<MenuLink[]>(() => {
    const podePlano = planoAtendeMinimo(
      this.profileService.profile()?.planoAtual,
      'GRADUADO',
    );
    return [
      { label: 'Dashboard', path: '/dashboard', icon: 'home' },
      { label: 'Minha Agenda', path: '/agenda', icon: 'calendar' },
      { label: 'Minhas Turmas', path: '/turmas', icon: 'building' },
      podePlano
        ? { label: 'Plano de Aula', path: '/plano-aula', icon: 'book' }
        : {
            label: 'Plano de Aula',
            path: '/planos',
            icon: 'book',
            locked: true,
            query: { recurso: 'PLANO_AULA' },
          },
      { label: 'Configurações', path: '/configuracoes', icon: 'settings' },
    ];
  });
}
