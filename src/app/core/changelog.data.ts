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
    versao: 'v0.8.0',
    data: '2026-07-04',
    titulo: 'Hall da Fama & Jogos flexíveis',
    itens: [
      { categoria: 'Nova feature', texto: 'Turmas agora têm abas Ativas e Encerradas: ao encerrar uma turma, ela vira somente leitura e libera o PIN para uma nova turma.' },
      { categoria: 'Nova feature', texto: 'Hall da Fama: os alunos acessam as turmas encerradas do professor e veem o ranking final — sem precisar de PIN.' },
      { categoria: 'Nova feature', texto: 'Um mesmo Tichr Qlick pode ser atribuído a várias turmas; ao rodar, o sistema pergunta para qual turma.' },
      { categoria: 'Nova feature', texto: 'No estúdio, marque as turmas do jogo; no painel da turma, use "Adicionar jogo" para puxar um Qlick da sua biblioteca.' },
      { categoria: 'Nova feature', texto: 'Sala de espera do professor mostra o PIN da turma em tamanho grande e uma lista de alunos onde o PIN de cada um se revela ao toque (ajuda quem esqueceu).' },
      { categoria: 'Melhoria', texto: 'Dashboard ganhou uma grade de Acesso Rápido espelhando o menu, otimizada para o celular.' },
      { categoria: 'Melhoria', texto: 'Emojis substituídos por ícones para um visual mais consistente entre aparelhos, com espaçamentos e cards mais adaptados ao mobile.' },
    ],
  },
  {
    versao: 'v0.7.0',
    data: '2026-07-04',
    titulo: 'Smart PINs',
    itens: [
      { categoria: 'Nova feature', texto: 'PINs curtos de 2 dígitos para a turma e para cada aluno — bem mais fáceis de digitar na hora de entrar na aula.' },
      { categoria: 'Nova feature', texto: 'Turmas antigas ganham um aviso e um botão para atualizar aos novos PINs (o sistema regenera o PIN da sala e o de cada aluno em sequência).' },
      { categoria: 'Melhoria', texto: 'O portal do aluno ajusta sozinho a quantidade de dígitos do PIN, então turmas novas e antigas convivem sem confusão.' },
    ],
  },
  {
    versao: 'v0.6.0',
    data: '2026-07-04',
    titulo: 'Perfil, Mídias & Experiência',
    itens: [
      { categoria: 'Nova feature', texto: 'Foto de perfil do professor: recorte quadrado, otimização automática e upload — com um avatar de iniciais quando não há foto.' },
      { categoria: 'Nova feature', texto: 'Configurações viraram um Hub com atalhos para "Meu Perfil" e "Meu Plano".' },
      { categoria: 'Nova feature', texto: 'Nome de usuário (@) do portal com trava de 60 dias para evitar trocas frequentes.' },
      { categoria: 'Nova feature', texto: 'O avatar do professor aparece na busca do aluno no portal.' },
      { categoria: 'Melhoria', texto: 'Disciplinas agora são cards com um modal para renomear ou excluir.' },
      { categoria: 'Melhoria', texto: 'Tichr Qlick mais divertido: lobby animado, alternativas coloridas (A/B/C/D), animação ao responder e revelação com confete no acerto.' },
      { categoria: 'Melhoria', texto: 'Carregamentos com "esqueletos" (skeleton) e bloqueio do formulário enquanto salva, evitando cliques duplos.' },
      { categoria: 'Melhoria', texto: 'Painel mais rápido: dados carregados de forma agregada e em paralelo.' },
      { categoria: 'Correção', texto: 'Ajuste visual no aviso de atribuição de cargos (cantos arredondados demais).' },
    ],
  },
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
