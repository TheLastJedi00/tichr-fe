import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Moldura de layout flat. Usa projecao de conteudo para envelopar
 * formularios e informacoes da agenda com o mesmo estilo.
 */
@Component({
  selector: 'app-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      @if (title()) {
        <header class="card__header">
          <h3 class="card__title">{{ title() }}</h3>
          <ng-content select="[card-actions]" />
        </header>
      }
      <div class="card__body">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    .card__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }
    .card__body {
      padding: 1rem;
    }
  `,
})
export class Card {
  readonly title = input<string>();
}
