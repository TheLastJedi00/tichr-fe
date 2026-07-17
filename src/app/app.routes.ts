import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { adminGuard } from './core/admin.guard';
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
    path: 'cadastro',
    loadComponent: () =>
      import('./pages/cadastro/cadastro-page').then((m) => m.CadastroPage),
  },
  {
    path: 'recuperar-senha',
    loadComponent: () =>
      import('./pages/recuperar-senha/recuperar-senha-page').then(
        (m) => m.RecuperarSenhaPage,
      ),
  },
  {
    // Bloco público de propósito: quem espera confirmação TEM token válido, mas
    // o painel está travado. Atrás do authGuard funcionaria (ele só olha o
    // localStorage), mas o lugar certo é aqui — a tela existe justamente para
    // quem ainda não tem acesso ao painel.
    path: 'verificar-email',
    loadComponent: () =>
      import('./pages/verificar-email/verificar-email-page').then(
        (m) => m.VerificarEmailPage,
      ),
  },
  {
    path: 'novidades',
    loadComponent: () =>
      import('./pages/novidades/novidades-page').then((m) => m.NovidadesPage),
  },
  {
    path: 'tecnologia',
    loadComponent: () =>
      import('./pages/tecnologia/tecnologia-page').then((m) => m.TecnologiaPage),
  },
  {
    path: 'termos',
    loadComponent: () =>
      import('./pages/termos/termos-page').then((m) => m.TermosPage),
  },
  {
    path: 'privacidade',
    loadComponent: () =>
      import('./pages/privacidade/privacidade-page').then(
        (m) => m.PrivacidadePage,
      ),
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
      {
        path: 'qlick',
        loadComponent: () =>
          import('./pages/student-qlick/student-qlick-page').then(
            (m) => m.StudentQlickPage,
          ),
      },
      {
        path: 'wor',
        loadComponent: () =>
          import('./pages/student-wor/student-wor-page').then(
            (m) => m.StudentWorPage,
          ),
      },
      {
        path: 'isolateus',
        loadComponent: () =>
          import('./pages/student-isolateus/student-isolateus-page').then(
            (m) => m.StudentIsolateusPage,
          ),
      },
      {
        path: 'manual',
        loadComponent: () =>
          import('./pages/student-manual/student-manual-page').then(
            (m) => m.StudentManualPage,
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
        path: 'checkout',
        loadComponent: () =>
          import('./pages/checkout/checkout-page').then((m) => m.CheckoutPage),
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
          import('./pages/jogos/qlick-home-page').then((m) => m.QlickHomePage),
      },
      { path: 'jogos/qlick/meus', redirectTo: 'jogos/qlick', pathMatch: 'full' },
      {
        path: 'jogos/wor',
        loadComponent: () =>
          import('./pages/jogos/wor-home-page').then((m) => m.WorHomePage),
      },
      { path: 'jogos/wor/meus', redirectTo: 'jogos/wor', pathMatch: 'full' },
      {
        path: 'jogos/wor/novo',
        canActivate: [exigePlano('WOR')],
        loadComponent: () =>
          import('./pages/jogos/wor-studio-page').then((m) => m.WorStudioPage),
      },
      {
        path: 'jogos/wor/editar/:id',
        canActivate: [exigePlano('WOR')],
        loadComponent: () =>
          import('./pages/jogos/wor-studio-page').then((m) => m.WorStudioPage),
      },
      {
        path: 'jogos/wor/partida/:id',
        canActivate: [exigePlano('WOR')],
        loadComponent: () =>
          import('./pages/jogos/wor-projetor-page').then((m) => m.WorProjetorPage),
      },
      // Isolateus: a home é aberta (descoberta → upsell); criar/rodar é PhD.
      {
        path: 'jogos/isolateus',
        loadComponent: () =>
          import('./pages/jogos/isolateus-home-page').then(
            (m) => m.IsolateusHomePage,
          ),
      },
      {
        path: 'jogos/isolateus/meus',
        redirectTo: 'jogos/isolateus',
        pathMatch: 'full',
      },
      {
        path: 'jogos/isolateus/novo',
        canActivate: [exigePlano('ISOLATEUS')],
        loadComponent: () =>
          import('./pages/jogos/isolateus-studio-page').then(
            (m) => m.IsolateusStudioPage,
          ),
      },
      {
        path: 'jogos/isolateus/editar/:id',
        canActivate: [exigePlano('ISOLATEUS')],
        loadComponent: () =>
          import('./pages/jogos/isolateus-studio-page').then(
            (m) => m.IsolateusStudioPage,
          ),
      },
      {
        path: 'jogos/isolateus/partida/:id',
        canActivate: [exigePlano('ISOLATEUS')],
        loadComponent: () =>
          import('./pages/jogos/isolateus-projetor-page').then(
            (m) => m.IsolateusProjetorPage,
          ),
      },
      {
        path: 'jogos/qlick/partida/:id',
        canActivate: [exigePlano('QLICK')],
        loadComponent: () =>
          import('./pages/jogos/professor-partida-page').then(
            (m) => m.ProfessorPartidaPage,
          ),
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
      {
        path: 'configuracoes/perfil',
        loadComponent: () =>
          import('./pages/meu-perfil/meu-perfil-page').then(
            (m) => m.MeuPerfilPage,
          ),
      },
      {
        path: 'configuracoes/seguranca',
        loadComponent: () =>
          import('./pages/seguranca/seguranca-page').then((m) => m.SegurancaPage),
      },
      {
        path: 'configuracoes/plano',
        loadComponent: () =>
          import('./pages/meu-plano/meu-plano-page').then(
            (m) => m.MeuPlanoPage,
          ),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin/admin-dashboard-page').then(
            (m) => m.AdminDashboardPage,
          ),
      },
      {
        path: 'admin/usuarios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin/admin-usuarios-page').then(
            (m) => m.AdminUsuariosPage,
          ),
      },
      {
        path: 'admin/cupons',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin/admin-cupons-page').then(
            (m) => m.AdminCuponsPage,
          ),
      },
      {
        path: 'admin/feedbacks',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin/admin-feedbacks-page').then(
            (m) => m.AdminFeedbacksPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
