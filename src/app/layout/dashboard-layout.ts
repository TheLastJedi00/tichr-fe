import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Footer } from '../ui/footer/footer';
import { Header } from '../ui/header/header';
import { MobileMenu } from '../ui/mobile-menu/mobile-menu';
import { TutorialOverlay } from '../ui/tutorial-overlay/tutorial-overlay';
import { TutorialConteudo, TutorialService } from '../core/tutorial.service';

/** Moldura do painel: header fixo + menu + area de conteudo roteada. */
@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Header, MobileMenu, Footer, TutorialOverlay],
  template: `
    <app-header (toggleMenu)="menuOpen.set(true)" />
    <app-mobile-menu [open]="menuOpen()" (close)="menuOpen.set(false)" />
    <main class="content">
      <router-outlet />
    </main>
    <app-footer [painel]="true" />

    @if (tutorial(); as t) {
      <app-tutorial-overlay
        [titulo]="t.titulo"
        [texto]="t.texto"
        [passo]="t.passo"
        (pular)="fecharTutorial(t)"
        (entendi)="fecharTutorial(t)"
      />
    }
  `,
  styles: `
    .content {
      max-width: 720px;
      margin: 0 auto;
      padding: 1.25rem 1rem 1rem;
    }
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .content { flex: 1; width: 100%; }
    app-footer { max-width: 720px; margin: 0 auto; width: 100%; }
  `,
})
export class DashboardLayout {
  private readonly router = inject(Router);
  private readonly tutorialService = inject(TutorialService);

  protected readonly menuOpen = signal(false);
  protected readonly tutorial = signal<TutorialConteudo | null>(null);

  constructor() {
    // Na primeira visita a uma área com tutorial, dispara o overlay contextual.
    this.avaliarRota(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.avaliarRota(e.urlAfterRedirects));
  }

  private avaliarRota(url: string): void {
    this.tutorial.set(this.tutorialService.paraRota(url));
  }

  protected fecharTutorial(t: TutorialConteudo): void {
    this.tutorialService.marcarVisto(t.chave);
    this.tutorial.set(null);
  }
}
