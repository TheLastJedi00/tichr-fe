import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  CriarIsolateusPayload,
  IsolateusJogo,
  IsolateusMatch,
  PainelIsolateus,
  PoderAlienigena,
  QuestaoIsolateus,
  StatusIsolateus,
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
  }): Observable<{ questoes: QuestaoIsolateus[]; restantes: number }> {
    return this.http.post<{ questoes: QuestaoIsolateus[]; restantes: number }>(
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
  /** Remove um habitante do lobby (entrou na partida errada). Só no LOBBY. */
  removerInscrito(id: string, alunoId: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/isolateus/matches/${id}/remover/${alunoId}`,
      {},
    );
  }
  /**
   * O Despertar: preenche a vila com NPCs e sorteia a Ameaça. As opções do
   * lobby (debate antes da votação) ficam fixas a partir daqui.
   */
  iniciar(
    id: string,
    opcoes: { debateHabilitado: boolean },
  ): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/isolateus/matches/${id}/iniciar`,
      opcoes,
    );
  }
  /** Fecha a fase cronometrada (o telão dispara ao zerar o relógio). */
  tempo(id: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/isolateus/matches/${id}/tempo`,
      {},
    );
  }
  /**
   * O professor pula o tempo restante da fase cronometrada. `status` é a fase
   * que o telão exibia — protege contra pular duas fases num clique atrasado.
   */
  pularFase(id: string, status: StatusIsolateus): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/isolateus/matches/${id}/pular-fase`,
      { status },
    );
  }
  /** @deprecated O telão usa `pularFase`. */
  proxima(id: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/isolateus/matches/${id}/proxima`,
      {},
    );
  }
  /**
   * Encerra a investigação no meio do jogo (o sinal da aula bateu). O veredito
   * sai pelo estado da vila no instante da interrupção.
   */
  encerrar(id: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/isolateus/matches/${id}/encerrar`,
      {},
    );
  }

  // --- Aluno (portal) ---
  partidaAtual(): Observable<IsolateusMatch | null> {
    return this.http.get<IsolateusMatch | null>(`${this.base}/aluno/isolateus`);
  }
  /** O Registro: declara presença. O codinome vem no Despertar. */
  entrar(id: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/aluno/isolateus/${id}/entrar`,
      {},
    );
  }
  /** A Revelação: o papel do aluno (e, só para a Ameaça, a solução verdadeira). */
  painel(id: string): Observable<PainelIsolateus> {
    return this.http.get<PainelIsolateus>(
      `${this.base}/aluno/isolateus/${id}/painel`,
    );
  }
  /**
   * A Ameaça gasta o Poder Alienígena ganho no acerto. `alvoId` só no Controle
   * Mental. Devolve o painel atualizado — o doc público não muda aqui.
   */
  usarPoder(
    id: string,
    poder: PoderAlienigena,
    alvoId?: string,
  ): Observable<PainelIsolateus> {
    return this.http.post<PainelIsolateus>(
      `${this.base}/aluno/isolateus/${id}/poder`,
      { poder, alvoId },
    );
  }
  /** O deslocamento da noite: anda um setor pelas estradas do mapa. */
  mover(id: string, setorId: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/aluno/isolateus/${id}/mover`,
      { setorId },
    );
  }

  /** "Eu fico." Fecha a jogada da noite sem sair do lugar. */
  confirmarPosicao(id: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/aluno/isolateus/${id}/confirmar-posicao`,
      {},
    );
  }

  /** A Reconstrução: organiza o reparo da ruína onde você está. */
  reparo(id: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/aluno/isolateus/${id}/reparo`,
      {},
    );
  }

  /**
   * A jogada da Ameaça.
   *
   * `SABOTAR` não leva alvo (sabota-se onde se está). `ABDUZIR` leva **um** dos
   * dois: `alvoId` (presencial, escolhendo a vítima) ou `setorId` (às cegas,
   * apostando num setor distante).
   */
  acao(
    id: string,
    jogada: {
      tipo: 'SABOTAR' | 'ABDUZIR' | 'AGUARDAR';
      alvoId?: string;
      setorId?: string;
    },
  ): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/aluno/isolateus/${id}/acao`,
      jogada,
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
  /**
   * O celular também cobra o prazo vencido de uma fase. O telão continua sendo o
   * cronômetro principal, mas deixou de ser o único: uma aba dormindo parava a
   * partida inteira.
   */
  tempoAluno(id: string): Observable<IsolateusMatch> {
    return this.http.post<IsolateusMatch>(
      `${this.base}/aluno/isolateus/${id}/tempo`,
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
