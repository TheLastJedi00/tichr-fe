import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { LogPontuacaoJogador } from '../../core/models';

/**
 * De onde veio cada ponto de um jogador no fim da partida (dumb). No projetor
 * abre como modal; no celular, como folha que sobe do rodapé. Fecha no X, no
 * Esc ou tocando fora.
 */
@Component({
  selector: 'app-log-pontuacao',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'aoEsc()' },
  template: `
    @if (jogador(); as j) {
      <div class="ov" [class.ov--sheet]="modo() === 'sheet'" (click)="fechar.emit()">
        <section
          class="log"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="'Pontos de ' + j.nome"
          (click)="$event.stopPropagation()"
        >
          <header class="log__head">
            <div>
              <h2 class="log__nome">{{ j.nome }}</h2>
              <span class="log__total">
                {{ fmt(j.totalPartida) }} {{ unidade() }} na partida
                @if (posicao()) { · {{ posicao() }}º lugar }
              </span>
            </div>
            <button class="log__x" type="button" aria-label="Fechar" (click)="fechar.emit()">×</button>
          </header>

          @if (j.itens.length) {
            <ol class="log__itens">
              @for (i of j.itens; track $index) {
                <li class="item" [class.item--neg]="i.pontos < 0">
                  <span class="item__desc">{{ i.descricao }}</span>
                  <span class="item__pts">{{ sinal(i.pontos) }}</span>
                </li>
              }
            </ol>
          } @else {
            <p class="log__vazio">Nenhum ponto nesta partida.</p>
          }

          <p class="log__credito" [class.log__credito--zero]="creditoTexto().zero">
            {{ creditoTexto().texto }}
          </p>
        </section>
      </div>
    }
  `,
  styles: `
    .ov {
      position: fixed;
      inset: 0;
      z-index: 120;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(15, 23, 42, 0.55);
    }
    .ov--sheet { align-items: flex-end; padding: 0; }
    .log {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: min(520px, 100%);
      max-height: calc(100dvh - 2rem);
      padding: 1.25rem;
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 4px 4px 0 rgba(15, 23, 42, 0.35);
    }
    .ov--sheet .log {
      width: 100%;
      max-height: 85dvh;
      border-radius: 16px 16px 0 0;
      border-bottom: 0;
      box-shadow: none;
      animation: sobe 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    @keyframes sobe { from { transform: translateY(30%); opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .ov--sheet .log { animation: none; } }
    .log__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .log__nome { margin: 0; font-size: 1.2rem; font-weight: 800; }
    .log__total { color: var(--text-muted); font-size: 0.9rem; font-variant-numeric: tabular-nums; }
    .log__x {
      flex: 0 0 auto;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
    }
    .log__itens {
      list-style: none;
      margin: 0;
      padding: 0;
      overflow-y: auto;
      min-height: 0;
      display: grid;
      gap: 0.35rem;
    }
    .item {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      padding: 0.55rem 0.7rem;
      border-radius: 8px;
      background: var(--surface-alt);
    }
    .item__desc { flex: 1 1 auto; font-size: 0.92rem; }
    .item__pts { flex: 0 0 auto; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--success); }
    .item--neg .item__pts { color: var(--danger); }
    .log__vazio { margin: 0; color: var(--text-muted); text-align: center; padding: 1rem 0; }
    .log__credito {
      margin: 0;
      padding: 0.7rem;
      border: 1px solid var(--primary);
      border-radius: 8px;
      text-align: center;
      font-weight: 700;
      color: var(--primary);
    }
    .log__credito--zero { border-style: dashed; border-color: var(--border); color: var(--text-muted); }
  `,
})
export class LogPontuacaoComponent {
  readonly jogador = input<LogPontuacaoJogador | null>(null);
  readonly posicao = input<number | null>(null);
  /** O nome da pontuação da turma (padrão "XP"). */
  readonly unidade = input('XP');
  /** A partida tinha turma? Sem turma, nada vai para ranking nenhum. */
  readonly temTurma = input(true);
  /** Desmarcado no lobby: a partida foi casual. */
  readonly casual = input(false);
  readonly modo = input<'modal' | 'sheet'>('modal');
  readonly fechar = output<void>();

  protected readonly creditoTexto = computed(() => {
    const j = this.jogador();
    if (!this.temTurma()) {
      return { texto: 'Partida sem turma: não somou no ranking.', zero: true };
    }
    if (this.casual()) {
      return { texto: 'Partida casual: não somou no ranking.', zero: true };
    }
    const credito = j?.creditoRanking ?? 0;
    return {
      texto: `+${this.fmt(credito)} ${this.unidade()} no ranking da turma`,
      zero: credito === 0,
    };
  });

  protected aoEsc(): void {
    if (this.jogador()) this.fechar.emit();
  }

  protected fmt(n: number): string {
    return Math.abs(n).toLocaleString('pt-BR');
  }

  protected sinal(n: number): string {
    return `${n < 0 ? '−' : '+'}${this.fmt(n)}`;
  }
}
