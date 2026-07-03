import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StudentAuthService } from './student-auth.service';

/**
 * Protege as rotas do portal do aluno: libera se houver sessao de aluno,
 * senao volta para a tela de login da turma (ou a landing).
 */
export const studentGuard: CanActivateFn = () => {
  const studentAuth = inject(StudentAuthService);
  const router = inject(Router);

  if (studentAuth.isAuthenticated()) {
    return true;
  }
  const turmaId = studentAuth.turmaId();
  return router.createUrlTree([turmaId ? `/t/${turmaId}` : '/']);
};
