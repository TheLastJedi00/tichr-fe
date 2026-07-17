import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { PLANO_PENDENTE_KEY } from './plano.util';

/**
 * Protege rotas privadas: libera se houver token; caso contrario
 * redireciona para /login.
 *
 * Também resolve o **checkout pendente do cadastro**: se o professor escolheu um
 * plano pago no cadastro, o plano fica no localStorage e o pagamento só pode
 * acontecer depois de o e-mail ser confirmado. Como o link de verificação cai em
 * `/login` → dashboard (pulando a tela de espera), este guard leva ao `/checkout`
 * em **qualquer** entrada autenticada — a tela de checkout limpa a chave ao abrir.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const pendente = localStorage.getItem(PLANO_PENDENTE_KEY);
  if (pendente && pendente !== 'ESTAGIARIO' && !state.url.startsWith('/checkout')) {
    return router.createUrlTree(['/checkout'], {
      queryParams: { tipo: 'upgrade', plano: pendente },
    });
  }

  return true;
};
