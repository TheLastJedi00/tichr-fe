export type CategoriaMudanca = 'Nova feature' | 'Melhoria' | 'Correção';

export interface ItemMudanca {
  categoria: CategoriaMudanca;
  texto: string;
}

export interface VersaoChangelog {
  versao: string;
  data: string; // 'YYYY-MM-DD'
  titulo: string;
  itens: ItemMudanca[];
}

/**
 * Histórico de novidades — espelha o README e é atualizado no fechamento de
 * cada release (junto do README, conforme a strategy).
 */
export const CHANGELOG: VersaoChangelog[] = [
  {
    versao: 'v0.5.0',
    data: '2026-07-03',
    titulo: 'Tichr Qlick',
    itens: [
      { categoria: 'Nova feature', texto: 'Tichr Qlick: quiz ao vivo estilo Kahoot, exclusivo do plano PhD. Estúdio para montar perguntas e alternativas.' },
      { categoria: 'Nova feature', texto: 'Partida em tempo real: lobby, pergunta com cronômetro, revelação da resposta e pódio final — tudo sincronizado ao vivo.' },
      { categoria: 'Nova feature', texto: 'No portal, o aluno entra pelo "Tichr Qlick de hoje", responde e vê sua colocação na hora.' },
      { categoria: 'Nova feature', texto: 'Os pontos da partida entram no XP do portal (motivo Qlick), somando ao ranking da turma.' },
      { categoria: 'Melhoria', texto: 'Novo menu "Jogos" com a vitrine do Tichr Qlick.' },
    ],
  },
  {
    versao: 'v0.4.0',
    data: '2026-07-03',
    titulo: 'Plano de Aula & Agenda',
    itens: [
      { categoria: 'Nova feature', texto: 'Plano de Aula por disciplina (Graduado), com tópicos e alocação por arrastar-e-soltar na grade (Mestre).' },
      { categoria: 'Nova feature', texto: 'Sincronização dos tópicos no Portal do Aluno (PhD): "o que já vimos" e "o que vem por aí".' },
      { categoria: 'Melhoria', texto: 'Dashboard destaca o assunto/tópico da próxima aula.' },
      { categoria: 'Melhoria', texto: 'Agenda com alternância Calendário (5 semanas) / Detalhado (15 dias por turnos).' },
      { categoria: 'Nova feature', texto: 'Rodapé global e esta página de Novidades.' },
    ],
  },
  {
    versao: 'v0.3.0',
    data: '2026-07-03',
    titulo: 'Portal PhD & Gamificação',
    itens: [
      { categoria: 'Nova feature', texto: 'Portal do aluno por @username do professor + PIN da turma.' },
      { categoria: 'Nova feature', texto: 'Gamificação exclusiva do plano PhD, com pontuação base pelo andamento do curso.' },
      { categoria: 'Melhoria', texto: 'PINs de turma e de aluno visíveis para o professor repassar.' },
      { categoria: 'Correção', texto: 'Portal do aluno deixou de receber 403 ao carregar o painel.' },
    ],
  },
  {
    versao: 'v0.2.0',
    data: '2026-07-03',
    titulo: 'Alunos, Equipes & Planos',
    itens: [
      { categoria: 'Nova feature', texto: 'Gestão de equipes com arrastar-e-soltar e cargos atribuíveis aos membros.' },
      { categoria: 'Nova feature', texto: 'Pontuação customizável por turma (nome, rótulos, ranking on/off).' },
      { categoria: 'Melhoria', texto: 'Planos de assinatura com gating de recursos e upsell.' },
    ],
  },
  {
    versao: 'v0.1.0',
    data: '2026-07-02',
    titulo: 'MVP',
    itens: [
      { categoria: 'Nova feature', texto: 'Motor de agendamento orientado a regras (deslizamento e grade fixa).' },
      { categoria: 'Nova feature', texto: 'Turmas, agenda, exceções e férias.' },
      { categoria: 'Nova feature', texto: 'Portal do aluno com XP e ranking.' },
    ],
  },
];
