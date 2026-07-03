import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  Alocacao,
  Aluno,
  AtualizarEquipePayload,
  Cargo,
  CriarAgrupamentoPayload,
  CriarEquipePayload,
  CriarExcecaoPayload,
  CriarFeriasPayload,
  CriarQlickPayload,
  CriarTurmaPayload,
  Equipe,
  Ferias,
  PlanoAula,
  ProgressoTurma,
  Qlick,
  RankingItem,
  Sessao,
  Squad,
  Topico,
  TopicoAula,
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

  /** Progresso do curso (aulas concluídas/total) + base coletiva. */
  getProgressoTurma(id: string): Observable<ProgressoTurma> {
    return this.http.get<ProgressoTurma>(`${this.base}/turmas/${id}/progresso`);
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

  /** Renomeia um aluno da turma. */
  editarAluno(
    turmaId: string,
    alunoId: string,
    nome: string,
  ): Observable<Aluno> {
    return this.http.patch<Aluno>(
      `${this.base}/turmas/${turmaId}/alunos/${alunoId}`,
      { nome },
    );
  }

  // ===== Equipes (agrupamento persistente com drag & drop) =====

  getEquipes(turmaId: string): Observable<Equipe[]> {
    return this.http.get<Equipe[]>(`${this.base}/turmas/${turmaId}/equipes`);
  }

  criarEquipe(
    turmaId: string,
    payload: CriarEquipePayload,
  ): Observable<Equipe> {
    return this.http.post<Equipe>(
      `${this.base}/turmas/${turmaId}/equipes`,
      payload,
    );
  }

  atualizarEquipe(
    turmaId: string,
    equipeId: string,
    payload: AtualizarEquipePayload,
  ): Observable<Equipe> {
    return this.http.put<Equipe>(
      `${this.base}/turmas/${turmaId}/equipes/${equipeId}`,
      payload,
    );
  }

  removerEquipe(
    turmaId: string,
    equipeId: string,
  ): Observable<{ removido: boolean }> {
    return this.http.delete<{ removido: boolean }>(
      `${this.base}/turmas/${turmaId}/equipes/${equipeId}`,
    );
  }

  /** Move o aluno para uma equipe (drop) ou de volta ao pool (equipeId=null). */
  definirEquipeDoAluno(
    turmaId: string,
    alunoId: string,
    equipeId: string | null,
  ): Observable<Aluno> {
    return this.http.patch<Aluno>(
      `${this.base}/turmas/${turmaId}/alunos/${alunoId}/equipe`,
      { equipeId },
    );
  }

  /** Distribui os alunos pelas equipes de forma balanceada. */
  distribuirEquipes(turmaId: string): Observable<Aluno[]> {
    return this.http.post<Aluno[]>(
      `${this.base}/turmas/${turmaId}/equipes/distribuir`,
      {},
    );
  }

  // ===== Cargos (tarefas atribuíveis a membros) =====

  getCargos(turmaId: string): Observable<Cargo[]> {
    return this.http.get<Cargo[]>(`${this.base}/turmas/${turmaId}/cargos`);
  }

  adicionarCargos(turmaId: string, nomes: string[]): Observable<Cargo[]> {
    return this.http.post<Cargo[]>(`${this.base}/turmas/${turmaId}/cargos`, {
      nomes,
    });
  }

  removerCargo(
    turmaId: string,
    cargoId: string,
  ): Observable<{ removido: boolean }> {
    return this.http.delete<{ removido: boolean }>(
      `${this.base}/turmas/${turmaId}/cargos/${cargoId}`,
    );
  }

  /** Define o conjunto final de membros responsáveis por um cargo (N↔N). */
  atribuirCargo(
    turmaId: string,
    cargoId: string,
    alunoIds: string[],
  ): Observable<Aluno[]> {
    return this.http.put<Aluno[]>(
      `${this.base}/turmas/${turmaId}/cargos/${cargoId}/membros`,
      { alunoIds },
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

  getMeuProgresso(): Observable<ProgressoTurma> {
    return this.http.get<ProgressoTurma>(`${this.base}/aluno/progresso`);
  }

  /** Tópicos do plano de aula alocados às minhas aulas (portal PhD). */
  getMeuPlano(): Observable<{ topicos: TopicoAula[] }> {
    return this.http.get<{ topicos: TopicoAula[] }>(`${this.base}/aluno/plano`);
  }

  // ===== Plano de Aula (escopo geral por disciplina) =====

  getPlanosAula(): Observable<PlanoAula[]> {
    return this.http.get<PlanoAula[]>(`${this.base}/planos-aula`);
  }

  salvarPlanoAula(
    disciplina: string,
    contextoGeral: string,
  ): Observable<PlanoAula> {
    return this.http.put<PlanoAula>(`${this.base}/planos-aula`, {
      disciplina,
      contextoGeral,
    });
  }

  // ===== Tópicos (backlog por disciplina) e alocação (Mestre) =====

  getTopicos(disciplina: string): Observable<Topico[]> {
    return this.http.get<Topico[]>(`${this.base}/topicos`, {
      params: { disciplina },
    });
  }

  adicionarTopicos(disciplina: string, nomes: string[]): Observable<Topico[]> {
    return this.http.post<Topico[]>(`${this.base}/topicos`, {
      disciplina,
      nomes,
    });
  }

  removerTopico(id: string): Observable<{ removido: boolean }> {
    return this.http.delete<{ removido: boolean }>(`${this.base}/topicos/${id}`);
  }

  // ===== Tichr Qlick (definição do questionário) =====

  getQlicks(): Observable<Qlick[]> {
    return this.http.get<Qlick[]>(`${this.base}/qlicks`);
  }

  getQlick(id: string): Observable<Qlick> {
    return this.http.get<Qlick>(`${this.base}/qlicks/${id}`);
  }

  criarQlick(payload: CriarQlickPayload): Observable<Qlick> {
    return this.http.post<Qlick>(`${this.base}/qlicks`, payload);
  }

  atualizarQlick(id: string, payload: CriarQlickPayload): Observable<Qlick> {
    return this.http.put<Qlick>(`${this.base}/qlicks/${id}`, payload);
  }

  removerQlick(id: string): Observable<{ removido: boolean }> {
    return this.http.delete<{ removido: boolean }>(`${this.base}/qlicks/${id}`);
  }

  getAlocacoes(turmaId: string): Observable<Alocacao[]> {
    return this.http.get<Alocacao[]>(`${this.base}/turmas/${turmaId}/alocacoes`);
  }

  /** Aloca (topicoId) ou desaloca (null) um tópico à aula `numero`. */
  definirAlocacao(
    turmaId: string,
    numero: number,
    topicoId: string | null,
  ): Observable<Alocacao | { removido: true }> {
    return this.http.put<Alocacao | { removido: true }>(
      `${this.base}/turmas/${turmaId}/alocacoes/${numero}`,
      { topicoId },
    );
  }
}
