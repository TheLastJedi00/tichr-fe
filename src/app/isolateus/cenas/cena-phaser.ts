/**
 * A cena do Isolateus no Phaser 3 (spec 034 #34): resolução lógica fixa 320×180,
 * modo pixel art, escala em múltiplos inteiros, câmera para a tremida, input
 * unificado (mouse e toque). O Phaser hospeda o loop, a escala, o input e a
 * textura; o desenho de cada quadro vem de `desenho-cena.ts`. O HUD e as
 * sobreposições são Angular por cima deste canvas.
 *
 * Esta classe é carregada **só na rota do jogo** (`import('phaser')` dinâmico).
 */
import type Phaser from 'phaser';
import { FonteFundo, FundoEmCodigo } from './fonte-fundo';
import {
  CAIXA_BONECO,
  FlashDesenho,
  FloodDesenho,
  HabitanteDesenho,
  QuadroDaCena,
  coresDoHabitante,
  desenharQuadro,
  xInicialDoHabitante,
} from './desenho-cena';
import {
  CENA,
  ObjetoCentral,
  Passo,
  PortaCena,
} from './cenas.data';

/** Um habitante do setor que a cena desenha (vem da página, sem posição). */
export interface HabitanteDaCena {
  id: string;
  nome: string;
  eu: boolean;
  /** Parado na luz de uma porta: aviso de saída. */
  saindo: boolean;
}

/** Tudo que a cena precisa saber, atualizado pelo componente. */
export interface EntradaDaCena {
  setorId: string;
  intacto: boolean;
  habitantes: HabitanteDaCena[];
  /** As posições ao vivo do canal (só dos outros; o meu boneco anda na hora). */
  posicoes: Record<string, Passo>;
  portas: PortaCena[];
  portasAbertas: boolean;
  objeto: ObjetoCentral | null;
  objetoBloqueado: boolean;
  ocultarMeuNome: boolean;
  pausada: boolean;
  /** 0..1 — a cortina preta da troca de setor. */
  cortina: number;
  rotuloDaPorta: (para: string) => string;
}

/** Os eventos que a cena devolve ao Angular. */
export interface SaidasDaCena {
  tocarChao(x: number): void;
  tocarMeuBoneco(): void;
  tocarObjeto(): void;
  tocarPorta(para: string, aberta: boolean): void;
  /** O meu boneco entrou (ou saiu) da luz de uma porta. */
  luzDaPorta(para: string | null): void;
}

interface Andarilho {
  x: number;
  alvo: number;
  quadro: 0 | 1;
  ft: number;
  /** Para detectar um passo novo no canal (o `t` do servidor). */
  visto: number;
}

const VELOCIDADE = CENA.VELOCIDADE;
const MEIA_PORTA = 6;

export class CenaPhaser {
  private jogo?: Phaser.Game;
  private cena?: Phaser.Scene;
  private textura?: Phaser.Textures.CanvasTexture;
  private tempo = 0;
  private entrada!: EntradaDaCena;
  private readonly andarilhos = new Map<string, Andarilho>();
  private meuId: string | null = null;
  private abertura = 0;
  private flashes: FlashDesenho[] = [];
  private flood: (FloodDesenho & { aoPico?: () => void; fim?: () => void; pico?: boolean }) | null = null;
  private luzAtual: string | null = null;
  private readonly fundos: FonteFundo = new FundoEmCodigo();
  private readonly chavesDeFundo = new Set<string>();
  private pronta: Promise<void>;
  private resolverPronta!: () => void;

  constructor(
    private readonly Fase: typeof Phaser,
    private readonly saidas: SaidasDaCena,
  ) {
    this.pronta = new Promise((r) => (this.resolverPronta = r));
  }

  /** Cria o jogo dentro de `pai`. */
  iniciar(pai: HTMLElement, entrada: EntradaDaCena): void {
    this.entrada = entrada;
    const alvo = this;
    const Fase = this.Fase;
    class CenaDoSetor extends Fase.Scene {
      constructor() {
        super('cena-do-setor');
      }
      create(): void {
        alvo.aoCriar(this);
      }
      override update(_t: number, delta: number): void {
        alvo.aoAtualizar(Math.min(delta / 1000, 0.05));
      }
    }
    this.jogo = new Fase.Game({
      type: Fase.CANVAS,
      parent: pai,
      width: CENA.LARGURA,
      height: CENA.ALTURA,
      backgroundColor: '#000000',
      pixelArt: true,
      render: { pixelArt: true, antialias: false, roundPixels: true },
      scale: { mode: Fase.Scale.FIT, autoCenter: Fase.Scale.CENTER_BOTH },
      disableContextMenu: true,
      audio: { noAudio: true },
      banner: false,
      scene: [CenaDoSetor],
    });
  }

  /** Resolve quando a cena já existe (antes disso, atualizações só guardam a entrada). */
  aguardar(): Promise<void> {
    return this.pronta;
  }

  atualizar(entrada: EntradaDaCena): void {
    this.entrada = entrada;
    this.meuId = entrada.habitantes.find((h) => h.eu)?.id ?? null;
  }

  /** Um clarão na porta (saída ou chegada), em `x`. */
  piscar(x: number, dur = 450): void {
    this.flashes.push({ x, t: 0, dur });
  }

  /** Põe o meu boneco em `x` (chegada pela porta de origem) e o faz andar até `alvo`. */
  posicionarMeuBoneco(x: number, alvo: number): void {
    if (!this.meuId) return;
    const a = this.andarilho(this.meuId);
    a.x = x;
    a.alvo = alvo;
  }

  /** Volta o meu boneco para o meio da cena (desistiu de sair). */
  afastarMeuBoneco(): void {
    if (!this.meuId) return;
    const a = this.andarilho(this.meuId);
    a.alvo = Math.max(30, Math.min(290, a.x < CENA.CENTRO ? a.x + 40 : a.x - 40));
  }

  /** Posiciona alguém que chegou (de outro setor) na porta, andando para dentro. */
  chegada(id: string, xPorta: number): void {
    const a = this.andarilho(id);
    a.x = xPorta;
    a.alvo = xPorta < CENA.CENTRO ? xPorta + 40 : xPorta - 40;
  }

  /**
   * A luz verde (abdução ou sabotagem). `aoPico` roda quando a tela está toda
   * coberta (é aí que a pessoa some ou o fundo troca); a promessa resolve
   * quando a luz apaga.
   */
  luzVerde(tipo: 'ABDUCAO' | 'SABOTAGEM', aoPico?: () => void): Promise<void> {
    return new Promise((resolve) => {
      this.flood = { tipo, t: 0, aoPico, fim: resolve };
      if (tipo === 'SABOTAGEM') this.cena?.cameras.main.shake(1900, 0.008);
    });
  }

  get emEfeito(): boolean {
    return !!this.flood;
  }

  /** O x atual do meu boneco (para a página decidir se está na luz de uma porta). */
  meuX(): number | null {
    return this.meuId ? (this.andarilhos.get(this.meuId)?.x ?? null) : null;
  }

  destruir(): void {
    this.jogo?.destroy(true);
    this.jogo = undefined;
    this.cena = undefined;
    this.andarilhos.clear();
  }

  // ---------------------------------------------------------------- Phaser

  private aoCriar(cena: Phaser.Scene): void {
    this.cena = cena;
    this.textura = cena.textures.createCanvas('cena', CENA.LARGURA, CENA.ALTURA) ?? undefined;
    cena.add.image(0, 0, 'cena').setOrigin(0, 0);
    cena.input.on('pointerdown', (p: Phaser.Input.Pointer) =>
      this.aoTocar(p.worldX, p.worldY),
    );
    this.resolverPronta();
  }

  /** O fundo do setor (intacto ou destruído), registrado como textura do Phaser. */
  private fundoDe(setorId: string, intacto: boolean): CanvasImageSource {
    const chave = `fundo-${setorId}-${intacto ? 'i' : 'd'}`;
    const texturas = this.cena!.textures;
    if (!this.chavesDeFundo.has(chave)) {
      texturas.addCanvas(chave, this.fundos.desenhar(setorId, !intacto));
      this.chavesDeFundo.add(chave);
    }
    return texturas.get(chave).getSourceImage() as CanvasImageSource;
  }

  private andarilho(id: string): Andarilho {
    let a = this.andarilhos.get(id);
    if (!a) {
      const x = xInicialDoHabitante(id);
      a = { x, alvo: x, quadro: 0, ft: Math.random() * 0.3, visto: 0 };
      this.andarilhos.set(id, a);
    }
    return a;
  }

  private aoTocar(x: number, y: number): void {
    if (this.entrada.pausada || this.flood) return;
    const e = this.entrada;
    const meu = this.meuX();
    if (
      meu !== null &&
      Math.abs(x - meu) <= CAIXA_BONECO.meia &&
      y >= CENA.CHAO - CAIXA_BONECO.alto &&
      y <= CENA.CHAO + CAIXA_BONECO.baixo
    ) {
      this.saidas.tocarMeuBoneco();
      return;
    }
    if (
      e.objeto &&
      Math.abs(x - CENA.CENTRO) <= 16 &&
      y >= CENA.CHAO - 42 &&
      y <= CENA.CHAO + 4
    ) {
      this.saidas.tocarObjeto();
      return;
    }
    if (y < 40) return; // o céu não é chão
    const porta = e.portas.find(
      (p) => Math.abs(p.x - x) <= 9 && y >= CENA.CHAO - 28 && y <= CENA.CHAO + 2,
    );
    if (porta && this.abertura < 1) this.saidas.tocarPorta(porta.para, false);
    // Andar até ali: o meu boneco vai na hora; o servidor recebe o destino.
    const alvo = Math.max(8, Math.min(CENA.LARGURA - 8, Math.round(x)));
    if (this.meuId) this.andarilho(this.meuId).alvo = alvo;
    this.saidas.tocarChao(alvo);
  }

  private aoAtualizar(dt: number): void {
    if (!this.textura || !this.entrada) return;
    const e = this.entrada;
    this.tempo += dt;
    const parada = e.pausada;
    if (!parada) {
      const alvoAbertura = e.portasAbertas ? 1 : 0;
      if (this.abertura < alvoAbertura) this.abertura = Math.min(1, this.abertura + dt / 0.9);
      if (this.abertura > alvoAbertura) this.abertura = Math.max(0, this.abertura - dt / 0.6);
    }

    // quem saiu do setor deixa de ser desenhado (a cena é só do meu setor)
    const ids = new Set(e.habitantes.map((h) => h.id));
    for (const id of [...this.andarilhos.keys()]) if (!ids.has(id)) this.andarilhos.delete(id);

    const habitantes: HabitanteDesenho[] = [];
    for (const h of e.habitantes) {
      const a = this.andarilho(h.id);
      if (!h.eu) this.seguirCanal(a, e.posicoes[h.id]);
      const dx = a.alvo - a.x;
      const andando = Math.abs(dx) > 0.5;
      if (!parada && andando) a.x += Math.sign(dx) * Math.min(Math.abs(dx), VELOCIDADE * dt);
      // as perninhas SEMPRE mexem: mais rápido andando, mais devagar parado
      a.ft += parada ? 0 : dt;
      if (a.ft > (andando ? 0.14 : 0.32)) {
        a.ft = 0;
        a.quadro = a.quadro === 0 ? 1 : 0;
      }
      habitantes.push({
        id: h.id,
        nome: h.nome,
        cores: coresDoHabitante(h.id),
        x: a.x,
        quadro: a.quadro,
        saindo: h.saindo,
        eu: h.eu,
        ocultarNome: e.ocultarMeuNome,
      });
    }
    this.vigiarLuz(habitantes);

    for (const f of this.flashes) f.t += dt * 1000;
    this.flashes = this.flashes.filter((f) => f.t < f.dur);
    if (this.flood) {
      this.flood.t += dt * 1000;
      if (!this.flood.pico && this.flood.t >= 1400) {
        this.flood.pico = true;
        this.flood.aoPico?.();
      }
      if (this.flood.t >= 2900) {
        const fim = this.flood.fim;
        this.flood = null;
        fim?.();
      }
    }

    const quadro: QuadroDaCena = {
      fundo: this.fundoDe(e.setorId, e.intacto),
      setorId: e.setorId,
      intacto: e.intacto,
      habitantes,
      portas: e.portas,
      abertura: this.abertura,
      objeto: e.objeto,
      objetoBloqueado: e.objetoBloqueado,
      flashes: this.flashes,
      flood: this.flood ? { tipo: this.flood.tipo, t: this.flood.t } : null,
      cortina: e.cortina,
      rotuloDaPorta: e.rotuloDaPorta,
      tempo: this.tempo,
      sorteio: Math.random,
    };
    desenharQuadro(this.textura.getContext(), quadro);
    this.textura.refresh();
  }

  /** O passo novo do canal vira uma caminhada (a partir da hora em que chegou). */
  private seguirCanal(a: Andarilho, passo: Passo | undefined): void {
    if (!passo || passo.t === a.visto) return;
    a.visto = passo.t;
    a.alvo = Math.max(0, Math.min(CENA.LARGURA, passo.alvoX));
    // O x de saída vem do servidor; só corrige se estiver longe (evita saltos).
    if (Math.abs(a.x - passo.x) > 24) a.x = passo.x;
  }

  /** O meu boneco entra na luz de uma porta = aviso de saída; sair dela = desistir. */
  private vigiarLuz(habitantes: HabitanteDesenho[]): void {
    const e = this.entrada;
    if (!e.portasAbertas) this.luzAtual = null;
    const eu = habitantes.find((h) => h.eu);
    if (!eu || !e.portasAbertas || this.abertura < 1 || this.flood) return;
    const a = this.andarilhos.get(eu.id);
    if (!a || Math.abs(a.alvo - a.x) > 0.5) return;
    const porta = e.portas.find((p) => Math.abs(p.x - a.x) <= MEIA_PORTA);
    const para = porta?.para ?? null;
    if (para !== this.luzAtual) {
      this.luzAtual = para;
      this.saidas.luzDaPorta(para);
    }
  }
}
