import { P } from '../../isolateus-paleta';
import { DesenhoDoSetor } from './fundo-comum';

/** Setor de Abastecimento: a caixa d'água e o depósito com caixotes. */
export const desenharAbastecimento: DesenhoDoSetor = (p) => {
  const { r } = p;
  p.predio([62, 38, 64, 112]);
  r(70, 40, 50, 34, P.s6);
  r(66, 46, 58, 22, P.s6);
  r(70, 36, 50, 4, P.s5);
  r(76, 32, 38, 4, P.s5);
  for (let y = 48; y < 70; y += 6) r(66, y, 58, 1, P.s7);
  p.placa('ÁGUA', 95, 50, P.blue3, P.s8);
  for (const lx of [72, 92, 114]) r(lx, 74, 3, 76, P.s7);
  for (let y = 80; y < 148; y += 16) r(72, y, 45, 1, P.s7);
  for (let y = 76; y < 150; y += 4) r(124, y, 4, 1, P.s5);
  p.predio([140, 90, 140, 60]);
  r(140, 90, 140, 60, P.s7);
  r(136, 84, 148, 7, P.s6);
  for (let i = 0; i < 140; i += 4) r(140 + i, 91, 1, 59, P.s8);
  p.placa('DEPÓSITO', 210, 96, P.amber3, P.ink);
  r(170, 112, 50, 38, P.s6);
  for (let y = 114; y < 150; y += 3) r(172, y, 46, 1, P.s7);
  const caixotes: Array<[number, number]> = [[232, 134], [248, 134], [264, 134], [240, 118], [256, 118]];
  for (const [cx, cy] of caixotes) {
    r(cx, cy, 15, 16, P.brown2);
    r(cx, cy, 15, 1, P.brown);
    r(cx, cy + 15, 15, 1, P.brown);
    r(cx + 7, cy, 1, 16, P.brown);
  }
};
