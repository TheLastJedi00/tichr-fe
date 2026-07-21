import { GradeSlot, Instituicao, TipoTurno } from './models';

/** Turnos possíveis, na ordem de exibição. */
export const TURNOS: { value: TipoTurno; label: string }[] = [
  { value: 'MATUTINO', label: 'Matutino' },
  { value: 'VESPERTINO', label: 'Vespertino' },
  { value: 'NOTURNO', label: 'Noturno' },
];

/** Horários padrão sugeridos por turno (usados ao ativar um turno novo). */
export const DEFAULTS_TURNO: Record<
  TipoTurno,
  { inicio: string; fim: string }
> = {
  MATUTINO: { inicio: '07:00', fim: '12:00' },
  VESPERTINO: { inicio: '13:00', fim: '18:00' },
  NOTURNO: { inicio: '19:00', fim: '22:30' },
};

export function rotuloTurno(t?: TipoTurno | null): string {
  return TURNOS.find((x) => x.value === t)?.label ?? '';
}

/** Turnos que uma instituição oferece (a partir das grades calculadas). */
export function turnosDaInstituicao(inst?: Instituicao | null): TipoTurno[] {
  return (inst?.grades ?? []).map((g) => g.turno);
}

/**
 * Slots (grade) do turno de uma instituição. Sem turno informado, cai no 1º
 * turno; e, na ausência de `grades`, na `grade` única legada.
 */
export function gradeDoTurno(
  inst?: Instituicao | null,
  turno?: TipoTurno | null,
): GradeSlot[] {
  if (!inst) return [];
  const grades = inst.grades ?? [];
  if (turno) return grades.find((g) => g.turno === turno)?.slots ?? [];
  return grades[0]?.slots ?? inst.grade ?? [];
}
