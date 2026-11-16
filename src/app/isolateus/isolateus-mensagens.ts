/**
 * A mensagem do turno (spec 034 #17, #56): a caixa de texto fixa no topo da
 * tela, que diz o que fazer em cada fase. Os textos vivem numa constante só,
 * para revisar sem mexer em tela.
 */
import { StatusIsolateus } from '../core/models';

export interface MensagemTurno {
  /** O título da caixa, com a rodada ("RODADA 3/10"). */
  titulo: string;
  texto: string;
}

export type FaseDaMensagem = StatusIsolateus | 'AMANHECER' | 'PAUSA' | 'RESULTADO';

const TEXTOS: Record<string, string> = {
  DESLOCAMENTO:
    'As portas se abriram. Entre numa porta ou toque em Ficar neste setor.',
  AMANHECER: 'Veja o que mudou na vila.',
  QUESTAO_ATIVA: 'Responda à questão do Comando Central.',
  QUARENTENA_DEBATE: 'Quarentena convocada: debata antes de votar.',
  QUARENTENA_VOTO: 'Quarentena convocada: vote em quem isolar.',
  RESGATE_VOTO: 'Resgate em andamento: vote em quem trazer de volta.',
  RESULTADO: 'Leia o resultado da rodada. A noite já vai começar.',
  PAUSA: 'Partida pausada pelo professor.',
  ENCERRADO: 'A investigação terminou.',
  LOBBY: 'Aguarde o professor iniciar a investigação.',
  RESULTADO_RODADA: 'Leia o resultado da rodada.',
};

const ROTULO_FASE: Record<string, string> = {
  DESLOCAMENTO: 'NOITE',
  AMANHECER: 'AMANHECER',
  QUESTAO_ATIVA: 'QUESTÃO',
  QUARENTENA_DEBATE: 'QUARENTENA',
  QUARENTENA_VOTO: 'QUARENTENA',
  RESGATE_VOTO: 'RESGATE',
  RESULTADO: 'RESULTADO',
  PAUSA: 'PAUSA',
  ENCERRADO: 'FIM',
  LOBBY: 'LOBBY',
  RESULTADO_RODADA: 'RESULTADO',
};

/**
 * A mensagem de uma fase. O título traz sempre o progresso da partida
 * ("RODADA 3/10", em todas as fases) — o professor e a turma sabem quanto falta.
 */
export function mensagemDoTurno(
  fase: FaseDaMensagem,
  rodada: number,
  totalRodadas: number,
): MensagemTurno {
  const total = Math.max(totalRodadas, rodada + 1);
  const progresso = `RODADA ${Math.min(rodada + 1, total)}/${total}`;
  return {
    titulo: `${ROTULO_FASE[fase] ?? fase} · ${progresso}`,
    texto: TEXTOS[fase] ?? '',
  };
}
