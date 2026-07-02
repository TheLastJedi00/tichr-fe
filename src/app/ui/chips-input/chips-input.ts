import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  signal,
} from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Input que transforma texto em "chips" ao pressionar Enter. Reutilizavel
 * para cadastrar múltiplos papéis, temas, tags etc. Two-way via [(chips)].
 */
@Component({
  selector: 'app-chips-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <label class="chips">
      @if (label()) {
        <span class="chips__label">{{ label() }}</span>
      }
      <div class="chips__box">
        @for (chip of chips(); track chip) {
          <span class="chip">
            {{ chip }}
            <button
              type="button"
              class="chip__x"
              aria-label="Remover"
              (click)="remover(chip)"
            >
              <app-icon name="close" [size]="14" />
            </button>
          </span>
        }
        <input
          class="chips__input"
          [placeholder]="placeholder()"
          [value]="texto()"
          (input)="texto.set($any($event.target).value)"
          (keydown.enter)="adicionar($event)"
          (keydown.backspace)="talvezRemoverUltimo()"
        />
      </div>
    </label>
  `,
  styles: `
    .chips { display: block; }
    .chips__label { display: block; font-weight: 600; margin-bottom: 0.35rem; }
    .chips__box {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      padding: 0.4rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .chips__box:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent);
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      border-radius: 999px;
    }
    .chip__x {
      display: inline-flex;
      color: inherit;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
    }
    .chips__input {
      flex: 1 1 120px;
      min-width: 120px;
      border: none;
      outline: none;
      background: transparent;
      color: var(--text);
      font: inherit;
      padding: 0.25rem;
    }
  `,
})
export class ChipsInput {
  readonly chips = model<string[]>([]);
  readonly label = input<string>();
  readonly placeholder = input('Digite e pressione Enter');

  protected readonly texto = signal('');

  protected adicionar(event: Event): void {
    event.preventDefault(); // evita submeter o formulario ao redor
    const valor = this.texto().trim();
    if (!valor || this.chips().includes(valor)) {
      this.texto.set('');
      return;
    }
    this.chips.update((atual) => [...atual, valor]);
    this.texto.set('');
  }

  protected remover(chip: string): void {
    this.chips.update((atual) => atual.filter((c) => c !== chip));
  }

  /** Backspace com input vazio remove o último chip (atalho comum). */
  protected talvezRemoverUltimo(): void {
    if (this.texto().length === 0 && this.chips().length > 0) {
      this.chips.update((atual) => atual.slice(0, -1));
    }
  }
}
