import { P } from '../../isolateus-paleta';
import { DesenhoDoSetor } from './fundo-comum';

/** Setor de Segurança: a delegacia, com a sirene no topo. */
export const desenharSeguranca: DesenhoDoSetor = (p) => {
  const { r, win, rr } = p;
  p.predio([60, 70, 200, 80]);
  r(60, 70, 200, 80, P.s7);
  r(56, 66, 208, 6, P.s6);
  r(56, 72, 208, 1, P.ink);
  p.placa('DELEGACIA', 160, 76, P.s2, P.blue7);
  for (let i = 0; i < 6; i++) {
    const wx = 70 + i * 31;
    if (wx > 140 && wx < 175) continue;
    win(wx, 92, 14, 16, rr() < 0.7);
    for (let b = 2; b < 14; b += 3) r(wx + b, 92, 1, 16, P.ink);
  }
  r(146, 116, 28, 34, P.s8);
  r(150, 120, 20, 30, P.ink);
  r(144, 146, 32, 4, P.s5);
  r(157, 107, 6, 6, P.amber5);
  r(159, 105, 2, 10, P.amber5);
  r(155, 109, 10, 2, P.amber5);
  r(156, 60, 8, 6, P.s5);
};
