import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal,
} from '@angular/core';
import { Acontecimento, TipoAcontecimento } from '../../core/models';
import { Icon } from '../icon/icon';

/** Quanto o card fica na tela antes de se recolher sozinho. */
const DURACAO_MS = 4000;

const ESTILO: Record<TipoAcontecimento, { icone: string; cor: string }> = {
  NOITE: { icone: 'moon', cor: 'neutro' },
  SABOTAGEM: { icone: 'rachadura', cor: 'ruim' },
  ABDUCAO: { icone: 'nave', cor: 'ruim' },
  // Mesmo ícone e mesma cor para os dois casos que REPELIDA cobre — a UI não
  // pode deixar escapar se a Ameaça agiu de perto ou atirou de longe.
  REPELIDA: { icone: 'shield', cor: 'bom' },
  ESPERA: { icone: 'moon', cor: 'neutro' },
  REPARO: { icone: 'sparkles', cor: 'atencao' },
  RESTAURADO: { icone: 'check', cor: 'bom' },
  REPARO_FALHOU: { icone: 'x', cor: 'ruim' },
  QUARENTENA: { icone: 'alert', cor: 'atencao' },
  VEREDITO: { icone: 'lock', cor: 'atencao' },
  FIM: { icone: 'flag', cor: 'neutro' },
};

/**
 * O card que anuncia um acontecimento novo, sobre a tela de todo mundo ao mesmo
 * tempo. Depois de fechar, o evento continua consultável no Diário.
 *
 * Ele reage à **última entrada** do diário. Entrar no meio da partida não
 * dispara nada: o primeiro valor recebido é só a linha de base.
 */
@Component({
  selector: 'app-isolateus-evento',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (visivel(); as e) {
      <div class="card" [class]="'card--' + e.cor" role="status" (click)="fechar()">
        <span class="card__icone"><app-icon [name]="$any(e.icone)" [size]="22" /></span>
        <p class="card__texto">{{ e.texto }}</p>
      </div>
    }
  `,
  styles: `
    :host { display: contents; }

    .card {
      position: fixed;
      left: 50%;
      top: 1rem;
      z-index: 55;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      width: min(26rem, calc(100vw - 2rem));
      padding: 0.7rem 0.9rem;
      background: var(--bg, #fff);
      border: 2px solid currentColor;
      box-shadow: 4px 4px 0 currentColor;
      cursor: pointer;
      animation: entra 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .card--bom { color: #15803d; }
    .card--ruim { color: #dc2626; }
    .card--atencao { color: #b45309; }
    .card--neutro { color: #475569; }

    .card__icone { line-height: 0; }
    .card__texto {
      margin: 0;
      font-size: 0.82rem;
      font-weight: 700;
      line-height: 1.35;
      color: var(--text, #0f172a);
    }

    @keyframes entra {
      from { opacity: 0; transform: translate(-50%, -1rem); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .card { animation: none; transform: translate(-50%, 0); }
    }
  `,
})
export class IsolateusEvento {
  readonly acontecimentos = input.required<Acontecimento[]>();

  protected readonly visivel = signal<
    (Acontecimento & { icone: string; cor: string }) | null
  >(null);

  private ultimoId: string | null = null;
  private primeiraLeitura = true;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const lista = this.acontecimentos() ?? [];
      const ultimo = lista[lista.length - 1];
      if (!ultimo || ultimo.id === this.ultimoId) return;
      this.ultimoId = ultimo.id;

      // Quem chega no meio da partida não leva um card do que já passou.
      if (this.primeiraLeitura) {
        this.primeiraLeitura = false;
        return;
      }
      this.mostrar(ultimo);
    });
  }

  private mostrar(e: Acontecimento): void {
    if (this.timer) clearTimeout(this.timer);
    this.visivel.set({
      ...e,
      icone: ESTILO[e.tipo]?.icone ?? 'info',
      cor: ESTILO[e.tipo]?.cor ?? 'neutro',
    });
    this.timer = setTimeout(() => this.visivel.set(null), DURACAO_MS);
  }

  protected fechar(): void {
    if (this.timer) clearTimeout(this.timer);
    this.visivel.set(null);
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}
