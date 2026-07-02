import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { DashboardLayout } from './layout/dashboard-layout';

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
        path: 'turmas/nova',
        loadComponent: () =>
          import('./pages/nova-turma/nova-turma-page').then(
            (m) => m.NovaTurmaPage,
          ),
      },
      {
        path: 'agenda',
        loadComponent: () =>
          import('./pages/agenda/agenda-page').then((m) => m.AgendaPage),
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
