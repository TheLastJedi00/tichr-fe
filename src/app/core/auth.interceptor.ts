import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { StudentAuthService } from './student-auth.service';

/**
 * Injeta o token no header Authorization e trata 401 (sessao expirada).
 * Suporta os dois mundos: professor (AuthService) e aluno (StudentAuthService).
 * O token do professor tem precedencia; se ausente, usa o do aluno.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const studentAuth = inject(StudentAuthService);
  const router = inject(Router);

  const profToken = auth.getToken();
  const studentToken = studentAuth.getToken();
  const token = profToken ?? studentToken;
  const usandoAluno = !profToken && !!studentToken;

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
