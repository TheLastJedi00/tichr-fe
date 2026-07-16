import { HttpClient, HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { StudentAuthService } from './student-auth.service';

/**
 * O caminho de renovação é a parte mais sutil do FE: erra e o professor cai no
 * /login no meio da aula, ou o app entra em laço. Cada teste aqui prende um dos
 * quatro cuidados do desenho.
 */
describe('authInterceptor — renovação de sessão', () => {
  let auth: jasmine.SpyObj<AuthService> & { getToken: jasmine.Spy };
  let studentAuth: jasmine.SpyObj<StudentAuthService>;
  let router: jasmine.SpyObj<Router>;

  function req(url = 'https://api.tichr.com.br/turmas') {
    return new HttpRequest('GET', url);
  }

  function erro(status: number, code?: string) {
    return new HttpErrorResponse({ status, error: code ? { code } : null });
  }

  /** Roda o interceptor dentro de um contexto de injeção. */
  function rodar(
    requisicao: HttpRequest<unknown>,
    next: (r: HttpRequest<unknown>) => Observable<never | HttpResponse<unknown>>,
  ) {
    return TestBed.runInInjectionContext(() =>
      authInterceptor(requisicao, next as never),
    );
  }

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'getToken',
      'refresh',
      'limparSessaoLocal',
      'logout',
    ]) as never;
    studentAuth = jasmine.createSpyObj<StudentAuthService>('StudentAuthService', [
      'getToken',
      'logout',
      'turmaId',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    auth.getToken.and.returnValue('token-velho');
    studentAuth.getToken.and.returnValue(null);
    studentAuth.turmaId.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: auth },
        { provide: StudentAuthService, useValue: studentAuth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('401 do professor: renova e REFAZ a requisição com o token novo', (done) => {
    auth.refresh.and.callFake(() => {
      auth.getToken.and.returnValue('token-novo');
      return of({ token: 'token-novo', expiresIn: 3600, uid: 'u', email: 'a@b.com' });
    });

    const tokensVistos: (string | null)[] = [];
    let primeira = true;
    const next = (r: HttpRequest<unknown>) => {
      tokensVistos.push(r.headers.get('Authorization'));
      if (primeira) {
        primeira = false;
        return throwError(() => erro(401));
      }
      return of(new HttpResponse({ status: 200 }));
    };

    rodar(req(), next).subscribe({
      next: () => {
        expect(tokensVistos).toEqual([
          'Bearer token-velho',
          'Bearer token-novo', // refeita com o token renovado
        ]);
        expect(auth.refresh).toHaveBeenCalledTimes(1);
        expect(router.navigateByUrl).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('SEM LAÇO: 401 do próprio /auth/refresh não tenta renovar', (done) => {
    const next = () => throwError(() => erro(401, 'SESSAO_EXPIRADA'));

    rodar(req('https://api.tichr.com.br/auth/refresh'), next).subscribe({
      error: () => {
        expect(auth.refresh).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('401 do /auth/login não tenta renovar (é senha errada, não sessão vencida)', (done) => {
    const next = () => throwError(() => erro(401));

    rodar(req('https://api.tichr.com.br/auth/login'), next).subscribe({
      error: () => {
        expect(auth.refresh).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('refresh falhou (senha/e-mail trocados): logout limpo, sem POST /auth/logout', (done) => {
    auth.refresh.and.returnValue(
      throwError(() => erro(401, 'SESSAO_EXPIRADA')) as never,
    );
    const next = () => throwError(() => erro(401));

    rodar(req(), next).subscribe({
      error: () => {
        expect(auth.limparSessaoLocal).toHaveBeenCalled();
        // O servidor já invalidou a sessão: um POST /auth/logout seria redundante.
        expect(auth.logout).not.toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
        done();
      },
    });
  });

  it('SÓ PROFESSOR: 401 em rota de aluno desloga, não renova', (done) => {
    studentAuth.getToken.and.returnValue('token-aluno');
    studentAuth.turmaId.and.returnValue('t1');
    const next = () => throwError(() => erro(401));

    rodar(req('https://api.tichr.com.br/aluno/qlick'), next).subscribe({
      error: () => {
        // O JWT do aluno vale 30 dias e não se renova.
        expect(auth.refresh).not.toHaveBeenCalled();
        expect(studentAuth.logout).toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/t/t1');
        done();
      },
    });
  });

  it('403 EMAIL_NAO_VERIFICADO: vai para a confirmação e NÃO desloga', (done) => {
    const next = () => throwError(() => erro(403, 'EMAIL_NAO_VERIFICADO'));

    rodar(req(), next).subscribe({
      error: () => {
        expect(router.navigateByUrl).toHaveBeenCalledWith('/verificar-email');
        // O token é válido, só está pendente: deslogar perderia a sessão à toa.
        expect(auth.limparSessaoLocal).not.toHaveBeenCalled();
        expect(auth.refresh).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('erro que não é 401/403 passa direto', (done) => {
    const next = () => throwError(() => erro(500));

    rodar(req(), next).subscribe({
      error: (e: HttpErrorResponse) => {
        expect(e.status).toBe(500);
        expect(auth.refresh).not.toHaveBeenCalled();
        done();
      },
    });
  });
});

/** Um refresh para N requisições concorrentes — senão o perdedor usa token morto. */
describe('AuthService.refresh — sem estouro de manada', () => {
  afterEach(() => localStorage.removeItem('tichr-token'));

  it('três chamadas concorrentes disparam UMA requisição', (done) => {
    // Subject e não `of()`: a resposta HTTP é assíncrona, e é justamente a
    // janela "em voo" que a deduplicação usa. Um mock síncrono completaria a
    // primeira chamada antes da segunda existir e não testaria concorrência.
    const resposta$ = new Subject<unknown>();
    let chamadas = 0;
    const http = {
      post: () => {
        chamadas++;
        return resposta$.asObservable();
      },
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: HttpClient, useValue: http },
        { provide: API_BASE_URL, useValue: 'https://api.tichr.com.br' },
      ],
    });
    const service = TestBed.inject(AuthService);

    let concluidas = 0;
    const pronto = () => {
      if (++concluidas === 3) {
        expect(chamadas).toBe(1);
        done();
      }
    };

    // As três chegam enquanto a requisição está em voo.
    service.refresh().subscribe(pronto);
    service.refresh().subscribe(pronto);
    service.refresh().subscribe(pronto);
    expect(chamadas).toBe(1);

    resposta$.next({ token: 'novo', expiresIn: 3600, uid: 'u', email: 'a@b.com' });
    resposta$.complete();
  });

  it('depois de concluir, uma nova chamada dispara outra requisição', (done) => {
    let chamadas = 0;
    const http = {
      post: () => {
        chamadas++;
        return of({ token: 'novo', expiresIn: 3600, uid: 'u', email: 'a@b.com' });
      },
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: HttpClient, useValue: http },
        { provide: API_BASE_URL, useValue: 'https://api.tichr.com.br' },
      ],
    });
    const service = TestBed.inject(AuthService);

    // O slot precisa ser liberado no fim, senão a sessão nunca mais renovaria.
    // Os dois refreshes são separados no tempo (é o caso real: ~1h entre eles),
    // e não aninhados — `finalize` roda no complete, depois do next.
    service.refresh().subscribe();
    service.refresh().subscribe(() => {
      expect(chamadas).toBe(2);
      done();
    });
  });
});
