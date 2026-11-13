/**
 * O que os seis fundos têm em comum (spec 034 #29–#31): o céu em faixas, a lua,
 * a cidade ao longe, o chão e a versão destruída. Cada setor desenha só o
 * prédio dele (um arquivo por setor) sobre esta base. Portado da prévia.
 */
import { desenharTexto, larguraTexto } from '../../isolateus-fonte-bitmap';
import { P } from '../../isolateus-paleta';

export const W = 320;
export const H = 180;
export const CHAO = 150;

/** Gerador pseudoaleatório com semente (mulberry32): igual em todo aparelho. */
export function rng(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Um prédio (retângulo) onde a versão destruída racha, fura e pinga. */
export type Predio = [number, number, number, number];

/** A caixa de ferramentas que cada setor recebe para desenhar o próprio prédio. */
export interface Pincel {
  /** Retângulo cheio. */
  r(x: number, y: number, w: number, h: number, cor: string): void;
  /** O sorteio do setor (semente fixa). */
  rr: () => number;
  /** Janela: acesa ou apagada; guardada para a versão destruída. */
  win(x: number, y: number, w: number, h: number, acesa: boolean, cor?: string): void;
  /** Placa com texto na fonte bitmap, centrada em `cx`. */
  placa(texto: string, cx: number, y: number, fg: string, bg: string): void;
  /** Linha de pixels (treliça, fios). */
  linha(x0: number, y0: number, x1: number, y1: number, cor: string): void;
  /** Registra um prédio para a versão destruída. */
  predio(p: Predio): void;
  /** Escolhe um item (com o sorteio do setor). */
  sortear<T>(itens: readonly T[]): T;
}

export type DesenhoDoSetor = (p: Pincel, id: string) => void;

function criarCanvas(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  return cv;
}

/** Monta o fundo de `id` (intacto ou destruído) com o desenho do setor. */
export function montarFundo(
  id: string,
  destruido: boolean,
  desenhar: DesenhoDoSetor,
): HTMLCanvasElement {
  const cv = criarCanvas();
  const c = cv.getContext('2d')!;
  const r = (x: number, y: number, w: number, h: number, cor: string) => {
    c.fillStyle = cor;
    c.fillRect(x | 0, y | 0, w | 0, h | 0);
  };
  const rr = rng(id.length * 977 + 13);
  const janelas: Predio[] = [];
  const predios: Predio[] = [];

  const pincel: Pincel = {
    r,
    rr,
    win: (x, y, w, h, acesa, cor) => {
      janelas.push([x, y, w, h]);
      r(x, y, w, h, acesa ? (cor ?? P.win) : P.winDim);
      if (acesa) r(x, y + h - 2, w, 2, P.winDim);
    },
    placa: (texto, cx, y, fg, bg) => {
      const w = larguraTexto(texto) + 6;
      r(cx - w / 2, y, w, 9, bg);
      r(cx - w / 2, y + 9, w, 1, P.ink);
      desenharTexto(c, texto, Math.round(cx - w / 2 + 3), y + 2, fg);
    },
    linha: (x0, y0, x1, y1, cor) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) {
        r(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1, cor);
      }
    },
    predio: (p) => predios.push(p),
    sortear: (itens) => itens[Math.floor(rr() * itens.length)],
  };

  // céu em faixas (sem gradiente)
  r(0, 0, W, 50, P.n0);
  r(0, 50, W, 45, P.n1);
  r(0, 95, W, 55, P.n2);
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(rr() * W);
    const y = Math.floor(rr() * 85);
    r(x, y, 1, 1, rr() < 0.3 ? P.white : P.s5);
  }
  // lua
  const mx = id === 'comunicacao' ? 40 : 270;
  const my = 16;
  r(mx + 2, my, 6, 1, P.s2);
  r(mx + 1, my + 1, 8, 6, P.s2);
  r(mx + 2, my + 7, 6, 1, P.s2);
  r(mx + 4, my + 2, 2, 2, P.s4);
  // cidade ao longe
  let x = 0;
  while (x < W) {
    const w = 10 + Math.floor(rr() * 18);
    const h = 18 + Math.floor(rr() * 34);
    r(x, CHAO - 40 - h, w, h + 40, P.far);
    for (let k = 0; k < 3; k++) {
      if (rr() < 0.4) {
        r(x + 2 + Math.floor(rr() * (w - 4)), CHAO - 36 - Math.floor(rr() * h), 1, 1, P.winDim);
      }
    }
    x += w + 1;
  }

  desenhar(pincel, id);

  // chão
  r(0, CHAO, W, H - CHAO, P.s8);
  r(0, CHAO, W, 1, P.s6);
  r(0, CHAO + 1, W, 1, P.s7);
  for (let i = 0; i < W; i += 20) r(i, CHAO + 2, 1, H - CHAO, P.s9);
  r(0, CHAO + 14, W, 1, P.s9);
  for (let i = 0; i < 40; i++) {
    r(Math.floor(rr() * W), CHAO + 3 + Math.floor(rr() * 26), 1, 1, P.s7);
  }

  if (destruido) destruir(r, id, janelas, predios, pincel.sortear);
  return cv;
}

/** A versão destruída: a MESMA composição, quebrada (spec 034 #30). */
function destruir(
  r: Pincel['r'],
  id: string,
  janelas: Predio[],
  predios: Predio[],
  sortear: Pincel['sortear'],
): void {
  const dr = rng(id.length * 31 + 7);
  const dp = <T>(itens: readonly T[]) => itens[Math.floor(dr() * itens.length)];
  void sortear;
  // janelas quebradas
  for (const [wx, wy, ww, wh] of janelas) {
    if (dr() < 0.75) {
      r(wx, wy, ww, wh, P.ink);
      for (let k = 0; k < 5; k++) {
        const ex = wx + Math.floor(dr() * ww);
        r(ex, wy + Math.floor(dr() * 3), 1, 2 + Math.floor(dr() * 3), P.s4);
      }
    }
  }
  if (!predios.length) return;
  // rachaduras
  for (let k = 0; k < 10; k++) {
    const b = dp(predios);
    let cx = b[0] + Math.floor(dr() * b[2]);
    let cy = b[1] + Math.floor(dr() * b[3] * 0.5);
    const len = 10 + Math.floor(dr() * 22);
    for (let i = 0; i < len; i++) {
      r(cx, cy, 1, 1, P.ink);
      cy++;
      if (dr() < 0.45) cx += dr() < 0.5 ? -1 : 1;
    }
  }
  // buracos
  for (let k = 0; k < 3; k++) {
    const b = dp(predios);
    const hx = b[0] + 10 + Math.floor(dr() * Math.max(1, b[2] - 30));
    const hy = b[1] + 8 + Math.floor(dr() * Math.max(1, b[3] - 30));
    r(hx, hy, 9, 7, P.ink);
    r(hx + 2, hy - 2, 5, 2, P.ink);
    r(hx - 2, hy + 2, 2, 3, P.ink);
    r(hx + 9, hy + 1, 2, 4, P.ink);
  }
  // resíduo verde escorrendo
  for (let k = 0; k < 6; k++) {
    const b = dp(predios);
    const gx = b[0] + Math.floor(dr() * b[2]);
    const gy = b[1] + Math.floor(dr() * b[3] * 0.6);
    r(gx, gy, 6, 3, P.alien2);
    r(gx + 1, gy + 3, 1, 4 + Math.floor(dr() * 8), P.alien2);
    r(gx + 4, gy + 3, 1, 3 + Math.floor(dr() * 5), P.alienDk);
  }
  // fumaça
  for (let k = 0; k < 4; k++) {
    const sx = Math.floor(dr() * W);
    for (let j = 0; j < 7; j++) {
      r(sx + Math.floor(dr() * 8) - 4, 10 + j * 8 + Math.floor(dr() * 4), 4 + Math.floor(dr() * 5), 3, P.s9);
    }
  }
  // entulho
  for (let k = 0; k < 70; k++) {
    r(
      Math.floor(dr() * W),
      CHAO - 4 + Math.floor(dr() * 8),
      1 + Math.floor(dr() * 3),
      1 + Math.floor(dr() * 2),
      dp([P.s5, P.s6, P.s4, P.brown2]),
    );
  }
  // rachaduras no chão
  for (let k = 0; k < 6; k++) {
    let cx = Math.floor(dr() * W);
    let cy = CHAO + 2;
    for (let i = 0; i < 14; i++) {
      r(cx, cy, 1, 1, P.ink);
      cx += dr() < 0.5 ? 1 : 2;
      if (dr() < 0.6) cy++;
    }
  }
}
