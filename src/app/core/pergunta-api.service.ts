import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

/** Pergunta do aluno ao professor (spec 037). */
export type StatusPergunta = 'ABERTA' | 'ENCERRADA';
export type AutorMensagem = 'ALUNO' | 'PROFESSOR';
export type AguardandoPergunta = 'AGUARDANDO_PROFESSOR' | 'AGUARDANDO_ALUNO';
export type ExtensaoAnexo = 'html' | 'htm' | 'css' | 'pdf' | 'doc' | 'docx';

export interface Pergunta {
  id: string;
  titulo: string;
  status: StatusPergunta;
  /** Quem a pergunta está esperando; null quando encerrada. */
  aguardando: AguardandoPergunta | null;
  criadaEm: string;
  atualizadaEm: string;
  totalMensagens: number;
  temAnexo: boolean;
  encerradaEm?: string;
  encerradaPor?: AutorMensagem;
}

/** O professor vê quem perguntou (não é anônima). */
export interface PerguntaProfessor extends Pergunta {
  alunoId: string;
  alunoNome: string;
}

export interface MensagemPergunta {
  id: string;
  autor: AutorMensagem;
  texto?: string;
  anexo?: { nome: string; extensao: ExtensaoAnexo; tamanho: number };
  criadaEm: string;
}

export interface DetalhePergunta<P extends Pergunta = Pergunta> {
  pergunta: P;
  mensagens: MensagemPergunta[];
}

export interface EstadoJanelaPerguntas {
  abertas: boolean;
  desde: string | null;
}

/** Regras espelhadas do backend (037 #7, #13, #14). */
export const PERGUNTA_REGRAS = {
  TITULO_MAX: 120,
  TEXTO_MAX: 2000,
  ARQUIVO_MAX_BYTES: 4 * 1024 * 1024,
  EXTENSOES: ['html', 'htm', 'css', 'pdf', 'doc', 'docx'] as const,
  /** Para o `accept` do seletor de arquivo. */
  ACCEPT: '.html,.htm,.css,.pdf,.doc,.docx',
  /** Atualização da conversa com a tela aberta (sem tempo real, #9). */
  POLLING_MS: 30_000,
};

/** Erro de validação local do anexo, antes de enviar; null = ok. */
export function erroDoArquivo(arquivo: File): string | null {
  const ext = arquivo.name.split('.').pop()?.toLowerCase() ?? '';
  if (!(PERGUNTA_REGRAS.EXTENSOES as readonly string[]).includes(ext)) {
    return 'Envie um arquivo HTML, CSS, PDF ou Word (.doc/.docx). Imagens não são aceitas.';
  }
  if (arquivo.size === 0) return 'O arquivo está vazio.';
  if (arquivo.size > PERGUNTA_REGRAS.ARQUIVO_MAX_BYTES) {
    return 'O arquivo pode ter até 4 MB.';
  }
  return null;
}

/** "1,2 MB", "340 KB". */
export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

/** Abre a URL assinada (que já vem como download) sem sair da página. */
export function baixar(url: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function multipart(campos: Record<string, string | undefined>, arquivo?: File | null): FormData | Record<string, string> {
  const limpos = Object.fromEntries(
    Object.entries(campos).filter(([, v]) => v !== undefined && v !== ''),
  ) as Record<string, string>;
  if (!arquivo) return limpos;
  const fd = new FormData();
  for (const [k, v] of Object.entries(limpos)) fd.append(k, v);
  fd.append('arquivo', arquivo, arquivo.name);
  return fd;
}

/** HTTP das perguntas ao professor: lado do professor e lado do aluno (PIN). */
@Injectable({ providedIn: 'root' })
export class PerguntaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  // ===== Professor =====

  /** `{ turmaId: n }` de perguntas esperando o professor (badge). */
  pendentes(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.base}/perguntas/pendentes`);
  }

  listarDaTurma(turmaId: string, status?: StatusPergunta): Observable<PerguntaProfessor[]> {
    const q = status ? `?status=${status}` : '';
    return this.http.get<PerguntaProfessor[]>(`${this.base}/turmas/${turmaId}/perguntas${q}`);
  }

  detalheDoProfessor(turmaId: string, id: string): Observable<DetalhePergunta<PerguntaProfessor>> {
    return this.http.get<DetalhePergunta<PerguntaProfessor>>(
      `${this.base}/turmas/${turmaId}/perguntas/${id}`,
    );
  }

  responderDoProfessor(turmaId: string, id: string, texto: string): Observable<MensagemPergunta> {
    return this.http.post<MensagemPergunta>(
      `${this.base}/turmas/${turmaId}/perguntas/${id}/mensagens`,
      { texto },
    );
  }

  encerrarDoProfessor(turmaId: string, id: string): Observable<Pergunta> {
    return this.http.post<Pergunta>(`${this.base}/turmas/${turmaId}/perguntas/${id}/encerrar`, {});
  }

  reabrir(turmaId: string, id: string): Observable<Pergunta> {
    return this.http.post<Pergunta>(`${this.base}/turmas/${turmaId}/perguntas/${id}/reabrir`, {});
  }

  anexoDoProfessor(turmaId: string, id: string, mensagemId: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(
      `${this.base}/turmas/${turmaId}/perguntas/${id}/mensagens/${mensagemId}/anexo`,
    );
  }

  estadoJanela(turmaId: string): Observable<EstadoJanelaPerguntas> {
    return this.http.get<EstadoJanelaPerguntas>(`${this.base}/turmas/${turmaId}/perguntas/estado`);
  }

  abrirJanela(turmaId: string): Observable<EstadoJanelaPerguntas> {
    return this.http.post<EstadoJanelaPerguntas>(`${this.base}/turmas/${turmaId}/perguntas/abrir`, {});
  }

  fecharJanela(turmaId: string): Observable<EstadoJanelaPerguntas> {
    return this.http.post<EstadoJanelaPerguntas>(`${this.base}/turmas/${turmaId}/perguntas/fechar`, {});
  }

  // ===== Aluno =====

  estadoAluno(): Observable<{ abertas: boolean }> {
    return this.http.get<{ abertas: boolean }>(`${this.base}/aluno/perguntas/estado`);
  }

  minhas(): Observable<Pergunta[]> {
    return this.http.get<Pergunta[]>(`${this.base}/aluno/perguntas`);
  }

  detalheDoAluno(id: string): Observable<DetalhePergunta> {
    return this.http.get<DetalhePergunta>(`${this.base}/aluno/perguntas/${id}`);
  }

  criar(dados: { titulo: string; texto?: string }, arquivo?: File | null): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.base}/aluno/perguntas`,
      multipart({ titulo: dados.titulo, texto: dados.texto }, arquivo),
    );
  }

  responderDoAluno(id: string, texto: string | undefined, arquivo?: File | null): Observable<MensagemPergunta> {
    return this.http.post<MensagemPergunta>(
      `${this.base}/aluno/perguntas/${id}/mensagens`,
      multipart({ texto }, arquivo),
    );
  }

  encerrarDoAluno(id: string): Observable<Pergunta> {
    return this.http.post<Pergunta>(`${this.base}/aluno/perguntas/${id}/encerrar`, {});
  }

  anexoDoAluno(id: string, mensagemId: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(
      `${this.base}/aluno/perguntas/${id}/mensagens/${mensagemId}/anexo`,
    );
  }
}
