import {
  DURACOES_ENTRADA,
  estadoCardJogo,
  formatarRestante,
  restanteEntrada,
  rotuloDuracao,
  textoEntradaFalhou,
} from './entrada';

describe('entrada (035)', () => {
  const agora = Date.parse('2026-11-18T12:00:00.000Z');

  it('durações e rótulos dos chips', () => {
    expect(DURACOES_ENTRADA.map(rotuloDuracao)).toEqual([
      '30s',
      '1 min',
      '2 min',
      '3 min',
      '5 min',
    ]);
  });

  it('restante e formato m:ss', () => {
    expect(restanteEntrada(null, agora)).toBeNull();
    expect(restanteEntrada('2026-11-18T12:01:42.000Z', agora)).toBe(102_000);
    expect(restanteEntrada('2026-11-18T11:59:00.000Z', agora)).toBe(0);
    expect(formatarRestante(102_000)).toBe('1:42');
    expect(formatarRestante(400)).toBe('0:01');
    expect(formatarRestante(0)).toBe('0:00');
  });

  it('card: aberto com contagem, jogando ou fechado', () => {
    expect(
      estadoCardJogo(
        { status: 'LOBBY', entradaEncerraEm: '2026-11-18T12:00:30.000Z' },
        agora,
      ),
    ).toEqual({ tipo: 'ABERTO', restanteMs: 30_000 });
    expect(estadoCardJogo({ status: 'LOBBY' }, agora)).toEqual({
      tipo: 'ABERTO',
      restanteMs: null,
    });
    expect(
      estadoCardJogo({ status: 'EM_ANDAMENTO', participa: true }, agora),
    ).toEqual({ tipo: 'JOGANDO' });
    expect(
      estadoCardJogo({ status: 'EM_ANDAMENTO', participa: false }, agora),
    ).toEqual({ tipo: 'FECHADO' });
    // servidor antigo, sem o campo: o card continua como era
    expect(estadoCardJogo({ status: 'EM_ANDAMENTO' }, agora)).toEqual({
      tipo: 'JOGANDO',
    });
  });

  it('aviso de gente de menos', () => {
    expect(textoEntradaFalhou({ inscritos: 1, minimo: 2 })).toContain(
      '1 inscrito: o mínimo é 2',
    );
  });
});
