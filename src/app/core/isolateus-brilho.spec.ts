import { noitesAteBrilho, rotuloBrilho, setoresBrilhando } from './isolateus-mapa';

/**
 * O contador do brilho misterioso (025 §5). A `rodada` é 0-indexada: a Noite 3
 * é a rodada 2, e o brilho cai nas noites 3, 6, 9…
 */
describe('Isolateus — relógio do brilho', () => {
  const noite = (rodada: number) => ({ rodada, status: 'DESLOCAMENTO', cicloBrilho: 3 });
  const dia = (rodada: number) => ({ rodada, status: 'RESULTADO_RODADA', cicloBrilho: 3 });

  it('Noite 1: faltam 2 noites; Noite 3: é esta noite', () => {
    expect(noitesAteBrilho(noite(0))).toBe(2);
    expect(noitesAteBrilho(noite(2))).toBe(0);
    expect(rotuloBrilho(noite(2))).toBe('Brilho misterioso esta noite');
  });

  it('no dia seguinte ao brilho, o próximo é dali a um ciclo', () => {
    expect(noitesAteBrilho(dia(2))).toBe(3);
    expect(rotuloBrilho(dia(2))).toBe('Brilho misterioso em 3 noites');
  });

  it('no dia da Noite 2, falta 1 noite (singular)', () => {
    expect(rotuloBrilho(dia(1))).toBe('Brilho misterioso em 1 noite');
  });

  it('sem o campo, o ciclo é 3', () => {
    expect(noitesAteBrilho({ rodada: 0, status: 'DESLOCAMENTO' })).toBe(2);
  });

  it('o setor brilha só no dia da noite do brilho', () => {
    const brilho = { rodada: 2, setorIds: ['energia'] };
    expect(setoresBrilhando({ ...dia(2), brilho })).toEqual(['energia']);
    expect(setoresBrilhando({ ...noite(2), brilho })).toEqual([]);
    expect(setoresBrilhando({ ...noite(3), brilho })).toEqual([]);
  });
});
