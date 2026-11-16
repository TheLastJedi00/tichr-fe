import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  CenaPhaser,
  EntradaDaCena,
  HabitanteDaCena,
} from '../../isolateus/cenas/cena-phaser';
import {
  ObjetoCentral,
  Passo,
  PortaCena,
} from '../../isolateus/cenas/cenas.data';

/**
 * O palco do Isolateus pixel art: um canvas Phaser 320×180 com a cena do setor.
 * Dumb (spec 034 §3): só recebe o que desenhar e emite o que o jogador tocou;
 * quem faz requisição é a página. O Phaser é carregado aqui, sob demanda — fora
 * da rota do jogo ele nunca é baixado.
 */
@Component({
  selector: 'app-isolateus-cena',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #palco class="palco" aria-label="Cena do setor"></div>`,
  styles: `
    :host { display: block; position: absolute; inset: 0; }
    .palco { position: absolute; inset: 0; }
    .palco :is(canvas) {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      touch-action: manipulation;
      cursor: pointer;
    }
  `,
})
export class IsolateusCena implements OnDestroy {
  readonly setorId = input.required<string>();
  readonly intacto = input.required<boolean>();
  readonly habitantes = input.required<HabitanteDaCena[]>();
  readonly posicoes = input<Record<string, Passo>>({});
  readonly portas = input.required<PortaCena[]>();
  readonly portasAbertas = input(false);
  readonly objeto = input<ObjetoCentral | null>(null);
  readonly objetoBloqueado = input(false);
  readonly ocultarMeuNome = input(false);
  readonly pausada = input(false);
  readonly cortina = input(0);
  readonly rotuloDaPorta = input<(para: string) => string>((p) => p.toUpperCase());

  readonly tocarChao = output<number>();
  readonly tocarMeuBoneco = output<void>();
  readonly tocarObjeto = output<void>();
  readonly tocarPorta = output<{ para: string; aberta: boolean }>();
  readonly luzDaPorta = output<string | null>();

  private readonly palco = viewChild.required<ElementRef<HTMLElement>>('palco');
  private cena?: CenaPhaser;
  private destruido = false;

  constructor() {
    // O Phaser só entra na página quando este componente nasce (rota do jogo).
    effect(() => {
      const el = this.palco().nativeElement;
      if (this.cena || this.destruido) return;
      void this.carregar(el);
    });
    effect(() => {
      const entrada = this.entrada(); // lê antes: é isto que registra as dependências
      this.cena?.atualizar(entrada);
    });
  }

  private entrada(): EntradaDaCena {
    return {
      setorId: this.setorId(),
      intacto: this.intacto(),
      habitantes: this.habitantes(),
      posicoes: this.posicoes(),
      portas: this.portas(),
      portasAbertas: this.portasAbertas(),
      objeto: this.objeto(),
      objetoBloqueado: this.objetoBloqueado(),
      ocultarMeuNome: this.ocultarMeuNome(),
      pausada: this.pausada(),
      cortina: this.cortina(),
      rotuloDaPorta: this.rotuloDaPorta(),
    };
  }

  private async carregar(el: HTMLElement): Promise<void> {
    const Fase = (await import('phaser')).default;
    if (this.destruido) return;
    const cena = new CenaPhaser(Fase, {
      tocarChao: (x) => this.tocarChao.emit(x),
      tocarMeuBoneco: () => this.tocarMeuBoneco.emit(),
      tocarObjeto: () => this.tocarObjeto.emit(),
      tocarPorta: (para, aberta) => this.tocarPorta.emit({ para, aberta }),
      luzDaPorta: (para) => this.luzDaPorta.emit(para),
    });
    this.cena = cena;
    cena.iniciar(el, this.entrada());
    await cena.aguardar();
    cena.atualizar(this.entrada());
  }

  // --- A página comanda os efeitos (amanhecer, abdução, sabotagem) ---

  piscar(x: number): void {
    this.cena?.piscar(x);
  }
  chegada(id: string, xPorta: number): void {
    this.cena?.chegada(id, xPorta);
  }
  posicionarMeuBoneco(x: number, alvo: number): void {
    this.cena?.posicionarMeuBoneco(x, alvo);
  }
  afastarMeuBoneco(): void {
    this.cena?.afastarMeuBoneco();
  }
  luzVerde(tipo: 'ABDUCAO' | 'SABOTAGEM', aoPico?: () => void): Promise<void> {
    return this.cena ? this.cena.luzVerde(tipo, aoPico) : Promise.resolve();
  }
  meuX(): number | null {
    return this.cena?.meuX() ?? null;
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.cena?.destruir();
    this.cena = undefined;
  }
}
