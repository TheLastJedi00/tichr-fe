import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, catchError, finalize, of, shareReplay, tap } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { ContaAuth, PlanoAtual } from './models';

/**
 * Sessao do professor. O `refreshToken` NAO aparece aqui de proposito: ele vive
 * num cookie HttpOnly emitido pelo backend, fora do alcance do JavaScript.
 */
interface LoginResponse {
  token: string;
  expiresIn: number;
  uid: string;
  email: string;
}

const STORAGE_KEY = 'tichr-token';

/**
 * Autenticacao via backend (o backend e o intermediario do Firebase Auth).
 * O frontend nao conhece o Firebase: envia email/senha para /auth/login,
 * guarda o token retornado e o injeta como Bearer nas requisicoes.
 *
 * A sessao anda em dois canais: o ID token (~1h) fica no localStorage e vai no
 * header; o refresh token fica num cookie HttpOnly que o browser manda sozinho
 * para /auth/*. Por isso todo metodo que precisa do cookie usa
 * `withCredentials: true` — sem ele o browser nem grava nem devolve o cookie.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private readonly _token = signal<string | null>(
    localStorage.getItem(STORAGE_KEY),
  );
  readonly isAuthenticated = computed(() => this._token() !== null);

  /**
   * Renovacao em voo, compartilhada. Sem isto, N requisicoes tomando 401 juntas
   * disparariam N refreshes simultaneos — e o perdedor da corrida usaria um
   * refresh ja rotacionado.
   */
  private refreshEmVoo: Observable<LoginResponse> | null = null;

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${this.base}/auth/login`,
        { email, password },
        { withCredentials: true },
      )
      .pipe(tap((res) => this.setToken(res.token)));
  }

  /**
   * Cadastro (plano Estagiário): cria a conta com nome + aceite legal e já
   * autentica. O aceite dos Termos e da Privacidade é obrigatório (LGPD).
   * A conta nasce sem e-mail confirmado — quem cadastra vai para /verificar-email.
   */
  signup(dados: {
    nome: string;
    email: string;
    password: string;
    aceiteTermos: boolean;
    aceitePrivacidade: boolean;
    /** Plano pago escolhido na vitrine — vira `planoPretendido` no servidor. */
    planoPretendido?: PlanoAtual;
  }): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.base}/auth/signup`, dados, {
        withCredentials: true,
      })
      .pipe(tap((res) => this.setToken(res.token)));
  }

  /**
   * Troca o cookie por um ID token fresco. Chamadas concorrentes compartilham a
   * mesma requisicao (`shareReplay`), e o slot e liberado no fim para a proxima
   * renovacao poder acontecer.
   */
  refresh(): Observable<LoginResponse> {
    if (!this.refreshEmVoo) {
      this.refreshEmVoo = this.http
        .post<LoginResponse>(
          `${this.base}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        .pipe(
          tap((res) => this.setToken(res.token)),
          finalize(() => (this.refreshEmVoo = null)),
          shareReplay(1),
        );
    }
    return this.refreshEmVoo;
  }

  /**
   * Encerra a sessao. Continua `void` e sincrono do ponto de vista de quem chama
   * (os call sites navegam logo depois), mas agora avisa o servidor: o cookie e
   * HttpOnly e o JavaScript nao consegue apaga-lo sozinho.
   *
   * O POST e fire-and-forget e engole erro: a limpeza local acontece de
   * imediato, entao ninguem fica preso numa sessao porque a rede caiu. Navegar
   * na SPA nao cancela a requisicao em voo.
   */
  logout(): void {
    this.http
      .post(`${this.base}/auth/logout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe();
    this.limparSessaoLocal();
  }

  /**
   * Limpa so o estado local. Usado quando o servidor ja invalidou a sessao
   * (401 SESSAO_EXPIRADA) e um POST /auth/logout seria redundante.
   */
  limparSessaoLocal(): void {
    this._token.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  /** "Esqueci minha senha". A resposta e sempre a mesma — ver mensagem na tela. */
  recuperarSenha(email: string): Observable<{ enviado: true }> {
    return this.http.post<{ enviado: true }>(
      `${this.base}/auth/recuperar-senha`,
      { email },
    );
  }

  /** Status da confirmacao de e-mail (poll da tela de espera). */
  statusVerificacao(): Observable<{ verificado: boolean }> {
    return this.http.get<{ verificado: boolean }>(`${this.base}/auth/verificacao`);
  }

  reenviarVerificacao(): Observable<{ enviado: true }> {
    return this.http.post<{ enviado: true }>(
      `${this.base}/auth/verificacao/reenviar`,
      {},
    );
  }

  /** E-mail atual da conta + status (pagina de Seguranca). */
  conta(): Observable<ContaAuth> {
    return this.http.get<ContaAuth>(`${this.base}/auth/conta`);
  }

  /** Pede a troca de e-mail; so efetiva quando o link chega na caixa nova. */
  trocarEmail(
    novoEmail: string,
    senha: string,
  ): Observable<{ enviado: true; novoEmail: string }> {
    return this.http.post<{ enviado: true; novoEmail: string }>(
      `${this.base}/auth/email`,
      { novoEmail, senha },
    );
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
