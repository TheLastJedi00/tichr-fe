import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { linksPainel } from '../../core/nav-links';
import { ProfileService } from '../../core/profile.service';
import { Icon } from '../icon/icon';

/**
 * Rodapé global (dumb-ish): autoria, link de código e âncora para as Novidades.
 * Com `[painel]="true"` (páginas de usuário) também lista as âncoras de navegação
 * — as mesmas do menu lateral. Na landing (`painel` falso) fica só o essencial.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  template: `
    <footer class="footer" [class.footer--landing]="!painel()">
      @if (painel()) {
        <nav class="footer__nav">
          @for (l of links(); track l.label) {
            <a
              class="footer__navlink"
              [routerLink]="l.path"
              [queryParams]="l.query ?? null"
            >
              {{ l.label }}@if (l.locked) { <app-icon name="lock" [size]="12" /> }
            </a>
          }
        </nav>
      } @else {
        <div class="footer__base">
          <span class="footer__autor">Feito por <strong>Leno Borges</strong></span>
          <span class="footer__sep">·</span>
          <a
            class="footer__link"
            href="https://github.com/TheLastJedi00"
            target="_blank"
            rel="noopener"
          >GitHub</a>
          <span class="footer__sep">·</span>
          <a class="footer__link" routerLink="/novidades">O que há de novo?</a>
        </div>
      }
    </footer>
  `,
  styles: `
    .footer {
      margin-top: 2rem;
      padding: 1.25rem 1rem;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
    }
    /* Na landing, o CTA fixo (mobile) ocupa o rodapé — folga para não sobrepor. */
    @media (max-width: 640px) {
      .footer--landing { padding-bottom: 5.5rem; }
    }
    .footer__nav {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.4rem 1rem;
    }
    .footer__navlink { color: var(--text); font-weight: 600; }
    .footer__navlink:hover { color: var(--primary); }
    .footer__base {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.4rem 0.6rem;
    }
    .footer__link { color: var(--primary); font-weight: 600; }
    .footer__sep { opacity: 0.5; }
  `,
})
export class Footer {
  private readonly profileService = inject(ProfileService);
  /** Ativa a barra de navegação (páginas do painel do usuário). */
  readonly painel = input(false);

  protected readonly links = computed(() =>
    this.painel() ? linksPainel(this.profileService.profile()?.planoAtual) : [],
  );
}
