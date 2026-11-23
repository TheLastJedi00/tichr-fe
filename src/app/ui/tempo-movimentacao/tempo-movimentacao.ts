import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { OPCOES_NOITE_S } from '../../core/isolateus-noite';

/**
 * Tempo de movimentação do Isolateus (036 #2, dumb): a noite inteira dura isto.
 * Chips de 10 a 60 segundos, no mesmo visual do cronômetro de entrada.
 */
@Component({
  selector: 'app-tempo-movimentacao',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tm">
      <div class="tm__cab">
        <span class="tm__titulo">Tempo de movimentação</span>
        <span class="tm__dica">
          A noite dura isto: os habitantes andam pela vila e valem onde estiverem quando o tempo zerar.
        </span>
      </div>
      <div class="tm__chips" role="radiogroup" aria-label="Tempo de movimentação">
        @for (s of opcoes; track s) {
          <button
            type="button"
            class="chip"
            role="radio"
            [attr.aria-checked]="valor() === s"
            [class.chip--sel]="valor() === s"
            [disabled]="desabilitado()"
            (click)="mudou.emit(s)"
          >
            {{ s }}s
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    .tm {
      display: grid;
      gap: 0.75rem;
      padding: 0.9rem 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      text-align: left;
    }
    .tm__cab { display: grid; gap: 0.15rem; }
    .tm__titulo { font-weight: 600; }
    .tm__dica { font-size: 0.85rem; color: var(--text-muted); }
    .tm__chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chip {
      font: inherit;
      font-size: 0.9rem;
      font-weight: 600;
      padding: 0.35rem 0.8rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      color: var(--text);
      cursor: pointer;
    }
    .chip--sel { background: var(--primary); border-color: var(--primary); color: #fff; }
    .chip:disabled { opacity: 0.5; cursor: not-allowed; }
  `,
})
export class TempoMovimentacaoComponent {
  readonly valor = input<number>(20);
  readonly desabilitado = input(false);
  readonly mudou = output<number>();

  protected readonly opcoes = OPCOES_NOITE_S;
}
