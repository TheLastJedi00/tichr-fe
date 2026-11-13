import { P } from '../../isolateus-paleta';
import { DesenhoDoSetor } from './fundo-comum';

/** Setor de Comércio: o mercado, com três lojas de toldo. */
export const desenharComercio: DesenhoDoSetor = (p) => {
  const { r, win } = p;
  const lojas: Array<[number, string, string]> = [
    [48, P.s7, '#7f1d1d'],
    [124, '#2c3a52', '#1e3a8a'],
    [200, P.s7, '#365314'],
  ];
  for (const [sx, parede, toldo] of lojas) {
    p.predio([sx, 86, 72, 64]);
    r(sx, 86, 72, 64, parede);
    r(sx - 2, 82, 76, 4, P.s6);
    for (let i = 0; i < 72; i += 8) {
      r(sx + i, 92, 4, 8, toldo);
      r(sx + i + 4, 92, 4, 8, P.s2);
    }
    for (let i = 0; i < 72; i += 4) r(sx + i + 1, 100, 2, 2, toldo);
    win(sx + 6, 106, 38, 24, true, '#c7a45a');
    for (let g = 0; g < 7; g++) {
      r(sx + 9 + g * 5, 122, 3, 5, p.sortear([P.red5, P.amber5, P.blue5, P.alien2, P.white]));
    }
    r(sx + 50, 108, 16, 42, P.s8);
    r(sx + 63, 128, 2, 2, P.amber3);
  }
  p.placa('MERCADO', 160, 68, P.amber3, P.brown);
};
