/**
 * Cronômetro de entrada do lobby (spec 035), comum a Qlick, Wor e Isolateus.
 * O servidor decide o início; o cliente só mostra a contagem e, no zero, pede
 * o início automático (o servidor revalida o prazo).
 */
export const DURACOES_ENTRADA = [30, 60, 120, 180, 300] as const;
export const DURACAO_PADRAO = 120;

export function rotuloDuracao(segundos: number): string {
  return segundos < 60 ? `${segundos}s` : `${segundos / 60} min`;
}

/** Milissegundos até o fim da entrada (0 se venceu; null sem cronômetro). */
export function restanteEntrada(
  encerraEm: string | null | undefined,
  agora: number,
): number | null {
  if (!encerraEm) return null;
  return Math.max(0, Date.parse(encerraEm) - agora);
}

/** "1:42" a partir de milissegundos (arredonda para cima: 0:01 até zerar). */
export function formatarRestante(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * O card do painel do aluno (035 #12–#14): colorido com contagem enquanto a
 * entrada está aberta; apagado quando a partida começou sem ele.
 */
export type EstadoCardJogo =
  | { tipo: 'ABERTO'; restanteMs: number | null }
  | { tipo: 'JOGANDO' }
  | { tipo: 'FECHADO' };

export function estadoCardJogo(
  partida: {
    status: string;
    entradaEncerraEm?: string | null;
    participa?: boolean;
  },
  agora: number,
): EstadoCardJogo {
  if (partida.status === 'LOBBY') {
    return {
      tipo: 'ABERTO',
      restanteMs: restanteEntrada(partida.entradaEncerraEm, agora),
    };
  }
  // Resposta antiga do servidor (sem o campo): mantém o card como era.
  if (partida.participa === undefined) return { tipo: 'JOGANDO' };
  return partida.participa ? { tipo: 'JOGANDO' } : { tipo: 'FECHADO' };
}

/** Texto do aviso quando o prazo venceu sem gente suficiente (035 #8). */
export function textoEntradaFalhou(f: { inscritos: number; minimo: number }): string {
  const n = f.inscritos;
  return `Tempo esgotado com ${n} inscrito${n === 1 ? '' : 's'}: o mínimo é ${f.minimo}. Ligue o cronômetro de novo ou inicie quando houver gente.`;
}
