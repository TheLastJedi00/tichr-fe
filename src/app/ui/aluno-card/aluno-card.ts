import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Aluno, Cargo } from '../../core/models';
import { Icon } from '../icon/icon';

/**
 * Card de aluno arrastável (dumb) para o quadro de equipes: handle + nome,
 * com bullets dos cargos abaixo do nome. No modo de atribuição, o card brilha
 * e é clicável para (des)marcar o membro do cargo em foco.
 */
@Component({
  selector: 'app-aluno-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDragHandle, Icon],
  host: {
    '[class.modo]': 'modoAtribuicao()',
    '[class.sel]': 'modoAtribuicao() && selecionado()',
    '(click)': 'aoClicar()',
  },
  template: `
    @if (aluno(); as a) {
      <button
        class="handle"
        type="button"
        cdkDragHandle
        aria-label="Arrastar aluno"
        [disabled]="modoAtribuicao()"
      >
        <app-icon name="grip" [size]="16" />
      </button>
      <div class="body">
        <span class="nome">{{ a.nome }}</span>
        @if (cargos().length) {
          <span class="cargos">
            @for (c of cargos(); track c.id) {
              <span class="cargo">{{ c.nome }}</span>
            }
          </span>
        }
      </div>
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
    :host.modo { cursor: pointer; animation: brilho 1.4s ease-in-out infinite; }
    :host.sel {
      border-color: var(--primary);
      box-shadow: inset 0 0 0 2px var(--primary);
      animation: none;
    }
    @keyframes brilho {
      0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 0%, transparent); }
      50% { box-shadow: 0 0 12px 1px color-mix(in srgb, var(--primary) 55%, transparent); }
    }
    @media (prefers-reduced-motion: reduce) {
      :host.modo { animation: none; border-color: var(--primary); }
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
    .handle:disabled { opacity: 0.4; cursor: inherit; }
    .body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
    .nome {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cargos { display: flex; flex-wrap: wrap; gap: 0.15rem 0.6rem; }
    .cargo {
      position: relative;
      padding-left: 0.7rem;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .cargo::before {
      content: '•';
      position: absolute;
      left: 0;
      color: var(--primary);
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
  readonly cargos = input<Cargo[]>([]);
  readonly modoAtribuicao = input(false);
  readonly selecionado = input(false);
  readonly toggle = output<void>();

  protected aoClicar(): void {
    if (this.modoAtribuicao()) {
      this.toggle.emit();
    }
  }
}
