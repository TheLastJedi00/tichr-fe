import { mensagemDoTurno } from './isolateus-mensagens';

describe('mensagem do turno (spec 034 #17, #56)', () => {
  it('traz o progresso "RODADA n/N" no título, em todas as fases', () => {
    for (const fase of [
      'DESLOCAMENTO',
      'QUESTAO_ATIVA',
      'QUARENTENA_VOTO',
      'RESGATE_VOTO',
      'PAUSA',
    ] as const) {
      expect(mensagemDoTurno(fase, 2, 10).titulo).toContain('RODADA 3/10');
    }
  });

  it('diz o que fazer na noite', () => {
    expect(mensagemDoTurno('DESLOCAMENTO', 0, 5).texto).toBe(
      'As portas se abriram. Entre numa porta ou toque em Ficar neste setor.',
    );
  });

  it('não passa do total', () => {
    expect(mensagemDoTurno('QUESTAO_ATIVA', 9, 10).titulo).toContain('10/10');
  });
});
