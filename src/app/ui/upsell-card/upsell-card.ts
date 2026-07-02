import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Cartao de upsell (dumb): aparece quando o professor bate o limite do plano.
 * Design em destaque com cadeado destrancando e duas acoes de conversao.
 */
@Component({
  selector: 'app-upsell-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="upsell">
      <span class="upsell__icon"><app-icon name="lock" [size]="28" /></span>
      <h2 class="upsell__title">{{ titulo() }}</h2>
      <p class="upsell__text">{{ mensagem() }}</p>
      <div class="upsell__actions">
        <button
          class="btn-primary"
          type="button"
          [disabled]="processando()"
          (click)="comprarSlot.emit()"
        >
          Comprar vaga avulsa
        </button>
        <button
          class="btn-outline"
          type="button"
          [disabled]="processando()"
          (click)="conhecerPlano.emit()"
        >
          {{ labelUpgrade() }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .upsell {
      max-width: 460px;
      margin: 1rem auto;
      padding: 2rem 1.5rem;
      text-align: center;
      border: 2px solid var(--primary);
      border-radius: 16px;
      background: var(--surface);
      box-shadow: 0 16px 44px color-mix(in srgb, var(--primary) 22%, transparent);
    }
    .upsell__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 14px;
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
    }
    .upsell__title {
      margin: 1rem 0 0.5rem;
      font-size: 1.3rem;
      font-weight: 800;
    }
    .upsell__text {
      margin: 0 0 1.5rem;
      color: var(--text-muted);
    }
    .upsell__actions {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    @media (min-width: 480px) {
      .upsell__actions {
        flex-direction: row;
        justify-content: center;
      }
    }
  `,
})
export class UpsellCard {
  readonly titulo = input('Você atingiu o limite do seu plano');
  readonly mensagem = input(
    'Libere mais uma vaga na hora ou suba de nível para ampliar seu limite de turmas ativas.',
  );
  readonly labelUpgrade = input('Conhecer plano Graduado');
  readonly processando = input(false);

  readonly comprarSlot = output<void>();
  readonly conhecerPlano = output<void>();
}
