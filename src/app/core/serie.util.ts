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
  // Nomenclatura por "Ano" também no Médio (1º/2º/3º Ano), não "Série".
  MEDIO: ['1º Ano', '2º Ano', '3º Ano'],
};

/** Opções de ano para o nível informado (vazio se nível ausente). */
export function seriesDoNivel(nivel?: NivelEnsino | null): string[] {
  return nivel ? SERIES_POR_NIVEL[nivel] : [];
}

/** Rótulo por extenso de um nível de ensino. */
export function rotuloNivel(nivel?: NivelEnsino | null): string {
  return NIVEIS_ENSINO.find((n) => n.value === nivel)?.label ?? '';
}

/** Rótulo curto do nível ('Fundamental' / 'Médio') — usado nas boas-vindas. */
export function nivelCurto(nivel?: NivelEnsino | null): string {
  switch (nivel) {
    case 'FUNDAMENTAL':
      return 'Fundamental';
    case 'MEDIO':
      return 'Médio';
    default:
      return '';
  }
}
