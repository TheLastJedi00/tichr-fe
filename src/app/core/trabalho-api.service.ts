import { HttpClient, HttpEvent } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import type { ExtensaoAnexo } from './pergunta-api.service';

/** Envio de trabalhos (spec 038). */
export type EstadoEntrega = 'PENDENTE' | 'ENTREGUE' | 'AVALIADA' | 'PERDIDA';

export interface Atividade {
  id: string;
  titulo: string;
  descricao: string | null;
  /** ISO com data e hora limite. */
  prazo: string;
  valorPontos: number;
  /** Ainda recebe entregas (`agora <= prazo`). */
  aberta: boolean;
}

/** O professor vê também os contadores da turma. */
export interface AtividadeProfessor extends Atividade {
  totalEntregas: number;
  aguardandoAvaliacao: number;
  totalAlunos: number;
  criadaEm: string;
}

export interface ArquivoEntrega {
  id: string;
  nome: string;
  extensao: ExtensaoAnexo;
  tamanho: number;
  enviadoEm: string;
}

export interface AvaliacaoEntrega {
  nota: number;
  comentario: string | null;
  avaliadaEm: string;
  /** XP que entrou no ranking por este trabalho. */
  pontos: number;
}

export interface Entrega {
  estado: EstadoEntrega;
  texto: string | null;
  arquivos: ArquivoEntrega[];
  criadaEm: string | null;
  atualizadaEm: string | null;
  avaliacao: AvaliacaoEntrega | null;
}

export interface TrabalhoDoAluno {
  atividade: Atividade;
  estado: EstadoEntrega;
  nota: number | null;
  atualizadaEm: string | null;
}

export interface DetalheTrabalhoAluno {
  atividade: Atividade;
  estado: EstadoEntrega;
  entrega: Entrega | null;
}

export interface EntregaResumo {
  alunoId: string;
  alunoNome: string;
  estado: EstadoEntrega;
  atualizadaEm: string | null;
  nota: number | null;
  temTexto: boolean;
  totalArquivos: number;
}

export interface EntregasDaAtividade {
  atividade: AtividadeProfessor;
  alunos: EntregaResumo[];
}

export interface EntregaDoAluno {
  atividade: AtividadeProfessor;
  aluno: { id: string; nome: string };
  estado: EstadoEntrega;
  entrega: Entrega | null;
}

export interface DadosAtividade {
  titulo: string;
  descricao: string | null;
  prazo: string;
  valorPontos: number;
}

/** Regras espelhadas do backend (038 #2, #8, #9, #14). */
export const TRABALHO_REGRAS = {
  TITULO_MAX: 120,
  DESCRICAO_MAX: 2000,
  /** Até 5 dígitos. */
  VALOR_MAX: 99_999,
  VALOR_PADRAO: 100,
  TEXTO_MAX: 10_000,
  MAX_ARQUIVOS: 5,
  NOTA_MAX: 10,
  COMENTARIO_MAX: 2000,
};

const p2 = (n: number) => String(n).padStart(2, '0');

/**
 * Data (`YYYY-MM-DD`) e hora (`HH:mm`) locais dos campos do formulário → ISO
 * UTC com a hora limite. Null se faltar um dos dois.
 */
export function prazoParaIso(data: string, hora: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(hora)) return null;
  const d = new Date(`${data}T${hora}:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** O inverso, para preencher o formulário de edição no fuso do professor. */
export function isoParaCampos(iso: string): { data: string; hora: string } {
  const d = new Date(iso);
  return {
    data: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`,
    hora: `${p2(d.getHours())}:${p2(d.getMinutes())}`,
  };
}

/** "05/12/2026 às 23:59" (038 #2: sempre data e hora). */
export function formatarPrazo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} às ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/**
 * Quanto falta, para o aluno: "encerra hoje às 23:59", "encerra amanhã às
 * 08:00", "faltam 3 dias"; null quando já passou.
 */
export function faltaParaPrazo(iso: string, agora: Date = new Date()): string | null {
  const d = new Date(iso);
  const ms = d.getTime() - agora.getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  const hora = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  const dia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dias = Math.round((dia(d) - dia(agora)) / 86_400_000);
  if (dias === 0) {
    const min = Math.floor(ms / 60_000);
    if (min < 60) return `encerra em ${Math.max(1, min)} min (às ${hora})`;
    return `encerra hoje às ${hora}`;
  }
  if (dias === 1) return `encerra amanhã às ${hora}`;
  return `faltam ${dias} dias`;
}

/** A nota vira XP (038 #15): `round(nota / 10 × valor)`. */
export function pontosDaNota(nota: number, valorPontos: number): number {
  return Math.round((nota / TRABALHO_REGRAS.NOTA_MAX) * valorPontos);
}

/** Nota 0–10 com até uma casa; aceita vírgula ("7,5"). Null se inválida. */
export function lerNota(texto: string): number | null {
  const t = texto.trim().replace(',', '.');
  if (!/^\d{1,2}(\.\d)?$/.test(t)) return null;
  const n = Number(t);
  return n >= 0 && n <= TRABALHO_REGRAS.NOTA_MAX ? n : null;
}

/** "8", "7,5". */
export function formatarNota(nota: number): string {
  return nota.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/** HTTP do envio de trabalhos: lado do professor e lado do aluno (PIN). */
@Injectable({ providedIn: 'root' })
export class TrabalhoApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  // ===== Professor =====

  /** `{ turmaId: n }` de entregas esperando nota (badge). */
  pendentes(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.base}/trabalhos/pendentes`);
  }

  listarAtividades(turmaId: string): Observable<AtividadeProfessor[]> {
    return this.http.get<AtividadeProfessor[]>(`${this.base}/turmas/${turmaId}/atividades`);
  }

  criarAtividade(turmaId: string, dados: DadosAtividade): Observable<AtividadeProfessor> {
    return this.http.post<AtividadeProfessor>(`${this.base}/turmas/${turmaId}/atividades`, dados);
  }

  editarAtividade(turmaId: string, id: string, dados: Partial<DadosAtividade>): Observable<AtividadeProfessor> {
    return this.http.patch<AtividadeProfessor>(`${this.base}/turmas/${turmaId}/atividades/${id}`, dados);
  }

  excluirAtividade(turmaId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/turmas/${turmaId}/atividades/${id}`);
  }

  entregas(turmaId: string, id: string): Observable<EntregasDaAtividade> {
    return this.http.get<EntregasDaAtividade>(`${this.base}/turmas/${turmaId}/atividades/${id}/entregas`);
  }

  entregaDoAluno(turmaId: string, id: string, alunoId: string): Observable<EntregaDoAluno> {
    return this.http.get<EntregaDoAluno>(
      `${this.base}/turmas/${turmaId}/atividades/${id}/entregas/${alunoId}`,
    );
  }

  arquivoDoProfessor(turmaId: string, id: string, alunoId: string, arquivoId: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(
      `${this.base}/turmas/${turmaId}/atividades/${id}/entregas/${alunoId}/arquivos/${arquivoId}`,
    );
  }

  avaliar(
    turmaId: string,
    id: string,
    alunoId: string,
    dados: { nota: number; comentario: string | null },
  ): Observable<Entrega> {
    return this.http.put<Entrega>(
      `${this.base}/turmas/${turmaId}/atividades/${id}/entregas/${alunoId}/avaliacao`,
      dados,
    );
  }

  // ===== Aluno =====

  meus(): Observable<TrabalhoDoAluno[]> {
    return this.http.get<TrabalhoDoAluno[]>(`${this.base}/aluno/trabalhos`);
  }

  detalhe(atividadeId: string): Observable<DetalheTrabalhoAluno> {
    return this.http.get<DetalheTrabalhoAluno>(`${this.base}/aluno/trabalhos/${atividadeId}`);
  }

  salvarTexto(atividadeId: string, texto: string): Observable<Entrega> {
    return this.http.put<Entrega>(`${this.base}/aluno/trabalhos/${atividadeId}/texto`, { texto });
  }

  /** Um arquivo por requisição (038 #9), com progresso de upload. */
  enviarArquivo(atividadeId: string, arquivo: File): Observable<HttpEvent<Entrega>> {
    const fd = new FormData();
    fd.append('arquivo', arquivo, arquivo.name);
    return this.http.post<Entrega>(`${this.base}/aluno/trabalhos/${atividadeId}/arquivos`, fd, {
      reportProgress: true,
      observe: 'events',
    });
  }

  removerArquivo(atividadeId: string, arquivoId: string): Observable<Entrega> {
    return this.http.delete<Entrega>(`${this.base}/aluno/trabalhos/${atividadeId}/arquivos/${arquivoId}`);
  }

  arquivoDoAluno(atividadeId: string, arquivoId: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.base}/aluno/trabalhos/${atividadeId}/arquivos/${arquivoId}`);
  }
}
