/**
 * Fonte bitmap 3×5 (spec 034 #29): nomes, placas e rótulos desenhados direto no
 * canvas, nítidos em qualquer escala. Cada glifo é uma grade de 15 bits.
 */
const FONTE: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', '0': '111101101101111', '1': '010110010010111',
  '2': '110001010100111', '3': '110001010001110', '4': '101101111001001', '5': '111100110001110',
  '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110',
  ' ': '000000000000000', '-': '000000111000000', '.': '000000000000010', ':': '000010000010000',
  '!': '010010010000010', '?': '110001010000010', '<': '001010100010001', '>': '100010001010100',
  '^': '010101000000000', '•': '000010111010000',
};

/** Acentos: pixels extras (dx, dy) em volta do glifo base. */
const ACENTOS: Record<string, Array<[number, number]>> = {
  '́': [[2, -3], [1, -2]],
  '̀': [[0, -3], [1, -2]],
  '̂': [[1, -3], [0, -2], [2, -2]],
  '̃': [[0, -3], [1, -3], [1, -2], [2, -2]],
  '̧': [[1, 5], [0, 6]],
  '̈': [[0, -2], [2, -2]],
};

/** Largura em pixels de `texto` na escala `k`. */
export function larguraTexto(texto: string, k = 1): number {
  return (texto.length * 4 - 1) * k;
}

/** O alvo mínimo que a fonte precisa de um canvas 2D (também serve p/ testes). */
export interface AlvoDesenho {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, w: number, h: number): void;
}

/** Desenha `texto` em `(x, y)` com a cor dada. */
export function desenharTexto(
  c: AlvoDesenho,
  texto: string,
  x: number,
  y: number,
  cor: string,
  k = 1,
): void {
  c.fillStyle = cor;
  let cx = x;
  for (const ch of texto.toUpperCase()) {
    const d = ch.normalize('NFD');
    const g = FONTE[d[0]];
    if (g) {
      for (let i = 0; i < 15; i++) {
        if (g[i] === '1') {
          c.fillRect(cx + (i % 3) * k, y + Math.floor(i / 3) * k, k, k);
        }
      }
    }
    for (const m of d.slice(1)) {
      for (const [px, py] of ACENTOS[m] ?? []) {
        c.fillRect(cx + px * k, y + py * k, k, k);
      }
    }
    cx += 4 * k;
  }
}
