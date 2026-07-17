import { PlanoAtual } from './models';

/** Card de plano exibido na landing e no painel de assinatura. */
export interface Plano {
  /** Chave canonica do plano (liga o card ao estado do professor). */
  plano: PlanoAtual;
  nome: string;
  /** Preço para exibição (ex.: "R$ 19,90"). */
  preco: string;
  /** Preço cobrável em centavos (espelha o catálogo do backend; 0 = gratuito). */
  precoCentavos: number;
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
    precoCentavos: 0,
    limite: 'Até 5 turmas simultâneas',
    pitch: 'O test-drive de entrada. Organize sua agenda agora mesmo.',
    cta: 'Começar grátis',
    features: [
      'Motor de deslizamento completo',
      'Projeção de grade fixa e módulo fechado',
      'Até 5 turmas simultâneas',
      'Tema claro e escuro nativos',
      'Compra avulsa de slots extras (microtransação)',
    ],
  },
  {
    plano: 'GRADUADO',
    nome: 'Tichr Graduado',
    preco: 'R$ 19,90',
    precoCentavos: 1990,
    periodo: '/mês',
    limite: 'Até 99 turmas simultâneas',
    pitch: 'O planejador. Automação total da grade e do plano de aula.',
    cta: 'Quero o Graduado',
    features: [
      'Tudo do Estagiário',
      'Até 99 turmas simultâneas',
      'Plano de aula geral e modular (arraste tópicos para as aulas)',
      'Gestão de férias globais e por turma',
      'Disciplinas, cores e recálculo ilimitado da grade',
    ],
  },
  {
    plano: 'MESTRE',
    nome: 'Tichr Mestre',
    preco: 'R$ 39,90',
    precoCentavos: 3990,
    periodo: '/mês',
    limite: 'Até 99 turmas + gestão de alunos',
    pitch: 'A orquestração pedagógica. Alunos, squads e papéis em sala.',
    cta: 'Quero o Mestre',
    destaque: true,
    features: [
      'Tudo do Graduado',
      'Cadastro nominal de alunos por turma',
      'Gestão de squads e grupos dinâmicos',
      'Sorteio automático de temas',
      'Distribuição de papéis (Tech Lead, Pesquisador…)',
    ],
  },
  {
    plano: 'PHD',
    nome: 'Tichr PhD',
    preco: 'R$ 59,90',
    precoCentavos: 5990,
    periodo: '/mês',
    limite: 'Até 99 turmas + portal do aluno',
    pitch: 'O ecossistema multiplayer. Alunos jogam, acompanham a grade e ganham XP.',
    cta: 'Quero o PhD',
    features: [
      'Tudo do Mestre',
      'Portal do aluno com acesso via PIN',
      'Gamificação: ranking, XP e evolução da turma',
      'Ecossistema de jogos (Tichr Qlick e Tichr Wor)',
      'Engajamento gamificado multiplayer',
    ],
  },
];
