import { P } from '../../isolateus-paleta';
import { DesenhoDoSetor, W } from './fundo-comum';

/** Setor de Energia: a usina com chaminés, a subestação e a torre de alta tensão. */
export const desenharEnergia: DesenhoDoSetor = (p) => {
  const { r, win, rr, linha } = p;
  p.predio([40, 92, 160, 58]);
  r(40, 92, 160, 58, P.s7);
  r(36, 88, 168, 5, P.s6);
  for (const cx of [66, 100]) {
    r(cx, 36, 14, 56, P.s6);
    for (let y = 36; y < 92; y += 12) r(cx, y, 14, 4, P.red7);
    r(cx - 1, 34, 16, 3, P.s5);
    for (let k = 0; k < 7; k++) {
      r(cx + 2 + Math.floor(rr() * 12) - 4, 20 + Math.floor(rr() * 14), 3 + Math.floor(rr() * 4), 2, P.s7);
    }
  }
  p.placa('USINA', 150, 98, P.amber3, P.ink);
  for (let i = 0; i < 4; i++) win(124 + i * 18, 114, 12, 12, rr() < 0.7);
  r(54, 112, 3, 3, P.amber5);
  r(52, 115, 3, 3, P.amber5);
  r(55, 118, 3, 3, P.amber5);
  r(53, 121, 3, 3, P.amber5);
  p.predio([210, 112, 70, 38]);
  for (let i = 0; i < 3; i++) {
    r(212 + i * 24, 114, 20, 36, P.s6);
    for (let y = 118; y < 148; y += 4) r(214 + i * 24, y, 16, 1, P.s7);
    r(218 + i * 24, 108, 8, 6, P.s5);
  }
  linha(286, 112, 296, 40, P.s5);
  linha(306, 112, 296, 40, P.s5);
  for (let y = 50; y < 112; y += 12) {
    const off = ((y - 40) / 72) * 10;
    linha(296 - off, y, 296 + off, y + 12, P.s6);
    linha(296 + off, y, 296 - off, y + 12, P.s6);
  }
  r(282, 52, 28, 2, P.s5);
  for (let x2 = 0; x2 < W - 10; x2 += 3) r(x2, 54 + Math.round(Math.sin(x2 / 40) * 2), 1, 1, P.s7);
};
