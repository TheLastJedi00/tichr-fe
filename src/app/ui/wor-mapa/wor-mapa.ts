import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { PlacarEquipe, ResumoRodada } from '../../core/models';
import { CenaWor, EntradaDoMapa } from '../../wor/mapa/cena-wor';
import {
  EventoWor,
  montarFila,
  tempoPorEvento,
  textoDoEvento,
} from '../../wor/mapa/fila-eventos';
import { reinosDaPartida } from '../../wor/mapa/gerar-mapa';

/** Eventos grandes ganham o card (os Action Cards antigos, depois do evento). */
const CARDS: Partial<Record<EventoWor['tipo'], string>> = {
  CATAPULTA: 'CATAPULTA',
  CURA: 'CURA MASSIVA',
  QUEDA: 'QUEDA',
  USURPACAO: 'USURPAÇÃO',
};

/** Antes da fila: as letras aparecendo na máscara (035 #27.1). */
const ABERTURA_MS = 1200;

/**
 * O mapa de reinos do Wor pixel art (035, dumb): canvas Phaser 320×180 com os
 * reinos e os castelos. Quando chega um fechamento novo (`resumo.seq`) dentro
 * da janela, toca a animação; quem chega no meio vê o estado final. Emite o
 * castelo tocado e se está animando (a página esconde o Action Card antigo).
 */
@Component({
  selector: 'app-wor-mapa',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #palco class="palco" role="img" [attr.aria-label]="rotulo()"></div>
    @if (legenda(); as l) {
      <div class="legenda" [class.legenda--card]="!!l.titulo" aria-live="polite">
        @if (l.titulo) { <span class="legenda__tit">{{ l.titulo }}</span> }
        <span>{{ l.texto }}</span>
      </div>
    }
  `,
  styles: `
    :host { display: block; position: relative; aspect-ratio: 16 / 9; background: #000; container-type: inline-size; }
    .palco { position: absolute; inset: 0; }
    .palco :is(canvas) {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      touch-action: manipulation;
    }
    .legenda {
      position: absolute;
      left: 50%;
      bottom: 3cqw;
      transform: translateX(-50%);
      max-width: 70%;
      display: grid;
      gap: 0.4cqw;
      padding: 1cqw 1.6cqw;
      background: #111a2e;
      color: #e2e8f0;
      border: max(2px, 0.4cqw) solid #cbd5e1;
      box-shadow: 0.5cqw 0.5cqw 0 #05070f;
      font-family: 'Pixelify Sans', system-ui, sans-serif;
      font-size: max(12px, 1.7cqw);
      text-align: center;
      pointer-events: none;
    }
    .legenda--card { border-color: #fcd34d; }
    .legenda__tit { font-family: 'Press Start 2P', monospace; font-size: max(9px, 1.2cqw); color: #fcd34d; }
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
  /** O último fechamento e o início da rodada seguinte (fim da janela). */
  readonly resumo = input<ResumoRodada | null | undefined>(null);
  readonly rodadaIniciadaEm = input<string | null | undefined>(null);

  readonly tocarCastelo = output<string>();
  readonly animando = output<boolean>();
  /** O placar como a animação está mostrando; null fora dela (035). */
  readonly placarAnimado = output<Record<string, { hp: number; horda: boolean }> | null>();

  private readonly palco = viewChild.required<ElementRef<HTMLElement>>('palco');
  protected cena?: CenaWor;
  private destruido = false;
  /** O `seq` já visto: o primeiro é a base (abrir a tela não repete a animação). */
  private seqVisto: number | null = null;
  protected readonly legenda = signal<{ titulo?: string; texto: string } | null>(null);
  private legendaTimer?: ReturnType<typeof setTimeout>;
  private readonly reduzido =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      const resumo = this.resumo();
      const inicio = this.rodadaIniciadaEm();
      untracked(() => this.aplicar(entrada, resumo, inicio));
    });
  }

  /** Fechamento novo dentro da janela → anima; senão o mapa só encaixa. */
  private aplicar(
    entrada: EntradaDoMapa,
    resumo: ResumoRodada | null | undefined,
    inicio: string | null | undefined,
  ): void {
    const cena = this.cena;
    if (!cena) return;
    const seq = resumo?.seq ?? 0;
    const novo = this.seqVisto !== null && seq > this.seqVisto;
    this.seqVisto = seq;
    const naJanela = !!inicio && Date.parse(inicio) > Date.now();
    if (novo && resumo && naJanela) {
      const hordaAntes = cena.hordasNaTela();
      cena.prepararAnimacao();
      cena.atualizar(entrada);
      const fila = montarFila(resumo, hordaAntes);
      this.animando.emit(true);
      void cena
        .animar(fila, {
          porEvento: tempoPorEvento(resumo),
          abertura: ABERTURA_MS,
          reduzido: this.reduzido,
        })
        .then(() => this.animando.emit(false));
      return;
    }
    cena.atualizar(entrada);
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
      fimDaJanela: this.rodadaIniciadaEm() ? Date.parse(this.rodadaIniciadaEm()!) : null,
    };
  }

  private mostrar(e: EventoWor): void {
    const nomes = new Map(this.placar().map((t) => [t.id, t.nome]));
    this.legenda.set({
      titulo: CARDS[e.tipo],
      texto: textoDoEvento(e, (id) => nomes.get(id) ?? id),
    });
    clearTimeout(this.legendaTimer);
    this.legendaTimer = setTimeout(() => this.legenda.set(null), 2400);
  }

  private async carregar(el: HTMLElement): Promise<void> {
    const Fase = (await import('phaser')).default;
    if (this.destruido) return;
    const cena = new CenaWor(Fase, {
      tocarCastelo: (id) => this.tocarCastelo.emit(id),
      evento: (e) => this.mostrar(e),
      placar: (p) => this.placarAnimado.emit(p),
    });
    this.cena = cena;
    // A primeira leitura é a base: abrir a tela no meio da janela não anima (#32).
    this.seqVisto = this.resumo()?.seq ?? 0;
    cena.iniciar(el, this.entrada());
    await cena.aguardar();
    cena.atualizar(this.entrada());
  }

  ngOnDestroy(): void {
    this.destruido = true;
    clearTimeout(this.legendaTimer);
    this.cena?.destruir();
    this.cena = undefined;
  }
}
