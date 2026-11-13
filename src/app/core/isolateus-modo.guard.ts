import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * O aparelho prefere o modo simples do Isolateus (celular fraco)? A escolha
 * fica no `localStorage`; sem storage, o jogo em pixel art é o padrão.
 */
export const preferirModoSimples: CanActivateFn = () => {
  try {
    if (localStorage.getItem('isolateus:modo') === 'simples') {
      return inject(Router).createUrlTree(['/aluno/isolateus/simples']);
    }
  } catch {
    /* sem storage: segue para o jogo */
  }
  return true;
};
