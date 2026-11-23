import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IsolateusChat } from './isolateus-chat';

describe('IsolateusChat (036)', () => {
  let fixture: ComponentFixture<IsolateusChat>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IsolateusChat],
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(IsolateusChat);
    fixture.componentRef.setInput('mensagens', [
      { id: '1', autorNome: 'Tóquio', texto: 'eu estava na Saúde', em: '' },
    ]);
  });

  it('mostra as falas com o nome do habitante', () => {
    fixture.detectChanges();
    expect(el().textContent).toContain('Tóquio');
    expect(el().textContent).toContain('eu estava na Saúde');
  });

  it('envia o texto aparado', () => {
    const enviados: string[] = [];
    fixture.componentInstance.enviar.subscribe((t) => enviados.push(t));
    fixture.detectChanges();
    const input = el().querySelector('input') as HTMLInputElement;
    input.value = '  foi o Real 2  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (el().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(enviados).toEqual(['foi o Real 2']);
  });

  it('com motivo (fora da vila), só lê: sem campo', () => {
    fixture.componentRef.setInput('motivo', 'Você está fora da vila: só pode ler o chat.');
    fixture.detectChanges();
    expect(el().querySelector('input')).toBeNull();
    expect(el().textContent).toContain('só pode ler o chat');
  });

  it('no telão é só leitura', () => {
    fixture.componentRef.setInput('telao', true);
    fixture.detectChanges();
    expect(el().querySelector('form')).toBeNull();
  });
});
