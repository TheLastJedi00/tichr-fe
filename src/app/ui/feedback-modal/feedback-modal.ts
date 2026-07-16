import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CategoriaFeedback } from '../../core/models';
import { Modal } from '../modal/modal';

/** Rótulo humano de cada categoria — o literal cru nunca aparece na tela. */
const CATEGORIAS: { valor: CategoriaFeedback; rotulo: string }[] = [
  { valor: 'BUG', rotulo: 'Relato de Bug' },
  { valor: 'SUGESTAO', rotulo: 'Sugestão de Melhoria' },
  { valor: 'DUVIDA', rotulo: 'Dúvida Técnica' },
  { valor: 'ELOGIO', rotulo: 'Elogio' },
];

/**
 * Formulário de feedback (dumb): categoria + mensagem.
 *
 * Não injeta service nenhum — quem faz a chamada é o menu, que já é o dono do
 * estado do drawer. Aqui só há o form e o que ele emite.
 */
@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal],
  template: `
    <app-modal [open]="open()" title="Enviar feedback" (close)="fechar()">
      @if (enviado()) {
        <p class="ok">Recebemos! Obrigado — vamos ler cada palavra.</p>
      } @else {
        <div class="form">
          <label class="campo">
            <span>Sobre o que é?</span>
            <select
              class="tichr-input"
              [value]="categoria()"
              (change)="categoria.set($any($event.target).value)"
            >
              <option value="" disabled>Escolha uma opção…</option>
              @for (c of categorias; track c.valor) {
                <option [value]="c.valor">{{ c.rotulo }}</option>
              }
            </select>
          </label>

          <label class="campo">
            <span>Conte pra gente</span>
            <textarea
              class="tichr-input"
              rows="5"
              maxlength="2000"
              placeholder="Quanto mais detalhe, melhor. Se for um bug, o que você estava fazendo quando ele apareceu?"
              [value]="mensagem()"
              (input)="mensagem.set($any($event.target).value)"
            ></textarea>
          </label>

          @if (erro()) {
            <p class="erro">{{ erro() }}</p>
          }
        </div>
      }

      <div modal-actions>
        @if (enviado()) {
          <button class="btn-primary" type="button" (click)="fechar()">Fechar</button>
        } @else {
          <button class="btn-outline" type="button" (click)="fechar()">Cancelar</button>
          <button
            class="btn-primary"
            type="button"
            [disabled]="!podeEnviar() || enviando()"
            (click)="submeter()"
          >
            {{ enviando() ? 'Enviando…' : 'Enviar' }}
          </button>
        }
      </div>
    </app-modal>
  `,
  styles: `
    .form { display: flex; flex-direction: column; gap: 0.85rem; }
    .campo { display: flex; flex-direction: column; gap: 0.35rem; }
    .campo > span { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    textarea.tichr-input { resize: vertical; font: inherit; }
    .erro { margin: 0; font-size: 0.85rem; color: var(--danger); }
    .ok { margin: 0; color: var(--text); }
  `,
})
export class FeedbackModal {
  protected readonly categorias = CATEGORIAS;

  readonly open = input(false);
  readonly enviando = input(false);
  readonly enviado = input(false);
  readonly erro = input<string | null>(null);

  readonly enviar = output<{ categoria: CategoriaFeedback; mensagem: string }>();
  readonly close = output<void>();

  /** Vazio = nada escolhido; o <option> placeholder é disabled. */
  protected readonly categoria = signal<CategoriaFeedback | ''>('');
  protected readonly mensagem = signal('');

  protected readonly podeEnviar = computed(
    () => this.categoria() !== '' && this.mensagem().trim().length >= 3,
  );

  protected submeter(): void {
    if (!this.podeEnviar()) return;
    this.enviar.emit({
      categoria: this.categoria() as CategoriaFeedback,
      mensagem: this.mensagem().trim(),
    });
  }

  protected fechar(): void {
    this.categoria.set('');
    this.mensagem.set('');
    this.close.emit();
  }
}
