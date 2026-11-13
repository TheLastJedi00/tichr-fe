/**
 * O kit de ícones pixel art do Isolateus (spec 034 #62, #70): matrizes de
 * pixels na paleta única, desenhadas em código (SVG `crispEdges` no HUD e
 * `fillRect` no canvas). Mesmas matrizes da prévia da spec.
 */
export type NomeIcone =
  | 'CONTROLE'
  | 'CONTAGIO'
  | 'DELIRIO'
  | 'SABOTAR'
  | 'ABDUZIR'
  | 'AGUARDAR'
  | 'CADEADO'
  | 'ENERGIA';

/** Letra da matriz → cor (todas da paleta). */
export const COR_ICONE: Record<string, string> = {
  m: '#94a3b8',
  n: '#475569',
  g: '#39ff88',
  d: '#16a34a',
  D: '#0f5132',
  w: '#f1f5f9',
  k: '#05070f',
  a: '#fcd34d',
  b: '#3b82f6',
  r: '#ef4444',
  l: '#b9ffd6',
};

export const ICONES: Record<NomeIcone, string[]> = {
  // poderes
  CONTROLE: [
    '.....gg.....', '..g.gggg.g..', '...gwwwwg...', '..gwggggwg..', '.gwgkkkkgwg.',
    'gwgkkllkkgwg', 'gwgkkllkkgwg', '.gwgkkkkgwg.', '..gwggggwg..', '...gwwwwg...',
    '..g.gggg.g..', '.....gg.....',
  ],
  CONTAGIO: [
    '.....gg.....', '.g...gg...g.', '..g.gggg.g..', '...gddddg...', 'ggggdlddgggg',
    'ggggddddgggg', '...gddddg...', '..g.gggg.g..', '.g...gg...g.', '.....gg.....',
    '............', '............',
  ],
  DELIRIO: [
    'ggggggggggg.', '..........g.', '..ggggggg.g.', '..g.....g.g.', '..g.ggg.g.g.',
    '..g.g.g.g.g.', '..g.g.g.g.g.', '..g.g...g.g.', '..g.ggggg.g.', '..g.......g.',
    '..ggggggggg.', '............',
  ],
  // jogadas
  SABOTAR: [
    '......aa....', '.....aa.....', '....aa......', '...aaaaaa...', '......aa....',
    '.....aa.....', '....aa......', '...a........',
  ],
  ABDUZIR: [
    '....gggg....', '...gllllg...', '...gllllg...', '.gggggggggg.', 'gdadadadadg.',
    '.gggggggggg.', '....g..g....', '...g....g...', '..l......l..',
  ],
  AGUARDAR: [
    '...aaaa.....', '..aa.........', '.aa..........', '.aa..........', '.aa..........',
    '..aa.........', '...aaaa.....',
  ],
  // ação indisponível (cadeado FECHADO, cinza)
  CADEADO: [
    '..mmmm..', '.m....m.', '.m....m.', 'mmmmmmmm', 'mnnnnnnm', 'mnnkknnm', 'mnnkknnm',
    'mnnnnnnm', 'mmmmmmmm',
  ],
  // barra de energia
  ENERGIA: [
    '.....g.....', '....ggg....', '...glggg...', '..glgdddg..', '...gdddg...', '....ddg....',
    '.....d.....',
  ],
};

/** Largura e altura da matriz do ícone. */
export function medidasIcone(nome: NomeIcone): { w: number; h: number } {
  const m = ICONES[nome];
  return { w: m[0].length, h: m.length };
}

/** Os retângulos (um por pixel aceso) do ícone, prontos para SVG ou canvas. */
export function pixelsDoIcone(
  nome: NomeIcone,
): Array<{ x: number; y: number; cor: string }> {
  const m = ICONES[nome];
  const pixels: Array<{ x: number; y: number; cor: string }> = [];
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[0].length; x++) {
      const c = m[y][x];
      if (c !== '.') pixels.push({ x, y, cor: COR_ICONE[c] });
    }
  }
  return pixels;
}

/** Desenha o ícone num canvas 2D em `(x, y)`. */
export function desenharIcone(
  c: { fillStyle: string | CanvasGradient | CanvasPattern; fillRect(x: number, y: number, w: number, h: number): void },
  nome: NomeIcone,
  x: number,
  y: number,
): void {
  for (const p of pixelsDoIcone(nome)) {
    c.fillStyle = p.cor;
    c.fillRect(x + p.x, y + p.y, 1, 1);
  }
}
