import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Spinner } from '../spinner/spinner';

/**
 * Envelopa um formulário e, durante o submit (`busy`), aplica bloqueio total:
 * esmaece o conteúdo (dimming), corta interação (pointer-events) e sobrepõe um
 * spinner. Evita cliques duplos e edições enquanto a API processa a requisição.
 */
@Component({
  selector: 'app-form-blocker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Spinner],
  template: `
    <div class="fb">
      <div class="fb__content" [class.fb__content--busy]="busy()" [attr.inert]="busy() ? '' : null">
        <ng-content />
      </div>
      @if (busy()) {
        <div class="fb__overlay">
          <app-spinner [size]="32" />
        </div>
      }
    </div>
  `,
  styles: `
    .fb { position: relative; }
    .fb__content { transition: opacity 0.2s ease; }
    .fb__content--busy { opacity: 0.45; pointer-events: none; user-select: none; }
    .fb__overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: var(--primary);
      z-index: 1;
    }
  `,
})
export class FormBlocker {
  readonly busy = input(false);
}
