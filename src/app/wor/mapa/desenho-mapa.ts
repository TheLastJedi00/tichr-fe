/**
 * O desenho do mapa de reinos do Wor (spec 035 #20–#25): o fundo (terreno,
 * fronteiras e a tinta de cada reino) vai para um canvas fora da tela e só é
 * refeito quando um reino muda de dono ou vira Horda; castelos, tropas e
 * efeitos são desenhados por quadro, com `fillRect` na paleta (como a cena do
 * Isolateus). Referência visual: `previa.html` da spec 035.
 */
import { desenharTexto, larguraTexto } from '../../pixel/fonte-bitmap';
import { P, PW } from '../../pixel/paleta';
import { MAPA, MapaWor, Ponto } from './gerar-mapa';

const W = MAPA.LARGURA;
const H = MAPA.ALTURA;
export const HP_MAX = 1000;

/** O que o desenho precisa de cada equipe. */
export interface EquipeNoMapa {
  id: string;
  num: number;
  nome: string;
  cor: string;
  /** HP mostrado (anima entre o antes e o depois). */
  hp: number;
  horda: boolean;
  /** Afundamento da queda (0..4). */
  afundar?: number;
  tremer?: boolean;
}

type Rgb = [number, number, number];
const hex = (h: string): Rgb => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

type Ctx = CanvasRenderingContext2D;
const ret = (c: Ctx, x: number, y: number, w: number, h: number, cor: string) => {
  c.fillStyle = cor;
  c.fillRect(x, y, w, h);
};

/** Texto em fonte bitmap centrado em `cx`, com sombra de 1px. */
export function textoCentrado(c: Ctx, s: string, cx: number, y: number, cor: string): void {
  const x = Math.round(cx - larguraTexto(s) / 2);
  desenharTexto(c, s, x + 1, y + 1, P.ink);
  desenharTexto(c, s, x, y, cor);
}

/**
 * O fundo: terreno + tinta do dono de cada reino (`donoDoReino[k]`) + linha de
 * fronteira. Reino da Horda fica acinzentado, com árvores mortas.
 */
export function desenharFundo(
  mapa: MapaWor,
  donoDoReino: Array<{ cor: string; horda: boolean } | undefined>,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  const img = c.createImageData(W, H);
  const d = img.data;
  const grama = [hex(PW.grama0), hex(PW.grama1), hex(PW.grama2)];
  const cinza = hex(PW.cinza);
  const tintaHorda = hex(PW.horda);
  const linha = hex(PW.fronteira);
  const agua = hex(PW.agua);
  const aguaLt = hex(PW.aguaLt);
  const areia = hex(PW.areia);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const e = donoDoReino[mapa.dono[i]] ?? { cor: P.s5, horda: false };
      let cor: Rgb;
      if (mapa.agua[i]) {
        cor = ((x >> 1) + y) % 5 === 0 ? aguaLt : agua;
      } else {
        cor = grama[mapa.grama[i]];
        const praia =
          (x > 0 && mapa.agua[i - 1]) ||
          (x < W - 1 && mapa.agua[i + 1]) ||
          (y > 0 && mapa.agua[i - W]) ||
          (y < H - 1 && mapa.agua[i + W]);
        if (praia) cor = areia;
      }
      const tinta = e.horda ? tintaHorda : hex(e.cor);
      cor = e.horda ? mix(cor, cinza, 0.6) : mix(cor, tinta, 0.14);
      const dd = mapa.dist[i];
      const naLinha =
        (x + 1 < W && mapa.dono[i + 1] !== mapa.dono[i]) ||
        (y + 1 < H && mapa.dono[i + W] !== mapa.dono[i]);
      if (naLinha) cor = linha;
      else if (dd === 1 || dd === 2) cor = mix(cor, tinta, 0.62);
      else if (dd === 3 && (x + y) % 2 === 0) cor = mix(cor, tinta, 0.5);
      d[i * 4] = cor[0];
      d[i * 4 + 1] = cor[1];
      d[i * 4 + 2] = cor[2];
      d[i * 4 + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);

  const hordaEm = (p: Ponto) => !!donoDoReino[mapa.dono[p.y * W + p.x]]?.horda;
  for (const m of mapa.montes) {
    const h = hordaEm(m);
    const cl = h ? PW.hordaMorta : PW.pedra;
    const cd = h ? PW.cinza : PW.pedraDk;
    for (let r = 0; r < 7; r++) {
      ret(c, m.x - r, m.y - 7 + r, r + 1, 1, cl);
      ret(c, m.x + 1, m.y - 7 + r, r, 1, cd);
    }
    ret(c, m.x - 1, m.y - 7, 2, 2, h ? PW.hordaPedraL : PW.neve);
  }
  for (const t of mapa.arvores) {
    const h = hordaEm(t);
    const dk = h ? PW.hordaMorta : PW.arvore;
    const lt = h ? PW.hordaMortaLt : PW.arvoreLt;
    ret(c, t.x, t.y - 6, 1, 1, dk);
    ret(c, t.x - 1, t.y - 5, 3, 2, dk);
    ret(c, t.x - 2, t.y - 3, 5, 2, dk);
    ret(c, t.x - 1, t.y - 5, 1, 2, lt);
    ret(c, t.x - 2, t.y - 3, 1, 1, lt);
    ret(c, t.x, t.y - 1, 1, 1, PW.tronco);
  }
  return canvas;
}

/** Estado visual do castelo pelo HP (035 #21). */
export function estadoDoCastelo(e: { hp: number; horda: boolean }): 'ok' | 'racha' | 'ruina' | 'horda' {
  if (e.horda) return 'horda';
  if (e.hp <= 300) return 'ruina';
  if (e.hp <= 600) return 'racha';
  return 'ok';
}

/** O castelo no centro do reino, com bandeira, número e barra de HP. */
export function desenharCastelo(c: Ctx, e: EquipeNoMapa, centro: Ponto, t: number): void {
  const x = centro.x + (e.tremer ? (Math.floor(t / 40) % 2 ? 1 : -1) : 0);
  const y = centro.y + Math.round(e.afundar ?? 0);
  const st = estadoDoCastelo(e);
  const pal = e.horda
    ? { L: PW.hordaPedraL, M: PW.hordaPedraM, D: PW.hordaPedraD }
    : { L: P.s2, M: P.s4, D: P.s5 };
  const O = P.ink;
  const baixo = st === 'ruina' || st === 'horda';
  const tH = baixo ? 8 : 12;

  ret(c, x - 10, y + 1, 21, 1, 'rgba(5,7,15,.45)');
  // torres
  ret(c, x - 9, y - tH - 1, 5, tH + 1, O);
  ret(c, x + 4, y - tH - 1, 5, tH + 1, O);
  ret(c, x - 8, y - tH, 3, tH, pal.L);
  ret(c, x + 5, y - tH, 3, tH, pal.D);
  for (const tx of [x - 9, x + 4]) {
    ret(c, tx, y - tH - 2, 1, 1, O);
    ret(c, tx + 2, y - tH - 2, 1, 1, O);
    ret(c, tx + 4, y - tH - 2, 1, 1, O);
  }
  // muralha
  ret(c, x - 6, y - 8, 12, 8, O);
  ret(c, x - 5, y - 7, 10, 7, pal.M);
  ret(c, x - 5, y - 7, 10, 1, pal.L);
  ret(c, x + 3, y - 6, 2, 6, pal.D);
  // torre central
  if (!baixo) {
    ret(c, x - 3, y - 14, 7, 7, O);
    ret(c, x - 2, y - 13, 5, 6, pal.L);
    ret(c, x + 1, y - 13, 2, 6, pal.M);
    for (const dx of [-3, -1, 1, 3]) ret(c, x + dx, y - 15, 1, 1, O);
    ret(c, x, y - 11, 1, 2, st === 'ok' ? P.amber3 : P.winDim);
  }
  // portão
  ret(c, x - 1, y - 3, 3, 3, O);
  ret(c, x, y - 4, 1, 1, O);
  // janelas
  const jan = e.horda
    ? Math.floor(t / 300) % 3
      ? P.alien
      : P.alienDk
    : st === 'ruina'
      ? P.winDim
      : P.amber3;
  ret(c, x - 7, y - tH + 3, 1, 2, jan);
  ret(c, x + 6, y - tH + 3, 1, 2, jan);
  if (e.horda) {
    ret(c, x - 1, y - 2, 1, 1, P.alien);
    ret(c, x + 1, y - 2, 1, 1, P.alien);
  }
  // rachaduras e entulho
  if (st !== 'ok') {
    ret(c, x - 4, y - 6, 1, 1, O);
    ret(c, x - 3, y - 5, 1, 2, O);
    ret(c, x + 2, y - 7, 1, 2, O);
  }
  if (baixo) {
    ret(c, x - 11, y - 1, 2, 1, pal.D);
    ret(c, x + 9, y - 2, 2, 2, pal.D);
    ret(c, x + 11, y - 1, 1, 1, pal.M);
    ret(c, x - 12, y, 3, 1, pal.M);
    if (!e.horda && Math.floor(t / 400) % 2) {
      ret(c, x + 6, y - tH - 5, 2, 2, P.s5);
      ret(c, x + 7, y - tH - 8, 2, 2, P.s6);
    }
  }
  // bandeira
  const topo = baixo ? y - 15 : y - 21;
  const f = Math.floor(t / 260) % 2;
  ret(c, x, topo, 1, 7, PW.mastro);
  const cb = e.horda ? PW.bandeiraHorda : e.cor;
  ret(c, x + 1, topo, 4, 1, cb);
  ret(c, x + 1, topo + 1, f ? 5 : 4, 1, cb);
  ret(c, x + 1, topo + 2, f ? 3 : 4, 1, cb);
  if (e.horda) {
    ret(c, x + 3, topo + 1, 1, 1, PW.hordaPedraD);
    ret(c, x + 2, topo + 2, 1, 1, PW.hordaPedraD);
  }
  textoCentrado(c, String(e.num), x + 3, topo - 7, e.horda ? PW.hordaLt : P.white);
  // barra de HP
  ret(c, x - 9, y + 3, 19, 3, O);
  ret(c, x - 8, y + 4, 17, 1, P.s8);
  const w = Math.max(0, Math.round((17 * e.hp) / HP_MAX));
  if (w) ret(c, x - 8, y + 4, w, 1, e.horda ? PW.horda : e.cor);
  // a Horda ronda o castelo caído
  if (e.horda) {
    for (let k = 0; k < 3; k++) {
      const ang = t / 1400 + k * 2.1;
      desenharCriatura(c, x + Math.round(Math.cos(ang) * 13), y + Math.round(Math.sin(ang) * 4) + 2, t + k * 100);
    }
  }
}

/** Soldado 3×6 com lança, nas cores da equipe (perninhas em 2 quadros). */
export function desenharSoldado(c: Ctx, x: number, y: number, cor: string, t: number): void {
  x = Math.round(x);
  y = Math.round(y);
  const f = Math.floor(t / 120) % 2;
  ret(c, x + 1, y - 6, 1, 1, PW.pele);
  ret(c, x, y - 5, 3, 3, cor);
  ret(c, x, y - 5, 3, 1, P.ink);
  if (f) {
    ret(c, x, y - 2, 1, 2, P.ink);
    ret(c, x + 2, y - 2, 1, 2, P.ink);
  } else {
    ret(c, x + 1, y - 2, 1, 2, P.ink);
  }
  ret(c, x + 3, y - 8, 1, 6, P.s2);
}

/** Criatura da Horda 4×4, olhos verdes. */
export function desenharCriatura(c: Ctx, x: number, y: number, t: number): void {
  x = Math.round(x);
  y = Math.round(y);
  const f = Math.floor(t / 150) % 2;
  ret(c, x, y - 4, 4, 3, PW.horda);
  ret(c, x - 1, y - 3, 1, 1, PW.horda);
  ret(c, x + 4, y - 3, 1, 1, PW.horda);
  ret(c, x + 1, y - 3, 1, 1, P.alien);
  ret(c, x + 3, y - 3, 1, 1, P.alien);
  if (f) {
    ret(c, x, y - 1, 1, 1, P.ink);
    ret(c, x + 3, y - 1, 1, 1, P.ink);
  } else {
    ret(c, x + 1, y - 1, 1, 1, P.ink);
    ret(c, x + 2, y - 1, 1, 1, P.ink);
  }
}

/** Contorno piscando do meu reino (celular). */
export function desenharContorno(c: Ctx, pixels: number[], cor: string): void {
  c.fillStyle = cor;
  for (const i of pixels) c.fillRect(i % W, (i / W) | 0, 1, 1);
}

/** A mira em volta do castelo escolhido como alvo (celular). */
export function desenharMira(c: Ctx, centro: Ponto, cor: string): void {
  c.fillStyle = cor;
  for (const [ox, oy] of [
    [-13, -24],
    [11, -24],
    [-13, 4],
    [11, 4],
  ]) {
    c.fillRect(centro.x + ox, centro.y + oy, 3, 1);
    c.fillRect(centro.x + ox + (ox < 0 ? 0 : 2), centro.y + oy + (oy < 0 ? 0 : -2), 1, 3);
  }
}
