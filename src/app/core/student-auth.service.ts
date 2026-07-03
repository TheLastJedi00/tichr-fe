import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  LoginAlunoResponse,
  LoginInfoTurma,
  PortalTurma,
  TurmaConfigPublica,
} from './models';

const TOKEN_KEY = 'tichr-aluno-token';
const ALUNO_KEY = 'tichr-aluno';
const CONFIG_KEY = 'tichr-aluno-config';

type AlunoSessao = LoginAlunoResponse['aluno'];

const CONFIG_PADRAO: TurmaConfigPublica = {
  nomePontuacao: 'XP',
  rankingAtivo: true,
};

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
  readonly config = signal<TurmaConfigPublica>(this.lerConfig());
  readonly isAuthenticated = computed(() => this._token() !== null);
  readonly turmaId = computed(() => this.aluno()?.turmaId ?? null);
  readonly nomePontuacao = computed(() => this.config().nomePontuacao);
  readonly rankingAtivo = computed(() => this.config().rankingAtivo);

  /** Info publica da turma (nome + nomes) para a tela de login. */
  infoTurma(turmaId: string): Observable<LoginInfoTurma> {
    return this.http.get<LoginInfoTurma>(`${this.base}/auth/turma/${turmaId}`);
  }

  /** Portal: turmas ativas de um professor pelo @username. */
  buscarTurmas(username: string): Observable<PortalTurma[]> {
    const u = username.trim().replace(/^@/, '');
    return this.http.get<PortalTurma[]>(
      `${this.base}/portal/professor/${encodeURIComponent(u)}/turmas`,
    );
  }

  /** Portal: valida o PIN de 6 dígitos da turma e devolve os nomes. */
  desbloquearTurma(
    turmaId: string,
    pinTurma: string,
  ): Observable<LoginInfoTurma> {
    return this.http.post<LoginInfoTurma>(
      `${this.base}/portal/turma/${turmaId}/alunos`,
      { pinTurma },
    );
  }

  login(turmaId: string, pin: string): Observable<LoginAlunoResponse> {
    return this.http
      .post<LoginAlunoResponse>(`${this.base}/auth/aluno`, { turmaId, pin })
      .pipe(tap((res) => this.salvarSessao(res)));
  }

  logout(): void {
    this._token.set(null);
    this.aluno.set(null);
    this.config.set(CONFIG_PADRAO);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ALUNO_KEY);
    localStorage.removeItem(CONFIG_KEY);
  }

  getToken(): string | null {
    return this._token();
  }

  private salvarSessao(res: LoginAlunoResponse): void {
    this._token.set(res.token);
    this.aluno.set(res.aluno);
    this.config.set(res.turma ?? CONFIG_PADRAO);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(ALUNO_KEY, JSON.stringify(res.aluno));
    localStorage.setItem(CONFIG_KEY, JSON.stringify(res.turma ?? CONFIG_PADRAO));
  }

  private lerAluno(): AlunoSessao | null {
    const raw = localStorage.getItem(ALUNO_KEY);
    return raw ? (JSON.parse(raw) as AlunoSessao) : null;
  }

  private lerConfig(): TurmaConfigPublica {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as TurmaConfigPublica) : CONFIG_PADRAO;
  }
}
