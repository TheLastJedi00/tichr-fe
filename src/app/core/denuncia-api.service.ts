import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

/** Status de uma denúncia entre alunos (spec 032). */
export type StatusDenuncia = 'PENDENTE' | 'VALIDADA' | 'INVALIDADA';

/** Tópico comum de denúncia, criado pelo professor (vale em todas as turmas). */
export interface TopicoDenuncia {
  id: string;
  titulo: string;
  pontosSugeridos: number;
  ativo: boolean;
}

/** O que o professor vê de cada denúncia. */
export interface DenunciaProfessor {
  id: string;
  status: StatusDenuncia;
  criadaEm: string;
  resolvidaEm?: string;
  autorAlunoId: string;
  autorNome: string;
  denunciadoAlunoId: string;
  denunciadoNome: string;
  xpDenunciado: number;
  /** Janela de denúncia em que foi feita (033); ausente nas anteriores. */
  janelaId?: string;
  /** Grupo de que faz parte (033). */
  grupoId?: string;
  topicoId?: string;
  topicoTitulo?: string;
  pontosSugeridos?: number;
  texto?: string;
  /** Só denúncias anteriores à 033 podem ter foto. */
  temImagem: boolean;
  pontos?: number;
  pontosTransferidos?: number;
}

/** Janela de denúncia: intervalo em que a turma pôde denunciar (033). */
export interface JanelaDenuncia {
  id: string;
  abertaEm: string;
  fechadaEm?: string;
}

export interface EstadoJanelas {
  abertas: boolean;
  janelaAtualId: string | null;
  /** Mais nova primeiro. */
  janelas: JanelaDenuncia[];
}

export type StatusGrupo = 'PENDENTE' | 'VALIDADO' | 'INVALIDADO';

/** Grupo de denúncias contra o mesmo aluno (033). */
export interface GrupoDenuncia {
  id: string;
  status: StatusGrupo;
  criadoEm: string;
  resolvidoEm?: string;
  denunciadoAlunoId: string;
  denunciadoNome: string;
  xpDenunciado: number;
  topicoId?: string;
  topicoTitulo?: string;
  pontosSugeridos?: number;
  /** Ordem cronológica: a sobra da divisão vai aos primeiros. */
  denunciaIds: string[];
  pontos?: number;
  pontosTransferidos?: number;
}

/** Pendentes avulsas com o mesmo denunciado e tópico (033). */
export interface SugestaoGrupo {
  denunciadoAlunoId: string;
  denunciadoNome: string;
  topicoId: string;
  topicoTitulo?: string;
  denunciaIds: string[];
}

/** Divide `total` igualmente; a sobra vai, 1 por vez, aos primeiros (espelha o backend). */
export function dividirIgual(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const sobra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < sobra ? 1 : 0));
}

/** O que o aluno vê das próprias denúncias (sem pontos). */
export interface DenunciaAluno {
  id: string;
  status: StatusDenuncia;
  criadaEm: string;
  denunciadoNome: string;
  topicoTitulo?: string;
  texto?: string;
}

export interface OpcoesDenuncia {
  /** Janela de denúncia aberta pelo professor (033). */
  abertas: boolean;
  colegas: Array<{ id: string; nome: string }>;
  topicos: Array<{ id: string; titulo: string }>;
}

/** Teto de pontos por denúncia (espelha o backend). */
export const TETO_PONTOS_DENUNCIA = 10000;

/** HTTP da denúncia entre alunos: lado do professor e lado do aluno (PIN). */
@Injectable({ providedIn: 'root' })
export class DenunciaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  // ===== Professor =====

  listarTopicos(): Observable<TopicoDenuncia[]> {
    return this.http.get<TopicoDenuncia[]>(`${this.base}/denuncias/topicos`);
  }

  criarTopico(dados: { titulo: string; pontosSugeridos: number }): Observable<TopicoDenuncia> {
    return this.http.post<TopicoDenuncia>(`${this.base}/denuncias/topicos`, dados);
  }

  editarTopico(
    id: string,
    dados: Partial<Pick<TopicoDenuncia, 'titulo' | 'pontosSugeridos' | 'ativo'>>,
  ): Observable<TopicoDenuncia> {
    return this.http.patch<TopicoDenuncia>(`${this.base}/denuncias/topicos/${id}`, dados);
  }

  /** `{ turmaId: pendentes }` para os badges. */
  pendentes(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.base}/denuncias/pendentes`);
  }

  listarDaTurma(turmaId: string): Observable<DenunciaProfessor[]> {
    return this.http.get<DenunciaProfessor[]>(`${this.base}/turmas/${turmaId}/denuncias`);
  }

  urlImagem(turmaId: string, id: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(
      `${this.base}/turmas/${turmaId}/denuncias/${id}/imagem`,
    );
  }

  validar(turmaId: string, id: string, pontos: number): Observable<{ pontosTransferidos: number }> {
    return this.http.post<{ pontosTransferidos: number }>(
      `${this.base}/turmas/${turmaId}/denuncias/${id}/validar`,
      { pontos },
    );
  }

  invalidar(turmaId: string, id: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      `${this.base}/turmas/${turmaId}/denuncias/${id}/invalidar`,
      {},
    );
  }

  // ===== Janela (033) =====

  janelas(turmaId: string): Observable<EstadoJanelas> {
    return this.http.get<EstadoJanelas>(`${this.base}/turmas/${turmaId}/denuncias/janelas`);
  }

  abrirJanela(turmaId: string): Observable<{ abertas: boolean }> {
    return this.http.post<{ abertas: boolean }>(`${this.base}/turmas/${turmaId}/denuncias/abrir`, {});
  }

  fecharJanela(turmaId: string): Observable<{ abertas: boolean }> {
    return this.http.post<{ abertas: boolean }>(`${this.base}/turmas/${turmaId}/denuncias/fechar`, {});
  }

  // ===== Grupos (033) =====

  grupos(turmaId: string): Observable<{ grupos: GrupoDenuncia[]; sugestoes: SugestaoGrupo[] }> {
    return this.http.get<{ grupos: GrupoDenuncia[]; sugestoes: SugestaoGrupo[] }>(
      `${this.base}/turmas/${turmaId}/denuncias/grupos`,
    );
  }

  criarGrupo(turmaId: string, denunciaIds: string[]): Observable<GrupoDenuncia> {
    return this.http.post<GrupoDenuncia>(`${this.base}/turmas/${turmaId}/denuncias/grupos`, {
      denunciaIds,
    });
  }

  associar(turmaId: string, grupoId: string, denunciaId: string): Observable<{ motivoDiferente: boolean }> {
    return this.http.post<{ motivoDiferente: boolean }>(
      `${this.base}/turmas/${turmaId}/denuncias/grupos/${grupoId}/associar`,
      { denunciaId },
    );
  }

  desassociar(turmaId: string, grupoId: string, denunciaId: string): Observable<{ desfeito: boolean }> {
    return this.http.post<{ desfeito: boolean }>(
      `${this.base}/turmas/${turmaId}/denuncias/grupos/${grupoId}/desassociar`,
      { denunciaId },
    );
  }

  validarGrupo(
    turmaId: string,
    grupoId: string,
    pontos: number,
  ): Observable<{ pontosTransferidos: number; partes: Array<{ alunoId: string; pontos: number }> }> {
    return this.http.post<{
      pontosTransferidos: number;
      partes: Array<{ alunoId: string; pontos: number }>;
    }>(`${this.base}/turmas/${turmaId}/denuncias/grupos/${grupoId}/validar`, { pontos });
  }

  invalidarGrupo(turmaId: string, grupoId: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      `${this.base}/turmas/${turmaId}/denuncias/grupos/${grupoId}/invalidar`,
      {},
    );
  }

  // ===== Aluno =====

  opcoes(): Observable<OpcoesDenuncia> {
    return this.http.get<OpcoesDenuncia>(`${this.base}/aluno/denuncias/opcoes`);
  }

  minhas(): Observable<DenunciaAluno[]> {
    return this.http.get<DenunciaAluno[]>(`${this.base}/aluno/denuncias`);
  }

  /** Sem foto desde a 033: só colega, tópico e/ou texto. */
  denunciar(dados: {
    denunciadoAlunoId: string;
    topicoId?: string;
    texto?: string;
  }): Observable<{ id: string }> {
    const corpo: { denunciadoAlunoId: string; topicoId?: string; texto?: string } = {
      denunciadoAlunoId: dados.denunciadoAlunoId,
    };
    if (dados.topicoId) corpo.topicoId = dados.topicoId;
    if (dados.texto?.trim()) corpo.texto = dados.texto.trim();
    return this.http.post<{ id: string }>(`${this.base}/aluno/denuncias`, corpo);
  }
}
