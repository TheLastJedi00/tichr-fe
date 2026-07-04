import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  CheckUsernameResponse,
  HomePayload,
  PlanoAtual,
  Profile,
  UpdateProfilePayload,
} from './models';

/**
 * Perfil do professor: camada HTTP + estado reativo (signal) compartilhado.
 * Ao salvar, o signal atualiza e o greeting do Dashboard reflete na hora.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  readonly profile = signal<Profile | null>(null);
  readonly nome = computed(() => this.profile()?.nomeExibicao ?? null);

  load(): Observable<Profile> {
    return this.http
      .get<Profile>(`${this.base}/profile`)
      .pipe(tap((p) => this.profile.set(p)));
  }

  /**
   * Agregador do painel (BFF): perfil + turmas num único roundtrip. Atualiza o
   * perfil reativo (greeting) e devolve o payload completo para a página.
   */
  loadHome(): Observable<HomePayload> {
    return this.http
      .get<HomePayload>(`${this.base}/home`)
      .pipe(tap((h) => this.profile.set(h.profile)));
  }

  update(payload: UpdateProfilePayload): Observable<Profile> {
    return this.http
      .put<Profile>(`${this.base}/profile`, payload)
      .pipe(tap((p) => this.profile.set(p)));
  }

  /** Disponibilidade de um @username (debounce na tela de Configurações). */
  checkUsername(u: string): Observable<CheckUsernameResponse> {
    return this.http.get<CheckUsernameResponse>(
      `${this.base}/profile/check-username`,
      { params: { u } },
    );
  }

  /** Compra uma vaga avulsa (+1 slot); atualiza o perfil reativo. */
  comprarSlotAvulso(): Observable<Profile> {
    return this.http
      .post<Profile>(`${this.base}/checkout/slot-avulso`, {})
      .pipe(tap((p) => this.profile.set(p)));
  }

  /** Faz upgrade do plano; atualiza o perfil reativo. */
  upgradePlano(plano: PlanoAtual): Observable<Profile> {
    return this.http
      .post<Profile>(`${this.base}/checkout/upgrade`, { plano })
      .pipe(tap((p) => this.profile.set(p)));
  }
}
