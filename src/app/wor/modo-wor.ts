/**
 * Modo simples do Wor (spec 035 #36): a tela antiga, sem o mapa pixel art, para
 * celular fraco ou telão antigo. Preferência do aparelho (localStorage), nunca
 * estado do jogo: sem armazenamento (aba anônima), vale o mapa.
 */
const CHAVE = 'tichr-wor-modo-simples';

export function lerModoSimplesWor(): boolean {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
}

export function gravarModoSimplesWor(simples: boolean): void {
  try {
    if (simples) localStorage.setItem(CHAVE, '1');
    else localStorage.removeItem(CHAVE);
  } catch {
    /* sem armazenamento: a escolha vale só nesta tela */
  }
}
