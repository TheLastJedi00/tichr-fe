import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  CriarWorJogoPayload,
  WorJogo,
  WorMatch,
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
  /**
   * Forja o arsenal inteiro por IA: a instrução do professor + disciplina/tópico
   * viram 5 palavras com 3 dicas cada, em uma única geração (1×/dia).
   */
  gerarArsenal(payload: {
    instrucao: string;
    topico?: string;
    disciplina?: string;
  }): Observable<{ palavras: Array<{ palavra: string; dicas: string[] }> }> {
    return this.http.post<{
      palavras: Array<{ palavra: string; dicas: string[] }>;
    }>(`${this.base}/wor/jogos/arsenal`, payload);
  }

  // --- Partida (professor / projetor) ---
  /**
   * Cria a partida e devolve o match (entidade crua, com `id`) — como o
   * `criarPartida` do Qlick devolve a `Partida`. A tela do projetor lê o estado
   * completo em tempo real; aqui só precisamos do id para navegar.
   */
  criarPartida(jogoId: string, turmaId?: string): Observable<WorMatch> {
    return this.http.post<WorMatch>(
      `${this.base}/wor/jogos/${jogoId}/partida`,
      turmaId ? { turmaId } : {},
    );
  }
  verPartida(matchId: string): Observable<WorMatchView> {
    return this.http.get<WorMatchView>(`${this.base}/wor/matches/${matchId}`);
  }
  /** Distribui os inscritos em equipes com tamanho automático (backend decide). */
  distribuir(matchId: string): Observable<WorMatchView> {
    return this.http.post<WorMatchView>(
      `${this.base}/wor/matches/${matchId}/distribuir`,
      {},
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
  /** Encerra a rodada por tempo esgotado (o projetor dispara ao zerar o cronômetro). */
  tempo(matchId: string): Observable<WorMatchView> {
    return this.http.post<WorMatchView>(
      `${this.base}/wor/matches/${matchId}/tempo`,
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
  /** Chuta uma letra e vota a ação da equipe (atacar um rival ou comprar dica). */
  chutarLetra(
    matchId: string,
    letra: string,
    acao: 'ATACAR' | 'DICA',
    alvoEquipeId?: string,
  ): Observable<WorMatchView> {
    return this.http.post<WorMatchView>(
      `${this.base}/aluno/wor/${matchId}/letra`,
      { letra, acao, alvoEquipeId },
    );
  }
  arriscar(matchId: string, palavra: string): Observable<WorMatchView> {
    return this.http.post<WorMatchView>(
      `${this.base}/aluno/wor/${matchId}/arriscar`,
      { palavra },
    );
  }
}
