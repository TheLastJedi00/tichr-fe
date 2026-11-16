import { P } from '../../isolateus-paleta';
import { DesenhoDoSetor } from './fundo-comum';

/** Setor de Saúde: o hospital, com a cruz vermelha. */
export const desenharSaude: DesenhoDoSetor = (p) => {
  const { r, win, rr } = p;
  p.predio([56, 58, 208, 92]);
  r(56, 58, 208, 92, P.s6);
  r(52, 54, 216, 6, P.s5);
  r(52, 60, 216, 1, P.ink);
  for (let i = 0; i < 208; i += 6) r(56 + i, 112, 3, 1, P.s7);
  p.placa('HOSPITAL', 160, 64, P.red5, P.white);
  r(151, 77, 18, 18, P.white);
  r(157, 79, 6, 14, P.red5);
  r(153, 83, 14, 6, P.red5);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 6; i++) {
      const wx = 68 + i * 32;
      if (wx > 135 && wx < 175) continue;
      win(wx, 82 + row * 22, 16, 14, rr() < 0.75, P.blueWin);
    }
  }
  r(136, 118, 48, 32, P.s7);
  r(142, 122, 36, 28, P.ink);
  r(158, 122, 2, 28, P.s6);
  r(138, 114, 44, 4, P.red7);
};
