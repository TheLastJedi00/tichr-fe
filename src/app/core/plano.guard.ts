import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map } from 'rxjs';
import { planoAtendeMinimo } from './plano.util';
import { ProfileService } from './profile.service';
import { RECURSO_PLANO_MINIMO, Recurso } from './recursos';

/**
 * Guard de plano parametrizavel: libera a rota se o plano do professor alcanca
 * o minimo exigido pelo recurso; caso contrario redireciona ao painel /planos
 * com o contexto do recurso (?recurso=...).
 */
export function exigePlano(recurso: Recurso): CanActivateFn {
  return () => {
    const profileService = inject(ProfileService);
    const router = inject(Router);
    const minimo = RECURSO_PLANO_MINIMO[recurso];

    const decidir = (): boolean | UrlTree =>
      planoAtendeMinimo(profileService.profile()?.planoAtual, minimo)
        ? true
        : router.createUrlTree(['/planos'], { queryParams: { recurso } });

    // Garante o perfil carregado antes de decidir (ex.: navegacao direta).
    if (profileService.profile()) {
      return decidir();
    }
    return profileService.load().pipe(map(decidir));
  };
}
