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
import { RouterLink } from '@angular/router';
import { estadoCardJogo, formatarRestante } from '../../core/entrada';

/**
 * Card "… de hoje" do painel do aluno (035 #12–#14, dumb). Cor sólida do jogo
 * com a contagem do cronômetro de entrada; apagado (cinza, sem link) quando a
 * partida começou sem o aluno. No zero da contagem emite `zerou`: a página
 * relê a partida (a leitura do aluno também dispara o início).
 */
@Component({
  selector: 'app-card-jogo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (estado().tipo === 'FECHADO') {
      <div class="cj cj--off" role="status" [attr.aria-label]="titulo() + ': tempo encerrado para entrar'">
        <span class="cj__pulse"></span>
        <span>
          <strong>{{ titulo() }}</strong>
          <span class="cj__sub">{{ nome() }} · Tempo encerrado para entrar</span>
        </span>
      </div>
    } @else {
      <a class="cj cj--{{ jogo() }}" [routerLink]="link()">
        <span class="cj__pulse"></span>
        <span>
          <strong>{{ titulo() }}</strong>
          <span class="cj__sub">{{ nome() }} · {{ sub() }}</span>
        </span>
        <span class="cj__seta">→</span>
      </a>
    }
  `,
  styles: `
    :host { display: block; }
    .cj {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.9rem 1rem;
      border-radius: 14px;
      border: 2px solid rgba(0, 0, 0, 0.25);
      color: #fff;
      box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.25);
      text-decoration: none;
    }
    .cj strong { display: block; }
    .cj__sub { font-size: 0.82rem; opacity: 0.92; font-variant-numeric: tabular-nums; }
    .cj__seta { margin-left: auto; font-weight: 800; font-size: 1.2rem; }
    .cj--qlick { background: #6d28d9; }
    .cj--wor { background: #b45309; }
    .cj--iso { background: #4d7c0f; }
    .cj__pulse {
      flex: 0 0 auto;
      width: 12px;
      height: 12px;
      border-radius: 999px;
      background: #fff;
      animation: cjpulse 1.2s steps(2) infinite;
    }
    @keyframes cjpulse { 50% { opacity: 0.3; } }
    .cj--off {
      background: var(--surface-alt);
      border-color: var(--border);
      color: var(--text-muted);
      box-shadow: none;
      cursor: not-allowed;
    }
    .cj--off strong { color: var(--text); }
    .cj--off .cj__pulse { animation: none; background: var(--border); }
    @media (prefers-reduced-motion: reduce) { .cj__pulse { animation: none; } }
  `,
})
export class CardJogoComponent {
  readonly jogo = input.required<'qlick' | 'wor' | 'iso'>();
  readonly titulo = input.required<string>();
  readonly nome = input.required<string>();
  readonly link = input.required<string>();
  readonly status = input.required<string>();
  readonly entradaEncerraEm = input<string | null | undefined>(null);
  readonly participa = input<boolean | undefined>(undefined);
  readonly zerou = output<void>();

  private readonly agora = signal(Date.now());
  protected readonly estado = computed(() =>
    estadoCardJogo(
      {
        status: this.status(),
        entradaEncerraEm: this.entradaEncerraEm(),
        participa: this.participa(),
      },
      this.agora(),
    ),
  );
  protected readonly sub = computed(() => {
    const e = this.estado();
    if (e.tipo === 'JOGANDO') return 'partida em andamento, toque para jogar';
    if (e.tipo === 'ABERTO' && e.restanteMs !== null) {
      return `entrada fecha em ${formatarRestante(e.restanteMs)}`;
    }
    return 'toque para entrar';
  });

  private avisado: string | null = null;

  constructor() {
    const id = setInterval(() => this.agora.set(Date.now()), 500);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
    effect(() => {
      const e = this.estado();
      const fim = this.entradaEncerraEm();
      if (e.tipo === 'ABERTO' && e.restanteMs === 0 && fim && this.avisado !== fim) {
        this.avisado = fim;
        this.zerou.emit();
      }
    });
  }
}
