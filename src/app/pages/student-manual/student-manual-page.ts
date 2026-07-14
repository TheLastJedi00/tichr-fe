import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { JogoId, REGRAS_JOGO } from '../../core/regras-jogo.data';
import { Icon } from '../../ui/icon/icon';
import { RegrasJogoView } from '../../ui/regras-jogo/regras-jogo';

/**
 * Manual de Guerra: as regras completas e a Tabela de Recompensas dos jogos, na
 * mão do aluno. O ponto é a estratégia PRÉ-jogo — saber que um Risco Heroico
 * vale 300 e que o castelo intacto no fim vale +1 por HP muda como a equipe joga.
 */
@Component({
  selector: 'app-student-manual-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RegrasJogoView],
  template: `
    <header class="head">
      <h1>Manual de Guerra</h1>
      <p class="sub">As regras e quanto vale cada jogada. Estude antes da batalha.</p>
    </header>

    <div class="abas" role="tablist">
      @for (j of jogos; track j) {
        <button
          class="aba"
          type="button"
          role="tab"
          [class.aba--on]="aba() === j"
          [attr.aria-selected]="aba() === j"
          (click)="aba.set(j)"
        >
          <app-icon [name]="j === 'WOR' ? 'castle' : 'game'" [size]="16" />
          {{ nomeDe(j) }}
        </button>
      }
    </div>

    <section class="conteudo">
      <app-regras-jogo [regras]="regrasDe(aba())" />
    </section>
  `,
  styles: `
    :host { display: block; }
    .head { margin-bottom: 1.25rem; }
    .head h1 { margin: 0; font-size: 1.5rem; font-weight: 800; }
    .sub { margin: 0.25rem 0 0; color: var(--text-muted); }
    .abas { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
    .aba {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      flex: 1;
      justify-content: center;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
      color: var(--text-muted);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .aba--on {
      border-color: var(--primary);
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 10%, var(--surface));
    }
    .conteudo { padding: 1.1rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); }
  `,
})
export class StudentManualPage {
  protected readonly jogos: JogoId[] = ['WOR', 'QLICK'];
  protected readonly aba = signal<JogoId>('WOR');

  protected nomeDe(id: JogoId): string {
    return REGRAS_JOGO[id].nome;
  }
  protected regrasDe(id: JogoId) {
    return REGRAS_JOGO[id];
  }
}
