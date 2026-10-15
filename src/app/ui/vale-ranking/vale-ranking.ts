import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Checkbox do lobby "Vale para o ranking da turma" (dumb). Desmarcado, a
 * partida é casual: placar e log normais, sem crédito no ranking. A página
 * esconde o controle quando a partida não tem turma.
 */
@Component({
  selector: 'app-vale-ranking',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="vr" [class.vr--off]="!valor()">
      <input
        type="checkbox"
        [checked]="valor()"
        [disabled]="desabilitado()"
        (change)="mudou.emit($any($event.target).checked)"
      />
      <span class="vr__txt">
        <span class="vr__lbl">Vale para o ranking da turma</span>
        <span class="vr__hint">
          Desmarcado, a partida é casual: os pontos aparecem no fim, mas não somam no ranking.
        </span>
      </span>
    </label>
  `,
  styles: `
    .vr {
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
    .vr--off { border-style: dashed; }
    .vr input {
      width: 1.15rem;
      height: 1.15rem;
      margin-top: 0.15rem;
      accent-color: var(--primary);
      flex: 0 0 auto;
      cursor: pointer;
    }
    .vr input:disabled { cursor: not-allowed; }
    .vr__txt { display: flex; flex-direction: column; gap: 0.2rem; }
    .vr__lbl { font-weight: 600; }
    .vr__hint { font-size: 0.85rem; color: var(--text-muted); }
  `,
})
export class ValeRankingComponent {
  readonly valor = input(true);
  readonly desabilitado = input(false);
  readonly mudou = output<boolean>();
}
