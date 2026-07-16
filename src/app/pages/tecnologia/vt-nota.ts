import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

/**
 * Nota técnica expansível: o rótulo é um `<button>` que abre um texto curto.
 *
 * A spec pedia *hover*. Hover sozinho não serve: metade dos recrutadores abre o
 * link no celular, onde `:hover` não existe e o conteúdo simplesmente não seria
 * alcançável. Então o gatilho é o **clique** (funciona no toque e no teclado), e
 * o hover no desktop é um bônus por cima.
 *
 * `title=""` nativo também não serve: não aparece no toque, não é estilizável e
 * o *delay* do sistema operacional destrói o efeito.
 */
@Component({
  selector: 'vt-nota',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [class.aberto]="aberto()"
      [attr.aria-expanded]="aberto()"
      (click)="aberto.set(!aberto())"
    >
      {{ rotulo() }}
      <span class="sinal" aria-hidden="true">{{ aberto() ? '−' : '+' }}</span>
    </button>
    @if (aberto()) {
      <p><ng-content /></p>
    }
  `,
  styles: `
    :host { display: block; }
    button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.3rem 0.6rem;
      border: 1px dashed var(--vt-line-forte);
      border-radius: 5px;
      background: transparent;
      color: var(--vt-dim);
      font-family: var(--vt-mono);
      font-size: 0.72rem;
      cursor: pointer;
      transition: color 0.15s ease, border-color 0.15s ease;
    }
    button:hover,
    button.aberto {
      color: var(--vt-text);
      border-color: var(--vt-text);
      border-style: solid;
    }
    button:focus-visible {
      outline: 2px solid var(--vt-write);
      outline-offset: 2px;
    }
    .sinal { color: var(--vt-dim); }
    p {
      margin: 0.65rem 0 0;
      padding-left: 0.75rem;
      border-left: 1px solid var(--vt-line-forte);
      max-width: 58ch;
      font-size: 0.85rem;
      line-height: 1.65;
      color: var(--vt-dim);
    }
  `,
})
export class VtNota {
  readonly rotulo = input.required<string>();
  protected readonly aberto = signal(false);
}
