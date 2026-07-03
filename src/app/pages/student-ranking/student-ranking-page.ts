import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RankingItem } from '../../core/models';
import { StudentAuthService } from '../../core/student-auth.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Ranking da turma: pódio (ouro/prata/bronze) para o top 3 e destaque no card
 * do próprio aluno logado.
 */
@Component({
  selector: 'app-student-ranking-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Spinner],
  template: `
    <h1 class="title">Ranking da turma</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (ranking().length === 0) {
      <p class="muted">Ainda não há pontuação na turma.</p>
    } @else {
      <ol class="rank">
        @for (item of ranking(); track item.alunoId) {
          <li
            class="linha"
            [class.linha--eu]="item.alunoId === meuId"
            [attr.data-pos]="item.posicao <= 3 ? item.posicao : null"
          >
            <span class="pos">{{ medalha(item.posicao) }}</span>
            <span class="nome">
              {{ item.nome }}
              @if (item.alunoId === meuId) { <span class="voce">você</span> }
            </span>
            <span class="xp">{{ item.xpTotal }} XP</span>
          </li>
        }
      </ol>
    }
  `,
  styles: `
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 800; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .muted { color: var(--text-muted); }
    .rank { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .linha {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
    }
    .linha[data-pos='1'] { border-color: #eab308; box-shadow: 0 6px 20px rgba(234, 179, 8, 0.25); }
    .linha[data-pos='2'] { border-color: #94a3b8; box-shadow: 0 6px 20px rgba(148, 163, 184, 0.22); }
    .linha[data-pos='3'] { border-color: #d97706; box-shadow: 0 6px 20px rgba(217, 119, 6, 0.22); }
    .linha--eu {
      outline: 2px solid var(--primary);
      outline-offset: 1px;
    }
    .pos { font-size: 1.2rem; font-weight: 800; min-width: 2rem; text-align: center; }
    .nome { flex: 1; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
    .voce {
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--primary-contrast);
      background: var(--primary);
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
    }
    .xp { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--text-muted); }
  `,
})
export class StudentRankingPage {
  private readonly api = inject(TurmaApiService);
  private readonly studentAuth = inject(StudentAuthService);

  protected readonly meuId = this.studentAuth.aluno()?.id ?? '';
  protected readonly carregando = signal(true);
  protected readonly ranking = signal<RankingItem[]>([]);

  constructor() {
    const turmaId = this.studentAuth.turmaId();
    if (!turmaId) {
      this.carregando.set(false);
    } else {
      this.api.getRanking(turmaId).subscribe({
        next: (r) => {
          this.ranking.set(r);
          this.carregando.set(false);
        },
        error: () => this.carregando.set(false),
      });
    }
  }

  protected medalha(pos: number): string {
    return { 1: '🥇', 2: '🥈', 3: '🥉' }[pos] ?? `${pos}º`;
  }
}
