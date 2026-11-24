import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { formatarDataHora } from '../../core/date-format';
import {
  AutorMensagem,
  MensagemPergunta,
  tamanhoLegivel,
} from '../../core/pergunta-api.service';
import { Icon } from '../icon/icon';

/**
 * A conversa de uma pergunta ao professor (spec 037): mensagens em ordem
 * cronológica, as de quem está vendo à direita. Anexo vira um chip de
 * download; o arquivo nunca é aberto na tela.
 */
@Component({
  selector: 'app-conversa-pergunta',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <ol class="conversa">
      @for (m of mensagens(); track m.id) {
        <li class="msg" [class.msg--minha]="m.autor === eu()">
          <span class="msg__autor">
            {{ m.autor === 'PROFESSOR' ? 'Professor' : nomeAluno() }}
            <time [attr.datetime]="m.criadaEm">{{ dataHora(m.criadaEm) }}</time>
          </span>
          @if (m.texto) {
            <p class="msg__texto">{{ m.texto }}</p>
          }
          @if (m.anexo; as a) {
            <button
              type="button"
              class="anexo"
              [disabled]="baixando() === m.id"
              (click)="baixar.emit(m.id)"
              [attr.aria-label]="'Baixar ' + a.nome"
            >
              <app-icon name="paperclip" [size]="16" />
              <span class="anexo__nome">{{ a.nome }}</span>
              <span class="anexo__tam">{{ tamanho(a.tamanho) }}</span>
              <span class="anexo__acao">
                <app-icon name="download" [size]="16" />
                {{ baixando() === m.id ? 'Baixando…' : 'Baixar' }}
              </span>
            </button>
          }
        </li>
      }
    </ol>
  `,
  styles: `
    .conversa { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    .msg {
      align-self: flex-start;
      max-width: min(85%, 560px);
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      padding: 0.6rem 0.8rem;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
    }
    .msg--minha {
      align-self: flex-end;
      border-color: var(--primary);
      background: color-mix(in srgb, var(--primary) 8%, var(--surface));
    }
    .msg__autor { display: flex; gap: 0.5rem; align-items: baseline; font-size: 0.8rem; font-weight: 700; }
    .msg__autor time { font-weight: 500; color: var(--text-muted); }
    .msg__texto { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 0.95rem; }
    .anexo {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-wrap: wrap;
      padding: 0.45rem 0.6rem;
      border: 2px solid var(--border);
      border-radius: 8px;
      background: var(--bg, var(--surface));
      color: var(--text);
      font: inherit;
      font-size: 0.88rem;
      cursor: pointer;
      text-align: left;
    }
    .anexo:hover:not(:disabled) { border-color: var(--primary); }
    .anexo__nome { font-weight: 700; overflow-wrap: anywhere; }
    .anexo__tam { color: var(--text-muted); }
    .anexo__acao { display: inline-flex; align-items: center; gap: 0.25rem; color: var(--primary); font-weight: 700; }
  `,
})
export class ConversaPergunta {
  readonly mensagens = input.required<MensagemPergunta[]>();
  /** Quem está vendo: as mensagens dele ficam à direita. */
  readonly eu = input.required<AutorMensagem>();
  readonly nomeAluno = input('Aluno');
  /** Mensagem cujo anexo está sendo baixado (desabilita o chip). */
  readonly baixando = input<string | null>(null);
  readonly baixar = output<string>();

  protected readonly dataHora = formatarDataHora;
  protected readonly tamanho = tamanhoLegivel;
}
