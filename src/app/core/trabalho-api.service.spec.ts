import {
  faltaParaPrazo,
  formatarNota,
  formatarPrazo,
  isoParaCampos,
  lerNota,
  pontosDaNota,
  prazoParaIso,
} from './trabalho-api.service';

/** Spec 038: prazo com data e hora, nota que vira pontos. */
describe('trabalhos: helpers', () => {
  it('prazo exige data e hora; ida e volta no fuso local', () => {
    expect(prazoParaIso('2026-12-05', '')).toBeNull();
    expect(prazoParaIso('', '23:59')).toBeNull();
    const iso = prazoParaIso('2026-12-05', '23:59')!;
    expect(iso).toMatch(/T\d{2}:\d{2}/);
    expect(isoParaCampos(iso)).toEqual({ data: '2026-12-05', hora: '23:59' });
    expect(formatarPrazo(iso)).toBe('05/12/2026 às 23:59');
  });

  it('quanto falta para o prazo', () => {
    const agora = new Date(2026, 11, 5, 10, 0);
    expect(faltaParaPrazo(new Date(2026, 11, 5, 23, 59).toISOString(), agora)).toBe('encerra hoje às 23:59');
    expect(faltaParaPrazo(new Date(2026, 11, 5, 10, 30).toISOString(), agora)).toBe('encerra em 30 min (às 10:30)');
    expect(faltaParaPrazo(new Date(2026, 11, 6, 8, 0).toISOString(), agora)).toBe('encerra amanhã às 08:00');
    expect(faltaParaPrazo(new Date(2026, 11, 9, 8, 0).toISOString(), agora)).toBe('faltam 4 dias');
    expect(faltaParaPrazo(new Date(2026, 11, 5, 9, 0).toISOString(), agora)).toBeNull();
  });

  it('nota de 0 a 10 com uma casa, com vírgula', () => {
    expect(lerNota('8')).toBe(8);
    expect(lerNota('7,5')).toBe(7.5);
    expect(lerNota('10')).toBe(10);
    for (const t of ['', '11', '7,25', '-1', 'abc', '10.5']) expect(lerNota(t)).toBeNull();
    expect(formatarNota(7.5)).toBe('7,5');
  });

  it('a nota vira pontos: nota 8 numa atividade de 100 → 80', () => {
    expect(pontosDaNota(8, 100)).toBe(80);
    expect(pontosDaNota(7.5, 33)).toBe(25);
    expect(pontosDaNota(10, 0)).toBe(0);
  });
});
