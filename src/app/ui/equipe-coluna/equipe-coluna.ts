import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Equipe } from '../../core/models';
import { Icon } from '../icon/icon';

/**
 * Coluna de equipe (moldura/dumb): faixa na cor de destaque, TÍTULO na primeira
 * linha (pode quebrar) e uma BARRA DE AÇÕES abaixo (contagem, info, excluir).
 * O corpo (drop list dos cards) entra por projeção — a Page orquestra o D&D.
 * Ocupa 100% da altura da célula do grid.
 */
@Component({
  selector: 'app-equipe-coluna',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (equipe(); as e) {
      <div class="col" [class.col--balanca]="balancando()" [style.--cor]="e.cor">
        <span class="faixa"></span>
        <div class="col__head">
          <h3 class="col__titulo">{{ e.titulo }}</h3>
          <div class="col__acoes">
            <span class="col__contagem">{{ total() }}</span>
            <span class="col__spacer"></span>
            <button
              class="ibtn"
              type="button"
              aria-label="Informações da equipe"
              (click)="info.emit()"
            >
              <app-icon name="info" [size]="18" />
            </button>
            <button
              class="ibtn ibtn--danger"
              type="button"
              aria-label="Excluir equipe"
              (click)="excluir.emit()"
            >
              <app-icon name="close" [size]="18" />
            </button>
          </div>
        </div>
        <div class="col__body">
          <ng-content />
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: block; height: 100%; }
    .col {
      display: flex;
      flex-direction: column;
      height: 100%;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface-alt);
      overflow: hidden;
    }
    .col--balanca { animation: balanca 0.9s ease-in-out infinite; transform-origin: center; }
    @keyframes balanca {
      0%, 100% { transform: rotate(-0.8deg); }
      50% { transform: rotate(0.8deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .col--balanca { animation: none; }
    }
    .faixa {
      height: 4px;
      background: var(--cor, var(--primary));
      flex: 0 0 auto;
    }
    .col__head {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      padding: 0.6rem 0.6rem 0.5rem;
      flex: 0 0 auto;
    }
    .col__titulo {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .col__acoes {
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .col__spacer { flex: 1; }
    .col__contagem {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--cor, var(--primary));
      background: color-mix(in srgb, var(--cor, var(--primary)) 15%, transparent);
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
    }
    .ibtn {
      display: inline-flex;
      color: var(--text-muted);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.1rem;
    }
    .ibtn:hover { color: var(--text); }
    .ibtn--danger:hover { color: var(--danger); }
    .col__body {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      padding: 0.25rem 0.6rem 0.7rem;
      flex: 1 1 auto;
      min-height: 3rem;
    }
  `,
})
export class EquipeColuna {
  readonly equipe = input.required<Equipe>();
  readonly total = input(0);
  readonly balancando = input(false);
  readonly info = output<void>();
  readonly excluir = output<void>();
}
