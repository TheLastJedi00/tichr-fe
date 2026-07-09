import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { LimiaresNivel, nivelDeXp } from '../../core/nivel.util';

/**
 * Barra de XP animada: mostra o nível atual e o progresso até o próximo.
 * A porcentagem é derivada por Signal (input reativo) para animar suave.
 * Trilha Bronze → Prata → Ouro → Diamante → Platina com limiares da turma.
 */
@Component({
  selector: 'app-xp-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="xp">
      <div class="xp__top">
        <span class="xp__nivel" [style.color]="nivel().cor">{{ nivel().nome }}</span>
        <span class="xp__pontos">{{ xp() }} {{ unidade() }}</span>
      </div>
      <div class="xp__trilho">
        <div class="xp__preenchimento" [style.width.%]="pct()"></div>
      </div>
      <span class="xp__meta">{{ legenda() }}</span>
    </div>
  `,
  styles: `
    .xp { display: block; }
    .xp__top {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 0.4rem;
    }
    .xp__nivel { font-size: 1.1rem; font-weight: 800; color: var(--primary); }
    .xp__pontos { font-weight: 700; font-variant-numeric: tabular-nums; }
    .xp__trilho {
      height: 14px;
      border-radius: 999px;
      background: var(--surface-alt);
      overflow: hidden;
    }
    .xp__preenchimento {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #3b82f6, #22c55e);
      transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .xp__meta {
      display: block;
      margin-top: 0.4rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
  `,
})
export class XpBar {
  readonly xp = input(0);
  readonly unidade = input('XP');
  /** Limiares de nível da turma; ausente → usa os defaults. */
  readonly limiares = input<Partial<LimiaresNivel> | null>(null);

  protected readonly nivel = computed(() => nivelDeXp(this.xp(), this.limiares()));

  protected readonly pct = computed(() => {
    const n = this.nivel();
    if (n.proxMin === null) {
      return 100;
    }
    const faixa = n.proxMin - n.atualMin;
    return Math.min(100, Math.max(0, ((this.xp() - n.atualMin) / faixa) * 100));
  });

  protected readonly legenda = computed(() => {
    const n = this.nivel();
    if (n.proxMin === null) {
      return 'Nível máximo alcançado!';
    }
    return `Faltam ${n.proxMin - this.xp()} ${this.unidade()} para o próximo nível`;
  });
}
