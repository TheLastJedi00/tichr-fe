import { PlanoAtual, Profile, Turma } from './models';

/**
 * Teto tecnico de turmas ativas: o PIN da turma e de 2 digitos ('01'..'99') e
 * nao pode repetir entre turmas ativas. Espelha `LIMITE_TURMAS_ATIVAS` do backend.
 */
const TETO_TURMAS = 99;

/**
 * Limite base de turmas ativas por plano. Nenhum plano e ilimitado — o teto do
 * PIN de 2 digitos (99) vale para todos os pagos; o Estagiario fica em 5.
 */
const LIMITE_BASE_PLANO: Record<PlanoAtual, number> = {
  ESTAGIARIO: 5,
  GRADUADO: TETO_TURMAS,
  MESTRE: TETO_TURMAS,
  PHD: TETO_TURMAS,
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

/** Gamificação (pontuação/portal) é exclusiva do plano PhD. */
export function podeGamificar(atual: PlanoAtual | undefined): boolean {
  return planoAtendeMinimo(atual, 'PHD');
}

/**
 * Limite efetivo do professor: base do plano + slots avulsos comprados, sempre
 * limitado ao teto tecnico do PIN de 2 digitos (99).
 */
export function limiteDoPlano(profile: Profile | null): number {
  const plano = profile?.planoAtual ?? 'ESTAGIARIO';
  const base = LIMITE_BASE_PLANO[plano] + (profile?.slotsAdicionaisComprados ?? 0);
  return Math.min(base, TETO_TURMAS);
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

/**
 * Chave do localStorage que guarda o plano pretendido entre o cadastro e o
 * checkout. Necessária porque o redirect do interceptor no 403
 * EMAIL_NAO_VERIFICADO descarta query params — o localStorage sobrevive.
 */
export const PLANO_PENDENTE_KEY = 'tichr-plano-pendente';
