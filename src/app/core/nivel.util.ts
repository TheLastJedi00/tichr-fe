/**
 * Níveis do aluno por XP acumulado. Trilha: Bronze → Prata → Ouro → Diamante →
 * Platina (topo). Os limiares são configuráveis por turma (o professor define
 * com quantos pontos se passa de um tier para o próximo); Bronze é o piso (0).
 * Fonte única de verdade, consumida pela barra de XP e pela lista de alunos.
 */
export interface LimiaresNivel {
  prata: number;
  ouro: number;
  diamante: number;
  platina: number;
}

/** Defaults — espelham `NIVEIS_TURMA_DEFAULT` do backend. */
export const NIVEIS_DEFAULT: LimiaresNivel = {
  prata: 500,
  ouro: 1000,
  diamante: 2000,
  platina: 4000,
};

export interface NivelInfo {
  nome: string;
  cor: string;
  /** XP de entrada no tier atual. */
  atualMin: number;
  /** XP de entrada no próximo tier, ou null se já no topo (Platina). */
  proxMin: number | null;
}

const CORES: Record<string, string> = {
  Bronze: '#a97142',
  Prata: '#9ca3af',
  Ouro: '#eab308',
  Diamante: '#22d3ee',
  Platina: '#a78bfa',
};

/** Aplica defaults e garante ordem ascendente (prata < ouro < diamante < platina). */
export function normalizarLimiares(l?: Partial<LimiaresNivel> | null): LimiaresNivel {
  const d = NIVEIS_DEFAULT;
  const prata = Math.max(1, l?.prata ?? d.prata);
  const ouro = Math.max(prata + 1, l?.ouro ?? d.ouro);
  const diamante = Math.max(ouro + 1, l?.diamante ?? d.diamante);
  const platina = Math.max(diamante + 1, l?.platina ?? d.platina);
  return { prata, ouro, diamante, platina };
}

/** Nível do aluno para um XP dado, respeitando os limiares (ou os defaults). */
export function nivelDeXp(
  xp: number,
  limiares?: Partial<LimiaresNivel> | null,
): NivelInfo {
  const l = normalizarLimiares(limiares);
  const tiers = [
    { nome: 'Bronze', min: 0 },
    { nome: 'Prata', min: l.prata },
    { nome: 'Ouro', min: l.ouro },
    { nome: 'Diamante', min: l.diamante },
    { nome: 'Platina', min: l.platina },
  ];
  const pontos = Math.max(0, xp);
  let idx = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (pontos >= tiers[i].min) idx = i;
  }
  const tier = tiers[idx];
  const prox = tiers[idx + 1];
  return {
    nome: tier.nome,
    cor: CORES[tier.nome],
    atualMin: tier.min,
    proxMin: prox ? prox.min : null,
  };
}
