import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { formatarRestante, restanteEntrada } from '../../core/entrada';

/**
 * Aviso do cronômetro de entrada na tela do aluno (035, dumb).
 * - Lobby com cronômetro: "A partida começa em 1:42". No zero, emite `zerou`
 *   (a página relê a partida: a leitura do aluno também dispara o início).
 * - `fechado`: a partida começou sem o aluno: "Tempo encerrado para entrar".
 * A variante `pixel` usa as classes retrô do jogo (Isolateus/Wor pixel).
 */
@Component({
  selector: 'app-aviso-entrada',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (fechado()) {
      <div class="av av--fechado" [class.av--pixel]="pixel()" role="status">
        <strong>Tempo encerrado para entrar</strong>
        <span>A partida começou sem você. Aguarde a próxima!</span>
      </div>
    } @else if (restante() !== null) {
      <div class="av" [class.av--pixel]="pixel()" aria-live="polite">
        <span>A partida começa em</span>
        <strong class="av__num">{{ texto() }}</strong>
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .av {
      display: flex;
      align-items: baseline;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0.7rem 1rem;
      border: 1px solid var(--primary);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      text-align: center;
    }
    .av__num {
      font-size: 1.5rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: var(--primary);
    }
    .av--fechado {
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
      border-color: var(--border);
      background: var(--surface-2, var(--surface));
      color: var(--text-muted);
    }
    .av--fechado strong { color: var(--text); }
    .av--pixel {
      border: 3px solid #cbd5e1;
      border-radius: 0;
      background: #111a2e;
      color: #e2e8f0;
      box-shadow: 4px 4px 0 #05070f;
      font-family: 'Pixelify Sans', system-ui, sans-serif;
    }
    .av--pixel .av__num { font-family: 'Press Start 2P', monospace; font-weight: 400; font-size: 1.1rem; color: #fcd34d; }
    .av--pixel.av--fechado { border-color: #475569; color: #94a3b8; }
    .av--pixel.av--fechado strong { color: #e2e8f0; }
  `,
})
export class AvisoEntradaComponent {
  readonly encerraEm = input<string | null | undefined>(null);
  /** A partida começou e o aluno não está nela. */
  readonly fechado = input(false);
  readonly pixel = input(false);
  /** Uma vez por prazo, quando a contagem chega a zero. */
  readonly zerou = output<void>();

  private readonly agora = signal(Date.now());
  protected readonly restante = computed(() =>
    restanteEntrada(this.encerraEm(), this.agora()),
  );
  protected readonly texto = computed(() =>
    formatarRestante(this.restante() ?? 0),
  );
  private avisado: string | null = null;

  constructor() {
    const id = setInterval(() => this.agora.set(Date.now()), 250);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
    effect(() => {
      const fim = this.encerraEm();
      if (fim && this.restante() === 0 && this.avisado !== fim) {
        this.avisado = fim;
        this.zerou.emit();
      }
    });
  }
}
