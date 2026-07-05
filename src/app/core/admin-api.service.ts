import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  AdminMetrics,
  CriarCupomPayload,
  Cupom,
  PlanoAtual,
  UsuarioAdmin,
} from './models';

/** Camada HTTP do backoffice (todas as rotas exigem admin no backend). */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** Sonda usada pelo guard: 200 = admin, 403 = comum. */
  ping(): Observable<{ admin: boolean }> {
    return this.http.get<{ admin: boolean }>(`${this.base}/admin/ping`);
  }

  metrics(): Observable<AdminMetrics> {
    return this.http.get<AdminMetrics>(`${this.base}/admin/metrics`);
  }

  usuarios(busca?: string): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.base}/admin/usuarios`, {
      params: busca ? { busca } : {},
    });
  }

  detalhe(uid: string): Observable<UsuarioAdmin> {
    return this.http.get<UsuarioAdmin>(`${this.base}/admin/usuarios/${uid}`);
  }

  resetSenha(uid: string): Observable<{ email: string; enviado: boolean }> {
    return this.http.post<{ email: string; enviado: boolean }>(
      `${this.base}/admin/usuarios/${uid}/reset-senha`,
      {},
    );
  }

  limparDados(uid: string): Observable<{ turmas: number; qlicks: number }> {
    return this.http.post<{ turmas: number; qlicks: number }>(
      `${this.base}/admin/usuarios/${uid}/limpar-dados`,
      {},
    );
  }

  excluir(uid: string, hard: boolean): Observable<{ modo: string }> {
    return this.http.delete<{ modo: string }>(
      `${this.base}/admin/usuarios/${uid}`,
      { params: hard ? { hard: 'true' } : {} },
    );
  }

  alterarPlano(uid: string, plano: PlanoAtual): Observable<UsuarioAdmin> {
    return this.http.patch<UsuarioAdmin>(
      `${this.base}/admin/usuarios/${uid}/plano`,
      { plano },
    );
  }

  definirAdmin(
    uid: string,
    conceder: boolean,
  ): Observable<{ uid: string; admin: boolean }> {
    return this.http.post<{ uid: string; admin: boolean }>(
      `${this.base}/admin/usuarios/${uid}/admin`,
      { conceder },
    );
  }

  // --- Cupons ---

  cupons(): Observable<Cupom[]> {
    return this.http.get<Cupom[]>(`${this.base}/admin/cupons`);
  }

  criarCupom(payload: CriarCupomPayload): Observable<Cupom> {
    return this.http.post<Cupom>(`${this.base}/admin/cupons`, payload);
  }

  atualizarCupom(id: string, payload: Partial<CriarCupomPayload>): Observable<void> {
    return this.http.patch<void>(`${this.base}/admin/cupons/${id}`, payload);
  }

  removerCupom(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/cupons/${id}`);
  }
}
