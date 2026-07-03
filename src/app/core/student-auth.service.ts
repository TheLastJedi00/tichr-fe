import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { LoginAlunoResponse, LoginInfoTurma } from './models';

const TOKEN_KEY = 'tichr-aluno-token';
const ALUNO_KEY = 'tichr-aluno';

type AlunoSessao = LoginAlunoResponse['aluno'];

/**
 * Autenticacao do portal do aluno (Plano PhD). Token e sessao separados dos
 * do professor — permite os dois mundos coexistirem sem colisao de estado.
 */
@Injectable({ providedIn: 'root' })
export class StudentAuthService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private readonly _token = signal<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );
  readonly aluno = signal<AlunoSessao | null>(this.lerAluno());
  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly turmaId = computed(() => this.aluno()?.turmaId ?? null);

  /** Info publica da turma (nome + nomes) para a tela de login. */
  infoTurma(turmaId: string): Observable<LoginInfoTurma> {
    return this.http.get<LoginInfoTurma>(`${this.base}/auth/turma/${turmaId}`);
  }

  login(turmaId: string, pin: string): Observable<LoginAlunoResponse> {
    return this.http
      .post<LoginAlunoResponse>(`${this.base}/auth/aluno`, { turmaId, pin })
      .pipe(tap((res) => this.salvarSessao(res)));
  }

  logout(): void {
    this._token.set(null);
    this.aluno.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ALUNO_KEY);
  }

  getToken(): string | null {
    return this._token();
  }

  private salvarSessao(res: LoginAlunoResponse): void {
    this._token.set(res.token);
    this.aluno.set(res.aluno);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(ALUNO_KEY, JSON.stringify(res.aluno));
  }

  private lerAluno(): AlunoSessao | null {
    const raw = localStorage.getItem(ALUNO_KEY);
    return raw ? (JSON.parse(raw) as AlunoSessao) : null;
  }
}
