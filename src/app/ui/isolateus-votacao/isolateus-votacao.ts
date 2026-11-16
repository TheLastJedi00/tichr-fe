import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconePixel } from '../icone-pixel/icone-pixel';

export interface OpcaoDeVoto {
  id: string;
  nome: string;
  /** Marca o próprio jogador ("você"). */
  eu?: boolean;
}

/**
 * A votação única do Isolateus (spec 034 #46): Quarentena e resgate usam o mesmo
 * componente retrô, com título, cor e lista diferentes. Dumb: emite o voto; as
 * rotas e as regras continuam separadas no backend.
 */
@Component({
  selector: 'app-isolateus-votacao',
  imports: [IconePixel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="px-titulo titulo" [class.titulo--vermelho]="tipo() === 'QUARENTENA'">
      {{ tipo() === 'RESGATE' ? 'RESGATE: QUEM TRAZER DE VOLTA?' : 'QUARENTENA: QUEM ISOLAR?' }}
    </h2>
    <p>{{ instrucao() }}</p>
    @if (motivo(); as m) {
      <p class="motivo"><app-icone-pixel nome="CADEADO" class="cad" /> {{ m }}</p>
    } @else {
      <div class="grade">
        @for (o of opcoes(); track o.id) {
          <button
            class="px-btn"
            [class.px-btn--blue]="tipo() === 'RESGATE'"
            [class.px-btn--red]="tipo() === 'QUARENTENA'"
            type="button"
            [disabled]="desabilitado()"
            (click)="votar.emit(o.id)"
          >
            {{ o.nome }}@if (o.eu) { <small> (você)</small> }
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .titulo { font-size: calc(var(--u) * 1.5); color: var(--px-amber-lt); margin: 0 0 calc(var(--u) * 1.4); }
    .titulo--vermelho { color: var(--px-red); }
    p { margin: 0 0 calc(var(--u) * 1.2); }
    .grade { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(var(--u) * 1.2); }
    .grade .px-btn { font-size: calc(var(--u) * 1.6); text-align: left; }
    .motivo { display: flex; align-items: center; gap: calc(var(--u) * 0.8); color: var(--px-txt-dim); }
    .cad { width: calc(var(--u) * 2); }
    @media (max-width: 480px) { .grade { grid-template-columns: repeat(2, 1fr); } }
  `,
})
export class IsolateusVotacao {
  readonly tipo = input.required<'QUARENTENA' | 'RESGATE'>();
  readonly opcoes = input.required<OpcaoDeVoto[]>();
  /** O motivo de não poder votar (fora da vila, já votei): tira a lista. */
  readonly motivo = input<string | null>(null);
  readonly desabilitado = input(false);
  readonly votar = output<string>();

  protected instrucao(): string {
    return this.tipo() === 'RESGATE'
      ? 'Vote em quem está fora da vila.'
      : 'Vote em quem você suspeita ser a Ameaça.';
  }
}
