/**
 * O relógio de uma fase cronometrada do Isolateus — compartilhado pelo telão e
 * pelos celulares.
 *
 * O servidor não tem timer (padrão Qlick/Wor): ele grava `faseIniciadaEm` e
 * revalida o prazo quando alguém o cobra. Cabe ao cliente contar e cobrar. Esta
 * classe resolve as duas armadilhas que travavam a partida:
 *
 * 1.  **O relógio da máquina não é o do servidor.** Um cliente adiantado zerava a
 *     contagem cedo, cobrava o prazo, ouvia "ainda não" (margem de 2s do
 *     servidor) e ficava parado — o disparo era único.
 * 2.  **Um disparo por fase não basta.** Rede caindo, aba dormindo ou token
 *     renovando gastavam a única chance e congelavam a fase até alguém
 *     recarregar a página.
 */

/** Espera entre duas cobranças do mesmo prazo. */
const INTERVALO_MS = 2_000;
/** Teto de cobranças por fase — o suficiente para cobrir uma queda de rede. */
const MAX_TENTATIVAS = 10;
/** Espalha a rajada da turma: N celulares vencendo o mesmo prazo no mesmo segundo. */
const ATRASO_MAX_MS = 1_500;

export class RelogioDaFase {
  /** Quanto o relógio local está adiantado em relação ao do servidor. */
  private desvioMs: number | null = null;
  private fase: string | null = null;
  private tentativas = 0;
  private venceuEm = 0;
  private ultimoEnvio = 0;
  private readonly atraso = Math.floor(Math.random() * ATRASO_MAX_MS);

  /**
   * Uma fase nova chegou do servidor: recalibra o desvio e rearma as cobranças.
   *
   * O desvio é o **mínimo** das amostras, não a última: `faseIniciadaEm` nem
   * sempre significa "começou agora". A carência da Ameaça reescreve o campo
   * para um instante no passado de propósito (é assim que ela encurta o relógio
   * de todos), e tomar essa amostra como referência faria o cronômetro pular
   * para trás. O mínimo despreza as amostras "velhas" e converge para a
   * diferença real entre os dois relógios.
   */
  sincronizar(faseIniciadaEm: string | null): void {
    if (faseIniciadaEm === this.fase) return;
    this.fase = faseIniciadaEm;
    this.tentativas = 0;
    this.venceuEm = 0;
    this.ultimoEnvio = 0;
    if (!faseIniciadaEm) return;

    const amostra = Date.now() - Date.parse(faseIniciadaEm);
    this.desvioMs =
      this.desvioMs === null ? amostra : Math.min(this.desvioMs, amostra);
  }

  /** O relógio do servidor, estimado a partir do local. */
  agora(local: number): number {
    return local - (this.desvioMs ?? 0);
  }

  /**
   * Vale cobrar o prazo agora? Consome a tentativa quando devolve `true`.
   *
   * `vencida` é o cliente dizendo que a contagem zerou. A primeira cobrança sai
   * depois de um atraso sorteado (para a turma não bater junto); as seguintes, a
   * cada 2s, até o teto — é o que transforma uma falha isolada em atraso de dois
   * segundos, e não em partida travada.
   */
  devoCobrar(local: number, vencida: boolean): boolean {
    if (!vencida) {
      this.venceuEm = 0;
      return false;
    }
    if (!this.venceuEm) this.venceuEm = local;
    if (this.tentativas >= MAX_TENTATIVAS) return false;

    const desde = this.ultimoEnvio || this.venceuEm;
    const espera = this.ultimoEnvio ? INTERVALO_MS : this.atraso;
    if (local - desde < espera) return false;

    this.ultimoEnvio = local;
    this.tentativas++;
    return true;
  }
}
