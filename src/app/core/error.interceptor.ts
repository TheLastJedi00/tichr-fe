import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorService } from './error.service';

/** Extrai uma mensagem legível do erro (formato NestJS, string ou rede). */
function extrairMensagem(err: HttpErrorResponse): string {
  if (err.status === 0) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  }
  const corpo = err.error as { message?: string | string[] } | string | null;
  if (corpo && typeof corpo === 'object' && corpo.message) {
    return Array.isArray(corpo.message)
      ? corpo.message.join('; ')
      : corpo.message;
  }
  if (typeof corpo === 'string' && corpo) {
    return corpo;
  }
  return err.message || 'Erro inesperado. Tente novamente.';
}

/**
 * Dispara o modal global de erro para qualquer falha HTTP, exceto 401
 * (tratado pelo authInterceptor: redireciona para /login).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ErrorService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) {
        errorService.show(extrairMensagem(err));
      }
      return throwError(() => err);
    }),
  );
};
