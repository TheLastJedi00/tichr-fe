import { NivelEnsino } from './models';

/** Rótulos dos níveis de ensino regular. */
export const NIVEIS_ENSINO: { value: NivelEnsino; label: string }[] = [
  { value: 'FUNDAMENTAL', label: 'Ensino Fundamental' },
  { value: 'MEDIO', label: 'Ensino Médio' },
];

/** Séries/anos disponíveis para cada nível (dropdown dinâmico). */
const SERIES_POR_NIVEL: Record<NivelEnsino, string[]> = {
  FUNDAMENTAL: [
    '1º Ano',
    '2º Ano',
    '3º Ano',
    '4º Ano',
    '5º Ano',
    '6º Ano',
    '7º Ano',
    '8º Ano',
    '9º Ano',
  ],
  MEDIO: ['1ª Série', '2ª Série', '3ª Série'],
};

/** Opções de ano/série para o nível informado (vazio se nível ausente). */
export function seriesDoNivel(nivel?: NivelEnsino | null): string[] {
  return nivel ? SERIES_POR_NIVEL[nivel] : [];
}

/** Rótulo por extenso de um nível de ensino. */
export function rotuloNivel(nivel?: NivelEnsino | null): string {
  return NIVEIS_ENSINO.find((n) => n.value === nivel)?.label ?? '';
}
