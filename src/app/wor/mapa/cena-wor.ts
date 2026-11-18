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
  desenharCriatura,
  desenharSoldado,
  desenharContorno,
  desenharFundo,
  desenharMira,
  textoCentrado,
} from './desenho-mapa';
import { MAPA, MapaWor, Ponto, gerarMapa } from './gerar-mapa';
import { EventoWor, NUMEROS_WOR } from './fila-eventos';

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
  /**
   * Fim da janela da animação (ms, relógio local): a rodada seguinte começa.
   * Passou dele sem a animação terminar (aba escondida, aparelho lento), a
   * tela pula para o estado final.
   */
  fimDaJanela?: number | null;
}

export interface SaidasDoMapa {
  tocarCastelo(equipeId: string): void;
  /** Cada evento animado, no instante do impacto (a legenda e o card do telão). */
  evento?(e: EventoWor): void;
  /**
   * O placar como a animação está mostrando (HP e Horda depois de cada evento);
   * `null` quando acaba. O HUD não adianta o resultado.
   */
  placar?(estado: Record<string, { hp: number; horda: boolean }> | null): void;
}

/** Como tocar a fila do fechamento (035 #27–#34). */
export interface OpcoesAnimacao {
  /** Tempo de cada evento (`tempoPorEvento`). */
  porEvento: number;
  /** Antes da fila: as letras aparecendo na máscara. */
  abertura: number;
  /** prefers-reduced-motion: sem marcha nem tremida, resultado em degraus. */
  reduzido: boolean;
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
  private esperas: Array<{ ate: number; fim: () => void }> = [];
  /** HP/Horda de cada equipe ao fim do evento em curso (o placar do HUD). */
  private alvos = new Map<string, { hp: number; horda: boolean }>();
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

  /**
   * Segura o estado novo: a partir daqui `atualizar` só guarda a entrada, e a
   * tela segue mostrando o antes até a fila terminar. Chamar ANTES do
   * `atualizar` que traz o fechamento.
   */
  prepararAnimacao(): void {
    this.animando = true;
  }

  /** Quem é Horda na tela agora (antes do fechamento). */
  hordasNaTela(): Set<string> {
    return new Set([...this.vistas.values()].filter((v) => v.horda).map((v) => v.id));
  }

  /** Toca a fila do fechamento; ao fim, a tela encaixa no estado final. */
  async animar(fila: EventoWor[], op: OpcoesAnimacao): Promise<void> {
    this.animando = true;
    this.alvos = new Map([...this.vistas.values()].map((v) => [v.id, { hp: v.hp, horda: v.horda }]));
    this.emitirPlacar();
    try {
      await this.esperar(op.abertura);
      for (const e of fila) {
        if (!this.animando || this.atrasada()) return;
        await this.tocar(e, op);
      }
    } finally {
      this.animando = false;
      this.encaixarEstado();
      this.saidas.placar?.(null);
    }
  }

  private emitirPlacar(): void {
    this.saidas.placar?.(Object.fromEntries(this.alvos));
  }

  /** Pula a animação (quem abre a tela no meio da janela vê o estado final). */
  pularAnimacao(): void {
    this.animando = false;
    this.efeitos = [];
    for (const w of this.esperas) w.fim();
    this.esperas = [];
    this.encaixarEstado();
  }

  /** Espera em tempo de JOGO: a pausa congela a animação junto (035 #33). */
  private esperar(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((fim) => this.esperas.push({ ate: this.relogio + ms, fim }));
  }

  /** A janela já acabou (fora da pausa): não adianta mais animar. */
  private atrasada(): boolean {
    const fim = this.entrada.fimDaJanela;
    return !this.entrada.pausada && !!fim && Date.now() > fim + 1500;
  }

  private vista(id: string): EquipeNoMapa | undefined {
    return this.vistas.get(id);
  }

  private async tocar(e: EventoWor, op: OpcoesAnimacao): Promise<void> {
    const slot = op.porEvento;
    switch (e.tipo) {
      case 'ATAQUE': {
        const a = this.centroDe(e.de);
        const b = this.centroDe(e.alvo);
        const cor = this.vista(e.de)?.cor ?? P.s2;
        const marcha = op.reduzido || !a || !b ? 0 : slot * 0.6;
        if (marcha && a && b) {
          const ang = Math.atan2(b.y - a.y, b.x - a.x);
          const fim = { x: b.x - Math.cos(ang) * 11, y: b.y - Math.sin(ang) * 5 + 2 };
          this.efeito(marcha, (c, p, t) => {
            const st = Math.floor(p * 10) / 10;
            for (const [ox, oy] of [[0, 0], [-3, 2], [3, 2]]) {
              desenharSoldado(c, a.x + (fim.x - a.x) * st + ox, a.y + 3 + (fim.y - a.y - 3) * st + oy, cor, t);
            }
          });
          await this.esperar(marcha);
        }
        if (b) {
          this.faiscas(b.x, b.y - 6, e.critico ? P.amber3 : P.red3);
          this.flutuar(b.x, b.y - 18, '-' + e.dano, P.red5);
          if (e.critico) {
            this.flutuar(b.x, b.y - 26, 'CRIT!', P.amber3);
            if (!op.reduzido) this.tremer(350, 2);
          }
        }
        this.mudarHp(e.alvo, -e.dano, op.reduzido);
        this.saidas.evento?.(e);
        this.emitirPlacar();
        await this.esperar(slot - marcha);
        return;
      }
      case 'CATAPULTA': {
        const a = this.centroDe(e.de);
        const b = this.centroDe(e.alvo);
        const voo = op.reduzido || !a || !b ? 0 : slot * 0.6;
        if (voo && a && b) {
          this.efeito(voo, (c, p) => {
            const st = Math.floor(p * 14) / 14;
            const x = Math.round(a.x + (b.x - a.x) * st);
            const yb = a.y - 8 + (b.y + 2 - a.y) * st;
            const h = Math.sin(st * Math.PI) * 42;
            c.fillStyle = 'rgba(5,7,15,.5)';
            c.fillRect(x, Math.round(a.y + 1 + (b.y - a.y) * st), 2, 1);
            c.fillStyle = P.s6;
            c.fillRect(x, Math.round(yb - h), 3, 3);
            c.fillStyle = P.s4;
            c.fillRect(x, Math.round(yb - h), 2, 2);
          });
          await this.esperar(voo);
        }
        if (b) {
          this.poeira(b.x, b.y - 4);
          this.faiscas(b.x, b.y - 6, P.amber5);
          this.flutuar(b.x, b.y - 18, '-' + e.dano, P.red5);
          if (!op.reduzido) this.tremer(250, 1);
        }
        this.mudarHp(e.alvo, -e.dano, op.reduzido);
        this.saidas.evento?.(e);
        this.emitirPlacar();
        await this.esperar(slot - voo);
        return;
      }
      case 'CURA': {
        const c0 = this.centroDe(e.equipe);
        if (c0 && !op.reduzido) {
          this.efeito(slot * 0.7, (c, p) => {
            const st = Math.floor(p * 8) / 8;
            for (let k = 0; k < 8; k++) {
              const x = c0.x - 9 + ((k * 5) % 19);
              const y = Math.round(c0.y - 4 - st * 18 - (k % 3) * 3);
              c.fillStyle = k % 2 ? P.alien : P.blue3;
              c.fillRect(x, y, 1, 3);
              c.fillRect(x - 1, y + 1, 3, 1);
            }
          });
        }
        if (c0) this.flutuar(c0.x, c0.y - 18, '+' + NUMEROS_WOR.CURA_MASSIVA, P.alien);
        this.mudarHp(e.equipe, NUMEROS_WOR.CURA_MASSIVA, op.reduzido);
        this.saidas.evento?.(e);
        this.emitirPlacar();
        await this.esperar(slot);
        return;
      }
      case 'ERRO': {
        const c0 = this.centroDe(e.equipe);
        const v = this.vista(e.equipe);
        if (v && !op.reduzido) v.tremer = true;
        if (c0 && !op.reduzido) {
          this.efeito(slot * 0.5, (c, p) => {
            if (Math.floor(p * 6) % 2 === 0) {
              c.fillStyle = 'rgba(239,68,68,.45)';
              c.fillRect(c0.x - 11, c0.y - 22, 23, 23);
            }
          });
        }
        if (c0) this.flutuar(c0.x, c0.y - 18, '-' + e.dano, P.red5);
        this.mudarHp(e.equipe, -e.dano, op.reduzido);
        this.saidas.evento?.(e);
        this.emitirPlacar();
        await this.esperar(slot * 0.5);
        if (v) v.tremer = false;
        await this.esperar(slot * 0.5);
        return;
      }
      case 'QUEDA': {
        const c0 = this.centroDe(e.equipe);
        const v = this.vista(e.equipe);
        if (c0) this.poeira(c0.x, c0.y - 2);
        if (!op.reduzido) {
          this.tremer(500, 2);
          for (let k = 1; k <= 4; k++) {
            await this.esperar(slot * 0.1);
            if (v) v.afundar = k;
            if (c0) this.poeira(c0.x + (k % 2 ? -6 : 6), c0.y - 3);
          }
        }
        if (v) Object.assign(v, { horda: true, hp: 0, afundar: 0 });
        this.alvos.set(e.equipe, { hp: 0, horda: true });
        this.saidas.evento?.(e);
        this.emitirPlacar();
        await this.esperar(slot * (op.reduzido ? 1 : 0.6));
        return;
      }
      case 'USURPACAO': {
        const a = this.centroDe(e.horda);
        const b = this.centroDe(e.lider);
        const marcha = op.reduzido || !a || !b ? 0 : slot * 0.55;
        if (marcha && a && b) {
          this.efeito(marcha, (c, p, t) => {
            const st = Math.floor(p * 12) / 12;
            for (let k = 0; k < 6; k++) {
              desenharCriatura(
                c,
                a.x + (b.x - 6 - a.x) * st + (k % 3) * 5 - 5,
                a.y + 2 + (b.y + 1 - a.y) * st + Math.floor(k / 3) * 3,
                t + k * 80,
              );
            }
          });
          await this.esperar(marcha);
        }
        if (b) {
          this.poeira(b.x, b.y - 4);
          this.faiscas(b.x, b.y - 8, P.alien);
          if (!op.reduzido) this.tremer(400, 2);
        }
        await this.esperar(op.reduzido ? 0 : slot * 0.15);
        // A Horda toma o reino do líder; o líder fica com o reino em ruínas.
        const h = this.vista(e.horda);
        const l = this.vista(e.lider);
        const kh = this.reinosVistos[e.horda];
        const kl = this.reinosVistos[e.lider];
        if (kh !== undefined && kl !== undefined) {
          this.reinosVistos = { ...this.reinosVistos, [e.horda]: kl, [e.lider]: kh };
        }
        if (h && l) {
          Object.assign(h, { horda: false, hp: l.hp });
          Object.assign(l, { horda: true, hp: 0 });
          this.alvos.set(h.id, { hp: h.hp, horda: false });
          this.alvos.set(l.id, { hp: 0, horda: true });
        }
        this.saidas.evento?.(e);
        this.emitirPlacar();
        await this.esperar(slot * (op.reduzido ? 1 : 0.3));
        return;
      }
    }
  }

  /** HP na tela: desce/sobe em degraus até o valor novo (teto 1000, piso 0). */
  private mudarHp(id: string, delta: number, reduzido: boolean): void {
    const v = this.vista(id);
    if (!v) return;
    const de = v.hp;
    const para = Math.max(0, Math.min(NUMEROS_WOR.HP_MAX, de + delta));
    this.alvos.set(id, { hp: para, horda: v.horda });
    if (reduzido) {
      v.hp = para;
      return;
    }
    this.efeito(450, (_c, p) => {
      v.hp = Math.round(de + (para - de) * (Math.floor(p * 6) / 6));
    });
  }

  private flutuar(x: number, y: number, texto: string, cor: string): void {
    this.efeito(1100, (c, p) => textoCentrado(c, texto, x, Math.round(y - 14 * p), cor));
  }

  private faiscas(x: number, y: number, cor: string): void {
    this.efeito(450, (c, p) => {
      const st = Math.floor(p * 4) / 4;
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        const v = 6 + (i % 3) * 3;
        c.fillStyle = i % 2 ? cor : P.white;
        c.fillRect(Math.round(x + Math.cos(ang) * v * st), Math.round(y + Math.sin(ang) * v * st * 0.6), 1, 1);
      }
    });
  }

  private poeira(x: number, y: number): void {
    this.efeito(700, (c, p) => {
      const raio = Math.round(4 + 10 * p);
      c.fillStyle = p < 0.5 ? P.s4 : P.s6;
      for (let k = 0; k < 12; k++) {
        const ang = (k / 12) * Math.PI * 2;
        c.fillRect(Math.round(x + Math.cos(ang) * raio), Math.round(y + Math.sin(ang) * raio * 0.4), 2, 1);
      }
    });
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
    if (this.esperas.length) {
      // Aba que volta depois da janela: solta tudo (a fila vê `atrasada` e encerra).
      if (this.atrasada()) for (const w of this.esperas) w.ate = 0;
      const prontas = this.esperas.filter((w) => w.ate <= t);
      this.esperas = this.esperas.filter((w) => w.ate > t);
      for (const w of prontas) w.fim();
    }
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
