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
        'Acertou: seu castelo recupera 400 de HP e a onda avança na hora.',
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
      titulo: 'Fim da batalha',
      itens: [
        'A batalha acaba quando as palavras do arsenal terminam.',
        'Vence quem tiver MAIS HP. Empate no HP é desempatado pelos pontos de combate.',
      ],
    },
  ],
  unidade: 'Pontos de combate',
  recompensas: [
    { acao: 'Ataque ao castelo rival', valor: '+100', detalhe: 'os pontos vão para a equipe atacante' },
    { acao: 'Ataque perfeito (equipe inteira acertou)', valor: '+200', detalhe: 'equipes de 2 ou mais membros' },
    { acao: 'Risco Heroico certeiro (ou Invasão da Horda)', valor: '+300', detalhe: 'além de curar 400 de HP ou roubar o castelo' },
    { acao: 'Castelo de pé no fim da batalha', valor: '+1 por HP restante', detalhe: 'terminar intacto vale até +1000' },
    { acao: 'Comprar dica', valor: '0', detalhe: 'sacrifica o ataque da rodada em troca de uma carta' },
    { acao: 'Errar a letra ou o Risco Heroico', valor: '0', detalhe: 'errar o risco ainda custa 200 de HP' },
  ],
  conversao:
    'Ao fim da batalha, os pontos de combate viram XP do ranking da turma: XP = pontos × 0,1. A equipe campeã recebe o valor cheio; as demais, metade. Todos os membros da equipe recebem o mesmo XP.',
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
      ],
    },
    {
      titulo: 'O Ciclo de Invasão',
      itens: [
        'A cada noite a Ameaça escolhe em segredo: sabotar um dos 6 setores da vila ou abduzir um morador.',
        'A vila é avisada do ataque e todos respondem à questão da rodada para defender o setor.',
        'Se a maioria acertar, a defesa resiste e nada acontece. Se a maioria errar, o ataque se concretiza e a Barra de Esperança cai.',
        'Como os Habitantes Virtuais votam ao acaso, empates são desempatados pelo consenso dos jogadores reais — o Instinto Humano.',
      ],
    },
    {
      titulo: 'A Guerra de Frequências',
      itens: [
        'Durante a questão, um chat de rumores corre na tela.',
        'A Ameaça conhece a resposta certa e pode transmitir um argumento falso, assinado com o nome de um Habitante Virtual.',
        'Quem já foi abduzido continua respondendo e pode mandar um Sinal de Rádio anônimo tentando salvar a vila.',
      ],
    },
    {
      titulo: 'A Quarentena',
      itens: [
        'Entre as rodadas, a vila pode convocar a Quarentena — uma única vez na partida.',
        'Abre um debate cronometrado e, em seguida, a votação no suspeito.',
        'Trancou a Ameaça: a invasão é contida e a Vila vence na hora.',
        'Trancou um inocente: a Esperança sofre dano severo e a identidade do preso continua em segredo.',
      ],
    },
    {
      titulo: 'Fim de partida',
      itens: [
        'A Ameaça vence se zerar a Esperança, abduzir mais da metade da vila ou destruir mais de 3 setores.',
        'A Vila vence se prender a Ameaça, manter mais de 3 setores intactos ou resistir com mais da metade dos moradores.',
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
