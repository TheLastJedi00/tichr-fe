import { desenharAbastecimento } from './fundos/abastecimento';
import { desenharComercio } from './fundos/comercio';
import { desenharComunicacao } from './fundos/comunicacao';
import { desenharEnergia } from './fundos/energia';
import { DesenhoDoSetor, montarFundo } from './fundos/fundo-comum';
import { desenharSaude } from './fundos/saude';
import { desenharSeguranca } from './fundos/seguranca';

/**
 * De onde vêm os fundos dos setores (spec 034 #32). Hoje, a implementação é o
 * desenho em código; se um dia houver ilustração, entra uma `FonteFundo` que
 * devolve um PNG por setor, sem mexer no resto da cena.
 */
export interface FonteFundo {
  /** O fundo do setor, intacto ou destruído, como um canvas 320×180. */
  desenhar(setorId: string, destruido: boolean): HTMLCanvasElement;
}

const DESENHOS: Record<string, DesenhoDoSetor> = {
  seguranca: desenharSeguranca,
  comercio: desenharComercio,
  saude: desenharSaude,
  energia: desenharEnergia,
  comunicacao: desenharComunicacao,
  abastecimento: desenharAbastecimento,
};

/** Os fundos desenhados em código, com semente fixa (iguais em todo aparelho). */
export class FundoEmCodigo implements FonteFundo {
  desenhar(setorId: string, destruido: boolean): HTMLCanvasElement {
    const desenho = DESENHOS[setorId] ?? desenharSeguranca;
    return montarFundo(setorId, destruido, desenho);
  }
}
