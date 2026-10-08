/**
 * Regras e Tabela de Recompensas dos jogos — fonte única, consumida pelas
 * landings, pelo modal do professor e pelo Manual de Guerra do aluno.
 *
 * Os valores ESPELHAM as constantes do backend (`WOR` em wor-match.entity.ts e
 * PONTOS_ACERTO/BONUS_RAPIDEZ em partida.service.ts). Ao mexer no balanceamento
 * lá, atualize aqui — é isto que o professor e o aluno leem como promessa.
 */

export type JogoId = 'WOR' | 'QLICK' | 'ISOLATEUS';

/** Uma linha da Tabela de Recompensas. */
export interface Recompensa {
  acao: string;
  valor: string;
  detalhe?: string;
}

export interface BlocoRegra {
  titulo: string;
  itens: string[];
}

export interface RegrasJogo {
  id: JogoId;
  nome: string;
  resumo: string;
  como: BlocoRegra[];
  /** O que a coluna de valor mede (o Wor pontua em combate; o Qlick, direto em XP). */
  unidade: string;
  recompensas: Recompensa[];
  /** Como a pontuação do jogo vira XP do ranking da turma. */
  conversao: string;
}

const WOR: RegrasJogo = {
  id: 'WOR',
  nome: 'Tichr Wor',
  resumo:
    'Batalha de castelos por palavras. Cada equipe defende uma fortaleza de 1000 HP e ataca as rivais acertando letras da palavra secreta.',
  como: [
    {
      titulo: 'O turno é da equipe',
      itens: [
        'As equipes jogam em rodízio. No turno da sua equipe, cada membro age uma vez.',
        'Na sua vez você chuta uma letra e vota: atacar um castelo rival ou comprar uma dica.',
        'A rodada só resolve quando todos os membros jogaram — ou quando o cronômetro de 1 minuto zera.',
        'Entre os que acertaram a letra, a ação mais votada vence. Empate: vale o voto de quem acertou primeiro.',
      ],
    },
    {
      titulo: 'Ataque e dano',
      itens: [
        'Se a equipe acertou letras e votou atacar, o castelo alvo perde 100 de HP.',
        'Ataque perfeito: se TODOS os membros da equipe acertarem a letra (equipes de 2+), o dano dobra para 200.',
        'Comprar dica sacrifica o ataque da rodada, mas revela mais uma carta da palavra (até 3).',
      ],
    },
    {
      titulo: 'Risco Heroico',
      itens: [
        'A qualquer momento do seu turno você pode arriscar a palavra inteira.',
        'Acertou: a onda avança na hora e quem arriscou escolhe a recompensa da equipe —',
        'Recuperar HP: seu castelo recupera 400 de HP.',
        'Catapulta: 300 de dano no castelo rival que você escolher (se o HP dele zerar, ele vira Horda).',
        'Errou: seu PRÓPRIO castelo sofre 200 de Dano Crítico.',
      ],
    },
    {
      titulo: 'Horda Bárbara',
      itens: [
        'Castelo a 0 de HP não elimina a equipe: ela vira uma Horda Bárbara.',
        'A Horda não chuta letras nem compra dicas — sua única jogada é a Invasão (adivinhar a palavra inteira).',
        'Invasão certeira ROUBA o castelo da equipe líder, que passa a ser a nova Horda.',
      ],
    },
    {
      titulo: 'Chat da equipe',
      itens: [
        'Cada equipe tem um chat privado: só os membros dela leem — nem as rivais, nem o professor.',
        'Mensagens de até 200 caracteres, uma a cada 2 segundos.',
        'Linguagem imprópria é bloqueada pelo sistema: a mensagem não chega à equipe, quem escreveu perde 1000 de XP no ranking e o castelo da equipe perde 100 de HP.',
        'O professor e a sua equipe recebem o alerta com o nome de quem escreveu.',
      ],
    },
    {
      titulo: 'Fim da batalha',
      itens: [
        'A batalha acaba quando as palavras do arsenal terminam.',
        'Vence quem tiver MAIS HP. Empate no HP é desempatado pelos pontos de combate.',
        'Partida valendo mais: antes de começar, o professor pode multiplicar os pontos da partida (de 1x a 10x). O dano nos castelos não muda, só a pontuação.',
      ],
    },
  ],
  unidade: 'Pontos de combate',
  recompensas: [
    { acao: 'Ataque ao castelo rival', valor: '+100', detalhe: 'os pontos vão para a equipe atacante' },
    { acao: 'Ataque perfeito (equipe inteira acertou)', valor: '+200', detalhe: 'equipes de 2 ou mais membros' },
    { acao: 'Risco Heroico certeiro (ou Invasão da Horda)', valor: '+300', detalhe: 'além de curar 400 de HP, disparar a Catapulta ou roubar o castelo' },
    { acao: 'Catapulta no castelo rival', valor: '+300', detalhe: 'o dano causado vira pontos, além do bônus do Risco Heroico' },
    { acao: 'Castelo de pé no fim da batalha', valor: '+1 por HP restante', detalhe: 'terminar intacto vale até +1000' },
    { acao: 'Comprar dica', valor: '0', detalhe: 'sacrifica o ataque da rodada em troca de uma carta' },
    { acao: 'Errar a letra ou o Risco Heroico', valor: '0', detalhe: 'errar o risco ainda custa 200 de HP' },
    { acao: 'Linguagem imprópria no chat', valor: '−1000 XP', detalhe: 'direto no ranking de quem escreveu, e −100 de HP no castelo da equipe' },
  ],
  conversao:
    'Ao fim da batalha, os pontos de combate viram XP do ranking da turma na proporção de 1 para 1. A equipe campeã recebe o valor cheio; as demais, metade. Todos os membros da equipe recebem o mesmo XP. O professor pode valer a partida de 1x a 10x antes de começar: todos os pontos (e o XP) são multiplicados.',
};

const QLICK: RegrasJogo = {
  id: 'QLICK',
  nome: 'Tichr Qlick',
  resumo:
    'Quiz ao vivo. O professor projeta a pergunta e todos respondem pelo celular — quanto mais rápida a resposta certa, mais vale.',
  como: [
    {
      titulo: 'Como se joga',
      itens: [
        'Todos os alunos respondem à mesma pergunta, ao mesmo tempo, dentro do tempo da questão.',
        'Só a resposta certa pontua — errar não tira pontos.',
        'O placar aparece no telão a cada rodada.',
      ],
    },
  ],
  unidade: 'XP',
  recompensas: [
    { acao: 'Resposta certa', valor: '+1000' },
    { acao: 'Bônus de rapidez', valor: 'até +500', detalhe: 'proporcional ao tempo que sobrou no relógio' },
    { acao: 'Resposta errada', valor: '0' },
  ],
  conversao:
    'No Qlick os pontos da partida viram XP do ranking na proporção de 1 para 1, direto para cada aluno.',
};

const ISOLATEUS: RegrasJogo = {
  id: 'ISOLATEUS',
  nome: 'Tichr Isolateus',
  resumo:
    'Dedução social numa vila isolada. Um infiltrado se esconde entre os habitantes: a turma responde questões para defender a vila e debate para descobrir quem é a Ameaça.',
  como: [
    {
      titulo: 'A vila e os papéis',
      itens: [
        'Ninguém usa o nome verdadeiro: cada aluno entra com um nome de personagem.',
        'Um aluno é sorteado como a Ameaça. Todos os outros são Aldeões.',
        'Em turmas pequenas, a vila é preenchida por Habitantes Virtuais para a Ameaça ter onde se esconder. Eles nunca são a Ameaça.',
        'São necessários pelo menos 4 investigadores reais para começar.',
        'Discrição: o papel não aparece na tela. Para ver se você é Aldeão ou Ameaça — e as suas ações —, toque no seu personagem.',
        'O olho abaixo do seu codinome esconde o nome da tela, para quem está do lado não ler.',
      ],
    },
    {
      titulo: 'O Ciclo de Invasão',
      itens: [
        'A cada noite a Ameaça escolhe em segredo: sabotar um dos 6 setores da vila ou abduzir um morador.',
        'A vila é avisada do ataque e todos respondem à questão da rodada para defender o setor.',
        'Se a maioria acertar, a defesa resiste e nada acontece. Se a maioria errar, o ataque se concretiza e a Barra de Esperança cai.',
        'Como os Habitantes Virtuais votam ao acaso, empates são desempatados pelo consenso dos jogadores reais — o Instinto Humano.',
        'O voto da Ameaça não conta na defesa: ela responde e pontua como todos, mas não decide o resultado.',
        'Durante a noite, só você sabe para onde andou: o mapa da vila só mostra as posições novas quando a noite termina.',
        'A cada 3 noites, um brilho misterioso irradia alguns setores da vila, sem explicação. O mapa mostra quantas noites faltam.',
      ],
    },
    {
      titulo: 'Os Poderes Alienígenas',
      itens: [
        'Se a Ameaça acertar a questão do dia, ganha um poder — um por acerto, válido até o fim da noite seguinte.',
        'Controle Mental: na noite seguinte, as jogadas dela partem do setor de outro habitante, que não fica sabendo. Se a vila prender o controlado, prende um inocente.',
        'Contágio: um aluno real, sorteado, vira uma Ameaça também — com jogada própria toda noite. A Esperança cai a cada contágio, sem aviso. Só a Ameaça original contagia.',
        'Delírio Coletivo: todos os habitantes trocam de nome entre si. O Diário avisa, mas não diz quem causou.',
        'Com mais de uma Ameaça, a vila só vence quando prender todas.',
      ],
    },
    {
      titulo: 'O Resgate',
      itens: [
        'Do Setor de Saúde, de pé, qualquer habitante pode organizar à noite o resgate de quem saiu da vila (abduzido ou preso).',
        'O resgate só vale se, ao amanhecer, houver pelo menos 2 habitantes na Saúde.',
        'Ele entra na questão do dia: se a maioria dos aldeões acertar, a vila vota quem volta — e a Esperança sobe 10.',
        'Quem volta reaparece na Saúde. Se a turma trouxer de volta uma Ameaça presa, ela volta livre: a escolha é da vila.',
      ],
    },
    {
      titulo: 'Sinais de Rádio',
      itens: [
        'Quem já foi abduzido ou preso continua respondendo e pode mandar um Sinal de Rádio anônimo durante a questão, tentando salvar a vila.',
      ],
    },
    {
      titulo: 'A Quarentena',
      itens: [
        'Depois de cada noite, a vila pode convocar a Quarentena — uma por rodada.',
        'Abre um debate cronometrado e, em seguida, a votação no suspeito.',
        'Quem convoca aparece para toda a vila e no Diário. Se a Quarentena prender um inocente, quem convocou fica a rodada seguinte sem poder convocar.',
        'Só os votos dos jogadores reais contam. A Quarentena sempre prende alguém; empate vira sorteio entre os empatados.',
        'O professor pode desligar o debate antes de iniciar a partida: aí a Quarentena vai direto para a votação.',
        'Quem já se decidiu pode pular o debate: se todos pularem, a votação começa na hora.',
        'O professor controla o ritmo pelo telão: ele pode pular o tempo restante de qualquer etapa — noite, questão, debate ou votação — e o jogo segue como se o relógio tivesse zerado.',
        'Trancou a Ameaça: a invasão é contida e a Vila vence na hora — ou, se o Contágio deixou outra solta, a partida segue.',
        'Trancou um inocente: a Esperança sofre dano severo e a identidade do preso continua em segredo.',
        'Se notar alunos combinando por fora, o professor pode causar um delírio coletivo a qualquer momento: todos trocam de nome, com o mesmo aviso anônimo do poder da Ameaça.',
      ],
    },
    {
      titulo: 'Fim de partida',
      itens: [
        'A Ameaça vence se zerar a Esperança, abduzir mais da metade da vila ou destruir mais de 3 setores.',
        'A Vila vence se prender todas as Ameaças, manter mais de 3 setores intactos ou resistir com mais da metade dos moradores.',
        'O telão sempre mostra o motivo técnico da vitória.',
      ],
    },
  ],
  unidade: 'XP',
  recompensas: [
    { acao: 'Resposta certa na defesa do setor', valor: '+1000' },
    {
      acao: 'Bônus de rapidez',
      valor: 'até +500',
      detalhe: 'proporcional ao tempo que sobrou no relógio',
    },
    {
      acao: 'Sabotagem validada (a vila errou)',
      valor: '+1000 para a Ameaça',
      detalhe: 'induzir a vila ao erro vale o mesmo que acertar a questão',
    },
    {
      acao: 'Resgate concluído',
      valor: '+10 de Esperança',
      detalhe: 'para a vila, não para o XP',
    },
    {
      acao: 'Vitória da partida',
      valor: '+1000',
      detalhe: 'para todos do lado vencedor — Aldeões ou a Ameaça',
    },
    {
      acao: 'Respostas de quem foi abduzido ou preso',
      valor: 'pontuam normalmente',
      detalhe: 'a tela hackeada continua valendo XP',
    },
    { acao: 'Resposta errada', valor: '0' },
  ],
  conversao:
    'No Isolateus os pontos da partida viram XP do ranking na proporção de 1 para 1, direto para cada aluno — inclusive para quem foi abduzido no meio do caminho.',
};

export const REGRAS_JOGO: Record<JogoId, RegrasJogo> = {
  WOR,
  QLICK,
  ISOLATEUS,
};
