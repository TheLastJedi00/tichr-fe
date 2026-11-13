import { P } from '../../isolateus-paleta';
import { DesenhoDoSetor } from './fundo-comum';

/**
 * Setor de Comunicação: a central de rádio com antenas. As laterais (e o
 * fundo, à direita do centro) ficam livres para as três portas.
 */
export const desenharComunicacao: DesenhoDoSetor = (p) => {
  const { r, win, rr, linha } = p;
  p.predio([64, 96, 140, 54]);
  r(64, 96, 140, 54, P.s7);
  r(60, 92, 148, 5, P.s6);
  p.placa('RÁDIO', 134, 102, P.alien, P.ink);
  for (let i = 0; i < 4; i++) win(76 + i * 32, 118, 16, 12, rr() < 0.7, P.blueWin);
  r(86, 84, 18, 2, P.s4);
  r(84, 80, 2, 4, P.s4);
  r(104, 80, 2, 4, P.s4);
  r(94, 86, 2, 6, P.s5);
  r(88, 78, 14, 2, P.s4);
  linha(244, 150, 258, 20, P.s5);
  linha(272, 150, 258, 20, P.s5);
  for (let y = 30; y < 150; y += 10) {
    const off = ((y - 20) / 130) * 14;
    linha(258 - off, y, 258 + off, y + 10, P.s6);
    linha(258 + off, y, 258 - off, y + 10, P.s6);
  }
  r(257, 12, 2, 8, P.s4);
  for (let x2 = 200; x2 < 258; x2 += 2) r(x2, 60 + Math.round((x2 - 200) / 6), 1, 1, P.s7);
};
