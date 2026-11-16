/**
 * A geometria das cenas (spec 034 §1). Espelho de `tichr-be/src/isolateus/
 * isolateus-cena.ts`: as constantes e o x das portas têm que casar, porque o
 * backend calcula de onde as caminhadas saem.
 */
import { MAPA, vizinhosDe as vizinhosDoMapa } from '../../core/isolateus-mapa';

export const CENA = {
  /** Resolução lógica (px); o celular escala em múltiplos inteiros. */
  LARGURA: 320,
  ALTURA: 180,
  /** Velocidade fixa da caminhada, em px por segundo. */
  VELOCIDADE: 48,
  /** Onde o habitante nasce no setor (sem passo anterior). */
  X_INICIAL: 160,
  /** A linha do chão (o pé do boneco). */
  CHAO: 150,
  /** O meio da cena: é onde mora o objeto do centro (reparo, resgate, Quarentena). */
  CENTRO: 160,
  /** Um passo por segundo por habitante. */
  PASSO_INTERVALO_MS: 1_000,
} as const;

export type LadoPorta = 'esquerda' | 'direita' | 'fundo';

/** O x de cada porta. A do fundo fica à direita do centro (o centro é do botão). */
export const PORTA_X: Record<LadoPorta, number> = {
  esquerda: 24,
  direita: 296,
  fundo: 220,
};

export interface PortaCena {
  para: string;
  lado: LadoPorta;
  x: number;
}

/**
 * As portas de um setor: o lado segue a posição do vizinho no mapa (coluna
 * maior = direita, senão esquerda). A Comunicação manda a Saúde, que fica
 * abaixo no mapa, para uma porta no fundo.
 */
export function portasDe(setorId: string): PortaCena[] {
  const col = (id: string) => MAPA.find((s) => s.id === id)?.col ?? 0;
  return vizinhosDoMapa(setorId).map((v) => {
    let lado: LadoPorta = col(v.id) > col(setorId) ? 'direita' : 'esquerda';
    if (setorId === 'comunicacao' && v.id === 'saude') lado = 'fundo';
    return { para: v.id, lado, x: PORTA_X[lado] };
  });
}

export function xDaPorta(de: string, para: string): number | undefined {
  return portasDe(de).find((p) => p.para === para)?.x;
}

export interface Passo {
  x: number;
  alvoX: number;
  t: number;
}

/** Onde a caminhada está em `agora`: linear, velocidade fixa, para no alvo. */
export function posicaoEm(passo: Passo, agora: number): number {
  const decorrido = Math.max(0, agora - passo.t) / 1000;
  const dist = Math.abs(passo.alvoX - passo.x);
  const andou = Math.min(dist, decorrido * CENA.VELOCIDADE);
  return passo.x + Math.sign(passo.alvoX - passo.x) * andou;
}

/** O objeto do centro do setor, quando há um (decisão #22). */
export type ObjetoCentral = 'REPARO' | 'RESGATE' | 'QUARENTENA';

/**
 * Qual objeto mora no centro deste setor agora: o reparo se ele está em ruínas
 * (é o que dá para fazer), senão o resgate (Saúde) ou a Quarentena (Comunicação).
 */
export function objetoCentralDe(setorId: string, intacto: boolean): ObjetoCentral | null {
  if (!intacto) return 'REPARO';
  if (setorId === 'saude') return 'RESGATE';
  if (setorId === 'comunicacao') return 'QUARENTENA';
  return null;
}

/** Rótulo do objeto, na fonte bitmap da cena. */
export const ROTULO_OBJETO: Record<ObjetoCentral, string> = {
  REPARO: 'ORGANIZAR REPARO',
  RESGATE: 'ORGANIZAR RESGATE',
  QUARENTENA: 'CONVOCAR QUARENTENA',
};
