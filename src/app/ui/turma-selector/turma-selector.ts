import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { Aluno, Turma } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { TurmaPickerState } from '../../core/turma-picker.state';
import { Icon } from '../icon/icon';
import { PreJogoAlunosModal } from '../pre-jogo-alunos-modal/pre-jogo-alunos-modal';
import { TurmaPickerModal } from '../turma-picker-modal/turma-picker-modal';

/**
 * Seleção de turmas do jogo (spec "UX de jogos"): substitui a lista de checkboxes
 * por um gatilho **"+ Selecionar turma"** que abre o {@link TurmaPickerModal} (busca
 * + filtros). Mantém o N:N — cada escolha vira um chip; reabrir adiciona outra.
 * Se a turma escolhida está **vazia**, dispara o cadastro rápido de alunos
 * ({@link PreJogoAlunosModal}) sem sair do fluxo (UX de jogos §3 / ENH-003).
 *
 * Usa `[(selecionadas)]` (two-way) com os ids das turmas; o pai só guarda os ids.
 */
@Component({
  selector: 'app-turma-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TurmaPickerModal, PreJogoAlunosModal],
  template: `
    <div class="chips">
      @for (id of selecionadas; track id) {
        <span class="chip">
          {{ nomeTurma(id) }}
          <button type="button" (click)="remover(id)" aria-label="Remover turma">×</button>
        </span>
      }
      <button type="button" class="btn-add" (click)="picker.set(true)">
        <app-icon name="plus" [size]="16" /> Selecionar turma
      </button>
    </div>
    @if (selecionadas.length === 0) {
      <p class="dica">Nenhuma turma selecionada — escolha uma ou informe a disciplina acima.</p>
    }

    <app-turma-picker-modal
      [open]="picker()"
      [turmas]="turmas"
      [selecionadas]="selecionadas"
      (selecionar)="aoSelecionar($event)"
      (fechar)="picker.set(false)"
    />
    <app-pre-jogo-alunos-modal
      [open]="!!rosterTurma()"
      [turmaId]="rosterTurma()?.id ?? null"
      [nomeTurma]="rosterTurma()?.nome ?? ''"
      (adicionados)="aposCadastro($event)"
      (fechar)="rosterTurma.set(null)"
    />
  `,
  styles: `
    .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
    .chip {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.3rem 0.6rem; border-radius: 999px;
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      color: var(--primary); font-weight: 600; font-size: 0.85rem;
    }
    .chip button {
      background: none; border: 0; color: inherit; cursor: pointer;
      font-size: 1rem; line-height: 1; padding: 0;
    }
    .btn-add {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.4rem 0.75rem; border-radius: 999px; cursor: pointer;
      border: 1px dashed var(--border); background: var(--surface); color: inherit;
      font: inherit; font-weight: 600; font-size: 0.85rem;
    }
    .btn-add:hover { border-color: var(--primary); color: var(--primary); }
    .dica { color: var(--text-muted); font-size: 0.85rem; margin: 0.4rem 0 0; }
  `,
})
export class TurmaSelector {
  private readonly api = inject(TurmaApiService);
  private readonly estado = inject(TurmaPickerState);

  @Input() turmas: Turma[] = [];
  @Input() selecionadas: string[] = [];
  @Output() selecionadasChange = new EventEmitter<string[]>();

  protected readonly picker = signal(false);
  protected readonly rosterTurma = signal<Turma | null>(null);

  protected nomeTurma(id: string): string {
    return this.turmas.find((t) => t.id === id)?.nome ?? 'Turma';
  }

  protected remover(id: string): void {
    this.selecionadasChange.emit(this.selecionadas.filter((x) => x !== id));
  }

  protected aoSelecionar(t: Turma): void {
    this.picker.set(false);
    if (!this.selecionadas.includes(t.id)) {
      this.selecionadasChange.emit([...this.selecionadas, t.id]);
    }
    // Interceptação de turma vazia → cadastro rápido de alunos.
    const n = this.estado.contagem(t.id);
    if (n === 0) {
      this.rosterTurma.set(t);
    } else if (n === undefined) {
      // Contagem ainda não carregada: confirma na API antes de decidir.
      this.api.getAlunos(t.id).subscribe((alunos) => {
        this.estado.definirContagem(t.id, alunos.length);
        if (alunos.length === 0) this.rosterTurma.set(t);
      });
    }
  }

  protected aposCadastro(novos: Aluno[]): void {
    const t = this.rosterTurma();
    if (t) {
      this.estado.definirContagem(t.id, (this.estado.contagem(t.id) ?? 0) + novos.length);
    }
    this.rosterTurma.set(null);
  }
}
