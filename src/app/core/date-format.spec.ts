import { duracao, formatarDataHoraSegundos, formatarHora, tempoRelativo } from './date-format';

describe('date-format (spec 033)', () => {
  it('data e hora com segundos no relógio local', () => {
    const iso = new Date(2026, 10, 12, 14, 2, 33).toISOString();
    expect(formatarDataHoraSegundos(iso)).toBe('12/11/2026 14:02:33');
    expect(formatarHora(iso)).toBe('14:02');
  });

  it('tempo relativo', () => {
    const agora = new Date(2026, 10, 12, 15, 0, 0);
    const antes = (ms: number) => new Date(agora.getTime() - ms).toISOString();
    expect(tempoRelativo(antes(20_000), agora)).toBe('agora');
    expect(tempoRelativo(antes(12 * 60_000), agora)).toBe('há 12 min');
    expect(tempoRelativo(antes(3 * 3_600_000), agora)).toBe('há 3 h');
    expect(tempoRelativo(antes(26 * 3_600_000), agora)).toBe('há 1 dia');
    expect(tempoRelativo(antes(50 * 3_600_000), agora)).toBe('há 2 dias');
  });

  it('duração entre a primeira e a última denúncia', () => {
    const t0 = new Date(2026, 10, 12, 14, 0, 0);
    const mais = (ms: number) => new Date(t0.getTime() + ms).toISOString();
    expect(duracao(t0.toISOString(), mais(45_000))).toBe('45 s');
    expect(duracao(t0.toISOString(), mais(12 * 60_000))).toBe('12 min');
    expect(duracao(t0.toISOString(), mais(65 * 60_000))).toBe('1 h 05 min');
  });
});
