import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { StudentAuthService } from './student-auth.service';

/**
 * Rotas de credencial: um 401 aqui e a resposta legitima ("senha errada",
 * "sessao expirada"), nao um token vencido a renovar. Incluir o proprio
 * /auth/refresh e obrigatorio — sem isso, um refresh que falha tentaria se
 * renovar e o laco nao terminaria.
 */
function isRotaDeCredencial(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/signup') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/aluno')
  );
}

/** Anexa o Bearer, quando ha token. */
function comToken(
  token: string | null,
  req: HttpRequest<unknown>,
): HttpRequest<unknown> {
  return token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
}

/**
 * Injeta o token no header Authorization e trata 401 (sessao expirada).
 * Suporta os dois mundos: professor (AuthService) e aluno (StudentAuthService).
 *
 * O token e escolhido pelo DESTINO da requisicao, nao por precedencia fixa:
 * chamadas ao portal do aluno (`/aluno/*`) usam sempre o token de aluno; as
 * demais usam o do professor (com fallback para o de aluno). Sem isso, um
 * navegador com os dois tokens mandaria o do professor para `/aluno/*` e o
 * backend devolveria 403 (rota `@Roles('STUDENT')`).
 *
 * No 401 de professor, RENOVA uma vez e refaz a requisicao: o ID token dura ~1h
 * e, sem isso, o professor caia no /login no meio da aula. A sessao so cai
 * depois de o refresh tambem falhar.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const studentAuth = inject(StudentAuthService);
  const router = inject(Router);

  const profToken = auth.getToken();
  const studentToken = studentAuth.getToken();

  // `/aluno/` (com barra) identifica a API do portal; nao colide com o roster
  // do professor (`/turmas/:id/alunos`, plural, sem `/aluno/`).
  const isAlunoApi = req.url.includes('/aluno/');
  const token = isAlunoApi ? studentToken : profToken ?? studentToken;
  const usandoAluno = isAlunoApi ? !!studentToken : !profToken && !!studentToken;

  return next(comToken(token, req)).pipe(
    catchError((err: HttpErrorResponse) => {
      const code = (err.error as { code?: string } | null)?.code;

      // Professor sem e-mail confirmado: o token e VALIDO, so esta pendente.
      // Nao desloga — leva para a tela de confirmacao.
      if (err.status === 403 && code === 'EMAIL_NAO_VERIFICADO') {
        void router.navigateByUrl('/verificar-email');
        return throwError(() => err);
      }

      if (err.status !== 401 || isRotaDeCredencial(req.url)) {
        return throwError(() => err);
      }

      // O JWT do aluno vale 30 dias e NAO se renova: 401 dele e fim de sessao.
      if (usandoAluno) {
        const turmaId = studentAuth.turmaId();
        studentAuth.logout();
        void router.navigateByUrl(turmaId ? `/t/${turmaId}` : '/');
        return throwError(() => err);
      }

      // Professor: renova (chamada compartilhada — N requisicoes falhando
      // juntas produzem UM refresh) e refaz a requisicao com o token novo.
      return auth.refresh().pipe(
        switchMap(() => next(comToken(auth.getToken(), req))),
        catchError((erroRefresh: HttpErrorResponse) => {
          // Caminho NORMAL de quem trocou senha ou e-mail: o Firebase revoga os
          // refresh tokens e a sessao acabou de verdade. Logout limpo, sem
          // POST /auth/logout (o servidor ja invalidou) e sem modal de erro —
          // nao e falha, e a sessao expirando na hora certa.
          auth.limparSessaoLocal();
          void router.navigateByUrl('/login');
          return throwError(() => erroRefresh);
        }),
      ) as Observable<HttpEvent<unknown>>;
    }),
  );
};
