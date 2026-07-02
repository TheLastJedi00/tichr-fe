import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ErrorService } from '../../core/error.service';
import { Modal } from '../modal/modal';

/**
 * Host global do modal de erro. Renderiza o <app-modal> a partir do estado
 * do ErrorService. Montado uma única vez no App para cobrir todas as telas.
 */
@Component({
  selector: 'app-error-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal],
  template: `
    <app-modal
      [open]="!!error.erro()"
      [title]="error.erro()?.titulo ?? ''"
      (close)="error.dismiss()"
    >
      <p class="msg">{{ error.erro()?.mensagem }}</p>
      <button modal-actions class="btn-primary" type="button" (click)="error.dismiss()">
        Fechar
      </button>
    </app-modal>
  `,
  styles: `
    .msg {
      margin: 0;
      color: var(--text-muted);
      line-height: 1.5;
    }
  `,
})
export class ErrorModal {
  protected readonly error = inject(ErrorService);
}
