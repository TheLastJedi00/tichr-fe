import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Modal genérico (dumb): backdrop escuro que bloqueia o fundo + card central flat.
 * Título via [title]; corpo e ações via projeção de conteúdo ([modal-actions]).
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="overlay" (click)="close.emit()">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          @if (title()) {
            <h2 class="modal__title">{{ title() }}</h2>
          }
          <div class="modal__body">
            <ng-content />
          </div>
          <div class="modal__actions">
            <ng-content select="[modal-actions]" />
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 100;
    }
    .modal {
      width: min(420px, 100%);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
    }
    .modal__title {
      margin: 0 0 0.75rem;
      font-size: 1.2rem;
      font-weight: 700;
    }
    .modal__body {
      color: var(--text);
    }
    .modal__actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.25rem;
    }
    .modal__actions:empty {
      display: none;
    }
  `,
})
export class Modal {
  readonly open = input(false);
  readonly title = input<string>();
  readonly close = output<void>();
}
