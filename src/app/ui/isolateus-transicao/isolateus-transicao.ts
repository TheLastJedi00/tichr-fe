import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ThemeService } from '../../core/theme.service';
import { Icon } from '../icon/icon';

/** Quanto dura a cena inteira (sol descendo → tema → lua subindo). */
const DURACAO_MS = 2500;
/** Em que ponto da cena o tema vira — quando o primeiro astro já sumiu. */
const TROCA_TEMA_MS = 1100;

/**
 * A passagem do dia para a noite (e vice-versa).
 *
 * **Anoitecer:** véu escurece, o sol desliza de cima para baixo até sumir, o
 * tema escuro entra, a lua sobe da borda inferior e sai pelo topo.
 * **Amanhecer:** o inverso exato.
 *
 * A cena **nunca bloqueia o jogo**: ela roda sobre um estado que já foi
 * publicado. Quem recarregar a página ou entrar no meio cai direto no estado
 * corrente, sem animação e sem perder nada.
 */
@Component({
  selector: 'app-isolateus-transicao',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (tocando()) {
      <div class="veu" [class.veu--amanhecer]="amanhecendo()" aria-hidden="true">
        <span class="astro astro--sai"><app-icon [name]="astroQueSai()" [size]="64" /></span>
        <span class="astro astro--entra"><app-icon [name]="astroQueEntra()" [size]="64" /></span>
        <span class="rotulo">{{ amanhecendo() ? 'Amanhece' : 'A noite cai' }}</span>
      </div>
    }
  `,
  styles: `
    :host { display: contents; }

    .veu {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: grid;
      place-items: center;
      overflow: hidden;
      background: rgba(15, 23, 42, 0.72);
      /*
        O blur fica confinado a este overlay de jogo. O design system do Tichr
        segue flat, sem blur (strategy.md FE §1) — a exceção é aqui, numa
        superfície cinematográfica que não reutiliza componentes do painel.
      */
      backdrop-filter: blur(6px);
      animation: veu 2500ms ease-in-out forwards;
    }
    .veu--amanhecer { background: rgba(226, 232, 240, 0.72); }

    .astro { position: absolute; line-height: 0; }
    /* Anoitecer: o sol desce e some; a lua sobe e sai pelo topo. */
    .astro--sai { color: #fbbf24; animation: desce 1100ms ease-in forwards; }
    .astro--entra {
      color: #e2e8f0;
      animation: sobe 1200ms ease-out 1100ms forwards;
      transform: translateY(60vh);
    }
    .veu--amanhecer .astro--sai { color: #cbd5e1; animation: desceCurto 1100ms ease-in forwards; }
    .veu--amanhecer .astro--entra { color: #fbbf24; }

    .rotulo {
      position: relative;
      top: 6rem;
      font-size: 0.7rem;
      font-weight: 900;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #f8fafc;
      animation: pisca 2500ms ease-in-out forwards;
    }
    .veu--amanhecer .rotulo { color: #0f172a; }

    @keyframes veu {
      0% { opacity: 0; }
      12% { opacity: 1; }
      88% { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes desce {
      from { transform: translateY(-45vh); }
      to { transform: translateY(60vh); }
    }
    @keyframes desceCurto {
      from { transform: translateY(-10vh); }
      to { transform: translateY(60vh); }
    }
    @keyframes sobe {
      from { transform: translateY(60vh); }
      to { transform: translateY(-60vh); }
    }
    @keyframes pisca {
      0%, 100% { opacity: 0; }
      25%, 75% { opacity: 1; }
    }

    /* Com movimento reduzido, a cena vira um fade curto e o tema troca na hora. */
    @media (prefers-reduced-motion: reduce) {
      .veu { animation: veuCurto 600ms ease-out forwards; backdrop-filter: none; }
      .astro, .rotulo { animation: none; }
      .astro--sai { display: none; }
      .astro--entra { transform: none; }
      @keyframes veuCurto {
        0% { opacity: 0; }
        30% { opacity: 1; }
        100% { opacity: 0; }
      }
    }
  `,
})
export class IsolateusTransicao {
  /**
   * `true` = é noite agora. A troca deste valor é o que dispara a cena; o
   * primeiro valor recebido **não** anima (quem entra no meio da partida não
   * assiste a uma transição que já aconteceu).
   */
  readonly noite = input.required<boolean>();

  private readonly tema = inject(ThemeService);

  protected readonly tocando = signal(false);
  protected readonly amanhecendo = signal(false);

  protected readonly astroQueSai = signal<'sun' | 'moon'>('sun');
  protected readonly astroQueEntra = signal<'sun' | 'moon'>('moon');

  private anterior: boolean | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    effect(() => {
      const noite = this.noite();
      const primeira = this.anterior === null;
      const mudou = this.anterior !== noite;
      this.anterior = noite;
      if (!mudou) return;

      if (primeira) {
        // Sem cena: só alinha o tema ao estado em que a partida já está.
        this.tema.aplicarTemporario(noite ? 'dark' : 'light');
        return;
      }
      this.tocar(noite);
    });
  }

  private tocar(noite: boolean): void {
    this.limpar();
    this.amanhecendo.set(!noite);
    this.astroQueSai.set(noite ? 'sun' : 'moon');
    this.astroQueEntra.set(noite ? 'moon' : 'sun');
    this.tocando.set(true);

    // O tema vira no meio da cena, quando o primeiro astro já saiu de quadro.
    this.timers.push(
      setTimeout(
        () => this.tema.aplicarTemporario(noite ? 'dark' : 'light'),
        TROCA_TEMA_MS,
      ),
      setTimeout(() => this.tocando.set(false), DURACAO_MS),
    );
  }

  private limpar(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  ngOnDestroy(): void {
    this.limpar();
  }
}
