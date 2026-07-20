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
    versao: 'v0.22.0',
    data: '2026-07-20',
    titulo: 'Menos atrito na hora do jogo',
    itens: [
      {
        categoria: 'Nova feature',
        texto:
          'Vai começar um jogo numa turma que ainda não tem alunos? Agora dá para cadastrar todo mundo ali mesmo, antes de abrir a partida: digite os nomes numa linha só (separados por vírgula, hífen ou quebra de linha) e a partida já começa com a turma montada.',
      },
      {
        categoria: 'Nova feature',
        texto:
          'Ao criar um jogo, agora você escolhe a turma ou a disciplina. Informando só a disciplina, o jogo fica disponível para todas as suas turmas dela. E, quando a turma não usa plano de tópicos, dá para dizer em qual aula (Aula 1, Aula 2…) o jogo deve rodar.',
      },
      {
        categoria: 'Melhoria',
        texto:
          'O painel inicial ficou mais direto: a "Próxima aula" aparece no topo, com um novo atalho "Meu Plano". E os avisos de jogo da próxima aula agora mostram só o que é daquela aula — jogos soltos, sem tópico nem aula definida, não poluem mais o painel.',
      },
      {
        categoria: 'Melhoria',
        texto:
          'A geração de conteúdo por IA pode liberar mais de um uso por dia (o limite é ajustável), e a tela mostra quantas gerações você ainda tem no dia.',
      },
      {
        categoria: 'Melhoria',
        texto:
          'Todo recurso que precisa de um plano superior agora mostra um cadeadinho no menu (não só "Plano de Aula", como antes) — inclusive os Jogos, exclusivos do PhD. O botão continua clicável para você ver do que se trata e decidir se quer fazer upgrade.',
      },
      {
        categoria: 'Correção',
        texto:
          'A geração de perguntas por IA no Teach War (e nos demais jogos) voltou a funcionar — ela estava falhando por um problema de configuração do modelo de IA.',
      },
    ],
  },
  {
    versao: 'v0.21.0',
    data: '2026-07-17',
    titulo: 'Pagamentos de verdade',
    itens: [
      {
        categoria: 'Nova feature',
        texto:
          'Agora dá para assinar e trocar de plano pagando de verdade, com PIX ou cartão. No PIX, o QR Code e o copia-e-cola aparecem na própria tela e o plano é liberado assim que o pagamento cai; no cartão, você é levado a um checkout seguro. A compra de vaga avulsa de turma também passou a funcionar assim.',
      },
      {
        categoria: 'Melhoria',
        texto:
          'Se a assinatura vencer, seus dados ficam intactos — turmas, jogos e histórico continuam salvos. O acesso aos recursos do plano só fica pausado até você renovar, com um aviso e um botão de renovação em "Meu Plano".',
      },
    ],
  },
  {
    versao: 'v0.20.0',
    data: '2026-07-16',
    titulo: 'Por dentro do Tichr',
    itens: [
      {
        categoria: 'Nova feature',
        texto:
          'Tem uma página nova no rodapé, a "Vitrine técnica", que mostra como o Tichr é construído por dentro: como as suas turmas e os seus jogos ficam guardados, por que os jogos ao vivo respondem na hora e o que impede um aluno de burlar a pontuação. É leitura para quem tem curiosidade — nada muda no seu dia a dia.',
      },
    ],
  },
  {
    versao: 'v0.19.0',
    data: '2026-07-16',
    titulo: 'Fale com a gente',
    itens: [
      {
        categoria: 'Nova feature',
        texto:
          'Achou um bug, teve uma ideia ou ficou com uma dúvida? Agora tem um botão "Enviar feedback" no menu, em qualquer tela. Você escolhe o assunto — bug, sugestão, dúvida ou elogio —, escreve, e pronto: chega direto em quem desenvolve o Tichr.',
      },
      {
        categoria: 'Melhoria',
        texto:
          'Você não precisa explicar onde estava nem qual aparelho usa: o Tichr anexa isso sozinho ao seu relato. Assim dá para reproduzir o problema no mesmo lugar em que ele aconteceu, em vez de ficar num vai e vem de perguntas.',
      },
    ],
  },
  {
    versao: 'v0.18.0',
    data: '2026-07-16',
    titulo: 'Sua conta, mais segura',
    itens: [
      {
        categoria: 'Nova feature',
        texto:
          'Agora o Tichr confirma o seu e-mail quando você cria a conta. Assim que se cadastrar, você recebe um link — é só tocar nele para liberar o painel. A tela de espera se atualiza sozinha e tem um botão de reenviar, caso a mensagem demore ou se perca no spam.',
      },
      {
        categoria: 'Nova feature',
        texto:
          'Esqueceu a senha? A tela de login agora tem "Esqueci minha senha". Você informa o e-mail, recebe um link e cadastra uma senha nova na hora — sem precisar falar com ninguém.',
      },
      {
        categoria: 'Nova feature',
        texto:
          'Uma área de Segurança nova nas Configurações, onde você troca o e-mail de acesso ou pede a redefinição da senha. A troca de e-mail é confirmada na caixa nova antes de valer: se você errar o endereço, o e-mail antigo continua funcionando e nada se perde.',
      },
      {
        categoria: 'Melhoria',
        texto:
          'O Tichr não desconecta mais você no meio da aula. Antes, depois de cerca de uma hora, o sistema pedia login de novo — às vezes bem na hora de rodar um jogo com a turma. Agora a sessão se renova sozinha.',
      },
    ],
  },
  {
    versao: 'v0.17.1',
    data: '2026-07-16',
    titulo: 'Acertos no Wor e no Isolateus',
    itens: [
      {
        categoria: 'Correção',
        texto:
          'No Tichr Wor, o rodízio de equipes agora continua de onde parou quando a turma vira a palavra. Antes, cada palavra nova recomeçava na equipe 1 — quem jogava por último acabava esperando duas vezes seguidas. Pular a palavra pelo telão não custa mais o turno de quem estava na vez.',
      },
      {
        categoria: 'Correção',
        texto:
          'No Tichr Wor, o aluno agora vê os nomes dos colegas da própria equipe na tela dele, com o próprio nome em destaque. Antes dava para jogar a partida inteira sem saber com quem se estava jogando.',
      },
      {
        categoria: 'Melhoria',
        texto:
          'No Tichr Isolateus, a Quarentena pode ser convocada depois de cada noite, e não mais uma única vez por partida. Continua cabendo uma por rodada: a vila não consegue emendar acusações até prender todo mundo, e errar segue custando Esperança.',
      },
      {
        categoria: 'Melhoria',
        texto:
          'No Tichr Isolateus, quem já se decidiu pode pular o debate da Quarentena. Se todos pularem, a votação começa na hora, sem ninguém esperar o cronômetro à toa. A vila vê quantos já pularam, mas nunca quem — isso entregaria quem é habitante real.',
      },
      {
        categoria: 'Correção',
        texto:
          'No Tichr Isolateus, o professor agora troca o apelido de um aluno no lobby: é só tocar no nome. Antes a única saída era vetar o nome e pedir para o aluno entrar de novo. Depois que a investigação começa o apelido fica fixo — é o que impede a turma de descobrir quem é habitante virtual.',
      },
    ],
  },
  {
    versao: 'v0.17.0',
    data: '2026-07-14',
    titulo: 'Tichr Isolateus: a vila sob invasão',
    itens: [
      {
        categoria: 'Nova feature',
        texto:
          'Chegou o Tichr Isolateus, o terceiro jogo do ecossistema. A turma vira uma vila isolada no extremo norte, invadida por uma ameaça que se esconde entre os próprios alunos. A cada noite o infiltrado sabota um setor ou tenta abduzir um morador — e a única defesa é a turma acertar a questão da sua matéria. Errar derruba a Barra de Esperança; acertar salva o setor. É dedução e debate por cima do conteúdo da sua aula, não no lugar dele.',
      },
      {
        categoria: 'Nova feature',
        texto:
          'Ninguém joga com o nome verdadeiro: cada aluno entra com um nome de personagem, e você aprova ou veta os nomes no lobby antes de começar. Em turmas pequenas, a vila é preenchida por habitantes virtuais para o infiltrado ter onde se esconder — os alunos não conseguem distinguir quem é real e quem não é, nem inspecionando o aplicativo.',
      },
      {
        categoria: 'Nova feature',
        texto:
          'Durante cada questão corre um chat de rumores. O infiltrado sabe a resposta certa e pode transmitir um argumento falso assinado com o nome de outro habitante, tentando levar a turma ao erro. Quem já foi abduzido não sai do jogo: continua respondendo (e pontuando) numa tela hackeada, de onde pode mandar sinais de rádio anônimos para tentar salvar a vila.',
      },
      {
        categoria: 'Nova feature',
        texto:
          'Quando a desconfiança aperta, a turma convoca a Quarentena: um debate cronometrado seguido de votação no suspeito. Acertar o infiltrado encerra a partida com vitória da vila. Prender um inocente custa caro — e a identidade do preso continua em segredo, para o mistério não acabar antes da hora. A Quarentena só pode ser convocada uma vez por partida.',
      },
      {
        categoria: 'Nova feature',
        texto:
          'As 10 questões da investigação podem ser escritas por você ou geradas pela IA a partir da disciplina e do tópico da aula, como já acontece no Qlick e no Wor. A geração continua limitada a 1 vez por dia, com cota própria — usar a IA do Isolateus não consome a dos outros jogos.',
      },
      {
        categoria: 'Melhoria',
        texto:
          'O Manual do aluno e a tela de regras ganharam a aba do Isolateus, com o passo a passo do jogo e a Tabela de Recompensas: quanto vale acertar a defesa, o bônus de rapidez, quanto o infiltrado ganha ao enganar a vila e o bônus de vitória. Todo mundo joga sabendo exatamente o que está em disputa.',
      },
    ],
  },
  {
    versao: 'v0.16.1',
    data: '2026-07-14',
    titulo: 'Janelas longas agora rolam no celular',
    itens: [
      { categoria: 'Correção', texto: 'No celular, a janela de "Regras e Pontuações" era mais alta que a tela e o final ficava inacessível — não dava para ler a tabela de recompensas inteira nem alcançar o botão de fechar. Agora o conteúdo rola dentro da janela, com o título e o botão sempre visíveis. A correção vale para todas as janelas do app com conteúdo longo.' },
    ],
  },
  {
    versao: 'v0.16.0',
    data: '2026-07-14',
    titulo: 'Batalhas narradas ao vivo, Manual de Guerra e patentes corretas',
    itens: [
      { categoria: 'Nova feature', texto: 'As jogadas de impacto do Tichr Wor agora são narradas ao vivo: quando uma equipe derruba HP de um castelo, quando alguém arrisca a palavra e cura (ou erra e sofre Dano Crítico), quando uma Horda rouba o castelo do líder ou quando uma equipe sacrifica o ataque para comprar uma dica, um aviso aparece no centro da tela de TODOS os alunos e no telão, ao mesmo tempo. O jogo pausa por 3 segundos durante o aviso — inclusive o cronômetro — para que ninguém perca o que aconteceu enquanto estava esperando a sua vez.' },
      { categoria: 'Nova feature', texto: 'Os alunos ganharam a aba "Manual de Guerra": as regras completas do Tichr Wor e do Tichr Qlick e a tabela de quanto vale cada jogada, para a turma poder montar estratégia antes da partida.' },
      { categoria: 'Nova feature', texto: 'Na sua lista de batalhas e de Qlicks, o botão "Regras e Pontuações" abre um resumo das regras e a tabela de recompensas — um guia de consulta rápida para usar durante a aula.' },
      { categoria: 'Nova feature', texto: 'As páginas de apresentação do Tichr Wor e do Tichr Qlick passaram a mostrar a Tabela de Recompensas, para você saber exatamente quanto cada ação do jogo vale antes de montar a atividade.' },
      { categoria: 'Correção', texto: 'A patente exibida no painel do aluno (Bronze, Prata, Ouro, Diamante, Platina) agora respeita os limiares de XP que você configurou na turma. Antes ela usava sempre os valores padrão, então um aluno podia aparecer com uma patente diferente da que a sua régua de pontuação dizia.' },
      { categoria: 'Correção', texto: 'A apresentação do Tichr Wor dizia que errar uma letra causava dano ao próprio castelo — não é o que acontece no jogo. O texto foi corrigido.' },
    ],
  },
  {
    versao: 'v0.15.0',
    data: '2026-07-12',
    titulo: 'Tichr Wor: arsenal inteiro forjado por IA',
    itens: [
      { categoria: 'Nova feature', texto: 'No estúdio do Tichr Wor, o botão "Forjar arsenal com IA" abre um espaço onde você descreve o que a batalha deve cobrar e, em um clique, a IA cria 5 palavras secretas já com as 3 dicas de cada uma — usando a disciplina e o tópico escolhidos como contexto. Antes era preciso digitar cada palavra e pedir as dicas uma por uma; agora o arsenal nasce pronto e você só ajusta o que quiser.' },
      { categoria: 'Melhoria', texto: 'A geração continua limitada a 1 vez por dia, e agora ela rende muito mais: em vez de gastar a cota com as dicas de uma única palavra, você recebe a batalha inteira de uma vez. Escrever palavras e dicas na mão segue sempre disponível.' },
    ],
  },
  {
    versao: 'v0.14.3',
    data: '2026-07-09',
    titulo: 'Jogos: vincular só a turmas ativas',
    itens: [
      { categoria: 'Correção', texto: 'Ao criar ou editar um Tichr Qlick ou um Tichr Wor, a lista de turmas para vincular o jogo agora mostra apenas turmas ativas — as turmas já encerradas deixaram de aparecer, já que não faz sentido preparar um jogo para uma turma encerrada. Se um jogo já estava vinculado a uma turma que encerrou depois, ela continua visível na edição para você poder removê-la.' },
    ],
  },
  {
    versao: 'v0.14.2',
    data: '2026-07-09',
    titulo: 'Painel: jogo da próxima aula por assunto',
    itens: [
      { categoria: 'Correção', texto: 'No painel, o aviso de jogo pronto para a próxima aula agora leva em conta o assunto da aula: em vez de repetir sempre o mesmo jogo da turma, aparece o jogo do mesmo assunto da próxima aula — bem mais preciso. Quando a aula ainda não tem um assunto definido, o painel continua mostrando os jogos daquela turma.' },
      { categoria: 'Melhoria', texto: 'O aviso de jogo pronto no painel passou a incluir também as batalhas do Tichr Wor, e não só o Tichr Qlick.' },
      { categoria: 'Melhoria', texto: 'O card da próxima aula no painel ganhou um botão "Detalhes da turma" para abrir a turma direto dali.' },
    ],
  },
  {
    versao: 'v0.14.1',
    data: '2026-07-09',
    titulo: 'Ordenar alunos por pontuação',
    itens: [
      { categoria: 'Correção', texto: 'Na lista de alunos da turma, ao ordenar por pontuação, quem tem mais pontos fica no topo e os alunos empatados agora aparecem em ordem alfabética — antes o empate caía numa ordem aparentemente aleatória.' },
    ],
  },
  {
    versao: 'v0.14.0',
    data: '2026-07-09',
    titulo: 'Tichr Qlick: perguntas geradas por IA',
    itens: [
      { categoria: 'Nova feature', texto: 'No estúdio do Tichr Qlick agora tem "Gerar perguntas com IA": você abre um campo, descreve como quer as questões e a IA cria 10 perguntas com 4 alternativas cada, usando a disciplina e o tópico como contexto. As perguntas ficam prontas para você revisar e editar do jeito de sempre. Limite de 1 geração por dia (independente da geração de dicas do Tichr Wor).' },
    ],
  },
  {
    versao: 'v0.13.1',
    data: '2026-07-09',
    titulo: 'Excluir a própria conta',
    itens: [
      { categoria: 'Nova feature', texto: 'Em Meu Perfil você agora pode excluir a própria conta. Por segurança, é preciso confirmar a senha e digitar uma palavra de confirmação — a exclusão é definitiva e apaga todos os dados atrelados (turmas, alunos, jogos e histórico).' },
    ],
  },
  {
    versao: 'v0.13.0',
    data: '2026-07-09',
    titulo: 'Cadastro, Termos de Uso e Privacidade',
    itens: [
      { categoria: 'Nova feature', texto: 'Chegaram os Termos de Uso e a Política de Privacidade: duas páginas próprias, acessíveis pelo rodapé do site, pelas Configurações e direto na hora de criar a conta.' },
      { categoria: 'Melhoria', texto: 'Tela de criar conta repaginada: agora você informa o nome, vê o plano escolhido (e pode trocá-lo ali mesmo) e o campo de cupom aparece só nos planos pagos.' },
      { categoria: 'Melhoria', texto: 'Para criar a conta é preciso marcar que leu e concorda com os Termos de Uso e a Política de Privacidade — os documentos abrem em uma janela sem sair do cadastro. O botão "Criar Conta" só habilita depois do aceite.' },
    ],
  },
  {
    versao: 'v0.12.1',
    data: '2026-07-09',
    titulo: 'Tichr Wor: pontos que viram ranking, níveis e férias na agenda',
    itens: [
      { categoria: 'Melhoria', texto: 'No Tichr Wor, cada equipe agora tem uma barra de pontuação acima da vida: o dano causado vira pontos. A vitória continua sendo de quem tem mais vida, mas os pontos servem de desempate — e terminar com o castelo mais intacto, ou arriscar a palavra inteira e acertar, rende pontos extras.' },
      { categoria: 'Melhoria', texto: 'Os pontos conquistados na batalha do Wor passam a contar no ranking da turma: a equipe campeã leva a pontuação cheia e as demais metade, refletindo direto na pontuação de cada aluno.' },
      { categoria: 'Melhoria', texto: 'Ao configurar a pontuação de uma turma, o professor agora define com quantos pontos o aluno sobe de Bronze para Prata, Ouro, Diamante e Platina. O nível do aluno aparece abaixo do nome na lista da turma.' },
      { categoria: 'Correção', texto: 'Na Minha Agenda, os dias marcados como férias agora aparecem com um contorno vermelho, ficando fáceis de identificar no calendário.' },
    ],
  },
  {
    versao: 'v0.12.0',
    data: '2026-07-07',
    titulo: 'Planos: novos limites e recursos por nível',
    itens: [
      { categoria: 'Melhoria', texto: 'O plano Estagiário agora permite até 5 turmas simultâneas (antes eram 2), e todos os planos pagos vão até 99 turmas.' },
      { categoria: 'Melhoria', texto: 'O plano de aula modular — arrastar tópicos direto para as aulas da grade — passou a estar disponível já no plano Graduado.' },
      { categoria: 'Melhoria', texto: 'O cadastro nominal de alunos passou a fazer parte do plano Mestre. Nos planos abaixo, a aba de alunos mostra um convite para desbloquear o recurso.' },
      { categoria: 'Melhoria', texto: 'Textos dos planos atualizados: a diferença entre os planos pagos passa a ser pelos recursos (planejamento, gestão de alunos e equipes, gamificação e jogos), não mais pela quantidade de turmas.' },
    ],
  },
  {
    versao: 'v0.11.5',
    data: '2026-07-06',
    titulo: 'Página inicial: a arena dos dois jogos',
    itens: [
      { categoria: 'Melhoria', texto: 'A página inicial deixou de falar só do Tichr Qlick: agora apresenta uma "arena de jogos" com os dois jogos lado a lado — Tichr Qlick (quiz ao vivo) e Tichr Wor (batalha de palavras em equipes) — cada um com a sua identidade.' },
      { categoria: 'Melhoria', texto: 'Nova seção de destaque do Tichr Wor com um mockup da batalha (castelos, vida e palavra sendo revelada) e um card "novos jogos em breve", deixando claro que o arsenal vai crescer.' },
    ],
  },
  {
    versao: 'v0.11.4',
    data: '2026-07-06',
    titulo: 'Tichr Wor: rodada em equipe e descoberta como o Qlick',
    itens: [
      { categoria: 'Melhoria', texto: 'O Tichr Wor agora aparece como um card no painel do aluno (igual ao Tichr Qlick), sem uma aba separada — o aluno descobre a batalha do dia e entra por ali.' },
      { categoria: 'Melhoria', texto: 'Nova dinâmica de rodada: cada integrante da equipe joga uma letra e vota em qual castelo atacar; se todos acertarem, o ataque é crítico. As equipes são formadas automaticamente (duplas a partir de 4 alunos, trios a partir de 6, quartetos a partir de 8).' },
      { categoria: 'Melhoria', texto: 'No fim da batalha ficou claro quem venceu: a equipe campeã aparece em destaque, com confete para quem ganhou.' },
      { categoria: 'Melhoria', texto: 'Durante a batalha o aluno vê os castelos de todas as equipes (HP e de quem é a vez) e, a cada rodada, um resumo de quem acertou a letra e quem atacou quem — com um aviso na tela quando o seu castelo leva dano.' },
      { categoria: 'Melhoria', texto: 'Cada rodada tem 1 minuto, com cronômetro visível para todos; ao zerar, a rodada é encerrada automaticamente.' },
      { categoria: 'Correção', texto: 'Contraste do Tichr Wor no tema escuro: textos e cartas de dica que ficavam difíceis de ler foram clareados.' },
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
