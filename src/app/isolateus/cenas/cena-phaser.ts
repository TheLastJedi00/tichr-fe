/**
 * A cena do Isolateus no Phaser 3 (spec 034 #34): resolução lógica fixa 320×180,
 * modo pixel art, escala em múltiplos inteiros, câmera para a tremida, input
 * unificado (mouse e toque) e teclado (036: WASD e setas). O Phaser hospeda o
 * loop, a escala, o input e a textura; o desenho de cada quadro vem de
 * `desenho-cena.ts`. O HUD e as sobreposições são Angular por cima deste canvas.
 *
 * Esta classe é carregada **só na rota do jogo** (`import('phaser')` dinâmico).
 */
import type Phaser from 'phaser';
import { FonteFundo, FundoEmCodigo } from './fonte-fundo';
import {
  BotaoPortaDesenho,
  CAIXA_BONECO,
  FlashDesenho,
  FloodDesenho,
  HabitanteDesenho,
  QuadroDaCena,
  caixaDoBotaoPorta,
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
  /** A vítima que a Ameaça marcou com um toque (só no celular dela, 036 #13a). */
  marcado?: boolean;
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
  /**
   * Eu posso atravessar agora (noite, solto, sem trava): o botão flutuante
   * aparece quando o meu boneco chega à porta (036 #19).
   */
  podeAtravessar: boolean;
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
  /**
   * Toque no boneco de outro habitante (036 #13a). Devolve `true` se a página
   * consumiu o toque (a Ameaça marcou a vítima); senão, o toque vira andar.
   */
  tocarHabitante(id: string): boolean;
  tocarObjeto(): void;
  tocarPorta(para: string, aberta: boolean): void;
  /** O meu boneco entrou (ou saiu) da zona de uma porta. */
  zonaDaPorta(para: string | null): void;
  /** Toque no botão flutuante (ou W): atravessar a porta (036 #20). */
  atravessar(para: string): void;
  /** S / seta para baixo: "Ficar neste setor" (036 #23). */
  ficar(): void;
}

interface Andarilho {
  x: number;
  alvo: number;
  quadro: 0 | 1;
  ft: number;
  /** Para detectar um passo novo no canal (o `t` do servidor). */
  visto: number;
  /**
   * Acabou de chegar ao setor e o canal ainda não disse onde (036): o
   * Firestore costuma chegar antes do RTDB. Fica invisível até o primeiro
   * passo (ou `ESPERA_CHEGADA`), para não piscar num ponto qualquer e pular
   * para a porta.
   */
  chegandoDesde?: number;
}

const VELOCIDADE = CENA.VELOCIDADE;
/** Folga do toque no boneco dos outros: o alvo é pequeno no celular (036 #13a). */
const FOLGA_TOQUE = 3;
const BORDA = 8;
/** Quanto um recém-chegado espera o canal antes de aparecer assim mesmo (s). */
const ESPERA_CHEGADA = 1.5;

/** O teclado da cena (036 #22–#24). */
const ESQUERDA = new Set(['a', 'arrowleft']);
const DIREITA = new Set(['d', 'arrowright']);
const ATRAVESSAR = new Set(['w', 'arrowup']);
const FICAR = new Set(['s', 'arrowdown']);

/** O foco está num campo de texto: o teclado é dele, não do boneco. */
function digitando(alvo: EventTarget | null): boolean {
  const el = alvo as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

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
  private zonaAtual: string | null = null;
  private botao: BotaoPortaDesenho | null = null;
  private readonly fundos: FonteFundo = new FundoEmCodigo();
  private readonly chavesDeFundo = new Set<string>();
  private pronta: Promise<void>;
  private resolverPronta!: () => void;
  /** A direção que o teclado está segurando (−1, 0, 1). */
  private direcao: -1 | 0 | 1 = 0;
  private primeiroQuadro = true;
  private setorDesenhado: string | null = null;
  private readonly aoApertar = (ev: KeyboardEvent) => this.tecla(ev, true);
  private readonly aoSoltar = (ev: KeyboardEvent) => this.tecla(ev, false);

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
    // Teclado na janela (e não no Phaser): nada é capturado, e o chat e os
    // campos de resposta continuam recebendo as letras normalmente.
    window.addEventListener('keydown', this.aoApertar);
    window.addEventListener('keyup', this.aoSoltar);
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

  /** Põe o meu boneco em `x` (chegada pela porta) e o faz andar até `alvo`. */
  posicionarMeuBoneco(x: number, alvo: number): void {
    if (!this.meuId) return;
    const a = this.andarilho(this.meuId);
    a.x = x;
    a.alvo = alvo;
    this.direcao = 0;
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

  /** O x atual do meu boneco. */
  meuX(): number | null {
    return this.meuId ? (this.andarilhos.get(this.meuId)?.x ?? null) : null;
  }

  destruir(): void {
    window.removeEventListener('keydown', this.aoApertar);
    window.removeEventListener('keyup', this.aoSoltar);
    this.jogo?.destroy(true);
    this.jogo = undefined;
    this.cena = undefined;
    this.andarilhos.clear();
  }

  // ---------------------------------------------------------------- teclado

  /**
   * A / D (ou setas) andam enquanto a tecla está apertada: apertar manda o
   * destino na borda da cena, soltar manda parar onde está (036 #25). W
   * atravessa a porta da zona, S fica no setor.
   */
  private tecla(ev: KeyboardEvent, apertou: boolean): void {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    // Esc tira o foco do chat (ou da resposta) e devolve o teclado ao boneco.
    if (apertou && ev.key === 'Escape' && digitando(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
      return;
    }
    if (digitando(ev.target) || digitando(document.activeElement)) return;
    if (!this.entrada || !this.meuId) return;
    const k = ev.key.toLowerCase();
    const lado = ESQUERDA.has(k) ? -1 : DIREITA.has(k) ? 1 : 0;
    if (lado) {
      ev.preventDefault();
      if (apertou) {
        if (ev.repeat || this.entrada.pausada || this.flood) return;
        this.direcao = lado;
        this.andarPara(lado < 0 ? BORDA : CENA.LARGURA - BORDA);
      } else if (this.direcao === lado) {
        this.direcao = 0;
        const x = this.meuX();
        if (x !== null) this.andarPara(x);
      }
      return;
    }
    if (!apertou || ev.repeat) return;
    if (ATRAVESSAR.has(k)) {
      ev.preventDefault();
      if (this.zonaAtual && this.botao) this.saidas.atravessar(this.zonaAtual);
    } else if (FICAR.has(k)) {
      ev.preventDefault();
      this.saidas.ficar();
    }
  }

  /** O meu boneco anda na hora; o servidor recebe o destino. */
  private andarPara(x: number): void {
    const alvo = Math.max(BORDA, Math.min(CENA.LARGURA - BORDA, Math.round(x)));
    if (this.meuId) this.andarilho(this.meuId).alvo = alvo;
    this.saidas.tocarChao(alvo);
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
    // 1. o botão flutuante acima da porta (036 #19)
    if (this.botao && this.zonaAtual) {
      const c = caixaDoBotaoPorta(this.botao);
      if (x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1) {
        this.saidas.atravessar(this.zonaAtual);
        return;
      }
    }
    const naAltura = (folga: number) =>
      y >= CENA.CHAO - CAIXA_BONECO.alto - folga && y <= CENA.CHAO + CAIXA_BONECO.baixo + folga;
    // 2. o boneco de outro habitante (a Ameaça marca a vítima com um toque) e
    // o meu: com os dois sob o dedo, vale o mais perto do toque.
    const meu = this.meuX();
    const noMeu = meu !== null && Math.abs(x - meu) <= CAIXA_BONECO.meia && naAltura(0);
    let perto: { id: string; d: number } | null = null;
    for (const h of e.habitantes) {
      if (h.eu) continue;
      const a = this.andarilhos.get(h.id);
      if (!a) continue;
      const d = Math.abs(x - a.x);
      if (d <= CAIXA_BONECO.meia + FOLGA_TOQUE && naAltura(FOLGA_TOQUE) && (!perto || d < perto.d)) {
        perto = { id: h.id, d };
      }
    }
    const outroAntes = perto && (!noMeu || perto.d < Math.abs(x - (meu ?? x)));
    if (perto && outroAntes && this.saidas.tocarHabitante(perto.id)) return;
    if (noMeu) {
      this.saidas.tocarMeuBoneco();
      return;
    }
    if (perto && !outroAntes && this.saidas.tocarHabitante(perto.id)) return;
    // 4. o objeto do centro
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
    // 5. andar até ali
    this.direcao = 0;
    this.andarPara(x);
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

    // Trocou de setor (eu atravessei): ninguém da cena antiga continua.
    const trocouDeSetor = this.setorDesenhado !== null && this.setorDesenhado !== e.setorId;
    if (trocouDeSetor) {
      for (const id of [...this.andarilhos.keys()]) if (id !== this.meuId) this.andarilhos.delete(id);
    }
    this.setorDesenhado = e.setorId;

    // Quem saiu do setor deixa de ser desenhado; se saiu por uma porta, ela
    // pisca (036 #8: as saídas são ao vivo).
    const ids = new Set(e.habitantes.map((h) => h.id));
    for (const [id, a] of [...this.andarilhos.entries()]) {
      if (ids.has(id)) continue;
      const porta = e.portas.find((p) => Math.abs(p.x - a.x) <= CENA.ZONA_PORTA + 6);
      if (porta && !trocouDeSetor) this.piscar(porta.x);
      this.andarilhos.delete(id);
    }

    const habitantes: HabitanteDesenho[] = [];
    for (const h of e.habitantes) {
      const novo = !this.andarilhos.has(h.id);
      const a = this.andarilho(h.id);
      if (novo && !h.eu && !this.primeiroQuadro) a.chegandoDesde = this.tempo;
      if (!h.eu) this.seguirCanal(a, e.posicoes[h.id]);
      if (a.chegandoDesde !== undefined) {
        if (this.tempo - a.chegandoDesde < ESPERA_CHEGADA) continue;
        a.chegandoDesde = undefined;
      }
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
        marcado: !!h.marcado,
        eu: h.eu,
        ocultarNome: e.ocultarMeuNome,
      });
    }
    this.primeiroQuadro = false;
    this.vigiarZona(habitantes);

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
      botaoPorta: this.botao,
      tempo: this.tempo,
      sorteio: Math.random,
    };
    desenharQuadro(this.textura.getContext(), quadro);
    this.textura.refresh();
  }

  /**
   * O passo novo do canal vira uma caminhada. Quem acabou de chegar ao setor
   * aparece no batente da porta (o backend grava o x de chegada nela).
   */
  private seguirCanal(a: Andarilho, passo: Passo | undefined): void {
    if (!passo || passo.t === a.visto) return;
    a.visto = passo.t;
    a.alvo = Math.max(0, Math.min(CENA.LARGURA, passo.alvoX));
    if (a.chegandoDesde !== undefined) {
      // O canal disse onde o recém-chegado está: aparece ali (na porta, com o
      // clarão, se entrou por ela).
      a.chegandoDesde = undefined;
      a.x = passo.x;
      const naPorta = this.entrada.portas.find((p) => Math.abs(p.x - passo.x) <= 1);
      if (naPorta) this.piscar(naPorta.x);
      return;
    }
    // O x de saída vem do servidor; só corrige se estiver longe (evita saltos).
    if (Math.abs(a.x - passo.x) > 24) a.x = passo.x;
  }

  /**
   * O meu boneco na zona de uma porta aberta: aparece o botão flutuante
   * "Entrar em {Setor}" acima dela (036 #19). Saiu da zona, o botão some.
   */
  private vigiarZona(habitantes: HabitanteDesenho[]): void {
    const e = this.entrada;
    const eu = habitantes.find((h) => h.eu);
    let para: string | null = null;
    let xPorta = 0;
    if (eu && e.portasAbertas && this.abertura >= 1 && !this.flood) {
      const porta = e.portas.find((p) => Math.abs(p.x - eu.x) <= CENA.ZONA_PORTA);
      if (porta) {
        para = porta.para;
        xPorta = porta.x;
      }
    }
    this.botao =
      para && e.podeAtravessar
        ? {
            x: xPorta,
            texto: `ENTRAR EM ${e.rotuloDaPorta(para)}`,
            fundo: e.portas.find((p) => p.para === para)?.lado === 'fundo',
          }
        : null;
    if (para !== this.zonaAtual) {
      this.zonaAtual = para;
      this.saidas.zonaDaPorta(para);
    }
  }
}
