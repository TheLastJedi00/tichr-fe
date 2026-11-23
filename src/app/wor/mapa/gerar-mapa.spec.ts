import { MAPA, gerarMapa, reinosDaPartida } from './gerar-mapa';

describe('Wor — gerador do mapa de reinos (035)', () => {
  const W = MAPA.LARGURA;

  it('é determinístico pela semente (todos os aparelhos desenham o mesmo mapa)', () => {
    const a = gerarMapa(5, 'match-abc');
    const b = gerarMapa(5, 'match-abc');
    expect(a.centros).toEqual(b.centros);
    expect(Array.from(a.dono)).toEqual(Array.from(b.dono));
    const c = gerarMapa(5, 'match-xyz');
    expect(c.centros).not.toEqual(a.centros);
  });

  it('um castelo (centro) por equipe, de 2 a 10 equipes', () => {
    for (const n of [2, 4, 7, 10]) {
      const m = gerarMapa(n, 'm' + n);
      expect(m.centros.length).toBe(n);
      // o centro é do próprio reino
      m.centros.forEach((c, k) => expect(m.dono[c.y * W + c.x]).toBe(k));
    }
  });

  it('cada reino é contíguo (sem ilhas soltas)', () => {
    const m = gerarMapa(6, 'contiguo');
    const H = MAPA.ALTURA;
    m.centros.forEach((c, k) => {
      const visto = new Uint8Array(W * H);
      const pilha = [c.y * W + c.x];
      visto[pilha[0]] = 1;
      let alcancados = 0;
      while (pilha.length) {
        const i = pilha.pop()!;
        alcancados++;
        const x = i % W;
        const y = (i / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          if (!visto[j] && m.dono[j] === k) {
            visto[j] = 1;
            pilha.push(j);
          }
        }
      }
      const total = Array.from(m.dono).filter((d) => d === k).length;
      expect(alcancados).toBe(total);
    });
  });

  it('reinos: usa o campo da partida ou cai na ordem das equipes', () => {
    expect(reinosDaPartida(['e1', 'e2'], { e1: 1, e2: 0 })).toEqual({ e1: 1, e2: 0 });
    expect(reinosDaPartida(['e1', 'e2'])).toEqual({ e1: 0, e2: 1 });
    expect(reinosDaPartida(['e1', 'e2'], { e1: 0 })).toEqual({ e1: 0, e2: 1 });
  });
});
