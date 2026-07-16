import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, throwError } from 'rxjs';
import { errorInterceptor } from './error.interceptor';
import { ErrorService } from './error.service';

/**
 * O que este interceptor decide é uma coisa só: essa falha merece o modal
 * global? Errar para mais gera modal por cima de tela que já explicou o erro;
 * errar para menos engole falha de verdade.
 */
describe('errorInterceptor — modal global vs inline', () => {
  let errorService: jasmine.SpyObj<ErrorService>;

  function rodar(url: string, status = 500, code?: string) {
    const next = () =>
      throwError(
        () => new HttpErrorResponse({ status, error: code ? { code } : null }),
      ) as Observable<never>;
    return TestBed.runInInjectionContext(() =>
      errorInterceptor(new HttpRequest('GET', url), next as never),
    );
  }

  /** Consome o Observable (o interceptor rethrow; o erro aqui é esperado). */
  function consumir(obs: Observable<unknown>) {
    obs.subscribe({ next: () => undefined, error: () => undefined });
  }

  beforeEach(() => {
    errorService = jasmine.createSpyObj<ErrorService>('ErrorService', ['show', 'dismiss']);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ErrorService, useValue: errorService },
      ],
    });
  });

  it('envio de feedback falhando NÃO abre o modal global (a tela já explica)', () => {
    consumir(rodar('https://api.tichr.com.br/feedbacks'));
    expect(errorService.show).not.toHaveBeenCalled();
  });

  it('inbox do admin falhando ABRE o modal global — é erro de verdade', () => {
    // `/admin/feedbacks` também termina em `/feedbacks`: se o filtro fosse só
    // endsWith, a inbox quebraria em silêncio.
    consumir(rodar('https://api.tichr.com.br/admin/feedbacks'));
    expect(errorService.show).toHaveBeenCalled();
  });

  it('triagem falhando também abre o modal global', () => {
    consumir(rodar('https://api.tichr.com.br/admin/feedbacks/fb-1'));
    expect(errorService.show).toHaveBeenCalled();
  });

  it('erro comum de outra rota segue abrindo o modal', () => {
    consumir(rodar('https://api.tichr.com.br/turmas'));
    expect(errorService.show).toHaveBeenCalled();
  });
});
