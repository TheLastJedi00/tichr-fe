import { nivelDeXp } from './nivel.util';

describe('nivelDeXp', () => {
  it('devolve a chave estável de cada tier pelos limiares default', () => {
    expect(nivelDeXp(0).chave).toBe('bronze');
    expect(nivelDeXp(500).chave).toBe('prata');
    expect(nivelDeXp(1000).chave).toBe('ouro');
    expect(nivelDeXp(2000).chave).toBe('diamante');
    expect(nivelDeXp(4000).chave).toBe('platina');
  });

  it('respeita os limiares da turma', () => {
    const l = { prata: 10, ouro: 20, diamante: 30, platina: 40 };
    expect(nivelDeXp(35, l)).toEqual(
      jasmine.objectContaining({ chave: 'diamante', nome: 'Diamante' }),
    );
  });
});
