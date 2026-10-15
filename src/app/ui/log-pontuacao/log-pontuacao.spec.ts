import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LogPontuacaoJogador } from '../../core/models';
import { LogPontuacaoComponent } from './log-pontuacao';

/** O painel "de onde veio cada ponto" do fim de partida (spec 027 §1.1). */
describe('LogPontuacaoComponent', () => {
  let fixture: ComponentFixture<LogPontuacaoComponent>;

  const ana: LogPontuacaoJogador = {
    alunoId: 'a1',
    nome: 'Ana',
    totalPartida: 1340,
    creditoRanking: 670,
    itens: [
      { rodada: 1, fonte: 'DANO', descricao: 'Rodada 1: ataque', pontos: 1340 },
      {
        rodada: 2,
        fonte: 'FATOR_COLOCACAO',
        descricao: 'Equipe não campeã: ×0,5 no ranking',
        pontos: -670,
      },
    ],
  };

  function montar(inputs: Record<string, unknown>): HTMLElement {
    fixture = TestBed.createComponent(LogPontuacaoComponent);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LogPontuacaoComponent],
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('não renderiza nada sem jogador', () => {
    expect(montar({ jogador: null }).querySelector('.log')).toBeNull();
  });

  it('lista os itens com sinal e o crédito real no ranking', () => {
    const el = montar({ jogador: ana, unidade: 'Moedas' });
    const pts = [...el.querySelectorAll('.item__pts')].map((e) => e.textContent?.trim());
    expect(pts).toEqual(['+1.340', '−670']);
    expect(el.querySelector('.log__credito')?.textContent).toContain('+670 Moedas no ranking');
  });

  it('partida casual e sem turma explicam por que não somou', () => {
    let el = montar({ jogador: ana, casual: true });
    expect(el.querySelector('.log__credito')?.textContent).toContain('Partida casual');
    el = montar({ jogador: ana, temTurma: false });
    expect(el.querySelector('.log__credito')?.textContent).toContain('sem turma');
  });

  it('jogador sem pontos mostra o estado vazio', () => {
    const el = montar({ jogador: { ...ana, itens: [], totalPartida: 0, creditoRanking: 0 } });
    expect(el.querySelector('.log__vazio')?.textContent).toContain('Nenhum ponto');
  });

  it('fecha no X e no Esc', () => {
    const el = montar({ jogador: ana });
    let fechou = 0;
    fixture.componentInstance.fechar.subscribe(() => fechou++);
    (el.querySelector('.log__x') as HTMLButtonElement).click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fechou).toBe(2);
  });
});
