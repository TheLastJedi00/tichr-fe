import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { PlacarEquipe } from '../../core/models';
import { CenaWor, EntradaDoMapa } from '../../wor/mapa/cena-wor';
import { reinosDaPartida } from '../../wor/mapa/gerar-mapa';

/**
 * O mapa de reinos do Wor pixel art (035, dumb): canvas Phaser 320×180 com os
 * reinos e os castelos. Recebe o placar e emite o castelo tocado. O Phaser é
 * carregado aqui, sob demanda: fora das telas do Wor ele nunca é baixado.
 */
@Component({
  selector: 'app-wor-mapa',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #palco class="palco" role="img" [attr.aria-label]="rotulo()"></div>`,
  styles: `
    :host { display: block; position: relative; aspect-ratio: 16 / 9; background: #000; }
    .palco { position: absolute; inset: 0; }
    .palco :is(canvas) {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      touch-action: manipulation;
    }
  `,
})
export class WorMapaComponent implements OnDestroy {
  /** Semente do mapa (o id da partida). */
  readonly semente = input.required<string>();
  readonly placar = input.required<PlacarEquipe[]>();
  readonly ordemEquipes = input.required<string[]>();
  readonly reinos = input<Record<string, number> | null | undefined>(null);
  readonly minhaEquipe = input<string | null>(null);
  readonly alvo = input<string | null>(null);
  readonly pausada = input(false);

  readonly tocarCastelo = output<string>();

  private readonly palco = viewChild.required<ElementRef<HTMLElement>>('palco');
  protected cena?: CenaWor;
  private destruido = false;

  protected readonly rotulo = computed(
    () =>
      'Mapa dos reinos: ' +
      this.placar()
        .map((t) => `${t.nome} ${t.isHorde ? 'Horda' : t.hp + ' HP'}`)
        .join(', '),
  );

  constructor() {
    effect(() => {
      const el = this.palco().nativeElement;
      if (this.cena || this.destruido) return;
      void this.carregar(el);
    });
    effect(() => {
      const entrada = this.entrada(); // lê antes: registra as dependências
      this.cena?.atualizar(entrada);
    });
  }

  protected entrada(): EntradaDoMapa {
    const ordem = this.ordemEquipes();
    const porId = new Map(this.placar().map((t) => [t.id, t]));
    return {
      semente: this.semente(),
      equipes: ordem
        .map((id, i) => {
          const t = porId.get(id);
          return t
            ? { id, num: i + 1, nome: t.nome, cor: t.cor, hp: t.hp, horda: t.isHorde }
            : null;
        })
        .filter((e): e is NonNullable<typeof e> => !!e),
      reinos: reinosDaPartida(ordem, this.reinos()),
      minhaEquipe: this.minhaEquipe(),
      alvo: this.alvo(),
      pausada: this.pausada(),
    };
  }

  private async carregar(el: HTMLElement): Promise<void> {
    const Fase = (await import('phaser')).default;
    if (this.destruido) return;
    const cena = new CenaWor(Fase, { tocarCastelo: (id) => this.tocarCastelo.emit(id) });
    this.cena = cena;
    cena.iniciar(el, this.entrada());
    await cena.aguardar();
    cena.atualizar(this.entrada());
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.cena?.destruir();
    this.cena = undefined;
  }
}
