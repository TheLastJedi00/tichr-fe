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
    versao: 'v0.11.4',
    data: '2026-07-06',
    titulo: 'Tichr Wor: rodada em equipe e descoberta como o Qlick',
    itens: [
      { categoria: 'Melhoria', texto: 'O Tichr Wor agora aparece como um card no painel do aluno (igual ao Tichr Qlick), sem uma aba separada — o aluno descobre a batalha do dia e entra por ali.' },
      { categoria: 'Melhoria', texto: 'Nova dinâmica de rodada: cada integrante da equipe joga uma letra e vota em qual castelo atacar; se todos acertarem, o ataque é crítico. As equipes são formadas automaticamente (duplas a partir de 4 alunos, trios a partir de 6, quartetos a partir de 8).' },
      { categoria: 'Melhoria', texto: 'No fim da batalha ficou claro quem venceu: a equipe campeã aparece em destaque, com confete para quem ganhou.' },
    ],
  },
  {
    versao: 'v0.11.3',
    data: '2026-07-06',
    titulo: 'Tichr Wor: sala do professor e entrada dos alunos',
    itens: [
      { categoria: 'Correção', texto: 'No Tichr Wor, o botão "Rodar" agora abre corretamente a sala do professor (antes não acontecia nada na tela).' },
      { categoria: 'Melhoria', texto: 'A sala de espera do professor no Tichr Wor ficou igual à do Tichr Qlick: o PIN da turma em destaque, uma indicação animada de que está aguardando os alunos entrarem, e o "Distribuir equipes" só libera quando há alunos suficientes na sala (com aviso de quantos faltam).' },
    ],
  },
  {
    versao: 'v0.11.2',
    data: '2026-07-06',
    titulo: 'Ajustes do painel, turmas e jogos',
    itens: [
      { categoria: 'Correção', texto: 'No painel, a aula em foco agora considera o horário, não só o dia: uma aula que já terminou some da tela e a que está acontecendo aparece marcada como "Em andamento".' },
      { categoria: 'Correção', texto: 'Turma encerrada por ter acabado os dias de aula: a tela de edição agora tem um botão "Reabrir turma" (que reagenda a grade a partir de hoje) e também dá para reabrir ajustando a data de início.' },
      { categoria: 'Correção', texto: 'A dica de primeiro acesso da área de Jogos ficou geral (fala do conjunto de jogos, como Tichr Qlick e Tichr Wor) em vez de mencionar só o Qlick.' },
    ],
  },
  {
    versao: 'v0.11.1',
    data: '2026-07-06',
    titulo: 'Tichr Wor no mesmo fluxo do Tichr Qlick',
    itens: [
      { categoria: 'Correção', texto: 'Ao criar um Tichr Wor você agora escolhe a disciplina, o tópico do plano de aula e as turmas do mesmo jeito que no Tichr Qlick — e a turma da partida é sugerida na hora de rodar.' },
      { categoria: 'Melhoria', texto: 'Criar e iniciar batalhas do Tichr Wor passou a fazer parte do plano PhD, como os demais jogos ao vivo. A página de apresentação continua aberta para todos.' },
    ],
  },
  {
    versao: 'v0.11.0',
    data: '2026-07-05',
    titulo: 'Tichr Wor',
    itens: [
      { categoria: 'Nova feature', texto: 'Tichr Wor: uma guerra de castelos em equipes. Os alunos decifram palavras, atacam rivais e defendem o HP da sua fortaleza — sobrevivência épica, sem eliminação.' },
      { categoria: 'Nova feature', texto: 'Monte o "arsenal" de palavras com 3 dicas cada; a IA pode criar os enigmas para você (1 geração por dia), e você reordena as palavras arrastando.' },
      { categoria: 'Nova feature', texto: 'Tela do projetor mostra a palavra, as cartas de dica e o HP de cada castelo ao vivo; os alunos jogam pelo celular, com Dilema Tático, Risco Heroico e a Horda (quem cai vira Usurpador e pode roubar a liderança).' },
    ],
  },
  {
    versao: 'v0.10.0',
    data: '2026-07-05',
    titulo: 'Nova Landing Page',
    itens: [
      { categoria: 'Melhoria', texto: 'Página inicial repaginada com foco em gamificação: o Tichr Qlick vira o destaque, com uma seção para cada vantagem (quiz ao vivo, acesso por PIN, ranking e Hall da Fama, equipes, plano de aula e agenda).' },
      { categoria: 'Melhoria', texto: 'Layout que alterna imagem e texto no computador e empilha no celular, com mais respiro entre as seções e ilustrações leves (carrega rápido).' },
    ],
  },
  {
    versao: 'v0.9.1',
    data: '2026-07-05',
    titulo: 'Ajustes do cadastro e do painel',
    itens: [
      { categoria: 'Nova feature', texto: 'Já dá para aplicar um cupom de desconto na hora de criar a conta.' },
      { categoria: 'Correção', texto: 'O aviso de "Falta pouco" no painel deixou de aparecer colado ao card da próxima aula.' },
    ],
  },
  {
    versao: 'v0.9.0',
    data: '2026-07-05',
    titulo: 'Cadastro rápido, Tutoriais & Painel Admin',
    itens: [
      { categoria: 'Nova feature', texto: 'Cadastro grátis em segundos: só e-mail e senha. Você já entra no painel e conclui o perfil depois.' },
      { categoria: 'Nova feature', texto: 'Um lembrete em destaque no painel ajuda a concluir seu perfil (nome, nome de usuário e foto) para liberar todas as ferramentas.' },
      { categoria: 'Nova feature', texto: 'Dicas de primeiro acesso: ao abrir uma área pela primeira vez, uma dica rápida explica o que ela faz e qual o primeiro passo.' },
      { categoria: 'Nova feature', texto: 'Resgate de cupom em "Meu Plano": aplique um código para ganhar desconto ou meses grátis.' },
      { categoria: 'Nova feature', texto: 'Painel administrativo para a equipe Tichr (métricas de uso, suporte a contas e cupons) — visível apenas para administradores.' },
      { categoria: 'Melhoria', texto: 'Visual mais consistente: os últimos emojis viraram ícones e as telas novas ganharam microinterações suaves.' },
    ],
  },
  {
    versao: 'v0.8.1',
    data: '2026-07-05',
    titulo: 'Ajustes de interface',
    itens: [
      { categoria: 'Melhoria', texto: 'Agora dá para sair da conta direto pelo menu lateral, com uma confirmação antes.' },
      { categoria: 'Melhoria', texto: 'Menu lateral e janelas (modais) abrem e fecham com animações suaves — respeitando quem prefere menos movimento.' },
      { categoria: 'Melhoria', texto: 'Em "Minhas Turmas", o card ficou mais limpo e clicável; para encerrar uma turma, use agora a tela de edição.' },
      { categoria: 'Melhoria', texto: 'O detalhe do dia na agenda foi repensado para o celular e ganhou um botão "Ver turma" que leva direto ao painel.' },
      { categoria: 'Correção', texto: 'Informações não se espremem mais: os cards de turma e de aula empilham nome, modalidade e disciplina e quebram linha quando o texto é longo.' },
      { categoria: 'Correção', texto: 'Espaçamentos ajustados em janelas e formulários — inclusive as alternativas e os cards do Tichr Qlick, que apareciam colados.' },
      { categoria: 'Correção', texto: 'Clicar no logo no topo leva ao painel quando você já está logado (antes voltava para a página inicial).' },
    ],
  },
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
