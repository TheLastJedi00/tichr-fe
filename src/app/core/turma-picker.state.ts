import { Injectable, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Turma } from './models';
import { TurmaApiService } from './turma-api.service';

/** Status pelo qual o modal filtra as turmas. */
export type FiltroStatusTurma = 'ativas' | 'todas';

/**
 * Estado compartilhado do seletor de turmas (modal de busca dos jogos). É
 * `providedIn: 'root'`, então vive por toda a **sessão** do app — é isso que dá
 * a "memória de sessão" pedida na spec: o último filtro (busca/disciplina/status)
 * continua aplicado ao abrir o modal de novo, inclusive para um segundo jogo.
 *
 * Também mantém um **cache de contagem de alunos por turma**, carregado sob
 * demanda (evita refazer as requisições a cada abertura) e usado tanto no card
 * quanto na interceptação de turma vazia (ENH-003 / UX de jogos §3).
 */
@Injectable({ providedIn: 'root' })
export class TurmaPickerState {
  private readonly api = inject(TurmaApiService);

  /** Filtros persistentes na sessão. */
  readonly busca = signal('');
  readonly disciplina = signal<string>('');
  readonly status = signal<FiltroStatusTurma>('ativas');

  /** Contagem de alunos por turma (`undefined` = ainda carregando). */
  readonly contagens = signal<Record<string, number | undefined>>({});
  private carregando = new Set<string>();

  /** Dispara o carregamento das contagens que ainda não estão em cache. */
  garantirContagens(turmas: Turma[]): void {
    const pendentes = turmas.filter(
      (t) =>
        this.contagens()[t.id] === undefined && !this.carregando.has(t.id),
    );
    if (pendentes.length === 0) return;
    pendentes.forEach((t) => this.carregando.add(t.id));
    forkJoin(pendentes.map((t) => this.api.getAlunos(t.id))).subscribe({
      next: (listas) => {
        const patch: Record<string, number> = {};
        pendentes.forEach((t, i) => {
          patch[t.id] = listas[i].length;
          this.carregando.delete(t.id);
        });
        this.contagens.update((c) => ({ ...c, ...patch }));
      },
      error: () => pendentes.forEach((t) => this.carregando.delete(t.id)),
    });
  }

  contagem(turmaId: string): number | undefined {
    return this.contagens()[turmaId];
  }

  /** Atualiza a contagem de uma turma (ex.: após cadastrar alunos no pré-jogo). */
  definirContagem(turmaId: string, n: number): void {
    this.contagens.update((c) => ({ ...c, [turmaId]: n }));
  }
}
