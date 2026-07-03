import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Bloqueio de recurso (dumb): aparece quando o plano do professor nao alcanca
 * o recurso. Reaproveita o visual em destaque do upsell (cadeado) e conduz ao
 * painel de planos via o botao "Fazer upgrade".
 */
@Component({
  selector: 'app-recurso-bloqueado',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="bloqueio">
      <span class="bloqueio__icon"><app-icon name="lock" [size]="28" /></span>
      <h2 class="bloqueio__title">{{ recurso() }} é do plano {{ planoNecessario() }}</h2>
      <p class="bloqueio__text">
        Este recurso faz parte do plano <strong>{{ planoNecessario() }}</strong>.
        Faça upgrade para desbloquear e continuar de onde parou.
      </p>
      <button class="btn-primary" type="button" (click)="upgrade.emit()">
        Fazer upgrade
      </button>
    </div>
  `,
  styles: `
    .bloqueio {
      max-width: 460px;
      margin: 1.5rem auto;
      padding: 2rem 1.5rem;
      text-align: center;
      border: 2px solid var(--primary);
      border-radius: 16px;
      background: var(--surface);
    }
    .bloqueio__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 14px;
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
    }
    .bloqueio__title {
      margin: 1rem 0 0.5rem;
      font-size: 1.25rem;
      font-weight: 800;
    }
    .bloqueio__text {
      margin: 0 0 1.5rem;
      color: var(--text-muted);
    }
  `,
})
export class RecursoBloqueado {
  readonly recurso = input.required<string>();
  readonly planoNecessario = input.required<string>();
  readonly upgrade = output<void>();
}
