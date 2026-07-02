import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

type Variant = 'primary' | 'outline' | 'ghost';

/**
 * Botao com icone (e texto opcional via projecao de conteudo).
 * Gerencia o alinhamento do SVG com o texto e a variante de cor.
 */
@Component({
  selector: 'app-icon-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button
      type="button"
      class="icon-button"
      [class.is-primary]="variant() === 'primary'"
      [class.is-outline]="variant() === 'outline'"
      [class.is-ghost]="variant() === 'ghost'"
      [attr.aria-label]="ariaLabel()"
      [disabled]="disabled()"
      (click)="clicked.emit()"
    >
      <app-icon [name]="name()" [size]="size()" />
      <ng-content />
    </button>
  `,
  styles: `
    .icon-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 600;
      line-height: 1;
      color: var(--text);
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius);
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
    }
    .icon-button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .is-primary {
      color: var(--primary-contrast);
      background: var(--primary);
      border-color: var(--primary);
    }
    .is-primary:hover:not(:disabled) {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
    }
    .is-outline {
      border-color: var(--border);
    }
    .is-outline:hover:not(:disabled) {
      border-color: var(--primary);
      color: var(--primary);
    }
    .is-ghost:hover:not(:disabled) {
      background: var(--surface-alt);
    }
  `,
})
export class IconButton {
  readonly name = input.required<IconName>();
  readonly variant = input<Variant>('ghost');
  readonly size = input(20);
  readonly ariaLabel = input<string>();
  readonly disabled = input(false);
  readonly clicked = output<void>();
}
