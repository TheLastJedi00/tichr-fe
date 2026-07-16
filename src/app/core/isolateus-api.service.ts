import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  CriarIsolateusPayload,
  IsolateusJogo,
  IsolateusMatch,
  PainelIsolateus,
  QuestaoIsolateus,
} from './models';

/**
 * Camada HTTP do Tichr Isolateus. **Toda** mutação passa por aqui: o cliente lê
 * a partida em tempo real pelo Firestore, mas não escreve uma linha nela — o
 * backend é o juiz da investigação (e o único que conhece o infiltrado).
 */
@Injectable({ providedIn: 'root' })
export class IsolateusApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  // --- Investigações (professor) ---
  listarJogos(): Observable<IsolateusJogo[]> {
    return this.http.get<IsolateusJogo[]>(`${this.base}/isolateus/jogos`);
  }
  obterJogo(id: string): Observable<IsolateusJogo> {
    return this.http.get<IsolateusJogo>(`${this.base}/isolateus/jogos/${id}`);
  }
  criarJogo(payload: CriarIsolateusPayload): Observable<IsolateusJogo> {
    return this.http.post<IsolateusJogo>(
      `${this.base}/isolateus/jogos`,
      payload,
    );
  }
  atualizarJogo(
    id: string,
    payload: CriarIsolateusPayload,
  ): Observable<IsolateusJogo> {
    return this.http.put<IsolateusJogo>(
      `${this.base}/isolateus/jogos/${id}`,
      payload,
    );
  }
  removerJogo(id: string): Observable<{ removido: boolean }> {
    return this.http.delete<{ removido: boolean }>(
      `${this.base}/isolateus/jogos/${id}`,
    );
  }
  /** Gera as 10 questões da investigação por IA (1×/dia, cota própria). */
  gerarQuestoes(payload: {
    instrucao: string;
    disciplina?: string;
    topico?: string;
  }): Observable<{ questoes: QuestaoIsolateus[] }> {
    return this.http.post<{ questoes: QuestaoIsolateus[] }>(
      `${this.base}/isolateus/jogos/questoes`,
      payload,
    );
  }

  // --- Partida (professor / telão) ---
  criarPartida(jogoId: string, turmaId?: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/isolateus/jogos/${jogoId}/partida`,
      turmaId ? { turmaId } : {},
    );
  }
  verPartida(id: string): Observable<IsolateusMatch> {
    return this.http.get<IsolateusMatch>(`${this.base}/isolateus/matches/${id}`);
  }
  /** A auditoria do Comando Central: veta um pseudônimo no lobby. */
  vetarNome(id: string, alunoId: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/isolateus/matches/${id}/vetar/${alunoId}`,
      {},
    );
  }
  /** Corrige o apelido de um habitante sem tirá-lo do lobby. */
  renomearInscrito(
    id: string,
    alunoId: string,
    pseudonimo: string,
  ): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/isolateus/matches/${id}/renomear/${alunoId}`,
      { pseudonimo },
    );
  }
  /** O Despertar: preenche a vila com NPCs e sorteia a Ameaça. */
  iniciar(id: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/isolateus/matches/${id}/iniciar`,
      {},
    );
  }
  /** Fecha a fase cronometrada (o telão dispara ao zerar o relógio). */
  tempo(id: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/isolateus/matches/${id}/tempo`,
      {},
    );
  }
  proxima(id: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/isolateus/matches/${id}/proxima`,
      {},
    );
  }
  abrirQuarentena(id: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/isolateus/matches/${id}/quarentena`,
      {},
    );
  }

  // --- Aluno (portal) ---
  partidaAtual(): Observable<IsolateusMatch | null> {
    return this.http.get<IsolateusMatch | null>(`${this.base}/aluno/isolateus`);
  }
  entrar(id: string, pseudonimo: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/aluno/isolateus/${id}/entrar`,
      { pseudonimo },
    );
  }
  /** A Revelação: o papel do aluno (e, só para a Ameaça, a solução verdadeira). */
  painel(id: string): Observable<PainelIsolateus> {
    return this.http.get<PainelIsolateus>(
      `${this.base}/aluno/isolateus/${id}/painel`,
    );
  }
  /** O Turno da Ameaça: sabotar um setor ou abduzir um morador. */
  acao(
    id: string,
    tipo: 'SABOTAR' | 'ABDUZIR',
    alvoId: string,
  ): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/aluno/isolateus/${id}/acao`,
      { tipo, alvoId },
    );
  }
  responder(
    id: string,
    alternativaIndex: number,
  ): Observable<{ registrada: boolean }> {
    return this.http.post<{ registrada: boolean }>(
      `${this.base}/aluno/isolateus/${id}/resposta`,
      { alternativaIndex },
    );
  }
  /** A Sabotagem de Frequência: o rumor falso, sob o nome de um NPC. */
  forjarRumor(id: string, texto: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/aluno/isolateus/${id}/rumor`,
      { texto },
    );
  }
  /** O Sinal Interceptado: a dica anônima de quem já foi levado. */
  sinalDeRadio(id: string, texto: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/aluno/isolateus/${id}/sinal`,
      { texto },
    );
  }
  convocarQuarentena(id: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/aluno/isolateus/${id}/quarentena`,
      {},
    );
  }
  debater(id: string, texto: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/aluno/isolateus/${id}/debate`,
      { texto },
    );
  }
  /** Abre mão do debate: se todos pularem, a votação começa na hora. */
  pularDebate(id: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/aluno/isolateus/${id}/pular-debate`,
      {},
    );
  }
  votarSuspeito(
    id: string,
    suspeitoId: string,
  ): Observable<{ registrado: boolean }> {
    return this.http.post<{ registrado: boolean }>(
      `${this.base}/aluno/isolateus/${id}/suspeito`,
      { suspeitoId },
    );
  }
}
