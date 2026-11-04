import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Alerta de ociosidade na tela do aluno (spec 032 §3.3). Dumb: recebe as faltas
 * e o limite; aparece quando o aluno atinge o limite. Pode ser fechado, mas
 * volta a cada falta nova.
 */
@Component({
  selector: 'app-alerta-ociosidade',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (visivel()) {
      <div class="alerta" role="alert">
        <app-icon name="alert" [size]="20" />
        <p>
          <strong>Ociosidade detectada:</strong>
          você ficou {{ faltas() }} {{ faltas() === 1 ? singular() : plural() }} sem jogar e está
          atrapalhando a partida. O professor pode descontar seus pontos no fim.
        </p>
        <button type="button" class="fechar" aria-label="Fechar o alerta" (click)="fechadoEm.set(faltas())">×</button>
      </div>
    }
  `,
  styles: `
    .alerta {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.75rem 0.9rem;
      border: 2px solid var(--danger);
      border-radius: 12px;
      background: color-mix(in srgb, var(--danger) 12%, var(--surface));
      color: var(--text);
      box-shadow: 3px 3px 0 var(--danger);
    }
    .alerta app-icon { color: var(--danger); flex: 0 0 auto; margin-top: 0.1rem; }
    .alerta p { margin: 0; flex: 1; font-size: 0.92rem; line-height: 1.35; }
    .alerta strong { color: var(--danger); }
    .fechar {
      flex: 0 0 auto;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.3rem;
      line-height: 1;
      cursor: pointer;
      padding: 0 0.15rem;
    }
  `,
})
export class AlertaOciosidade {
  readonly faltas = input(0);
  readonly limite = input(2);
  /** Ex.: "rodada"/"rodadas" (Wor), "pergunta"/"perguntas" (Qlick). */
  readonly singular = input('rodada');
  readonly plural = input('rodadas');

  /** As faltas no momento em que o aluno fechou; uma falta nova reabre. */
  protected readonly fechadoEm = signal(-1);
  protected readonly visivel = computed(
    () => this.faltas() >= this.limite() && this.faltas() > this.fechadoEm(),
  );
}
