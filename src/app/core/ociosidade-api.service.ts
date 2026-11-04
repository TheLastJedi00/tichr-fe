import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

/** Os três jogos de rodada com ociosidade (spec 032). */
export type JogoOcioso = 'QLICK' | 'WOR' | 'ISOLATEUS';

export interface DescontoOciosidade {
  alunoId: string;
  modo: 'ZERAR_PARTIDA' | 'VALOR';
  pontos?: number;
}

/**
 * Ociosidade (032): o limite escolhido no lobby e o desconto do fim da partida.
 * As rotas têm o mesmo formato nos três jogos, só muda o prefixo. A tela segue
 * o estado pelo snapshot da partida; a resposta só confirma.
 */
@Injectable({ providedIn: 'root' })
export class OciosidadeApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private prefixo(jogo: JogoOcioso, id: string): string {
    if (jogo === 'QLICK') return `${this.base}/partidas/${id}`;
    if (jogo === 'WOR') return `${this.base}/wor/matches/${id}`;
    return `${this.base}/isolateus/matches/${id}`;
  }

  definirLimite(jogo: JogoOcioso, id: string, limite: number): Observable<unknown> {
    return this.http.post(`${this.prefixo(jogo, id)}/ociosidade/limite`, { limite });
  }

  descontar(jogo: JogoOcioso, id: string, dto: DescontoOciosidade): Observable<unknown> {
    return this.http.post(`${this.prefixo(jogo, id)}/ociosidade/descontar`, dto);
  }
}
