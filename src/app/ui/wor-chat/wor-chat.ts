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
import { MensagemChatWor } from '../../core/models';
import { Icon } from '../icon/icon';

/** Espelha `WOR.CHAT_MAX_CARACTERES` do backend (só para o contador). */
export const CHAT_MAX_CARACTERES = 200;

/**
 * O chat privado da equipe no Wor, em bottom sheet. Burro: recebe as mensagens
 * e devolve o texto a enviar — quem fala com a API e decide o que é palavrão é
 * a página (e, no fim, o servidor).
 */
@Component({
  selector: 'app-wor-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="fundo" (click)="fechar.emit()"></div>
    <section class="sheet" role="dialog" aria-label="Chat da equipe" (keydown.escape)="fechar.emit()">
      <header class="topo">
        <span class="topo__tit"><app-icon name="chat" [size]="18" /> Chat da {{ equipe() }}</span>
        <button class="topo__x" type="button" aria-label="Fechar chat" (click)="fechar.emit()">
          <app-icon name="close" [size]="18" />
        </button>
      </header>

      <div class="lista" #lista>
        @for (m of mensagens(); track m.id) {
          <div class="msg" [class.msg--eu]="m.alunoId === alunoId()">
            @if (m.alunoId !== alunoId()) { <span class="msg__autor">{{ m.nome }}</span> }
            <span class="msg__txt">{{ m.texto }}</span>
          </div>
        } @empty {
          <p class="vazio">Só a sua equipe lê este chat. Combinem a estratégia!</p>
        }
      </div>

      @if (erro()) { <p class="erro" role="alert">{{ erro() }}</p> }

      @if (somenteLeitura()) {
        <p class="fim">A batalha acabou: o chat ficou só para leitura.</p>
      } @else {
        <form class="envio" (submit)="$event.preventDefault(); mandar()">
          <input
            class="tichr-input"
            [value]="texto()"
            (input)="texto.set($any($event.target).value)"
            [attr.maxlength]="max"
            placeholder="Mensagem para a equipe"
            aria-label="Mensagem para a equipe"
          />
          <button class="btn-primary envio__btn" type="submit" [disabled]="enviando() || !podeEnviar()" aria-label="Enviar">
            <app-icon name="send" [size]="16" />
          </button>
        </form>
        <small class="contador" [class.contador--fim]="restante() < 20">{{ restante() }}</small>
      }
    </section>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; justify-content: flex-end; }
    .fundo { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.35); }
    .sheet { position: relative; display: flex; flex-direction: column; gap: 0.6rem; max-height: 75vh; padding: 1rem 16px calc(1rem + env(safe-area-inset-bottom)); border-radius: 16px 16px 0 0; border-top: 2px solid var(--border); background: var(--surface); }
    .topo { display: flex; align-items: center; justify-content: space-between; }
    .topo__tit { display: flex; align-items: center; gap: 0.4rem; font-weight: 800; color: var(--text); }
    .topo__x { border: none; background: none; color: var(--text-muted); cursor: pointer; padding: 0.25rem; }
    .lista { display: flex; flex-direction: column; gap: 0.4rem; overflow-y: auto; min-height: 8rem; }
    .msg { align-self: flex-start; max-width: 85%; display: flex; flex-direction: column; gap: 0.1rem; padding: 0.45rem 0.7rem; border-radius: 12px; border: 1px solid var(--border); background: var(--surface-alt); color: var(--text); overflow-wrap: anywhere; }
    .msg--eu { align-self: flex-end; border-color: var(--primary); background: color-mix(in srgb, var(--primary) 14%, var(--surface)); }
    .msg__autor { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); }
    .msg__txt { font-size: 0.92rem; }
    .vazio, .fim { margin: 0; text-align: center; color: var(--text-muted); font-size: 0.85rem; }
    .erro { margin: 0; padding: 0.5rem 0.7rem; border-radius: 10px; background: color-mix(in srgb, var(--danger) 16%, transparent); color: var(--danger); font-size: 0.85rem; font-weight: 700; }
    .envio { display: flex; gap: 0.5rem; }
    .envio .tichr-input { flex: 1; min-width: 0; }
    .envio__btn { display: inline-flex; align-items: center; justify-content: center; padding: 0 0.9rem; }
    .contador { align-self: flex-end; font-size: 0.72rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .contador--fim { color: var(--danger); font-weight: 800; }
  `,
})
export class WorChat {
  readonly mensagens = input.required<MensagemChatWor[]>();
  readonly alunoId = input.required<string>();
  readonly equipe = input('equipe');
  readonly enviando = input(false);
  readonly erro = input<string | null>(null);
  readonly somenteLeitura = input(false);
  /** Muda a cada envio bem-sucedido: é o sinal para limpar o campo. */
  readonly enviadas = input(0);

  readonly enviar = output<string>();
  readonly fechar = output<void>();

  protected readonly max = CHAT_MAX_CARACTERES;
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
