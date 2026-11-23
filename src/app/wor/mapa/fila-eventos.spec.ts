import { ResumoRodada, ResultadoRodadaWor } from '../../core/models';
import { janelaAnimacao, montarFila, tempoPorEvento } from './fila-eventos';

const res = (over: Partial<ResultadoRodadaWor>): ResultadoRodadaWor => ({
  equipeId: 'e1',
  equipeNome: 'E1',
  ordem: 1,
  acertadores: [],
  acao: 'NADA',
  ...over,
});

describe('Wor — fila da animação do fim da rodada (035)', () => {
  it('ordem: ataques por chegada, Catapulta, cura, erro, queda, Usurpação', () => {
    const resumo: ResumoRodada = {
      seq: 3,
      resultados: [
        res({ equipeId: 'e2', ordem: 2, acao: 'ATACAR', alvoEquipeId: 'e1', dano: 100 }),
        res({
          equipeId: 'e1',
          ordem: 1,
          acao: 'ATACAR',
          alvoEquipeId: 'e3',
          dano: 200,
          critico: true,
          arriscar: { nome: 'A', acertou: true, efeito: 'CURA' },
        }),
        res({
          equipeId: 'e3',
          ordem: 3,
          arriscar: { nome: 'C', acertou: true, efeito: 'CATAPULTA', alvoEquipeId: 'e4', dano: 300 },
        }),
        res({ equipeId: 'e4', ordem: 4, arriscar: { nome: 'D', acertou: false } }),
        res({
          equipeId: 'h',
          ordem: 5,
          arriscar: { nome: 'H', acertou: true, efeito: 'USURPACAO', alvoEquipeId: 'e2' },
        }),
      ],
      quedas: ['e4'],
    };
    const fila = montarFila(resumo, new Set(['h']));
    expect(fila.map((e) => e.tipo)).toEqual([
      'ATAQUE',
      'ATAQUE',
      'CATAPULTA',
      'CURA',
      'ERRO',
      'QUEDA',
      'USURPACAO',
    ]);
    expect(fila[0]).toEqual({ tipo: 'ATAQUE', de: 'e1', alvo: 'e3', dano: 200, critico: true });
    expect(fila[6]).toEqual({ tipo: 'USURPACAO', horda: 'h', lider: 'e2' });
  });

  it('o arriscar errado da Horda não tira HP (é a Invasão que falhou)', () => {
    const resumo: ResumoRodada = {
      seq: 1,
      resultados: [res({ equipeId: 'h', arriscar: { nome: 'H', acertou: false } })],
    };
    expect(montarFila(resumo, new Set(['h']))).toEqual([]);
  });

  it('janela igual à do servidor e tempo por evento dentro dela', () => {
    const vazio: ResumoRodada = { seq: 1, resultados: [] };
    expect(janelaAnimacao(vazio)).toBe(2500);
    expect(tempoPorEvento(vazio)).toBe(0);
    const dois: ResumoRodada = {
      seq: 1,
      resultados: [res({ acao: 'ATACAR', alvoEquipeId: 'e2', dano: 100 })],
      quedas: ['e2'],
    };
    expect(janelaAnimacao(dois)).toBe(4900);
    expect(tempoPorEvento(dois)).toBe(1200);
    const muitos: ResumoRodada = {
      seq: 1,
      resultados: Array.from({ length: 10 }, (_, i) =>
        res({ equipeId: `e${i}`, ordem: i, acao: 'ATACAR', alvoEquipeId: 'x', dano: 100 }),
      ),
    };
    expect(janelaAnimacao(muitos)).toBe(12000);
    expect(tempoPorEvento(muitos)).toBe(950);
  });
});
