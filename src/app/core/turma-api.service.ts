import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  Aluno,
  CriarAgrupamentoPayload,
  CriarExcecaoPayload,
  CriarFeriasPayload,
  CriarTurmaPayload,
  Ferias,
  RankingItem,
  Sessao,
  Squad,
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

  // ===== Alunos (lista de chamada) =====

  getAlunos(turmaId: string): Observable<Aluno[]> {
    return this.http.get<Aluno[]>(`${this.base}/turmas/${turmaId}/alunos`);
  }

  adicionarAlunos(turmaId: string, nomes: string[]): Observable<Aluno[]> {
    return this.http.post<Aluno[]>(`${this.base}/turmas/${turmaId}/alunos`, {
      nomes,
    });
  }

  removerAluno(
    turmaId: string,
    alunoId: string,
  ): Observable<{ removido: boolean }> {
    return this.http.delete<{ removido: boolean }>(
      `${this.base}/turmas/${turmaId}/alunos/${alunoId}`,
    );
  }

  // ===== Agrupamento (sorteio de squads) =====

  sortearAgrupamento(
    turmaId: string,
    payload: CriarAgrupamentoPayload,
  ): Observable<{ squads: Squad[] }> {
    return this.http.post<{ squads: Squad[] }>(
      `${this.base}/turmas/${turmaId}/agrupamento`,
      payload,
    );
  }

  // ===== Gamificação (XP e ranking) =====

  /** Ferramenta do professor: distribui XP a um aluno. */
  darXp(
    turmaId: string,
    alunoId: string,
    pontos: number,
    motivo?: string,
  ): Observable<{ alunoId: string; xpTotal: number }> {
    return this.http.post<{ alunoId: string; xpTotal: number }>(
      `${this.base}/turmas/${turmaId}/alunos/${alunoId}/xp`,
      { pontos, motivo },
    );
  }

  getRanking(turmaId: string): Observable<RankingItem[]> {
    return this.http.get<RankingItem[]>(
      `${this.base}/turmas/${turmaId}/ranking`,
    );
  }

  // ===== Portal do aluno =====

  getMeuPerfil(): Observable<Aluno> {
    return this.http.get<Aluno>(`${this.base}/aluno/me`);
  }

  getMinhaAgenda(): Observable<Sessao[]> {
    return this.http.get<Sessao[]>(`${this.base}/aluno/agenda`);
  }
}
