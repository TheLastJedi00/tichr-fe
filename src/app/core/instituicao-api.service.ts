import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { CriarInstituicaoPayload, Instituicao } from './models';

/** CRUD das instituições (escolas) do ensino regular (`/instituicoes`). */
@Injectable({ providedIn: 'root' })
export class InstituicaoApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getInstituicoes(): Observable<Instituicao[]> {
    return this.http.get<Instituicao[]>(`${this.base}/instituicoes`);
  }

  getInstituicao(id: string): Observable<Instituicao> {
    return this.http.get<Instituicao>(`${this.base}/instituicoes/${id}`);
  }

  criarInstituicao(payload: CriarInstituicaoPayload): Observable<Instituicao> {
    return this.http.post<Instituicao>(`${this.base}/instituicoes`, payload);
  }

  atualizarInstituicao(
    id: string,
    payload: CriarInstituicaoPayload,
  ): Observable<Instituicao> {
    return this.http.put<Instituicao>(
      `${this.base}/instituicoes/${id}`,
      payload,
    );
  }

  removerInstituicao(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/instituicoes/${id}`);
  }
}
