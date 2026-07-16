import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Moldura de uma seção da vitrine (dumb). Faz o papel do `<app-card>`, mas com a
 * estética da página — que sai do design system de propósito.
 *
 * O `indice` não é enfeite numerado: ele existe porque a página **é** um
 * percurso — a requisição entra, é julgada, vira documento, volta em tempo real.
 * Numerar diz que a ordem carrega informação.
 */
@Component({
  selector: 'vt-bloco',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header>
        <p class="eyebrow">
          <span class="idx">{{ indice() }}</span>
          {{ eyebrow() }}
        </p>
        <h2>{{ titulo() }}</h2>
        @if (legenda()) {
          <p class="legenda">{{ legenda() }}</p>
        }
      </header>
      <div class="corpo">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      max-width: 68ch;
      margin: 0 auto;
      padding-top: 4.5rem;
    }
    header { margin-bottom: 1.75rem; }
    .eyebrow {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin: 0 0 0.75rem;
      font-family: var(--vt-mono);
      font-size: 0.72rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--vt-dim);
    }
    .idx {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border: 1px solid var(--vt-line-forte);
      border-radius: 50%;
      font-size: 0.68rem;
      letter-spacing: 0;
      color: var(--vt-text);
    }
    h2 {
      margin: 0;
      font-family: var(--vt-mono);
      font-size: clamp(1.15rem, 3.2vw, 1.5rem);
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.35;
    }
    .legenda {
      margin: 0.85rem 0 0;
      max-width: 60ch;
      font-size: 0.95rem;
      line-height: 1.7;
      color: var(--vt-dim);
    }
  `,
})
export class VtBloco {
  readonly indice = input.required<string>();
  readonly eyebrow = input.required<string>();
  readonly titulo = input.required<string>();
  readonly legenda = input<string>();
}
