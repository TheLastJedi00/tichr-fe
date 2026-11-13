import {
  chaveDoCodigo,
  motivoDaRecusa,
  textoDoMotivo,
} from './isolateus-motivos';

describe('isolateus-motivos (spec 034 #63–#69)', () => {
  it('preenche as variáveis do texto', () => {
    expect(textoDoMotivo('NOITE_NAO_COMECOU', { n: 4 })).toBe(
      'A noite começa em 4s. Leia o resultado da rodada.',
    );
    expect(textoDoMotivo('ENERGIA_INSUFICIENTE', { atual: 1, k: 2 })).toBe(
      'Energia alien 1/3: faltam 2 para um superpoder (acertos).',
    );
    expect(textoDoMotivo('POUCA_GENTE_NA_SAUDE', { n: 1 })).toContain('Agora há 1.');
  });

  it('o code do servidor aponta para o mesmo catálogo', () => {
    expect(chaveDoCodigo('RESGATE_USADO')).toBe('RESGATE_USADO');
    expect(chaveDoCodigo('QUARENTENA_JA_CONVOCADA')).toBe('QUARENTENA_JA_CONVOCADA');
    expect(chaveDoCodigo('NAO_EXISTE')).toBeNull();
  });

  it('FORA_DA_NOITE depende da ação tentada', () => {
    expect(chaveDoCodigo('FORA_DA_NOITE', 'REPARO')).toBe('FORA_DA_NOITE_REPARO');
    expect(chaveDoCodigo('FORA_DA_NOITE', 'RESGATE')).toBe('FORA_DA_NOITE_RESGATE');
    expect(chaveDoCodigo('FORA_DA_NOITE', 'QUARENTENA')).toBe('FORA_DA_NOITE_QUARENTENA');
    expect(chaveDoCodigo('FORA_DA_NOITE', 'PODER')).toBe('PODER_FORA_DA_NOITE');
  });

  it('a recusa usa o catálogo; a message do servidor é o último recurso', () => {
    expect(
      motivoDaRecusa({ error: { code: 'SAUDE_EM_RUINAS', message: 'x' } }),
    ).toContain('Setor de Saúde está em ruínas');
    expect(
      motivoDaRecusa({ error: { code: 'DESCONHECIDO', message: 'texto do servidor' } }),
    ).toBe('texto do servidor');
    expect(motivoDaRecusa({ error: {} })).toBeNull();
  });

  it('nenhum texto vaza papel, NPC ou o conteúdo do cofre (#69)', () => {
    const chaves = [
      'RESGATE_USADO',
      'REPARO_EM_ANDAMENTO',
      'QUARENTENA_JA_CONVOCADA',
      'FORA_DA_VILA',
    ] as const;
    for (const c of chaves) {
      expect(textoDoMotivo(c)).not.toMatch(/npc|ameaça|alien|infiltrad/i);
    }
  });
});
