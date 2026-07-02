import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../ui/header/header';
import { MobileMenu } from '../ui/mobile-menu/mobile-menu';

/** Moldura do painel: header fixo + menu + area de conteudo roteada. */
@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Header, MobileMenu],
  template: `
    <app-header (toggleMenu)="menuOpen.set(true)" />
    <app-mobile-menu [open]="menuOpen()" (close)="menuOpen.set(false)" />
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    .content {
      max-width: 720px;
      margin: 0 auto;
      padding: 1.25rem 1rem 3rem;
    }
  `,
})
export class DashboardLayout {
  protected readonly menuOpen = signal(false);
}
