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
  topicoId?: string;
  topicoTitulo?: string;
  pontosSugeridos?: number;
  texto?: string;
  temImagem: boolean;
  pontos?: number;
  pontosTransferidos?: number;
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

  // ===== Aluno =====

  opcoes(): Observable<OpcoesDenuncia> {
    return this.http.get<OpcoesDenuncia>(`${this.base}/aluno/denuncias/opcoes`);
  }

  minhas(): Observable<DenunciaAluno[]> {
    return this.http.get<DenunciaAluno[]>(`${this.base}/aluno/denuncias`);
  }

  /** Multipart: a imagem (já comprimida) vai no campo `imagem`. */
  denunciar(dados: {
    denunciadoAlunoId: string;
    topicoId?: string;
    texto?: string;
    imagem?: Blob | null;
  }): Observable<{ id: string }> {
    const form = new FormData();
    form.append('denunciadoAlunoId', dados.denunciadoAlunoId);
    if (dados.topicoId) form.append('topicoId', dados.topicoId);
    if (dados.texto?.trim()) form.append('texto', dados.texto.trim());
    if (dados.imagem) form.append('imagem', dados.imagem, 'denuncia.jpg');
    return this.http.post<{ id: string }>(`${this.base}/aluno/denuncias`, form);
  }
}
