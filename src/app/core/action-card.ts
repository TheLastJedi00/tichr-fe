import { computed, signal } from '@angular/core';
import { LastGlobalAction } from './models';

/** Espelha o `WOR.FREEZE_MS` do backend: quanto o card fica no ar (e congela o jogo). */
export const FREEZE_MS = 3000;

/**
 * Narrador dos Action Cards. Recebe o `lastGlobalAction` que chega pelo listener
 * (raiz no telão, doc da equipe no celular), detecta o `seq` novo, mantém o card
 * no ar por `duracaoMs` e some sozinho.
 *
 * `ativo()` é a trava de input: enquanto um card está em cartaz o jogo está
 * congelado — o cronômetro do servidor já nasceu 3s à frente, então destravar
 * cedo só permitiria jogar durante a narração.
 */
export class NarradorCards {
  private readonly atual = signal<LastGlobalAction | null>(null);
  readonly card = this.atual.asReadonly();
  readonly ativo = computed(() => !!this.atual());

  private ultimoSeq = 0;
  private timer?: ReturnType<typeof setTimeout>;

  /** Marca o que já estava gravado ao conectar — entrar na partida não dá replay. */
  ignorarAtual(evento?: LastGlobalAction | null): void {
    this.ultimoSeq = evento?.seq ?? 0;
  }

  /** Exibe o card se for um evento novo (idempotente por `seq`). */
  receber(evento?: LastGlobalAction | null): void {
    if (!evento || evento.seq <= this.ultimoSeq) return;
    this.ultimoSeq = evento.seq;
    this.atual.set(evento);
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => this.atual.set(null),
      evento.duracaoMs || FREEZE_MS,
    );
  }

  destruir(): void {
    clearTimeout(this.timer);
  }
}

/** Um card ainda está em cartaz? (usado para adiar o banner de resumo por baixo dele). */
export function cardNoAr(evento?: LastGlobalAction | null): boolean {
  if (!evento) return false;
  return Date.now() - Date.parse(evento.em) < (evento.duracaoMs || FREEZE_MS);
}
