import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AdminApiService } from './admin-api.service';

/**
 * Protege o backoffice: confirma a permissão pelo backend (`GET /admin/ping`).
 * Sem acesso (403), redireciona para o painel comum.
 */
export const adminGuard: CanActivateFn = () => {
  const api = inject(AdminApiService);
  const router = inject(Router);

  return api.ping().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/dashboard']))),
  );
};
