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

/** Erro de cota do plano — tratado inline (upsell), sem modal global. */
function isLimitReached(err: HttpErrorResponse): boolean {
  const corpo = err.error as { code?: string } | null;
  return err.status === 403 && corpo?.code === 'LIMIT_REACHED';
}

/**
 * Dispara o modal global de erro para qualquer falha HTTP, exceto:
 * - 401 (tratado pelo authInterceptor: redireciona para /login);
 * - 403 LIMIT_REACHED (tratado inline pela tela com o card de upsell).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ErrorService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 && !isLimitReached(err)) {
        errorService.show(extrairMensagem(err));
      }
      return throwError(() => err);
    }),
  );
};
