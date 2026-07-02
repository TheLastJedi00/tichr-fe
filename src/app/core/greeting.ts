const DIAS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Saudação conforme a hora do dia: "Bom dia" / "Boa tarde" / "Boa noite". */
export function saudacaoPorHora(data: Date): string {
  const h = data.getHours();
  if (h < 12) return 'bom dia';
  if (h < 18) return 'boa tarde';
  return 'boa noite';
}

/** Data por extenso em pt-BR: "Quinta-feira, 2 de Julho". */
export function dataPorExtenso(data: Date): string {
  return `${DIAS[data.getDay()]}, ${data.getDate()} de ${MESES[data.getMonth()]}`;
}

/** Data de hoje como 'YYYY-MM-DD' (hora local). */
export function hojeISO(data: Date): string {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
