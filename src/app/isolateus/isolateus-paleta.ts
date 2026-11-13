/**
 * A paleta única do Isolateus pixel art (spec 034 #28): ~30 cores derivadas dos
 * tokens Slate/Azul do app, mais o verde alien e o vermelho de alerta. Ela
 * alimenta as CSS variables do HUD, os sprites, as portas e os fundos — nada
 * no jogo usa uma cor que não esteja aqui.
 */
export const P = {
  ink: '#05070f',
  n0: '#070b17',
  n1: '#0a1122',
  n2: '#0e1830',
  far: '#0c1426',
  s9: '#0f172a',
  s8: '#1e293b',
  s7: '#334155',
  s6: '#475569',
  s5: '#64748b',
  s4: '#94a3b8',
  s2: '#cbd5e1',
  white: '#f1f5f9',
  blue7: '#1d4ed8',
  blue5: '#3b82f6',
  blue3: '#93c5fd',
  blueWin: '#5b7fb8',
  alien: '#39ff88',
  alien2: '#16a34a',
  alienDk: '#0f5132',
  alienLt: '#b9ffd6',
  red7: '#b91c1c',
  red5: '#ef4444',
  red3: '#fca5a5',
  amber5: '#f59e0b',
  amber3: '#fcd34d',
  amber1: '#fef3c7',
  brown: '#4a2f22',
  brown2: '#6b4430',
  win: '#d9b45a',
  winDim: '#3a3220',
} as const;

export type CorPaleta = keyof typeof P;

/** As cores do boneco: sorteadas por habitante, sempre dentro da paleta. */
export const CORES_CABELO = ['#2b1d14', '#5b3a29', '#c08a4a', '#111827', '#9ca3af', '#7c2d12'];
export const CORES_PELE = ['#f2c29b', '#d19a6a', '#a0673f', '#6b4226'];
export const CORES_CAMISA = [
  '#3b82f6',
  '#ef4444',
  '#a855f7',
  '#14b8a6',
  '#f59e0b',
  '#64748b',
  '#ec4899',
  '#84cc16',
];
export const CORES_CALCA = ['#334155', '#1e3a8a', '#3f3f46', '#4a2f22'];

/** As CSS variables do HUD (aplicadas no contêiner do jogo). */
export const VARIAVEIS_CSS: Record<string, string> = {
  '--px-ink': P.ink,
  '--px-box': '#111a2e',
  '--px-box2': P.s8,
  '--px-line': P.s2,
  '--px-line-dim': P.s6,
  '--px-txt': '#e2e8f0',
  '--px-txt-dim': P.s4,
  '--px-blue': P.blue5,
  '--px-alien': P.alien,
  '--px-green': '#22c55e',
  '--px-amber': P.amber5,
  '--px-amber-lt': P.amber3,
  '--px-red': P.red5,
  '--px-red-dk': P.red7,
};
