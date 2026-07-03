import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Aluno } from '../../core/models';
import { Icon } from '../icon/icon';

/**
 * Card de aluno arrastável (dumb) para o quadro de equipes: handle + nome.
 * A pontuação só aparece quando `mostrarPontuacao` é true — no quadro de
 * equipes ela fica oculta (a gestão de pontos mora na aba Alunos).
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
      @if (mostrarPontuacao()) {
        <span class="xp">{{ a.xpTotal ?? 0 }} {{ nomePontuacao() }}</span>
      }
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
      overflow: hidden;
    }
    .handle {
      display: inline-flex;
      flex: 0 0 auto;
      color: var(--text-muted);
      background: none;
      border: none;
      padding: 0.1rem;
      cursor: grab;
      touch-action: none;
    }
    .handle:active { cursor: grabbing; }
    .nome {
      flex: 1 1 auto;
      min-width: 0;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .xp {
      flex: 0 0 auto;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      font-size: 0.8rem;
      color: var(--primary);
    }
  `,
})
export class AlunoCard {
  readonly aluno = input.required<Aluno>();
  readonly mostrarPontuacao = input(true);
  readonly nomePontuacao = input('XP');
}
