/**
 * O mapa de reinos do Wor no Phaser 3 (spec 035 #35): resolução lógica 320×180,
 * modo pixel art, escala FIT, câmera para a tremida e input unificado. Como a
 * cena do Isolateus, o Phaser hospeda loop, escala, input e textura; o desenho
 * de cada quadro vem de `desenho-mapa.ts`. HUD e controles são Angular por cima.
 *
 * Carregada só nas telas do Wor (`import('phaser')` dinâmico).
 */
import type Phaser from 'phaser';
import { P } from '../../pixel/paleta';
import {
  EquipeNoMapa,
  desenharCastelo,
  desenharContorno,
  desenharFundo,
  desenharMira,
  textoCentrado,
} from './desenho-mapa';
import { MAPA, MapaWor, Ponto, gerarMapa } from './gerar-mapa';

/** Uma equipe como a página a entrega (estado final, sem animação). */
export interface EquipeDoMapa {
  id: string;
  num: number;
  nome: string;
  cor: string;
  hp: number;
  horda: boolean;
}

export interface EntradaDoMapa {
  /** Semente do mapa (o `matchId`). */
  semente: string;
  equipes: EquipeDoMapa[];
  /** equipeId → índice do reino. */
  reinos: Record<string, number>;
  /** Celular: a minha equipe (contorno piscando + "VOCÊ"). */
  minhaEquipe?: string | null;
  /** Celular: o castelo escolhido como alvo. */
  alvo?: string | null;
  pausada: boolean;
}

export interface SaidasDoMapa {
  tocarCastelo(equipeId: string): void;
}

/** Um efeito com duração, desenhado por cima do mapa (`p` vai de 0 a 1). */
export interface Efeito {
  t0: number;
  dur: number;
  desenhar(c: CanvasRenderingContext2D, p: number, t: number): void;
}

export class CenaWor {
  private jogo?: Phaser.Game;
  private cena?: Phaser.Scene;
  private textura?: Phaser.Textures.CanvasTexture;
  private entrada!: EntradaDoMapa;
  private mapa?: MapaWor;
  private semente = '';
  private fundo?: HTMLCanvasElement;
  private chaveFundo = '';
  /** O que está na tela (pode estar no meio de uma animação). */
  protected readonly vistas = new Map<string, EquipeNoMapa>();
  protected reinosVistos: Record<string, number> = {};
  protected efeitos: Efeito[] = [];
  /** Enquanto a animação roda, o estado novo espera (não salta na tela). */
  protected animando = false;
  protected relogio = 0;
  private pronta: Promise<void>;
  private resolverPronta!: () => void;

  constructor(
    private readonly Fase: typeof Phaser,
    private readonly saidas: SaidasDoMapa,
  ) {
    this.pronta = new Promise((r) => (this.resolverPronta = r));
  }

  iniciar(pai: HTMLElement, entrada: EntradaDoMapa): void {
    this.atualizar(entrada);
    const alvo = this;
    const Fase = this.Fase;
    class CenaDoMapa extends Fase.Scene {
      constructor() {
        super('mapa-wor');
      }
      create(): void {
        alvo.aoCriar(this);
      }
      override update(_t: number, delta: number): void {
        alvo.aoAtualizar(Math.min(delta, 50));
      }
    }
    this.jogo = new Fase.Game({
      type: Fase.CANVAS,
      parent: pai,
      width: MAPA.LARGURA,
      height: MAPA.ALTURA,
      backgroundColor: '#000000',
      pixelArt: true,
      render: { pixelArt: true, antialias: false, roundPixels: true },
      scale: { mode: Fase.Scale.FIT, autoCenter: Fase.Scale.CENTER_BOTH },
      disableContextMenu: true,
      audio: { noAudio: true },
      banner: false,
      scene: [CenaDoMapa],
    });
  }

  aguardar(): Promise<void> {
    return this.pronta;
  }

  /** O estado novo. Fora de animação, a tela passa a mostrá-lo na hora. */
  atualizar(entrada: EntradaDoMapa): void {
    this.entrada = entrada;
    if (!this.mapa || entrada.semente !== this.semente || this.mapa.n !== entrada.equipes.length) {
      this.semente = entrada.semente;
      this.mapa = gerarMapa(entrada.equipes.length, entrada.semente);
      this.chaveFundo = '';
    }
    if (!this.animando) this.encaixarEstado();
  }

  /** A tela salta para o estado final (sem animação). */
  encaixarEstado(): void {
    this.vistas.clear();
    for (const e of this.entrada.equipes) this.vistas.set(e.id, { ...e });
    this.reinosVistos = { ...this.entrada.reinos };
  }

  tremer(ms: number, forca: number): void {
    this.cena?.cameras.main.shake(ms, forca / 180);
  }

  destruir(): void {
    this.jogo?.destroy(true);
    this.jogo = undefined;
    this.cena = undefined;
    this.efeitos = [];
  }

  /** O centro (castelo) do reino da equipe, como está na tela. */
  protected centroDe(id: string): Ponto | null {
    const k = this.reinosVistos[id];
    return k === undefined ? null : (this.mapa?.centros[k] ?? null);
  }

  protected efeito(dur: number, desenhar: Efeito['desenhar']): void {
    this.efeitos.push({ t0: this.relogio, dur, desenhar });
  }

  // ---------------------------------------------------------------- Phaser

  private aoCriar(cena: Phaser.Scene): void {
    this.cena = cena;
    this.textura = cena.textures.createCanvas('mapa-wor', MAPA.LARGURA, MAPA.ALTURA) ?? undefined;
    cena.add.image(0, 0, 'mapa-wor').setOrigin(0, 0);
    cena.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.aoTocar(p.worldX, p.worldY));
    this.resolverPronta();
  }

  private aoTocar(x: number, y: number): void {
    let melhor: string | null = null;
    let md = 26;
    for (const v of this.vistas.values()) {
      const c = this.centroDe(v.id);
      if (!c) continue;
      const d = Math.hypot(c.x - x, c.y - 8 - y);
      if (d < md) {
        md = d;
        melhor = v.id;
      }
    }
    if (melhor) this.saidas.tocarCastelo(melhor);
  }

  /** O fundo só é refeito quando muda o dono de um reino ou um vira Horda. */
  private fundoAtual(): HTMLCanvasElement | null {
    if (!this.mapa) return null;
    const dono: Array<{ cor: string; horda: boolean } | undefined> = [];
    for (const v of this.vistas.values()) {
      const k = this.reinosVistos[v.id];
      if (k !== undefined) dono[k] = { cor: v.cor, horda: v.horda };
    }
    const chave = dono.map((d) => (d ? `${d.cor}${d.horda ? 'H' : ''}` : '-')).join('|');
    if (chave !== this.chaveFundo || !this.fundo) {
      this.fundo = desenharFundo(this.mapa, dono);
      this.chaveFundo = chave;
    }
    return this.fundo;
  }

  protected aoAtualizar(dt: number): void {
    if (!this.textura || !this.mapa) return;
    if (!this.entrada.pausada) this.relogio += dt;
    const t = this.relogio;
    const c = this.textura.getContext();
    c.fillStyle = '#000';
    c.fillRect(0, 0, MAPA.LARGURA, MAPA.ALTURA);
    const fundo = this.fundoAtual();
    if (fundo) c.drawImage(fundo, 0, 0);

    const e = this.entrada;
    if (e.minhaEquipe && Math.floor(t / 450) % 2) {
      const k = this.reinosVistos[e.minhaEquipe];
      if (k !== undefined) desenharContorno(c, this.mapa.contorno[k] ?? [], P.white);
    }
    const ordem = [...this.vistas.values()]
      .map((v) => ({ v, c: this.centroDe(v.id) }))
      .filter((x): x is { v: EquipeNoMapa; c: Ponto } => !!x.c)
      .sort((a, b) => a.c.y - b.c.y);
    for (const { v, c: centro } of ordem) desenharCastelo(c, v, centro, t);
    if (e.minhaEquipe) {
      const m = this.centroDe(e.minhaEquipe);
      if (m) textoCentrado(c, 'VOCÊ', m.x, m.y + 8, P.amber3);
    }
    if (e.alvo && !this.vistas.get(e.alvo)?.horda && Math.floor(t / 250) % 2) {
      const a = this.centroDe(e.alvo);
      if (a) desenharMira(c, a, P.amber3);
    }

    this.efeitos = this.efeitos.filter((f) => t - f.t0 <= f.dur);
    for (const f of this.efeitos) f.desenhar(c, Math.min(1, (t - f.t0) / f.dur), t);
    this.textura.refresh();
  }
}
