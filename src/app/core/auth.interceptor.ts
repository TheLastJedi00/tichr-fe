import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Injeta o token no header Authorization e trata 401 (sessao expirada). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  const authorized = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authorized).pipe(
    catchError((err: HttpErrorResponse) => {
      const isLoginCall = req.url.includes('/auth/login');
      if (err.status === 401 && !isLoginCall) {
        auth.logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};
