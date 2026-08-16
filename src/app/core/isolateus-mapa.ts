/**
 * A geografia da vila, do lado do cliente.
 *
 * A malha é **espelho** da que vive no backend (`isolateus.data.ts`) e existe
 * aqui só para desenhar: quem valida movimento é o servidor. Se as duas
 * divergirem, o sintoma é uma seta que aparece e o backend recusa — por isso os
 * ids têm que casar exatamente.
 *
 * As coordenadas seguem o Protótipo 1 do Figma, numa grade de 4×3 células. O
 * layout é fixo: um mapa que muda de forma a cada partida seria impossível de
 * memorizar, e memorizá-lo é parte de jogar bem.
 */
export interface SetorMapa {
  id: string;
  /** Rótulo curto para o mapa (o nome completo vem do backend). */
  curto: string;
  icone: string;
  vizinhos: string[];
  /** Posição na grade 4×3 do zoom-out. */
  col: number;
  linha: number;
}

export const MAPA: SetorMapa[] = [
  {
    id: 'seguranca',
    curto: 'Segurança',
    icone: 'shield',
    vizinhos: ['energia', 'comercio'],
    col: 1,
    linha: 1,
  },
  {
    id: 'energia',
    curto: 'Energia',
    icone: 'bolt',
    vizinhos: ['seguranca', 'comunicacao'],
    col: 2,
    linha: 1,
  },
  {
    id: 'abastecimento',
    curto: 'Abastecimento',
    icone: 'fuel',
    vizinhos: ['comunicacao'],
    col: 4,
    linha: 1,
  },
  {
    id: 'comunicacao',
    curto: 'Comunicação',
    icone: 'megafone',
    vizinhos: ['energia', 'saude', 'abastecimento'],
    col: 3,
    linha: 2,
  },
  {
    id: 'comercio',
    curto: 'Comércio',
    icone: 'loja',
    vizinhos: ['seguranca', 'saude'],
    col: 1,
    linha: 2,
  },
  {
    id: 'saude',
    curto: 'Saúde',
    icone: 'coracao',
    vizinhos: ['comercio', 'comunicacao'],
    col: 2,
    linha: 3,
  },
];

export function setorDoMapa(id: string): SetorMapa | undefined {
  return MAPA.find((s) => s.id === id);
}

/** Os vizinhos alcançáveis num salto (vazio se o id não existe). */
export function vizinhosDe(id: string): SetorMapa[] {
  return (setorDoMapa(id)?.vizinhos ?? [])
    .map((v) => setorDoMapa(v))
    .filter((s): s is SetorMapa => !!s);
}

/**
 * As estradas, como pares únicos. Derivadas da adjacência para que o desenho
 * nunca saia de sincronia com as setas de deslocamento — duas fontes de verdade
 * viraram, em algum momento, um mapa que mente.
 */
export function estradas(): Array<[SetorMapa, SetorMapa]> {
  const vistas = new Set<string>();
  const pares: Array<[SetorMapa, SetorMapa]> = [];
  for (const s of MAPA) {
    for (const v of vizinhosDe(s.id)) {
      const chave = [s.id, v.id].sort().join('|');
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      pares.push([s, v]);
    }
  }
  return pares;
}
