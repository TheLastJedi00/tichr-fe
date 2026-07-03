import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { StudentAuthService } from './student-auth.service';

/**
 * Injeta o token no header Authorization e trata 401 (sessao expirada).
 * Suporta os dois mundos: professor (AuthService) e aluno (StudentAuthService).
 *
 * O token e escolhido pelo DESTINO da requisicao, nao por precedencia fixa:
 * chamadas ao portal do aluno (`/aluno/*`) usam sempre o token de aluno; as
 * demais usam o do professor (com fallback para o de aluno). Sem isso, um
 * navegador com os dois tokens mandaria o do professor para `/aluno/*` e o
 * backend devolveria 403 (rota `@Roles('STUDENT')`).
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

  const authorized = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authorized).pipe(
    catchError((err: HttpErrorResponse) => {
      const isLoginCall =
        req.url.includes('/auth/login') || req.url.includes('/auth/aluno');
      if (err.status === 401 && !isLoginCall) {
        if (usandoAluno) {
          const turmaId = studentAuth.turmaId();
          studentAuth.logout();
          void router.navigateByUrl(turmaId ? `/t/${turmaId}` : '/');
        } else {
          auth.logout();
          void router.navigateByUrl('/login');
        }
      }
      return throwError(() => err);
    }),
  );
};
