import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  CriarWorJogoPayload,
  WorJogo,
  WorMatchView,
} from './models';

/** Camada HTTP do Tichr Wor (arsenal + partida). Escrita só via REST. */
@Injectable({ providedIn: 'root' })
export class WorApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  // --- Arsenal (professor) ---
  listarJogos(): Observable<WorJogo[]> {
    return this.http.get<WorJogo[]>(`${this.base}/wor/jogos`);
  }
  obterJogo(id: string): Observable<WorJogo> {
    return this.http.get<WorJogo>(`${this.base}/wor/jogos/${id}`);
  }
  criarJogo(payload: CriarWorJogoPayload): Observable<WorJogo> {
    return this.http.post<WorJogo>(`${this.base}/wor/jogos`, payload);
  }
  atualizarJogo(id: string, payload: CriarWorJogoPayload): Observable<WorJogo> {
    return this.http.put<WorJogo>(`${this.base}/wor/jogos/${id}`, payload);
  }
  removerJogo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/wor/jogos/${id}`);
  }
  gerarDicas(payload: {
    topico: string;
    palavra: string;
    disciplina?: string;
  }): Observable<{ dicas: string[] }> {
    return this.http.post<{ dicas: string[] }>(
      `${this.base}/wor/jogos/dicas`,
      payload,
    );
  }

  // --- Partida (professor / projetor) ---
  criarPartida(jogoId: string, turmaId: string): Observable<WorMatchView> {
    return this.http.post<WorMatchView>(
      `${this.base}/wor/jogos/${jogoId}/partida`,
      { turmaId },
    );
  }
  verPartida(matchId: string): Observable<WorMatchView> {
    return this.http.get<WorMatchView>(`${this.base}/wor/matches/${matchId}`);
  }
  distribuir(matchId: string, numeroEquipes: number): Observable<WorMatchView> {
    return this.http.post<WorMatchView>(
      `${this.base}/wor/matches/${matchId}/distribuir`,
      { numeroEquipes },
    );
  }
  iniciar(matchId: string): Observable<WorMatchView> {
    return this.http.post<WorMatchView>(
      `${this.base}/wor/matches/${matchId}/iniciar`,
      {},
    );
  }
  pular(matchId: string): Observable<WorMatchView> {
    return this.http.post<WorMatchView>(
      `${this.base}/wor/matches/${matchId}/pular`,
      {},
    );
  }

  // --- Aluno (portal) ---
  partidaAtual(): Observable<WorMatchView | null> {
    return this.http.get<WorMatchView | null>(`${this.base}/aluno/wor`);
  }
  entrar(matchId: string, nome: string): Observable<WorMatchView> {
    return this.http.post<WorMatchView>(
      `${this.base}/aluno/wor/${matchId}/entrar`,
      { nome },
    );
  }
  chutarLetra(matchId: string, letra: string): Observable<WorMatchView> {
    return this.http.post<WorMatchView>(
      `${this.base}/aluno/wor/${matchId}/letra`,
      { letra },
    );
  }
  dilema(
    matchId: string,
    acao: 'ATACAR' | 'COMPRAR_DICA',
    alvoEquipeId?: string,
  ): Observable<WorMatchView> {
    return this.http.post<WorMatchView>(
      `${this.base}/aluno/wor/${matchId}/dilema`,
      { acao, alvoEquipeId },
    );
  }
  arriscar(matchId: string, palavra: string): Observable<WorMatchView> {
    return this.http.post<WorMatchView>(
      `${this.base}/aluno/wor/${matchId}/arriscar`,
      { palavra },
    );
  }
}
