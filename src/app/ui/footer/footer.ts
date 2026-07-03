import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Rodapé global (dumb): autoria, link de código e âncora para as Novidades.
 * Flat, sem lógica de estado.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <span class="footer__autor">
        Feito por <strong>Jediael Borges</strong>
      </span>
      <nav class="footer__links">
        <a
          class="footer__link"
          href="https://github.com/TheLastJedi00"
          target="_blank"
          rel="noopener"
        >GitHub</a>
        <span class="footer__sep">·</span>
        <a class="footer__link" routerLink="/novidades">O que há de novo?</a>
      </nav>
      <span class="footer__repo">Tichr · Angular + NestJS/Firebase</span>
    </footer>
  `,
  styles: `
    .footer {
      margin-top: 2rem;
      padding: 1.25rem 1rem;
      border-top: 1px solid var(--border);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.4rem 1rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
    }
    .footer__link { color: var(--primary); font-weight: 600; }
    .footer__sep { opacity: 0.5; }
    .footer__repo { flex-basis: 100%; opacity: 0.75; }
  `,
})
export class Footer {}
