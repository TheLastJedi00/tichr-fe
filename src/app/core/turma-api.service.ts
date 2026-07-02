import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  CriarExcecaoPayload,
  CriarFeriasPayload,
  CriarTurmaPayload,
  Ferias,
  Sessao,
  Turma,
} from './models';

/** Service HTTP do frontend: fala com os endpoints do backend. */
@Injectable({ providedIn: 'root' })
export class TurmaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getSessoesSemana(): Observable<Sessao[]> {
    return this.http.get<Sessao[]>(`${this.base}/sessoes`);
  }

  getTurmas(): Observable<Turma[]> {
    return this.http.get<Turma[]>(`${this.base}/turmas`);
  }

  getTurma(id: string): Observable<Turma> {
    return this.http.get<Turma>(`${this.base}/turmas/${id}`);
  }

  atualizarTurma(
    id: string,
    payload: CriarTurmaPayload,
  ): Observable<{ turma: Turma; sessoes: Sessao[] }> {
    return this.http.put<{ turma: Turma; sessoes: Sessao[] }>(
      `${this.base}/turmas/${id}`,
      payload,
    );
  }

  getFerias(): Observable<Ferias[]> {
    return this.http.get<Ferias[]>(`${this.base}/ferias`);
  }

  criarFerias(
    payload: CriarFeriasPayload,
  ): Observable<{ ferias: Ferias; turmasRecalculadas: number }> {
    return this.http.post<{ ferias: Ferias; turmasRecalculadas: number }>(
      `${this.base}/ferias`,
      payload,
    );
  }

  removerFerias(id: string): Observable<{ turmasRecalculadas: number }> {
    return this.http.delete<{ turmasRecalculadas: number }>(
      `${this.base}/ferias/${id}`,
    );
  }

  criarTurma(
    payload: CriarTurmaPayload,
  ): Observable<{ turma: Turma; sessoes: Sessao[] }> {
    return this.http.post<{ turma: Turma; sessoes: Sessao[] }>(
      `${this.base}/turmas`,
      payload,
    );
  }

  criarExcecao(
    payload: CriarExcecaoPayload,
  ): Observable<{ turmasRecalculadas: number }> {
    return this.http.post<{ turmasRecalculadas: number }>(
      `${this.base}/excecoes`,
      payload,
    );
  }
}
