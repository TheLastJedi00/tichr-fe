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
import {
  DURACAO_PADRAO,
  DURACOES_ENTRADA,
  formatarRestante,
  restanteEntrada,
  rotuloDuracao,
  textoEntradaFalhou,
} from '../../core/entrada';
import { EntradaFalhou } from '../../core/models';

/**
 * Cronômetro de entrada do lobby (035, dumb). Mostra os chips de duração, a
 * contagem e o aviso de gente de menos. Quando a contagem zera, emite `zerou`
 * uma vez: a página pede o início automático (o servidor revalida o prazo).
 */
@Component({
  selector: 'app-cronometro-entrada',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cron" [class.cron--on]="restante() !== null">
      <div class="cron__cab">
        <span class="cron__titulo">Cronômetro de entrada</span>
        <span class="cron__dica">Quando zerar, a partida começa sozinha com quem entrou.</span>
      </div>

      @if (restante() === null) {
        <div class="cron__chips" role="radiogroup" aria-label="Duração">
          @for (s of duracoes; track s) {
            <button
              type="button"
              class="chip"
              role="radio"
              [attr.aria-checked]="escolhida() === s"
              [class.chip--sel]="escolhida() === s"
              [disabled]="desabilitado()"
              (click)="escolhida.set(s)"
            >
              {{ rotulo(s) }}
            </button>
          }
        </div>
        <button
          type="button"
          class="btn-outline cron__acao"
          [disabled]="desabilitado()"
          (click)="ligar.emit(escolhida())"
        >
          Iniciar cronômetro
        </button>
      } @else {
        <div class="cron__conta" aria-live="polite">
          <span class="cron__num">{{ texto() }}</span>
          <span class="cron__sub">para a partida começar</span>
        </div>
        <button
          type="button"
          class="btn-outline cron__acao"
          [disabled]="desabilitado()"
          (click)="cancelar.emit()"
        >
          Cancelar
        </button>
      }

      @if (falhou(); as f) {
        <p class="cron__aviso" role="alert">{{ avisoFalha(f) }}</p>
      }
    </div>
  `,
  styles: `
    .cron {
      display: grid;
      gap: 0.75rem;
      padding: 0.9rem 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      text-align: left;
    }
    .cron--on { border-color: var(--primary); }
    .cron__cab { display: grid; gap: 0.15rem; }
    .cron__titulo { font-weight: 600; }
    .cron__dica { font-size: 0.85rem; color: var(--text-muted); }
    .cron__chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
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
    .cron__acao { justify-self: start; }
    .cron__conta { display: flex; align-items: baseline; gap: 0.6rem; }
    .cron__num {
      font-size: 2rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: var(--primary);
    }
    .cron__sub { color: var(--text-muted); font-size: 0.9rem; }
    .cron__aviso {
      margin: 0;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--warning, #f59e0b);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--warning, #f59e0b) 12%, transparent);
      font-size: 0.9rem;
    }
  `,
})
export class CronometroEntradaComponent {
  readonly encerraEm = input<string | null | undefined>(null);
  readonly falhou = input<EntradaFalhou | null | undefined>(null);
  readonly desabilitado = input(false);

  readonly ligar = output<number>();
  readonly cancelar = output<void>();
  /** Uma vez por prazo, quando a contagem chega a zero. */
  readonly zerou = output<void>();

  protected readonly duracoes = DURACOES_ENTRADA;
  protected readonly escolhida = signal<number>(DURACAO_PADRAO);
  protected readonly rotulo = rotuloDuracao;
  protected readonly avisoFalha = textoEntradaFalhou;

  private readonly agora = signal(Date.now());
  protected readonly restante = computed(() =>
    restanteEntrada(this.encerraEm(), this.agora()),
  );
  protected readonly texto = computed(() =>
    formatarRestante(this.restante() ?? 0),
  );

  /** O prazo cujo zero já foi avisado (não dispara de novo no mesmo prazo). */
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
