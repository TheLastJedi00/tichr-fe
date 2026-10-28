import { PlacarIsolateus } from './models';

/**
 * A linha do Alienígena (a Ameaça original) no placar final, para o card do
 * veredito (spec 030 §1.3). `null` em partida encerrada antes da revelação.
 */
export function alienDoPlacar(ranking: PlacarIsolateus[]): PlacarIsolateus | null {
  return ranking.find((r) => r.papel === 'ALIEN') ?? null;
}

/** Rótulo do selo de papel revelado no placar final. */
export const ROTULO_PAPEL: Record<NonNullable<PlacarIsolateus['papel']>, string> = {
  ALIEN: 'Alienígena',
  CONTAGIADO: 'Contagiado',
};
