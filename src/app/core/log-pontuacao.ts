import { LogPontuacaoJogador } from './models';

/**
 * Ranking por aluno a partir do log do Wor, onde os pontos são da equipe. A
 * soma dos itens já inclui o fator ×0,5 da não campeã, então é o que cada um
 * levou da partida, valendo ou não para o ranking.
 */
export function rankingDoLog(
  log: LogPontuacaoJogador[] | undefined,
): Array<LogPontuacaoJogador & { posicao: number; pontos: number }> {
  return (log ?? [])
    .map((l) => ({ ...l, pontos: l.itens.reduce((s, i) => s + i.pontos, 0) }))
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome))
    .map((l, i) => ({ ...l, posicao: i + 1 }));
}
