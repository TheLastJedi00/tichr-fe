/**
 * A noite do Isolateus (036): ela é o tempo de movimentação, escolhido no lobby.
 * Espelho de `ISOLATEUS.OPCOES_NOITE_S` / `LIMITE_NOITE_PADRAO_MS` do backend.
 */
export const OPCOES_NOITE_S = [10, 20, 30, 45, 60] as const;
export const NOITE_PADRAO_S = 20;
/** Partidas anteriores à 036 (sem `limiteNoiteMs`): a noite legada. */
export const NOITE_LEGADA_S = 15;

/** A duração da noite da partida, em segundos. */
export function segundosDaNoite(p: { limiteNoiteMs?: number | null } | null | undefined): number {
  return p?.limiteNoiteMs ? Math.round(p.limiteNoiteMs / 1000) : NOITE_LEGADA_S;
}
