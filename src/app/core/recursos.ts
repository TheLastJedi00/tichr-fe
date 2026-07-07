import { PlanoAtual } from './models';

/** Recursos gerenciaveis sujeitos a gating por plano. */
export type Recurso =
  | 'CADASTRO_ALUNOS'
  | 'GESTAO_EQUIPES'
  | 'DINAMICAS'
  | 'GAMIFICACAO'
  | 'PLANO_AULA'
  | 'QLICK'
  | 'WOR';

/** Plano minimo exigido por recurso (ponto unico de verdade do gating). */
export const RECURSO_PLANO_MINIMO: Record<Recurso, PlanoAtual> = {
  // Gestao nominal de alunos vira o ponto de virada do plano Mestre.
  CADASTRO_ALUNOS: 'MESTRE',
  GESTAO_EQUIPES: 'MESTRE',
  DINAMICAS: 'MESTRE',
  GAMIFICACAO: 'PHD',
  PLANO_AULA: 'GRADUADO',
  QLICK: 'PHD',
  // Padrao do ecossistema: todo jogo e exclusivo do plano PhD (criar/rodar).
  WOR: 'PHD',
};

/** Rotulo amigavel de cada recurso (usado nas telas de bloqueio). */
export const NOME_RECURSO: Record<Recurso, string> = {
  CADASTRO_ALUNOS: 'Cadastro de alunos',
  GESTAO_EQUIPES: 'Gestão de equipes',
  DINAMICAS: 'Dinâmicas de grupos',
  GAMIFICACAO: 'Portal do aluno + Gamificação',
  PLANO_AULA: 'Plano de Aula',
  QLICK: 'Tichr Qlick',
  WOR: 'Tichr Wor',
};
