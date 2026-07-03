import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { Aluno } from '../../core/models';
import { Icon } from '../icon/icon';

/**
 * Card de aluno (dumb): nome + XP, com handle de arraste e acoes rapidas.
 * Usado dentro de um `cdkDrag` no quadro de equipes; toda a logica (HTTP)
 * fica na Page. So expoe inputs/outputs.
 */
@Component({
  selector: 'app-aluno-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDragHandle, Icon],
  template: `
    @if (aluno(); as a) {
      <button
        class="handle"
        type="button"
        cdkDragHandle
        aria-label="Arrastar aluno"
      >
        <app-icon name="grip" [size]="16" />
      </button>
      <span class="nome">{{ a.nome }}</span>
      <span class="xp">{{ a.xpTotal ?? 0 }} XP</span>
      <div class="acts">
        <button class="xpbtn xpbtn--add" type="button" (click)="darXp.emit(50)">
          +50
        </button>
        <button class="xpbtn xpbtn--sub" type="button" (click)="darXp.emit(-20)">
          -20
        </button>
        <button
          class="remover"
          type="button"
          aria-label="Remover aluno"
          (click)="remover.emit()"
        >
          <app-icon name="close" [size]="16" />
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.6rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .handle {
      display: inline-flex;
      color: var(--text-muted);
      background: none;
      border: none;
      padding: 0.1rem;
      cursor: grab;
      touch-action: none;
    }
    .handle:active { cursor: grabbing; }
    .nome { flex: 1; font-weight: 500; }
    .xp {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      font-size: 0.8rem;
      color: var(--primary);
    }
    .acts { display: flex; align-items: center; gap: 0.3rem; }
    .xpbtn {
      font: inherit;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 0.2rem 0.45rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface);
      cursor: pointer;
    }
    .xpbtn--add { color: var(--success); border-color: var(--success); }
    .xpbtn--sub { color: var(--danger); border-color: var(--danger); }
    .remover {
      display: inline-flex;
      color: var(--text-muted);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.15rem;
    }
    .remover:hover { color: var(--danger); }
  `,
})
export class AlunoCard {
  readonly aluno = input.required<Aluno>();
  readonly darXp = output<number>();
  readonly remover = output<void>();
}
