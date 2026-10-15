import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PartidaPausadaComponent } from './partida-pausada';

/** O modal da partida pausada (spec 028 §4.3). */
describe('PartidaPausadaComponent', () => {
  let fixture: ComponentFixture<PartidaPausadaComponent>;

  function montar(inputs: Record<string, unknown>): HTMLElement {
    fixture = TestBed.createComponent(PartidaPausadaComponent);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PartidaPausadaComponent],
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('mostra o nome do jogo, o título e o texto de espera', () => {
    const el = montar({ jogo: 'Tichr Wor', titulo: 'Batalha das Frações' });
    expect(el.querySelector('.pausa__jogo')?.textContent).toContain('Tichr Wor');
    expect(el.querySelector('.pausa__titulo')?.textContent).toContain(
      'Batalha das Frações',
    );
    expect(el.textContent).toContain(
      'Partida pausada. Aguardando o professor retomar.',
    );
  });

  it('no celular do aluno não há botão', () => {
    const el = montar({ jogo: 'Tichr Qlick', titulo: 'Quiz' });
    expect(el.querySelector('button')).toBeNull();
  });

  it('no telão, "Retomar partida" emite retomar', () => {
    const el = montar({ jogo: 'Tichr Isolateus', titulo: 'A Vila', professor: true });
    const botao = el.querySelector('button') as HTMLButtonElement;
    expect(botao.textContent).toContain('Retomar partida');

    let emitiu = false;
    fixture.componentInstance.retomar.subscribe(() => (emitiu = true));
    botao.click();
    expect(emitiu).toBeTrue();
  });

  it('carregando, o botão fica desabilitado', () => {
    const el = montar({ jogo: 'Tichr Qlick', professor: true, carregando: true });
    expect((el.querySelector('button') as HTMLButtonElement).disabled).toBeTrue();
  });
});
