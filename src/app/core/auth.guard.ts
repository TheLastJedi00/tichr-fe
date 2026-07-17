import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { Profile } from './models';
import { ProfileService } from './profile.service';

/**
 * Protege rotas privadas: libera se houver token; senão redireciona para /login.
 *
 * Também resolve o **checkout pendente do cadastro**: se o professor escolheu um
 * plano pago, o servidor guarda `planoPretendido` no perfil (fonte de verdade). O
 * pagamento só pode acontecer depois de o e-mail ser confirmado — e o link de
 * verificação cai no dashboard. Então, em **qualquer** entrada autenticada, se há
 * `planoPretendido`, este guard leva ao `/checkout` (a tela de checkout descarta a
 * marca ao abrir). Sem depender de localStorage, query param ou cache.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const profileService = inject(ProfileService);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const decidir = (p: Profile | null): boolean | UrlTree => {
    const pretendido = p?.planoPretendido;
    if (
      pretendido &&
      pretendido !== 'ESTAGIARIO' &&
      !state.url.startsWith('/checkout')
    ) {
      return router.createUrlTree(['/checkout'], {
        queryParams: { tipo: 'upgrade', plano: pretendido },
      });
    }
    return true;
  };

  // Usa o perfil já carregado; se ainda não veio, carrega uma vez (o /profile é
  // acessível mesmo antes da verificação). Falha de rede não bloqueia a rota.
  const cache = profileService.profile();
  if (cache) {
    return decidir(cache);
  }
  return profileService.load().pipe(
    map(decidir),
    catchError(() => of(true)),
  );
};
