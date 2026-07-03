import { PlanoAtual } from './models';

/** Recursos gerenciaveis sujeitos a gating por plano. */
export type Recurso = 'GESTAO_EQUIPES' | 'DINAMICAS';

/** Plano minimo exigido por recurso (ponto unico de verdade do gating). */
export const RECURSO_PLANO_MINIMO: Record<Recurso, PlanoAtual> = {
  GESTAO_EQUIPES: 'MESTRE',
  DINAMICAS: 'MESTRE',
};

/** Rotulo amigavel de cada recurso (usado nas telas de bloqueio). */
export const NOME_RECURSO: Record<Recurso, string> = {
  GESTAO_EQUIPES: 'Gestão de equipes',
  DINAMICAS: 'Dinâmicas de grupos',
};
