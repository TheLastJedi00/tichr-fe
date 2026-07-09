import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from './api.config';

interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  uid: string;
  email: string;
}

const STORAGE_KEY = 'tichr-token';

/**
 * Autenticacao via backend (o backend e o intermediario do Firebase Auth).
 * O frontend nao conhece o Firebase: envia email/senha para /auth/login,
 * guarda o token retornado e o injeta como Bearer nas requisicoes.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private readonly _token = signal<string | null>(
    localStorage.getItem(STORAGE_KEY),
  );
  readonly isAuthenticated = computed(() => this._token() !== null);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.base}/auth/login`, { email, password })
      .pipe(tap((res) => this.setToken(res.token)));
  }

  /**
   * Cadastro (plano Estagiário): cria a conta com nome + aceite legal e já
   * autentica. O aceite dos Termos e da Privacidade é obrigatório (LGPD).
   */
  signup(dados: {
    nome: string;
    email: string;
    password: string;
    aceiteTermos: boolean;
    aceitePrivacidade: boolean;
  }): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.base}/auth/signup`, dados)
      .pipe(tap((res) => this.setToken(res.token)));
  }

  logout(): void {
    this._token.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Token atual (sincrono) para o interceptor. */
  getToken(): string | null {
    return this._token();
  }

  private setToken(token: string): void {
    this._token.set(token);
    localStorage.setItem(STORAGE_KEY, token);
  }
}
