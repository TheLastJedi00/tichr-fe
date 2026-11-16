import { JANELA_RESULTADO_MS, RelogioDaFase, antecedenciaDaFase } from './isolateus-relogio';

describe('RelogioDaFase com a noite que espera o card (spec 034 #55)', () => {
  it('só a noite depois da primeira tem antecedência', () => {
    expect(antecedenciaDaFase('DESLOCAMENTO', 0)).toBe(0);
    expect(antecedenciaDaFase('DESLOCAMENTO', 3)).toBe(JANELA_RESULTADO_MS);
    expect(antecedenciaDaFase('QUESTAO_ATIVA', 3)).toBe(0);
  });

  it('um faseIniciadaEm no futuro não adianta o relógio do cliente', () => {
    const relogio = new RelogioDaFase();
    const agora = Date.now();
    // O servidor abriu a noite AGORA, com a contagem 6s à frente.
    const inicio = new Date(agora + JANELA_RESULTADO_MS).toISOString();
    relogio.sincronizar(inicio, JANELA_RESULTADO_MS);
    // O relógio estimado continua ~ o local (desvio ~0), não 6s à frente.
    expect(Math.abs(relogio.agora(agora) - agora)).toBeLessThan(500);
  });

  it('sem a antecedência, o mesmo valor desvia 6s (o bug que ela evita)', () => {
    const relogio = new RelogioDaFase();
    const agora = Date.now();
    relogio.sincronizar(new Date(agora + JANELA_RESULTADO_MS).toISOString(), 0);
    expect(relogio.agora(agora) - agora).toBeGreaterThan(5000);
  });
});
