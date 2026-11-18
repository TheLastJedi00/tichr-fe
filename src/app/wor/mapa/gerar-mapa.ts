/**
 * O mapa de reinos do Wor pixel art (spec 035 #20–#22): um reino por equipe,
 * com o castelo no centro. Determinístico pela semente (o `matchId`): telão e
 * celulares desenham o mesmo mapa sem guardar nada no Firestore. Puro (sem
 * DOM): o desenho fica em `desenho-mapa.ts`. Referência visual: `previa.html`
 * da spec 035.
 */
export const MAPA = { LARGURA: 320, ALTURA: 180 } as const;

const W = MAPA.LARGURA;
const H = MAPA.ALTURA;
const N4: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Faixa onde ficam os castelos: longe das bordas e dos painéis do HUD. */
const AREA = { x0: 30, x1: W - 30, y0: 58, y1: H - 40 };

export interface Ponto {
  x: number;
  y: number;
}

export interface MapaWor {
  n: number;
  /** O centro de cada reino (onde fica o castelo). */
  centros: Ponto[];
  /** Reino dono de cada pixel (`y * W + x`). */
  dono: Int8Array;
  /** Distância até a fronteira (1..3; 0 = longe). */
  dist: Uint8Array;
  /** Pixels da borda de cada reino (o contorno piscando do "meu" reino). */
  contorno: number[][];
  agua: Uint8Array;
  /** Tom da grama (0..2) por pixel. */
  grama: Uint8Array;
  arvores: Ponto[];
  montes: Ponto[];
}

export function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashTexto(s: string): number {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Ruído de valor suave (grade `g`), para borda orgânica, água e grama. */
function ruido(rand: () => number, g: number): (x: number, y: number) => number {
  const gw = Math.ceil(W / g) + 2;
  const gh = Math.ceil(H / g) + 2;
  const v = Float32Array.from({ length: gw * gh }, () => rand());
  const s = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / g;
    const fy = y / g;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const u = s(fx - ix);
    const w = s(fy - iy);
    const a = v[iy * gw + ix];
    const b = v[iy * gw + ix + 1];
    const c = v[(iy + 1) * gw + ix];
    const d = v[(iy + 1) * gw + ix + 1];
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
}

function vizinhos(i: number, f: (j: number) => boolean | void): void {
  const x = i % W;
  const y = (i / W) | 0;
  for (const [dx, dy] of N4) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    if (f(ny * W + nx) === true) return;
  }
}

/** Centros espaçados (amostragem com distância mínima, que encolhe se não couber). */
function sortearCentros(n: number, rand: () => number): Ponto[] {
  const largura = AREA.x1 - AREA.x0;
  const altura = AREA.y1 - AREA.y0;
  let d = Math.sqrt((largura * altura) / n) * 0.95;
  let centros: Ponto[] = [];
  for (let tent = 0; centros.length < n; tent++) {
    if (tent > 4000) {
      centros = [];
      tent = 0;
      d *= 0.92;
    }
    const x = AREA.x0 + rand() * largura;
    const y = AREA.y0 + rand() * altura;
    if (centros.every((c) => Math.hypot(c.x - x, c.y - y) >= d)) {
      centros.push({ x: Math.round(x), y: Math.round(y) });
    }
  }
  return centros;
}

export function gerarMapa(n: number, semente: string): MapaWor {
  const qtd = Math.max(1, n);
  const rand = mulberry32(hashTexto(semente));
  const nzAgua = ruido(rand, 26);
  const nzGrama = ruido(rand, 9);
  const wx = ruido(rand, 28);
  const wy = ruido(rand, 28);
  const centros = sortearCentros(qtd, rand);

  // Voronoi com a borda deslocada por ruído (fronteiras orgânicas).
  const dono = new Int8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + (wx(x, y) - 0.5) * 22;
      const py = y + (wy(x, y) - 0.5) * 22;
      let melhor = 0;
      let md = Infinity;
      centros.forEach((c, k) => {
        const dd = (c.x - px) ** 2 + (c.y - py) ** 2;
        if (dd < md) {
          md = dd;
          melhor = k;
        }
      });
      dono[y * W + x] = melhor;
    }
  }

  // Reinos contíguos: um pedaço solto (ilha do ruído) passa para o vizinho.
  const ok = new Uint8Array(W * H);
  centros.forEach((c, k) => {
    const pilha = [c.y * W + c.x];
    dono[pilha[0]] = k;
    ok[pilha[0]] = 1;
    while (pilha.length) {
      const i = pilha.pop()!;
      vizinhos(i, (j) => {
        if (!ok[j] && dono[j] === k) {
          ok[j] = 1;
          pilha.push(j);
        }
      });
    }
  });
  for (let mudou = true; mudou; ) {
    mudou = false;
    for (let i = 0; i < W * H; i++) {
      if (ok[i]) continue;
      vizinhos(i, (j) => {
        if (!ok[j]) return false;
        dono[i] = dono[j];
        ok[i] = 1;
        mudou = true;
        return true;
      });
    }
  }

  // Distância até a fronteira (1..3) e o contorno de cada reino.
  const dist = new Uint8Array(W * H);
  const fila: number[] = [];
  for (let i = 0; i < W * H; i++) {
    vizinhos(i, (j) => {
      if (dono[j] === dono[i]) return false;
      dist[i] = 1;
      fila.push(i);
      return true;
    });
  }
  for (let q = 0; q < fila.length; q++) {
    const i = fila[q];
    if (dist[i] >= 3) continue;
    vizinhos(i, (j) => {
      if (!dist[j]) {
        dist[j] = dist[i] + 1;
        fila.push(j);
      }
    });
  }
  const contorno: number[][] = centros.map(() => []);
  for (let i = 0; i < W * H; i++) if (dist[i] === 1) contorno[dono[i]].push(i);

  // Terreno: água longe dos castelos, três tons de grama com pontilhado.
  const agua = new Uint8Array(W * H);
  const grama = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const longe = centros.every((c) => Math.hypot(c.x - x, c.y - y) > 34);
      agua[i] = longe && nzAgua(x, y) > 0.8 ? 1 : 0;
      grama[i] = Math.max(
        0,
        Math.min(2, Math.floor(nzGrama(x, y) * 3 + ((x + y) & 1) * 0.3)),
      );
    }
  }
  const livre = (x: number, y: number, r: number) =>
    x > 3 &&
    y > 8 &&
    x < W - 4 &&
    y < H - 2 &&
    !agua[y * W + x] &&
    centros.every((c) => Math.hypot(c.x - x, c.y - (y - 4)) > r);
  const arvores: Ponto[] = [];
  const montes: Ponto[] = [];
  for (let k = 0; k < 220; k++) {
    const x = (rand() * W) | 0;
    const y = (rand() * H) | 0;
    if (livre(x, y, 17) && nzGrama(x, y) > 0.45) arvores.push({ x, y });
  }
  for (let k = 0; k < 40 && montes.length < 7; k++) {
    const x = (rand() * W) | 0;
    const y = (rand() * H) | 0;
    if (livre(x, y, 26)) montes.push({ x, y });
  }
  arvores.sort((a, b) => a.y - b.y);

  return { n: qtd, centros, dono, dist, contorno, agua, grama, arvores, montes };
}

/**
 * Qual reino é de cada equipe: o campo `reinos` da partida (troca na
 * Usurpação) ou, em partida antiga, a ordem de `ordemEquipes`.
 */
export function reinosDaPartida(
  ordemEquipes: string[],
  reinos?: Record<string, number> | null,
): Record<string, number> {
  if (reinos && ordemEquipes.every((id) => id in reinos)) return { ...reinos };
  return Object.fromEntries(ordemEquipes.map((id, i) => [id, i]));
}
