import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * O popup do próprio personagem (025 §4): o papel e as ações do jogador, que
 * saíram da tela principal para o colega ao lado não ler por cima do ombro.
 *
 * Burro e **idêntico para os dois papéis** — mesmo tamanho, mesmo fundo, mesmos
 * botões —, só o texto do papel muda de cor: azul para o aldeão, gradiente de
 * azul a verde tóxico para a Ameaça. As ações chegam por projeção de conteúdo:
 * quem decide o que mostrar é a página.
 *
 * O backdrop com blur é uma exceção pontual ao design system flat, pedida
 * para este popup (Decisões de escopo #9 da spec 025).
 */
@Component({
  selector: 'app-isolateus-personagem',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { '(document:keydown.escape)': 'fechar.emit()' },
  template: `
    <div class="fundo" (click)="fechar.emit()"></div>
    <section class="card" role="dialog" aria-modal="true" aria-labelledby="personagem-papel">
      <button class="card__x" type="button" aria-label="Fechar" (click)="fechar.emit()">
        <app-icon name="close" [size]="18" />
      </button>
      <strong
        id="personagem-papel"
        class="papel"
        [class.papel--ameaca]="papel() === 'AMEACA'"
      >
        {{ papel() === 'AMEACA' ? 'Você é a Ameaça' : 'Você é um Aldeão' }}
      </strong>
      <p class="codinome">Nesta vila, você é <b>{{ codinome() }}</b></p>
      <div class="acoes">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .fundo { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
    .card { position: relative; display: flex; flex-direction: column; gap: 0.6rem; width: 100%; max-width: 26rem; min-height: 16rem; max-height: 85vh; overflow-y: auto; padding: 1.25rem 1rem 1rem; border: 2px solid var(--border); background: var(--surface); box-shadow: 4px 4px 0 var(--border); color: var(--text); }
    .card__x { position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem; border: none; background: none; color: var(--text-muted); cursor: pointer; }
    .papel { align-self: center; font-size: 1.45rem; font-weight: 900; color: #2563eb; }
    /* A única cor que muda entre os papéis — e só neste texto. */
    .papel--ameaca {
      color: transparent;
      /* Quase todo azul: o verde só aparece no fim, como uma mancha que não se mostra inteira. */
      background: linear-gradient(90deg, #2563eb, #2563eb, #2563eb, #84cc16);
      -webkit-background-clip: text;
      background-clip: text;
    }
    .codinome { margin: 0; text-align: center; color: var(--text-muted); font-size: 0.92rem; }
    .codinome b { color: var(--text); }
    .acoes { display: flex; flex-direction: column; gap: 0.6rem; }
  `,
})
export class IsolateusPersonagem {
  readonly papel = input.required<'ALDEAO' | 'AMEACA'>();
  /** O codinome já mascarado, se o jogador escondeu o nome (o olho). */
  readonly codinome = input.required<string>();
  readonly fechar = output<void>();
}
