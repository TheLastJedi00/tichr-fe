/**
 * O catálogo único de motivos (spec 034 #63–#69): nenhuma ação some em
 * silêncio. Cada texto diz **o fator** e **o que fazer ou quando volta**, sem
 * vazar segredo (nada cita papel, NPC ou o conteúdo do cofre).
 *
 * O texto vem de duas origens, as duas apontando para este catálogo: o
 * **estado** (o celular já sabe o fator) e a **recusa do servidor** (`code`
 * estável, quando o fator mora no cofre). A `message` do servidor é só o
 * último recurso.
 */
export type ChaveMotivo =
  | 'PORTAS_FECHADAS'
  | 'NOITE_NAO_COMECOU'
  | 'POSICAO_TRAVADA_REPARO'
  | 'POSICAO_TRAVADA_RESGATE'
  | 'FORA_DA_VILA'
  | 'MOVER_RAPIDO'
  | 'PASSO_RAPIDO'
  | 'PARTIDA_PAUSADA'
  | 'JA_CONFIRMOU'
  | 'FORA_DA_NOITE_REPARO'
  | 'REPARO_EM_ANDAMENTO'
  | 'REPARO_JA_ORGANIZADO'
  | 'FORA_DA_NOITE_RESGATE'
  | 'SAUDE_EM_RUINAS'
  | 'SEM_RESGATAVEIS'
  | 'RESGATE_USADO'
  | 'POUCA_GENTE_NA_SAUDE'
  | 'FORA_DA_NOITE_QUARENTENA'
  | 'COMUNICACAO_EM_RUINAS'
  | 'CONVOCADOR_BLOQUEADO'
  | 'QUARENTENA_USADA'
  | 'QUARENTENA_JA_CONVOCADA'
  | 'JA_RESPONDI'
  | 'TEMPO_ESGOTADO'
  | 'FORA_DA_VILA_VOTO'
  | 'JA_VOTEI'
  | 'SETOR_EM_RUINAS'
  | 'SEM_ALVO_AQUI'
  | 'ENERGIA_INSUFICIENTE'
  | 'PODER_FORA_DA_NOITE'
  | 'SO_ORIGINAL'
  | 'JOGADA_FEITA';

/** As variáveis que alguns textos pedem (`{n}`, `{atual}`, `{k}`). */
export type VariaveisMotivo = Record<string, string | number>;

const TEXTOS: Record<ChaveMotivo, string> = {
  PORTAS_FECHADAS: 'As portas só se abrem à noite.',
  NOITE_NAO_COMECOU: 'A noite começa em {n}s. Leia o resultado da rodada.',
  POSICAO_TRAVADA_REPARO: 'Você organizou o reparo: fica neste setor esta noite.',
  POSICAO_TRAVADA_RESGATE: 'Você organizou o resgate: fica neste setor esta noite.',
  FORA_DA_VILA:
    'Você está fora da vila. Acompanhe a partida e responda às questões.',
  MOVER_RAPIDO: 'Calma! Espere um instante antes de trocar de porta.',
  PASSO_RAPIDO: 'Calma! Um passo por segundo.',
  PARTIDA_PAUSADA: 'Partida pausada pelo professor.',
  JA_CONFIRMOU: 'Você já confirmou. Entre numa porta para mudar de ideia.',
  FORA_DA_NOITE_REPARO: 'O reparo só pode ser organizado à noite.',
  REPARO_EM_ANDAMENTO: 'Já há um reparo em andamento esta noite.',
  REPARO_JA_ORGANIZADO: 'Você já organizou o reparo. Ele sai no amanhecer.',
  FORA_DA_NOITE_RESGATE: 'O resgate só pode ser organizado à noite.',
  SAUDE_EM_RUINAS:
    'O Setor de Saúde está em ruínas. Reconstrua-o para organizar um resgate.',
  SEM_RESGATAVEIS: 'Ninguém saiu da vila: não há quem resgatar.',
  RESGATE_USADO: 'Já há um resgate organizado esta noite.',
  POUCA_GENTE_NA_SAUDE:
    'Precisa de 2 ou mais pessoas na Saúde no amanhecer. Agora há {n}.',
  FORA_DA_NOITE_QUARENTENA:
    'A Quarentena só pode ser convocada à noite, de dentro da Comunicação.',
  COMUNICACAO_EM_RUINAS:
    'O Setor de Comunicação está em ruínas. Reconstrua o rádio para convocar a Quarentena.',
  CONVOCADOR_BLOQUEADO:
    'Sua última Quarentena prendeu um inocente. Você poderá convocar de novo na próxima rodada.',
  QUARENTENA_USADA: 'A vila já entrou em Quarentena nesta rodada.',
  QUARENTENA_JA_CONVOCADA: 'Uma Quarentena já foi convocada para esta rodada.',
  JA_RESPONDI: 'Resposta enviada. Aguarde os outros.',
  TEMPO_ESGOTADO: 'O tempo da questão acabou.',
  FORA_DA_VILA_VOTO: 'Quem saiu da vila não vota.',
  JA_VOTEI: 'Voto registrado. Aguarde os outros.',
  SETOR_EM_RUINAS: 'Este setor já está em ruínas: não há o que sabotar.',
  SEM_ALVO_AQUI: 'Ninguém neste setor para abduzir.',
  ENERGIA_INSUFICIENTE:
    'Energia alien {atual}/3: faltam {k} para um superpoder (acertos).',
  PODER_FORA_DA_NOITE: 'Superpoderes só são escolhidos à noite.',
  SO_ORIGINAL: 'Só a Ameaça original pode contagiar.',
  JOGADA_FEITA: 'Você já fez sua jogada esta noite.',
};

/**
 * O `code` do servidor → chave do catálogo. `FORA_DA_NOITE` depende do que se
 * tentou fazer (reparo, resgate, Quarentena, poder), por isso o chamador passa
 * a ação.
 */
export type AcaoDoMotivo = 'REPARO' | 'RESGATE' | 'QUARENTENA' | 'PODER' | 'PORTA';

const CODIGOS: Record<string, ChaveMotivo> = {
  NOITE_NAO_COMECOU: 'NOITE_NAO_COMECOU',
  FORA_DA_VILA: 'FORA_DA_VILA',
  FORA_DA_VILA_VOTO: 'FORA_DA_VILA_VOTO',
  MOVER_RAPIDO: 'MOVER_RAPIDO',
  PASSO_RAPIDO: 'PASSO_RAPIDO',
  PARTIDA_PAUSADA: 'PARTIDA_PAUSADA',
  REPARO_EM_ANDAMENTO: 'REPARO_EM_ANDAMENTO',
  REPARO_JA_ORGANIZADO: 'REPARO_JA_ORGANIZADO',
  SAUDE_EM_RUINAS: 'SAUDE_EM_RUINAS',
  SEM_RESGATAVEIS: 'SEM_RESGATAVEIS',
  RESGATE_USADO: 'RESGATE_USADO',
  COMUNICACAO_EM_RUINAS: 'COMUNICACAO_EM_RUINAS',
  CONVOCADOR_BLOQUEADO: 'CONVOCADOR_BLOQUEADO',
  QUARENTENA_USADA: 'QUARENTENA_USADA',
  QUARENTENA_JA_CONVOCADA: 'QUARENTENA_JA_CONVOCADA',
  SETOR_EM_RUINAS: 'SETOR_EM_RUINAS',
  ENERGIA_INSUFICIENTE: 'ENERGIA_INSUFICIENTE',
  SO_ORIGINAL: 'SO_ORIGINAL',
  JOGADA_FEITA: 'JOGADA_FEITA',
};

const FORA_DA_NOITE: Record<AcaoDoMotivo, ChaveMotivo> = {
  REPARO: 'FORA_DA_NOITE_REPARO',
  RESGATE: 'FORA_DA_NOITE_RESGATE',
  QUARENTENA: 'FORA_DA_NOITE_QUARENTENA',
  PODER: 'PODER_FORA_DA_NOITE',
  PORTA: 'PORTAS_FECHADAS',
};

/** O texto do motivo, com as variáveis `{...}` preenchidas. */
export function textoDoMotivo(
  chave: ChaveMotivo,
  variaveis: VariaveisMotivo = {},
): string {
  return TEXTOS[chave].replace(/\{(\w+)\}/g, (_, k: string) =>
    String(variaveis[k] ?? ''),
  );
}

/** Traduz a recusa do servidor para a chave do catálogo (ou `null`). */
export function chaveDoCodigo(
  code: string | undefined,
  acao: AcaoDoMotivo = 'PORTA',
): ChaveMotivo | null {
  if (!code) return null;
  if (code === 'FORA_DA_NOITE') return FORA_DA_NOITE[acao];
  return CODIGOS[code] ?? null;
}

/**
 * O texto a mostrar para uma recusa do servidor: o do catálogo (com as
 * variáveis) ou, em último caso, a `message` que o servidor mandou.
 */
export function motivoDaRecusa(
  erro: { error?: { code?: string; message?: string } } | undefined,
  acao: AcaoDoMotivo = 'PORTA',
  variaveis: VariaveisMotivo = {},
): string | null {
  const chave = chaveDoCodigo(erro?.error?.code, acao);
  if (chave) return textoDoMotivo(chave, variaveis);
  return erro?.error?.message ?? null;
}
