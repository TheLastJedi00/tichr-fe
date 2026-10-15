/**
 * A pausa do professor, comum aos três jogos (spec 028 §4).
 *
 * Todo cronômetro do cliente é derivado de um marco público da partida
 * (`perguntaIniciadaEm`, `rodadaIniciadaEm`, `faseIniciadaEm`) e do relógio
 * local. Pausada, a partida traz `pausadaEm`: contar até ele (e não até agora)
 * congela o tempo restante exatamente onde estava. Ao retomar, o servidor já
 * devolve o marco empurrado pelo tempo pausado.
 */
export function relogioDaPartida(
  agora: number,
  partida: { pausadaEm?: string | null } | null | undefined,
): number {
  return partida?.pausadaEm ? Date.parse(partida.pausadaEm) : agora;
}

/** Status em que o professor pode pausar (fora do lobby e do encerramento). */
export function podePausar(status: string | undefined): boolean {
  return !!status && status !== 'LOBBY' && status !== 'ENCERRADO';
}
