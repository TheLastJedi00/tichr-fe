import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * O aviso do brilho misterioso (025 §5), em todas as telas ao mesmo tempo.
 *
 * Existe à parte do card de acontecimentos porque aquele só anuncia a ÚLTIMA
 * entrada do Diário — e o brilho chega no mesmo commit da sabotagem, que o
 * cobriria. Burro: a página decide quando mostrar e por quanto tempo.
 */
@Component({
  selector: 'app-isolateus-brilho',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="card" role="status" (click)="fechar.emit()">
      <span class="card__icone"><app-icon name="sparkles" [size]="26" /></span>
      <div class="card__txt">
        @for (nome of setores(); track nome) {
          <p>Brilho misterioso irradiando no <b>{{ nome }}</b></p>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: contents; }
    .card {
      position: fixed;
      left: 50%;
      top: 35%;
      z-index: 56;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 0.7rem;
      width: min(26rem, calc(100vw - 2rem));
      padding: 1rem;
      color: #a16207;
      background: var(--bg, #fff);
      border: 3px solid #eab308;
      box-shadow: 5px 5px 0 #eab308;
      cursor: pointer;
    }
    .card__txt p { margin: 0; font-weight: 800; color: var(--text, #0f172a); }
    .card__txt p + p { margin-top: 0.3rem; }
  `,
})
export class IsolateusBrilho {
  /** Nomes completos dos setores que irradiaram. */
  readonly setores = input.required<string[]>();
  readonly fechar = output<void>();
}
