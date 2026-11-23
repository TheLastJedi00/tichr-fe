import { NOITE_LEGADA_S, OPCOES_NOITE_S, segundosDaNoite } from './isolateus-noite';

describe('isolateus-noite (036)', () => {
  it('a noite é o tempo de movimentação da partida', () => {
    expect(segundosDaNoite({ limiteNoiteMs: 45_000 })).toBe(45);
  });

  it('partida antiga, sem o campo, usa a noite legada', () => {
    expect(segundosDaNoite({})).toBe(NOITE_LEGADA_S);
    expect(segundosDaNoite(null)).toBe(NOITE_LEGADA_S);
  });

  it('os chips espelham o backend', () => {
    expect([...OPCOES_NOITE_S]).toEqual([10, 20, 30, 45, 60]);
  });
});
