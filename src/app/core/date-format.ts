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

/**
 * Formata um timestamp ISO completo como '02 mar, 14:32'.
 *
 * Diferente do `formatarData`, que recebe só o dia ('YYYY-MM-DD') e trabalha em
 * UTC de propósito (data de aula não tem hora, e converter para o fuso local
 * deslocaria o dia). Aqui é o oposto: é um instante, e quem lê quer vê-lo no
 * relógio dele — então usa os getters locais.
 */
export function formatarDataHora(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const dia = String(date.getDate()).padStart(2, '0');
  const hora = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dia} ${MESES[date.getMonth()]}, ${hora}:${min}`;
}
