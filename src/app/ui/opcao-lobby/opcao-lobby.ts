import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Checkbox de opção do lobby com rótulo e dica (dumb). Mesmo visual do
 * `app-vale-ranking`; usado nas opções de embaralhamento do Qlick.
 */
@Component({
  selector: 'app-opcao-lobby',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="op" [class.op--off]="!valor()">
      <input
        type="checkbox"
        [checked]="valor()"
        [disabled]="desabilitado()"
        (change)="mudou.emit($any($event.target).checked)"
      />
      <span class="op__txt">
        <span class="op__lbl">{{ rotulo() }}</span>
        <span class="op__hint">{{ dica() }}</span>
      </span>
    </label>
  `,
  styles: `
    .op {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      cursor: pointer;
      text-align: left;
    }
    .op--off { border-style: dashed; }
    .op input {
      width: 1.15rem;
      height: 1.15rem;
      margin-top: 0.15rem;
      accent-color: var(--primary);
      flex: 0 0 auto;
      cursor: pointer;
    }
    .op input:disabled { cursor: not-allowed; }
    .op__txt { display: flex; flex-direction: column; gap: 0.2rem; }
    .op__lbl { font-weight: 600; }
    .op__hint { font-size: 0.85rem; color: var(--text-muted); }
  `,
})
export class OpcaoLobbyComponent {
  readonly rotulo = input.required<string>();
  readonly dica = input('');
  readonly valor = input(false);
  readonly desabilitado = input(false);
  readonly mudou = output<boolean>();
}
