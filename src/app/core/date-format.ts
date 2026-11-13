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

/** Formata um instante ISO como '12/11/2026 14:02:33', no relógio de quem lê (spec 033). */
export function formatarDataHoraSegundos(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()} ` +
    `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
  );
}

/** Só a hora: '14:02' (local). */
export function formatarHora(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Tempo relativo curto: 'agora', 'há 12 min', 'há 3 h', 'há 2 dias'. */
export function tempoRelativo(iso: string, agora: Date = new Date()): string {
  const ms = agora.getTime() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

/** Intervalo entre dois instantes, curto: '45 s', '12 min', '1 h 05 min'. */
export function duracao(deIso: string, ateIso: string): string {
  const s = Math.max(0, Math.round((new Date(ateIso).getTime() - new Date(deIso).getTime()) / 1000));
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}
