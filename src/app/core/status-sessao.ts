import { Sessao } from './models';

/** Status calculado (derivado) de uma sessão para exibição na agenda. */
export type StatusVisual =
  | 'CONCLUIDA'
  | 'EM_ANDAMENTO'
  | 'AGENDADA'
  | 'CANCELADA';

/** Rótulos amigáveis de cada status visual. */
export const ROTULO_STATUS: Record<StatusVisual, string> = {
  CONCLUIDA: 'Concluída',
  EM_ANDAMENTO: 'Em andamento',
  AGENDADA: 'Agendada',
  CANCELADA: 'Cancelada',
};

/** Data local como 'YYYY-MM-DD' (dia de calendário do usuário). */
function hojeLocal(agora: Date): string {
  const y = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Hora local como 'HH:mm'. */
function horaLocal(agora: Date): string {
  return `${String(agora.getHours()).padStart(2, '0')}:${String(
    agora.getMinutes(),
  ).padStart(2, '0')}`;
}

/**
 * Deriva o status de exibição cruzando `data` + horários da turma com "agora":
 * - `CANCELADA`/`REALIZADA` vêm do status persistido;
 * - passado → `CONCLUIDA`; futuro → `AGENDADA`;
 * - hoje, com horários: dentro do intervalo → `EM_ANDAMENTO`, depois do fim →
 *   `CONCLUIDA`, antes do início → `AGENDADA`; sem horários → `EM_ANDAMENTO`.
 */
export function statusVisual(
  sessao: Pick<Sessao, 'data' | 'status'>,
  horaInicio?: string,
  horaFim?: string,
  agora: Date = new Date(),
): StatusVisual {
  if (sessao.status === 'CANCELADA') {
    return 'CANCELADA';
  }
  if (sessao.status === 'REALIZADA') {
    return 'CONCLUIDA';
  }

  const hoje = hojeLocal(agora);
  if (sessao.data < hoje) {
    return 'CONCLUIDA';
  }
  if (sessao.data > hoje) {
    return 'AGENDADA';
  }

  // Sessão é hoje: decide pelo horário, se houver.
  const hora = horaLocal(agora);
  if (horaFim && hora > horaFim) {
    return 'CONCLUIDA';
  }
  if (horaInicio && hora < horaInicio) {
    return 'AGENDADA';
  }
  return 'EM_ANDAMENTO';
}
