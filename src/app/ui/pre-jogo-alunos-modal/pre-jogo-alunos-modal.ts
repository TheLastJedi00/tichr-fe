import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { Aluno } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { Modal } from '../modal/modal';
import { RosterInput } from '../roster-input/roster-input';

/**
 * Interceptação de pré-jogo (ENH-003): quando o professor manda rodar uma
 * partida para uma turma **sem alunos**, este modal aparece antes do lobby com o
 * cadastro em massa ({@link RosterInput}). Ao adicionar, persiste na turma
 * (permanente) e avisa o pai (`adicionados`) para seguir direto para a partida.
 */
@Component({
  selector: 'app-pre-jogo-alunos-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, RosterInput],
  template: `
    <app-modal
      [open]="open"
      title="Adicione os alunos da turma"
      (close)="fechar.emit()"
    >
      <p class="dica">
        A turma <strong>{{ nomeTurma }}</strong> ainda não tem alunos. Digite os
        nomes (separados por vírgula, hífen ou quebra de linha) para cadastrá-los
        e já começar a partida.
      </p>
      <app-roster-input
        [salvando]="salvando()"
        rotulo="Cadastrar e continuar"
        (adicionar)="adicionar($event)"
      />
      @if (erro()) {
        <p class="erro">{{ erro() }}</p>
      }
      <div modal-actions>
        <button
          class="btn-outline"
          type="button"
          (click)="fechar.emit()"
          [disabled]="salvando()"
        >
          Cancelar
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .dica {
      margin: 0 0 0.75rem;
      color: var(--text-muted);
    }
    .erro {
      margin: 0.5rem 0 0;
      color: var(--danger);
      font-size: 0.85rem;
    }
  `,
})
export class PreJogoAlunosModal {
  private readonly api = inject(TurmaApiService);

  @Input() open = false;
  @Input() turmaId: string | null = null;
  @Input() nomeTurma = '';

  /** Alunos criados — o pai fecha o modal e segue para a partida. */
  @Output() adicionados = new EventEmitter<Aluno[]>();
  @Output() fechar = new EventEmitter<void>();

  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected adicionar(nomes: string[]): void {
    const turmaId = this.turmaId;
    if (!turmaId) return;
    this.salvando.set(true);
    this.erro.set(null);
    this.api.adicionarAlunos(turmaId, nomes).subscribe({
      next: (novos) => {
        this.salvando.set(false);
        this.adicionados.emit(novos);
      },
      error: () => {
        this.salvando.set(false);
        this.erro.set('Não foi possível cadastrar os alunos. Tente de novo.');
      },
    });
  }
}
