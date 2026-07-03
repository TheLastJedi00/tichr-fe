import { PlanoAtual, Profile, Turma } from './models';

/** Limite base de turmas ativas por plano (Infinity = ilimitado). */
const LIMITE_BASE_PLANO: Record<PlanoAtual, number> = {
  ESTAGIARIO: 2,
  GRADUADO: 5,
  MESTRE: Infinity,
  PHD: Infinity,
};

/** Rotulos amigaveis dos planos. */
export const NOME_PLANO: Record<PlanoAtual, string> = {
  ESTAGIARIO: 'Estagiário',
  GRADUADO: 'Graduado',
  MESTRE: 'Mestre',
  PHD: 'PhD',
};

/** Ordem hierarquica dos planos (indice = nivel; maior = mais recursos). */
export const ORDEM_PLANO: PlanoAtual[] = [
  'ESTAGIARIO',
  'GRADUADO',
  'MESTRE',
  'PHD',
];

/** Verdadeiro se `atual` tem nivel >= `minimo` na hierarquia de planos. */
export function planoAtendeMinimo(
  atual: PlanoAtual | undefined,
  minimo: PlanoAtual,
): boolean {
  return (
    ORDEM_PLANO.indexOf(atual ?? 'ESTAGIARIO') >= ORDEM_PLANO.indexOf(minimo)
  );
}

/** Limite efetivo do professor: base do plano + slots avulsos comprados. */
export function limiteDoPlano(profile: Profile | null): number {
  const plano = profile?.planoAtual ?? 'ESTAGIARIO';
  return LIMITE_BASE_PLANO[plano] + (profile?.slotsAdicionaisComprados ?? 0);
}

/** Hoje como 'YYYY-MM-DD' (mesma convenca de calendario do backend). */
function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Espelha `TurmaEntity.contaComoAtiva` do backend: a turma ocupa cota se nao
 * foi encerrada manualmente e seu cronograma ainda esta vigente.
 */
export function turmaContaComoAtiva(turma: Turma, hoje = hojeISO()): boolean {
  if (turma.encerradaManualmente) {
    return false;
  }
  if (turma.tipoModalidade === 'MODULO_FECHADO' && turma.dataFimPrevista) {
    return turma.dataFimPrevista >= hoje;
  }
  return true;
}
