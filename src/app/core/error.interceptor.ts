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

/** Erro tratado inline pela própria tela (sem modal global). */
function isTratadoInline(err: HttpErrorResponse): boolean {
  const corpo = err.error as { code?: string } | null;
  const code = corpo?.code;
  // Cota do plano (upsell) e trava de troca de @username (microcópia no form).
  return (
    (err.status === 403 && code === 'LIMIT_REACHED') ||
    (err.status === 409 && code === 'USERNAME_COOLDOWN')
  );
}

/**
 * Dispara o modal global de erro para qualquer falha HTTP, exceto:
 * - 401 (tratado pelo authInterceptor: redireciona para /login);
 * - 403 LIMIT_REACHED (upsell inline) e 409 USERNAME_COOLDOWN (microcópia inline).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ErrorService);
  // Telas de login/cadastro mostram o erro inline no próprio formulário.
  const isFormAuth =
    req.url.endsWith('/auth/login') || req.url.endsWith('/auth/signup');
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 && !isFormAuth && !isTratadoInline(err)) {
        errorService.show(extrairMensagem(err));
      }
      return throwError(() => err);
    }),
  );
};
