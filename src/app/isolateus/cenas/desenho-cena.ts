/**
 * O desenho de um quadro da cena (spec 034 §1): fundo, portas com luz,
 * objeto do centro, bonecos com as perninhas, nomes, luz verde da abdução e da
 * sabotagem. Tudo em código, na paleta única, sem gradiente nem blur (as luzes
 * são faixas de cor em degraus com dithering). Funções puras sobre um contexto
 * 2D: quem chama (a cena Phaser) decide quando e onde desenhar.
 */
import { desenharTexto, larguraTexto } from '../isolateus-fonte-bitmap';
import { desenharIcone } from '../isolateus-icones';
import {
  CORES_CABELO,
  CORES_CALCA,
  CORES_CAMISA,
  CORES_PELE,
  P,
} from '../isolateus-paleta';
import { CENA, ObjetoCentral, PortaCena, ROTULO_OBJETO } from './cenas.data';

const { LARGURA: W, ALTURA: H, CHAO, CENTRO } = CENA;

export type Ctx = CanvasRenderingContext2D;

/** As cores de um boneco (sorteadas pelo id: iguais em todo aparelho). */
export interface CoresBoneco {
  h: string;
  s: string;
  c: string;
  p: string;
}

function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** O boneco de um habitante: a mesma pessoa tem as mesmas cores em todo celular. */
export function coresDoHabitante(id: string): CoresBoneco {
  const h = hash(id);
  return {
    h: CORES_CABELO[h % CORES_CABELO.length],
    s: CORES_PELE[(h >>> 4) % CORES_PELE.length],
    c: CORES_CAMISA[(h >>> 8) % CORES_CAMISA.length],
    p: CORES_CALCA[(h >>> 12) % CORES_CALCA.length],
  };
}

/** Onde um habitante nasce na cena enquanto o canal não diz nada (espalhado). */
export function xInicialDoHabitante(id: string): number {
  return 40 + (hash(id + 'x') % 241);
}

export interface HabitanteDesenho {
  id: string;
  nome: string;
  cores: CoresBoneco;
  x: number;
  /** Quadro das perninhas (0 ou 1). */
  quadro: 0 | 1;
  /** Em fila na luz da porta: o contorno pisca (aviso de saída). */
  saindo: boolean;
  eu: boolean;
  /** Esconde o nome (o olho do próprio chip). */
  ocultarNome: boolean;
}

export interface FlashDesenho {
  x: number;
  t: number;
  dur: number;
}

export interface FloodDesenho {
  tipo: 'ABDUCAO' | 'SABOTAGEM';
  /** Milissegundos desde o início do efeito. */
  t: number;
}

export interface QuadroDaCena {
  fundo: CanvasImageSource;
  setorId: string;
  intacto: boolean;
  habitantes: HabitanteDesenho[];
  portas: PortaCena[];
  /** 0 = fechadas, 1 = abertas com luz. */
  abertura: number;
  objeto: ObjetoCentral | null;
  objetoBloqueado: boolean;
  flashes: FlashDesenho[];
  flood: FloodDesenho | null;
  /** 0..1: a cortina preta da troca de setor. */
  cortina: number;
  /** Rótulo de cada porta (nome curto do destino). */
  rotuloDaPorta: (para: string) => string;
  /** Segundos desde o início (anima sirene, luz, balanço). */
  tempo: number;
  /** O sorteio das faíscas do setor em ruínas (determinístico por quadro). */
  sorteio: () => number;
}

const px = (c: Ctx, x: number, y: number, w: number, h: number, cor: string) => {
  c.fillStyle = cor;
  c.fillRect(x | 0, y | 0, w | 0, h | 0);
};
const limitar = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- bonecos

const CORPO = [
  '...hhhh...',
  '..hhhhhh..',
  '..hssssh..',
  '..sesses..',
  '..ssssss..',
  '...ssss...',
  '.cccccccc.',
  'sccccccccs',
  'sccccccccs',
  '.cccccccc.',
  '..pppppp..',
];
const PERNAS: string[][] = [
  ['..pp..pp..', '.pp....pp.', 'bbb....bbb'],
  ['...pppp...', '...pp.pp..', '..bbb.bbb.'],
];

/** O alvo de clique do boneco (para o toque abrir o personagem). */
export const CAIXA_BONECO = { meia: 7, alto: 24, baixo: 4 };

export function desenharBoneco(
  c: Ctx,
  cores: CoresBoneco,
  x: number,
  quadro: 0 | 1,
  contorno: string | null,
): void {
  const linhas = CORPO.concat(PERNAS[quadro]);
  const mapa: Record<string, string> = {
    h: cores.h,
    s: cores.s,
    e: P.ink,
    c: cores.c,
    p: cores.p,
    b: P.ink,
  };
  const x0 = Math.round(x) - 5;
  const y0 = CHAO + 2 - linhas.length;
  if (contorno) {
    c.fillStyle = contorno;
    for (let j = 0; j < linhas.length; j++) {
      for (let i = 0; i < 10; i++) {
        if (linhas[j][i] === '.') continue;
        c.fillRect(x0 + i - 1, y0 + j, 1, 1);
        c.fillRect(x0 + i + 1, y0 + j, 1, 1);
        c.fillRect(x0 + i, y0 + j - 1, 1, 1);
        c.fillRect(x0 + i, y0 + j + 1, 1, 1);
      }
    }
  }
  for (let j = 0; j < linhas.length; j++) {
    for (let i = 0; i < 10; i++) {
      const k = linhas[j][i];
      if (k !== '.') {
        c.fillStyle = mapa[k];
        c.fillRect(x0 + i, y0 + j, 1, 1);
      }
    }
  }
}

// ----------------------------------------------------------------- portas

/** A porta: fechada → abrindo → aberta com luz (em degraus, sem gradiente). */
export function desenharPorta(
  c: Ctx,
  porta: PortaCena,
  abertura: number,
  rotulo: string,
  tempo: number,
): void {
  const fundo = porta.lado === 'fundo';
  const w = 14;
  const h = fundo ? 22 : 24;
  const x0 = porta.x - 7;
  const y0 = CHAO - h;
  const fase = Math.floor(tempo * 6) % 2;
  if (fundo) px(c, x0 - 4, y0 - 4, w + 8, h + 4, P.s9);
  if (abertura >= 1) {
    // luz que sai de dentro: moldura pontilhada em dois tons
    for (let yy = y0 - 4; yy < CHAO; yy++) {
      for (let xx = x0 - 5; xx < x0 + w + 5; xx++) {
        const anel = xx < x0 - 2 || xx >= x0 + w + 2 || yy < y0 - 2;
        if (anel && (xx + yy + fase) % 2 === 0) {
          px(c, xx, yy, 1, 1, xx < x0 - 3 || xx >= x0 + w + 3 || yy < y0 - 3 ? P.amber5 : P.amber3);
        }
      }
    }
  }
  px(c, x0 - 2, y0 - 2, w + 4, h + 2, P.s5);
  px(c, x0 - 1, y0 - 1, w + 2, h + 1, P.s9);
  if (abertura > 0) {
    px(c, x0, y0, w, h, P.amber3);
    px(c, x0 + 3, y0, w - 6, h, P.amber1);
    px(c, x0 + 5, y0, w - 10, h, P.white);
  } else {
    px(c, x0, y0, w, h, P.ink);
  }
  // a folha da porta, abrindo em 4 degraus
  const passos = 4;
  const pw = Math.round(w * (1 - Math.floor(abertura * passos) / passos));
  if (pw > 0) {
    px(c, x0, y0, pw, h, P.brown);
    for (let i = 3; i < pw; i += 4) px(c, x0 + i, y0, 1, h, P.brown2);
    px(c, x0, y0 + 6, pw, 1, P.brown2);
    px(c, x0, y0 + h - 7, pw, 1, P.brown2);
    if (pw > 4) px(c, x0 + pw - 3, y0 + 12, 2, 2, P.amber5);
  }
  if (abertura >= 1) {
    // a luz derramada no chão (dithering em degraus)
    for (let yy = CHAO + 1; yy < CHAO + 18; yy++) {
      const abre = Math.floor((yy - CHAO) * 0.9);
      const dens = yy - CHAO < 8 ? 2 : 4;
      for (let xx = x0 - abre; xx < x0 + w + abre; xx++) {
        if ((xx + yy + fase) % dens === 0) {
          px(c, xx, yy, 1, 1, yy - CHAO < 8 ? P.amber3 : P.amber5);
        }
      }
    }
  }
  const lado = fundo ? '^ ' : porta.x < CENTRO ? '< ' : '';
  const fim = porta.x > CENTRO && !fundo ? ' >' : '';
  const texto = `${lado}${rotulo}${fim}`;
  const lw = larguraTexto(texto);
  const lx = limitar(Math.round(porta.x - lw / 2), 2, W - lw - 2);
  px(c, lx - 2, y0 - 13, lw + 4, 9, P.ink);
  desenharTexto(c, texto, lx, y0 - 11, abertura >= 1 ? P.amber3 : P.s4);
}

// ----------------------------------------------------- objeto do centro

/** O objeto do centro: kit de reparo, maca do resgate ou botão da Quarentena. */
export function desenharObjeto(
  c: Ctx,
  tipo: ObjetoCentral,
  bloqueado: boolean,
  tempo: number,
): void {
  const x = CENTRO;
  const pulo = Math.floor(tempo * 3) % 2;
  if (tipo === 'REPARO') {
    px(c, x - 9, CHAO - 9, 18, 10, P.red7);
    px(c, x - 9, CHAO - 9, 18, 2, P.red5);
    px(c, x - 4, CHAO - 12, 8, 3, P.s5);
    px(c, x - 2, CHAO - 11, 4, 2, P.ink);
    px(c, x - 2, CHAO - 5, 4, 2, P.amber3);
    px(c, x + 6, CHAO - 16, 2, 8, P.s4);
    px(c, x + 4, CHAO - 18, 6, 3, P.s4);
    px(c, x + 6, CHAO - 18, 2, 1, P.ink);
  } else if (tipo === 'RESGATE') {
    px(c, x - 14, CHAO - 7, 28, 3, P.white);
    px(c, x - 14, CHAO - 4, 2, 5, P.s5);
    px(c, x + 12, CHAO - 4, 2, 5, P.s5);
    px(c, x - 13, CHAO - 9, 6, 2, P.s2);
    px(c, x - 3, CHAO - 22, 6, 12, P.red5);
    px(c, x - 6, CHAO - 19, 12, 6, P.red5);
    px(c, x - 2, CHAO - 21, 4, 10, P.red3);
  } else {
    // o botão vermelho grande da Quarentena
    px(c, x - 8, CHAO - 12, 16, 13, P.s6);
    px(c, x - 8, CHAO - 12, 16, 2, P.s5);
    px(c, x - 10, CHAO - 1, 20, 2, P.s7);
    px(c, x - 7, CHAO - 18, 14, 6, P.red7);
    px(c, x - 6, CHAO - 20, 12, 3, P.red5);
    px(c, x - 4, CHAO - 20, 4, 1, P.red3);
    for (let i = -8; i < 8; i += 4) px(c, x + i, CHAO - 7, 2, 2, P.amber5);
  }
  const rotulo = ROTULO_OBJETO[tipo];
  const lw = larguraTexto(rotulo);
  if (bloqueado) {
    // apagado: sombra sobre o objeto, rótulo cinza e o cadeado no lugar da seta
    c.fillStyle = 'rgba(5,7,15,.62)';
    c.fillRect(x - 16, CHAO - 26, 32, 28);
    px(c, x - lw / 2 - 2, CHAO - 39, lw + 4, 9, P.ink);
    desenharTexto(c, rotulo, Math.round(x - lw / 2), CHAO - 37, P.s5);
    desenharIcone(c, 'CADEADO', x - 4, CHAO - 29);
    return;
  }
  px(c, x - lw / 2 - 2, CHAO - 39 - pulo, lw + 4, 9, P.ink);
  desenharTexto(c, rotulo, Math.round(x - lw / 2), CHAO - 37 - pulo, tipo === 'QUARENTENA' ? P.red5 : P.amber3);
  px(c, x - 2, CHAO - 29 - pulo, 5, 1, P.amber3);
  px(c, x - 1, CHAO - 28 - pulo, 3, 1, P.amber3);
  px(c, x, CHAO - 27 - pulo, 1, 1, P.amber3);
}

// ----------------------------------------------------------- luz verde

/** A luz verde (abdução e sabotagem): cobre a cena em degraus e apaga. */
export function desenharFlood(c: Ctx, f: FloodDesenho): void {
  const t = f.t;
  const cobertura = t < 800 ? t / 800 : t < 2100 ? 1 : Math.max(0, 1 - (t - 2100) / 800);
  const linhas = Math.floor((Math.floor(cobertura * 12) / 12) * H);
  const fase = Math.floor(t / 120) % 2;
  px(c, 0, 0, W, linhas, fase ? P.alien : '#2ee87a');
  if (cobertura >= 1) {
    px(c, 140, 0, 40, H, P.alienLt);
    px(c, 150, 0, 20, H, P.white);
    for (let y = 0; y < H; y += 6) px(c, 0, y + fase * 3, W, 1, P.alien2);
  }
  for (let y = linhas; y < linhas + 8 && y < H; y++) {
    const passo = y - linhas < 4 ? 2 : 4;
    for (let x = (y + fase) % passo; x < W; x += passo) px(c, x, y, 1, 1, P.alien);
  }
}

// ------------------------------------------------------------ o quadro

/** Desenha o quadro inteiro da cena (um frame). */
export function desenharQuadro(c: Ctx, q: QuadroDaCena): void {
  c.save();
  // A tremida da sabotagem é a câmera do Phaser (`camera.shake`), não daqui.
  c.drawImage(q.fundo, 0, 0);
  // detalhes vivos por cima do fundo: sirene, luz da torre, faíscas da ruína
  if (q.setorId === 'seguranca') {
    px(c, 157, 61, 6, 4, Math.floor(q.tempo * 4) % 2 ? P.red5 : P.blue5);
  }
  if (q.setorId === 'comunicacao' && Math.floor(q.tempo * 1.5) % 2) {
    px(c, 257, 10, 2, 2, P.red5);
  }
  if (!q.intacto) {
    for (let i = 0; i < 4; i++) {
      if (q.sorteio() < 0.5) {
        px(
          c,
          40 + Math.floor(q.sorteio() * 240),
          60 + Math.floor(q.sorteio() * 80),
          1,
          1,
          [P.amber3, P.amber5, P.alien][Math.floor(q.sorteio() * 3)],
        );
      }
    }
  }
  for (const porta of q.portas) {
    desenharPorta(c, porta, q.abertura, q.rotuloDaPorta(porta.para), q.tempo);
  }
  if (q.objeto) desenharObjeto(c, q.objeto, q.objetoBloqueado, q.tempo);

  const lista = [...q.habitantes].sort(
    (a, b) => Number(a.eu) - Number(b.eu) || a.x - b.x,
  );
  const piscar = Math.floor(q.tempo * 5) % 2 === 1;
  for (const h of lista) {
    desenharBoneco(c, h.cores, h.x, h.quadro, h.saindo && piscar ? P.amber3 : null);
  }
  desenharNomes(c, lista, q.tempo);

  for (const f of q.flashes) {
    const a = f.t / f.dur;
    if (a < 1) px(c, f.x - 9, CHAO - 28, 18, 28, Math.floor(a * 6) % 2 ? P.white : P.amber1);
  }
  if (q.flood) desenharFlood(c, q.flood);
  c.restore();
  if (q.cortina > 0) {
    const alt = Math.round(q.cortina * 18);
    for (let k = 0; k < 10; k++) px(c, 0, k * 18, W, alt, P.ink);
  }
}

/** Os nomes acima das cabeças; os que se sobrepõem sobem um degrau. */
function desenharNomes(c: Ctx, lista: HabitanteDesenho[], tempo: number): void {
  const niveis: number[] = [];
  for (const h of [...lista].sort((a, b) => a.x - b.x)) {
    const nome = h.eu && h.ocultarNome ? '' : h.nome;
    const lw = nome ? larguraTexto(nome) : 5;
    const x0 = h.x - lw / 2 - 2;
    const x1 = h.x + lw / 2 + 2;
    let n = 0;
    while (niveis[n] !== undefined && niveis[n] > x0) n++;
    niveis[n] = x1 + 1;
    const y = CHAO - 21 - n * 10;
    if (n > 0) px(c, h.x, y + 6, 1, CHAO - 16 - (y + 6), 'rgba(148,163,184,.5)');
    if (nome) {
      px(c, x0, y - 3, lw + 4, 9, 'rgba(5,7,15,.8)');
      desenharTexto(c, nome, Math.round(h.x - lw / 2), y - 1, h.eu ? P.amber3 : P.s2);
    }
    if (h.eu) {
      const yy = y - 7 - (Math.floor(tempo * 3) % 2);
      px(c, h.x - 2, yy, 5, 1, P.amber3);
      px(c, h.x - 1, yy + 1, 3, 1, P.amber3);
      px(c, h.x, yy + 2, 1, 1, P.amber3);
    }
  }
}
