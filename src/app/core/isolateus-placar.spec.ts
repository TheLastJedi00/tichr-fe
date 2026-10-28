import { alienDoPlacar } from './isolateus-placar';
import { PlacarIsolateus } from './models';

describe('alienDoPlacar', () => {
  const linha = (alunoId: string, papel?: PlacarIsolateus['papel']): PlacarIsolateus => ({
    posicao: 1,
    alunoId,
    nome: `Cidade ${alunoId}`,
    pontos: 0,
    ...(papel ? { papel } : {}),
  });

  it('acha a Ameaça original, não a contagiada', () => {
    const r = alienDoPlacar([linha('a', 'CONTAGIADO'), linha('b', 'ALIEN'), linha('c')]);
    expect(r?.alunoId).toBe('b');
  });

  it('partida antiga, sem papel no placar, não tem Alienígena', () => {
    expect(alienDoPlacar([linha('a'), linha('b')])).toBeNull();
  });
});
