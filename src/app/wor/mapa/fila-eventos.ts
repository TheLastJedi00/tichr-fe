/**
 * A fila da animação do fim da rodada do Wor (spec 035 #26–#29). O cliente não
 * calcula nada do jogo: só traduz o `resumoRodada` (já decidido pelo servidor)
 * numa sequência de eventos para desenhar, na mesma ordem da resolução da 032.
 */
import { ResumoRodada } from '../../core/models';

/**
 * Espelho de `JANELA_ANIMACAO` do backend (`wor-match.entity.ts`): a rodada
 * seguinte nasce `base + porEvento × eventos` (com teto) no futuro.
 */
export const JANELA_ANIMACAO = {
  BASE_MS: 2500,
  POR_EVENTO_MS: 1200,
  MAX_MS: 12000,
} as const;

/** Números do jogo que a animação mostra (iguais aos `WOR.*` do backend). */
export const NUMEROS_WOR = {
  CURA_MASSIVA: 400,
  DANO_CATAPULTA: 300,
  DANO_CRITICO: 200,
  HP_MAX: 1000,
} as const;

export type EventoWor =
  | { tipo: 'ATAQUE'; de: string; alvo: string; dano: number; critico: boolean }
  | { tipo: 'CATAPULTA'; de: string; alvo: string; dano: number }
  | { tipo: 'CURA'; equipe: string }
  | { tipo: 'ERRO'; equipe: string; dano: number }
  | { tipo: 'QUEDA'; equipe: string }
  | { tipo: 'USURPACAO'; horda: string; lider: string };

/** Mesma contagem do servidor: ataques, arriscar (acerto ou erro) e quedas. */
export function eventosDaRodada(resumo: ResumoRodada): number {
  let n = resumo.quedas?.length ?? 0;
  for (const r of resumo.resultados) {
    if (r.acao === 'ATACAR' && r.alvoEquipeId) n++;
    if (r.arriscar) n++;
  }
  return n;
}

export function janelaAnimacao(resumo: ResumoRodada): number {
  return Math.min(
    JANELA_ANIMACAO.BASE_MS + JANELA_ANIMACAO.POR_EVENTO_MS * eventosDaRodada(resumo),
    JANELA_ANIMACAO.MAX_MS,
  );
}

/** Quanto tempo cada evento tem, para a fila caber na janela. */
export function tempoPorEvento(resumo: ResumoRodada): number {
  const n = eventosDaRodada(resumo);
  if (!n) return 0;
  return Math.min(
    JANELA_ANIMACAO.POR_EVENTO_MS,
    (janelaAnimacao(resumo) - JANELA_ANIMACAO.BASE_MS) / n,
  );
}

/**
 * Ordem (035 #27): ataques na ordem de chegada → Catapulta → cura → dano do
 * arriscar errado → quedas → Usurpação. `hordaAntes`: quem já era Horda antes
 * do fechamento (o arriscar errado da Horda não tira HP: é a Invasão que falhou).
 */
export function montarFila(resumo: ResumoRodada, hordaAntes: ReadonlySet<string>): EventoWor[] {
  const porOrdem = [...resumo.resultados].sort((a, b) => a.ordem - b.ordem);
  const fila: EventoWor[] = [];
  for (const r of porOrdem) {
    if (r.acao === 'ATACAR' && r.alvoEquipeId) {
      fila.push({
        tipo: 'ATAQUE',
        de: r.equipeId,
        alvo: r.alvoEquipeId,
        dano: r.dano ?? 0,
        critico: !!r.critico,
      });
    }
  }
  for (const r of porOrdem) {
    const a = r.arriscar;
    if (a?.acertou && a.efeito === 'CATAPULTA' && a.alvoEquipeId) {
      fila.push({
        tipo: 'CATAPULTA',
        de: r.equipeId,
        alvo: a.alvoEquipeId,
        dano: a.dano ?? NUMEROS_WOR.DANO_CATAPULTA,
      });
    }
  }
  for (const r of porOrdem) {
    if (r.arriscar?.acertou && r.arriscar.efeito === 'CURA') {
      fila.push({ tipo: 'CURA', equipe: r.equipeId });
    }
  }
  for (const r of porOrdem) {
    if (r.arriscar && !r.arriscar.acertou && !hordaAntes.has(r.equipeId)) {
      fila.push({ tipo: 'ERRO', equipe: r.equipeId, dano: NUMEROS_WOR.DANO_CRITICO });
    }
  }
  for (const id of resumo.quedas ?? []) fila.push({ tipo: 'QUEDA', equipe: id });
  for (const r of porOrdem) {
    const a = r.arriscar;
    if (a?.acertou && a.efeito === 'USURPACAO' && a.alvoEquipeId) {
      fila.push({ tipo: 'USURPACAO', horda: r.equipeId, lider: a.alvoEquipeId });
    }
  }
  return fila;
}

/** Texto do feed para cada evento (a caixa de texto retrô do telão). */
export function textoDoEvento(e: EventoWor, nome: (id: string) => string): string {
  switch (e.tipo) {
    case 'ATAQUE':
      return `${nome(e.de)} atacou ${nome(e.alvo)} · −${e.dano}${e.critico ? ' (crítico)' : ''}`;
    case 'CATAPULTA':
      return `${nome(e.de)} lançou a Catapulta em ${nome(e.alvo)} · −${e.dano}`;
    case 'CURA':
      return `${nome(e.equipe)} acertou a palavra e recuperou HP`;
    case 'ERRO':
      return `${nome(e.equipe)} arriscou e errou · −${e.dano} no próprio castelo`;
    case 'QUEDA':
      return `O castelo da ${nome(e.equipe)} caiu · agora é Horda`;
    case 'USURPACAO':
      return `A Horda (${nome(e.horda)}) tomou o castelo da ${nome(e.lider)}`;
  }
}
