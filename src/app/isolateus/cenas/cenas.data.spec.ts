import { MAPA } from '../../core/isolateus-mapa';
import { CENA, objetoCentralDe, portasDe, posicaoEm, xDaPorta } from './cenas.data';

describe('cenas.data (espelho da geometria do backend)', () => {
  it('toda ligação da malha vira uma porta', () => {
    for (const s of MAPA) {
      expect(portasDe(s.id).map((p) => p.para).sort()).toEqual([...s.vizinhos].sort());
    }
  });

  it('o lado segue o mapa e a Comunicação tem a porta do fundo à direita do centro', () => {
    expect(portasDe('seguranca').find((p) => p.para === 'energia')!.lado).toBe('direita');
    expect(portasDe('seguranca').find((p) => p.para === 'comercio')!.lado).toBe('esquerda');
    const fundo = portasDe('comunicacao').find((p) => p.lado === 'fundo')!;
    expect(fundo.para).toBe('saude');
    expect(fundo.x).toBeGreaterThan(CENA.LARGURA / 2);
    expect(xDaPorta('seguranca', 'abastecimento')).toBeUndefined();
  });

  it('os x das portas casam com o backend (24 / 296 / 220)', () => {
    expect(xDaPorta('seguranca', 'comercio')).toBe(24);
    expect(xDaPorta('seguranca', 'energia')).toBe(296);
    expect(xDaPorta('comunicacao', 'saude')).toBe(220);
  });

  it('a caminhada é linear, em velocidade fixa, e para no alvo', () => {
    const passo = { x: 100, alvoX: 200, t: 0 };
    expect(posicaoEm(passo, 1000)).toBeCloseTo(100 + CENA.VELOCIDADE);
    expect(posicaoEm(passo, 60_000)).toBe(200);
    expect(posicaoEm(passo, -5)).toBe(100);
  });

  it('o objeto do centro: reparo em ruínas, resgate na Saúde, Quarentena na Comunicação', () => {
    expect(objetoCentralDe('energia', false)).toBe('REPARO');
    expect(objetoCentralDe('saude', true)).toBe('RESGATE');
    expect(objetoCentralDe('comunicacao', true)).toBe('QUARENTENA');
    expect(objetoCentralDe('energia', true)).toBeNull();
    // Em ruínas, o que dá para fazer é reparar (decisão #67).
    expect(objetoCentralDe('saude', false)).toBe('REPARO');
  });
});
