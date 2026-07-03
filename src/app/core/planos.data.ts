import { PlanoAtual } from './models';

/** Card de plano exibido na landing e no painel de assinatura. */
export interface Plano {
  /** Chave canonica do plano (liga o card ao estado do professor). */
  plano: PlanoAtual;
  nome: string;
  preco: string;
  periodo?: string;
  limite: string;
  pitch: string;
  cta: string;
  destaque?: boolean;
  features: string[];
}

/** Vitrine dos 4 planos (fonte unica: landing + painel de assinatura). */
export const PLANOS: readonly Plano[] = [
  {
    plano: 'ESTAGIARIO',
    nome: 'Tichr Estagiário',
    preco: 'Grátis',
    limite: 'Até 2 turmas simultâneas',
    pitch: 'O test-drive de entrada. Resolva sua agenda agora mesmo.',
    cta: 'Começar grátis',
    features: [
      'Motor de deslizamento completo',
      'Projeção de grade fixa e módulo fechado',
      'Até 2 turmas simultâneas',
      'Tema claro e escuro nativos',
      'Compra avulsa de slots extras (microtransação)',
    ],
  },
  {
    plano: 'GRADUADO',
    nome: 'Tichr Graduado',
    preco: 'R$ 19,90',
    periodo: '/mês',
    limite: 'Até 5 turmas simultâneas',
    pitch: 'O titular da sala. Controle absoluto sobre projeções e deslizamentos.',
    cta: 'Quero o Graduado',
    features: [
      'Tudo do Estagiário',
      'Até 5 turmas simultâneas',
      'Gestão de férias globais e por turma',
      'Disciplinas e cores de destaque',
      'Recálculo ilimitado da grade',
    ],
  },
  {
    plano: 'MESTRE',
    nome: 'Tichr Mestre',
    preco: 'R$ 39,90',
    periodo: '/mês',
    limite: 'Turmas ilimitadas',
    pitch: 'A orquestração pedagógica. Squads, sorteios e papéis em sala.',
    cta: 'Quero o Mestre',
    destaque: true,
    features: [
      'Tudo do Graduado',
      'Turmas ilimitadas',
      'Gestão de squads e grupos dinâmicos',
      'Sorteio automático de temas',
      'Distribuição de papéis (Tech Lead, Pesquisador…)',
    ],
  },
  {
    plano: 'PHD',
    nome: 'Tichr PhD',
    preco: 'R$ 59,90',
    periodo: '/mês',
    limite: 'Turmas ilimitadas + portal',
    pitch: 'O ecossistema multiplayer. Alunos acompanham a grade e ganham XP.',
    cta: 'Quero o PhD',
    features: [
      'Tudo do Mestre',
      'Portal do aluno com acesso via PIN',
      'Ranking e acúmulo de XP',
      'Barras de progresso e evolução da turma',
      'Engajamento gamificado multiplayer',
    ],
  },
];
