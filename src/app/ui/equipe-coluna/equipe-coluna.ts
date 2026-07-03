import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Equipe } from '../../core/models';
import { Icon } from '../icon/icon';

/**
 * Coluna de equipe (moldura/dumb): cabecalho com faixa na cor de destaque,
 * titulo visivel e botao "i" de informacoes. O corpo (drop list dos cards)
 * entra por projecao de conteudo — a Page orquestra o drag & drop.
 */
@Component({
  selector: 'app-equipe-coluna',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (equipe(); as e) {
      <div class="col" [style.--cor]="e.cor">
        <span class="faixa"></span>
        <header class="col__head">
          <h3 class="col__titulo">{{ e.titulo }}</h3>
          <span class="col__contagem">{{ total() }}</span>
          <button
            class="ibtn"
            type="button"
            aria-label="Informacoes da equipe"
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
        </header>
        <div class="col__body">
          <ng-content />
        </div>
      </div>
    }
  `,
  styles: `
    .col {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface-alt);
      overflow: hidden;
    }
    .faixa {
      height: 4px;
      background: var(--cor, var(--primary));
    }
    .col__head {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 0.6rem 0.4rem;
    }
    .col__titulo {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
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
      padding: 0.5rem 0.6rem 0.7rem;
      min-height: 3rem;
    }
  `,
})
export class EquipeColuna {
  readonly equipe = input.required<Equipe>();
  readonly total = input(0);
  readonly info = output<void>();
  readonly excluir = output<void>();
}
