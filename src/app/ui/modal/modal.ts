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
      <div class="overlay" animate.enter="ov-in" animate.leave="ov-out" (click)="close.emit()">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          animate.enter="mo-in"
          animate.leave="mo-out"
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
    .ov-in { animation: ov-fade 0.18s ease both; }
    .ov-out { animation: ov-fade 0.15s ease reverse both; }
    .mo-in { animation: mo-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1) both; }
    .mo-out { animation: mo-pop 0.15s ease reverse both; }
    @keyframes ov-fade { from { opacity: 0; } }
    @keyframes mo-pop { from { opacity: 0; transform: translateY(10px) scale(0.97); } }
    @media (prefers-reduced-motion: reduce) {
      .ov-in, .ov-out, .mo-in, .mo-out { animation: none; }
    }
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
      /*
       * Conteúdo alto (ex.: Regras e Pontuações) não pode estourar a tela: o
       * card é limitado à viewport e quem rola é o corpo — título e ações ficam
       * sempre visíveis. A altura usa dvh por causa do mobile, onde a barra do
       * navegador some e volta (com vh o rodapé do modal fica atrás dela).
       */
      display: flex;
      flex-direction: column;
      width: min(420px, 100%);
      max-height: calc(100vh - 2rem);
      max-height: calc(100dvh - 2rem);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
    }
    .modal__title {
      flex: 0 0 auto;
      margin: 0 0 0.75rem;
      font-size: 1.2rem;
      font-weight: 700;
    }
    .modal__body {
      /* O min-height zero deixa o flex item encolher — sem ele, não rola. */
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      color: var(--text);
    }
    .modal__actions {
      flex: 0 0 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 1rem;
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
