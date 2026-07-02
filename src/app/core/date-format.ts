const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/** Formata 'YYYY-MM-DD' como 'Seg, 02 mar' (UTC, sem timezone). */
export function formatarData(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dia = DIAS[date.getUTCDay()];
  return `${dia}, ${String(d).padStart(2, '0')} ${MESES[m - 1]}`;
}
