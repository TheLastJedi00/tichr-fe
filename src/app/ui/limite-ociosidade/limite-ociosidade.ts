import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Lobby: "Alerta de ociosidade após N faltas" (dumb, spec 032 §3.5). Fica ao
 * lado de "Vale para o ranking". De 1 a 10.
 */
@Component({
  selector: 'app-limite-ociosidade',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lo">
      <span class="lo__txt">
        <span class="lo__lbl">Alerta de ociosidade</span>
        <span class="lo__hint">
          Depois de {{ valor() }} {{ valor() === 1 ? unidadeSingular() : unidadePlural() }} sem jogar, o aluno
          recebe o alerta e aparece em vermelho no ranking final.
        </span>
      </span>
      <span class="lo__stepper">
        <button
          type="button"
          aria-label="Menos faltas"
          [disabled]="desabilitado() || valor() <= min"
          (click)="mudou.emit(valor() - 1)"
        >−</button>
        <strong aria-live="polite">{{ valor() }}</strong>
        <button
          type="button"
          aria-label="Mais faltas"
          [disabled]="desabilitado() || valor() >= max"
          (click)="mudou.emit(valor() + 1)"
        >+</button>
      </span>
    </div>
  `,
  styles: `
    .lo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      text-align: left;
    }
    .lo__txt { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
    .lo__lbl { font-weight: 600; }
    .lo__hint { font-size: 0.85rem; color: var(--text-muted); }
    .lo__stepper { display: inline-flex; align-items: center; gap: 0.5rem; flex: 0 0 auto; }
    .lo__stepper strong { min-width: 1.5ch; text-align: center; font-size: 1.1rem; }
    .lo__stepper button {
      width: 2rem;
      height: 2rem;
      border-radius: 8px;
      border: 2px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font-size: 1.1rem;
      font-weight: 800;
      cursor: pointer;
    }
    .lo__stepper button:disabled { opacity: 0.4; cursor: not-allowed; }
  `,
})
export class LimiteOciosidadeComponent {
  readonly valor = input(2);
  readonly desabilitado = input(false);
  /** "rodada"/"rodadas" no Wor; "pergunta"/"perguntas" no Qlick; "fase"/"fases" no Isolateus. */
  readonly unidadeSingular = input('rodada');
  readonly unidadePlural = input('rodadas');
  readonly mudou = output<number>();
  protected readonly min = 1;
  protected readonly max = 10;
}
