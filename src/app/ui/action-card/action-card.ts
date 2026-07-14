import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LastGlobalAction } from '../../core/models';
import { Icon, IconName } from '../icon/icon';

/** Ícone e cor de cada gatilho — a leitura do card é instantânea, à distância. */
const VISUAL: Record<string, { icone: IconName; cor: string }> = {
  ATAQUE: { icone: 'sword', cor: '#dc2626' },
  CURA: { icone: 'sparkles', cor: '#16a34a' },
  USURPACAO: { icone: 'flag', cor: '#7c3aed' },
  DANO_CRITICO: { icone: 'skull', cor: '#b45309' },
  DICA: { icone: 'scroll', cor: '#0891b2' },
};

/**
 * Action Card: narra uma ação de impacto no centro da tela de TODOS (alunos e
 * telão), enquanto o jogo fica congelado. Burro: recebe o evento e o desenha —
 * quem conta os 3 segundos é o `NarradorCards`.
 */
@Component({
  selector: 'app-action-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="backdrop" role="status" aria-live="assertive">
      <div class="card" [style.--cor]="visual().cor" animate.enter="entrar" animate.leave="sair">
        <span class="card__icone"><app-icon [name]="visual().icone" [size]="30" /></span>
        <p class="card__msg">{{ card().mensagem }}</p>
      </div>
    </div>
  `,
  styles: `
    :host { display: contents; }
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      background: color-mix(in srgb, #0f172a 55%, transparent);
    }
    .card {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      max-width: 30rem;
      padding: 1.1rem 1.25rem;
      border: 2px solid var(--cor);
      border-radius: 14px;
      background: var(--surface);
      box-shadow: 6px 6px 0 var(--cor);
    }
    .card__icone {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 12px;
      color: #fff;
      background: var(--cor);
    }
    .card__msg {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      line-height: 1.35;
      color: var(--text);
    }
    @media (min-width: 640px) {
      .card { padding: 1.5rem 1.75rem; }
      .card__msg { font-size: 1.25rem; }
    }

    @keyframes entrar {
      from { opacity: 0; transform: scale(0.85); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes sair {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
    .entrar { animation: entrar 0.18s ease-out; }
    .sair { animation: sair 0.18s ease-in; }
    @media (prefers-reduced-motion: reduce) {
      .entrar, .sair { animation: none; }
    }
  `,
})
export class ActionCard {
  readonly card = input.required<LastGlobalAction>();

  protected readonly visual = computed(
    () => VISUAL[this.card().tipo] ?? VISUAL['ATAQUE'],
  );
}
