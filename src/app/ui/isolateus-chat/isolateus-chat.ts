import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MensagemVila } from '../../core/models';

/** Espelha `ISOLATEUS.CHAT_MAX_CARACTERES` do backend (só para o contador). */
export const CHAT_VILA_MAX_CARACTERES = 200;

/**
 * O chat da vila do Isolateus (036 #26–#33). Burro: recebe as mensagens e
 * devolve o texto a enviar — quem fala com a API é a página, e quem decide o
 * que é palavrão é o servidor. O mesmo componente serve o celular em pixel
 * art (sobreposição), o modo simples (painel) e o telão (só leitura).
 */
@Component({
  selector: 'app-isolateus-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.pixel]': 'pixel()', '[class.telao]': 'telao()' },
  template: `
    <div class="chat">
      <div class="lista" #lista aria-live="polite">
        @for (m of mensagens(); track m.id) {
          <p class="msg" [class.msg--eu]="m.autorNome === meuNome()">
            <b class="msg__autor">{{ m.autorNome }}</b>
            <span class="msg__txt">{{ m.texto }}</span>
          </p>
        } @empty {
          <p class="vazio">
            {{ telao() ? 'O chat da vila aparece aqui.' : 'Acuse, defenda-se, diga onde você esteve. Toda a vila lê.' }}
          </p>
        }
      </div>

      @if (!telao()) {
        @if (erro()) { <p class="erro" role="alert">{{ erro() }}</p> }
        @if (motivo(); as m) {
          <p class="motivo">{{ m }}</p>
        } @else {
          <form class="envio" (submit)="$event.preventDefault(); mandar()">
            <input
              class="entrada"
              [class.tichr-input]="!pixel()"
              [value]="texto()"
              (input)="texto.set($any($event.target).value)"
              [attr.maxlength]="max"
              placeholder="Mensagem para a vila"
              aria-label="Mensagem para a vila"
              autocomplete="off"
            />
            <button
              class="envio__btn"
              [class.px-btn]="pixel()"
              [class.btn-primary]="!pixel()"
              type="submit"
              [disabled]="enviando() || !podeEnviar()"
            >
              Enviar
            </button>
          </form>
          <small class="contador" [class.contador--fim]="restante() < 20">{{ restante() }}</small>
        }
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .chat { display: flex; flex-direction: column; gap: 0.5rem; }
    .lista { display: flex; flex-direction: column; gap: 0.35rem; overflow-y: auto; max-height: 40vh; min-height: 6rem; }
    .msg { margin: 0; overflow-wrap: anywhere; font-size: 0.92rem; color: var(--text); }
    .msg__autor { margin-right: 0.35rem; color: var(--text-muted); }
    .msg--eu .msg__autor { color: var(--primary); }
    .vazio, .motivo { margin: 0; color: var(--text-muted); font-size: 0.85rem; }
    .erro { margin: 0; padding: 0.45rem 0.6rem; border-radius: var(--radius); background: color-mix(in srgb, var(--danger) 16%, transparent); color: var(--danger); font-size: 0.85rem; font-weight: 700; }
    .envio { display: flex; gap: 0.5rem; }
    .entrada { flex: 1; min-width: 0; }
    .envio__btn { padding: 0 0.9rem; }
    .contador { align-self: flex-end; font-size: 0.72rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .contador--fim { color: var(--danger); font-weight: 800; }

    /* Pixel art: dentro das caixas retrô do jogo (sem raio, borda dura). */
    :host(.pixel) .lista { max-height: 38cqh; }
    :host(.pixel) .msg { font-size: calc(var(--u) * 1.45); color: var(--px-txt); }
    :host(.pixel) .msg__autor { color: var(--px-txt-dim); }
    :host(.pixel) .msg--eu .msg__autor { color: var(--px-amber-lt); }
    :host(.pixel) .vazio, :host(.pixel) .motivo { color: var(--px-txt-dim); font-size: calc(var(--u) * 1.35); }
    :host(.pixel) .erro { border-radius: 0; background: none; color: var(--px-amber-lt); padding: 0; }
    :host(.pixel) .entrada { font: inherit; background: #0a1122; color: var(--px-txt); border: var(--b) solid var(--px-line-dim); padding: calc(var(--u) * 0.6); }
    :host(.pixel) .envio__btn { font-size: calc(var(--u) * 1.4); }
    :host(.pixel) .contador { color: var(--px-txt-dim); }

    /* Telão: só leitura, coluna alta. */
    :host(.telao) .lista { max-height: none; min-height: 0; }
  `,
})
export class IsolateusChat {
  readonly mensagens = input.required<MensagemVila[]>();
  /** O meu codinome (destaca as minhas falas). */
  readonly meuNome = input<string | null>(null);
  /** Por que não posso escrever (fora da vila, pausa); `null` = posso. */
  readonly motivo = input<string | null>(null);
  readonly enviando = input(false);
  readonly erro = input<string | null>(null);
  /** Muda a cada envio bem-sucedido: é o sinal para limpar o campo. */
  readonly enviadas = input(0);
  readonly pixel = input(false);
  /** O telão do professor: só leitura. */
  readonly telao = input(false);

  readonly enviar = output<string>();

  protected readonly max = CHAT_VILA_MAX_CARACTERES;
  protected readonly texto = signal('');
  private readonly lista = viewChild<ElementRef<HTMLElement>>('lista');

  constructor() {
    // Mensagem nova: rola para o fim, como qualquer chat.
    effect(() => {
      this.mensagens();
      const el = this.lista()?.nativeElement;
      if (el) queueMicrotask(() => (el.scrollTop = el.scrollHeight));
    });
    effect(() => {
      if (this.enviadas() > 0) this.texto.set('');
    });
  }

  protected restante(): number {
    return this.max - this.texto().trim().length;
  }
  protected podeEnviar(): boolean {
    const t = this.texto().trim();
    return t.length > 0 && t.length <= this.max;
  }
  protected mandar(): void {
    if (this.enviando() || !this.podeEnviar()) return;
    this.enviar.emit(this.texto().trim());
  }
}
