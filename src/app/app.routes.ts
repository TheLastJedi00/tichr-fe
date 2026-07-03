import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { exigePlano } from './core/plano.guard';
import { studentGuard } from './core/student-auth.guard';
import { DashboardLayout } from './layout/dashboard-layout';
import { StudentLayout } from './layout/student-layout';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/landing/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'novidades',
    loadComponent: () =>
      import('./pages/novidades/novidades-page').then((m) => m.NovidadesPage),
  },
  {
    path: 'entrar',
    loadComponent: () =>
      import('./pages/student-entrar/student-entrar-page').then(
        (m) => m.StudentEntrarPage,
      ),
  },
  {
    path: 't/:turmaId',
    loadComponent: () =>
      import('./pages/student-login/student-login-page').then(
        (m) => m.StudentLoginPage,
      ),
  },
  {
    path: 'aluno',
    component: StudentLayout,
    canActivate: [studentGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/student-dashboard/student-dashboard-page').then(
            (m) => m.StudentDashboardPage,
          ),
      },
      {
        path: 'agenda',
        loadComponent: () =>
          import('./pages/student-agenda/student-agenda-page').then(
            (m) => m.StudentAgendaPage,
          ),
      },
      {
        path: 'ranking',
        loadComponent: () =>
          import('./pages/student-ranking/student-ranking-page').then(
            (m) => m.StudentRankingPage,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'turmas',
        loadComponent: () =>
          import('./pages/minhas-turmas/minhas-turmas-page').then(
            (m) => m.MinhasTurmasPage,
          ),
      },
      {
        path: 'turmas/nova',
        loadComponent: () =>
          import('./pages/nova-turma/nova-turma-page').then(
            (m) => m.NovaTurmaPage,
          ),
      },
      {
        path: 'turmas/:id/dinamica',
        canActivate: [exigePlano('DINAMICAS')],
        loadComponent: () =>
          import('./pages/nova-dinamica/nova-dinamica-page').then(
            (m) => m.NovaDinamicaPage,
          ),
      },
      {
        path: 'planos',
        loadComponent: () =>
          import('./pages/planos/planos-page').then((m) => m.PlanosPage),
      },
      {
        path: 'turmas/:id',
        loadComponent: () =>
          import('./pages/turma-detalhe/turma-detalhe-page').then(
            (m) => m.TurmaDetalhePage,
          ),
      },
      {
        path: 'turmas/:id/editar',
        loadComponent: () =>
          import('./pages/editar-turma/editar-turma-page').then(
            (m) => m.EditarTurmaPage,
          ),
      },
      {
        path: 'agenda',
        loadComponent: () =>
          import('./pages/agenda/agenda-page').then((m) => m.AgendaPage),
      },
      {
        path: 'plano-aula',
        canActivate: [exigePlano('PLANO_AULA')],
        loadComponent: () =>
          import('./pages/plano-aula/plano-aula-page').then(
            (m) => m.PlanoAulaPage,
          ),
      },
      {
        path: 'jogos',
        loadComponent: () =>
          import('./pages/jogos/jogos-page').then((m) => m.JogosPage),
      },
      {
        path: 'jogos/qlick',
        loadComponent: () =>
          import('./pages/jogos/qlick-intro-page').then((m) => m.QlickIntroPage),
      },
      {
        path: 'jogos/qlick/novo',
        canActivate: [exigePlano('QLICK')],
        loadComponent: () =>
          import('./pages/jogos/qlick-studio-page').then((m) => m.QlickStudioPage),
      },
      {
        path: 'jogos/qlick/editar/:id',
        canActivate: [exigePlano('QLICK')],
        loadComponent: () =>
          import('./pages/jogos/qlick-studio-page').then((m) => m.QlickStudioPage),
      },
      {
        path: 'configuracoes',
        loadComponent: () =>
          import('./pages/configuracoes/configuracoes-page').then(
            (m) => m.ConfiguracoesPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
