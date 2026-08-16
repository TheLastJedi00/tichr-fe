import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { IsolateusApiService } from '../../core/isolateus-api.service';
import { SETOR_COMUNICACAO } from '../../core/isolateus-mapa';
import { RelogioDaFase } from '../../core/isolateus-relogio';
import { IsolateusMatch, PainelIsolateus } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { StudentAuthService } from '../../core/student-auth.service';
import { ThemeService } from '../../core/theme.service';
import { Icon } from '../../ui/icon/icon';
import { LobbyLoader } from '../../ui/lobby-loader/lobby-loader';
import { IsolateusDiario } from '../../ui/isolateus-diario/isolateus-diario';
import { IsolateusEvento } from '../../ui/isolateus-evento/isolateus-evento';
import { IsolateusMapa } from '../../ui/isolateus-mapa/isolateus-mapa';
import { IsolateusSetor } from '../../ui/isolateus-setor/isolateus-setor';
import { IsolateusTransicao } from '../../ui/isolateus-transicao/isolateus-transicao';
import { Spinner } from '../../ui/spinner/spinner';

/** Duração da animação do Despertar (revelação de papéis). */
const REVELACAO_MS = 3000;
/** Janelas cronometradas — espelham as constantes `ISOLATEUS` do backend. */
const LIMITE_DEBATE_S = 90;
const LIMITE_VOTO_S = 60;
const LIMITE_DESLOCAMENTO_S = 60;
const JANELA_DECISAO_S = 15;

/**
 * O celular do habitante. Descobre a investigação da turma sozinho (sonda de 4s,
 * como o Qlick e o Wor), entra com um pseudônimo e passa pelo Despertar.
 *
 * O papel — e, para a Ameaça, a resposta correta — vem do `painel()`, uma rota
 * autenticada. **Nunca** do snapshot: o documento que este componente escuta é
 * cego de propósito, e é isso que impede um aluno com DevTools de descobrir o
 * infiltrado.
 */
@Component({
  selector: 'app-student-isolateus-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Icon,
    Spinner,
    LobbyLoader,
    IsolateusMapa,
    IsolateusSetor,
    IsolateusDiario,
    IsolateusTransicao,
    IsolateusEvento,
  ],
  template: `
    @if (carregando()) {
      <div class="loading"><app-spinner [size]="30" /></div>
    } @else if (partida(); as p) {
      @if (p.status === 'LOBBY') {
        <!-- O Prólogo e o Registro -->
        <section class="dossie">
          <span class="dossie__tag">ARQUIVO: ISOLATEUS</span>
          <p>
            A vila está isolada no extremo norte. Luzes cortaram o céu e uma
            estrutura metálica afundou na floresta. Desde então, moradores
            desaparecem à noite. A ameaça já está aqui — disfarçada entre vocês.
          </p>
        </section>

        @if (inscrito(p)) {
          <div class="espera">
            <app-lobby-loader />
            <strong>Aguardando Comando Central</strong>
            <p class="muted">
              Você está na vila. Seu <b>codinome</b> será revelado quando a
              investigação começar.
            </p>
          </div>
        } @else {
          <div class="registro">
            @if (removido()) {
              <p class="aviso">
                O Comando Central tirou você desta investigação. Se foi engano,
                entre de novo.
              </p>
            }
            <p class="muted">
              Ninguém usa o nome verdadeiro aqui. Ao começar, o Comando Central
              distribui a cada habitante um <b>codinome de cidade</b> — é por ele
              que você será conhecido.
            </p>
            @if (erro()) { <p class="aviso">{{ erro() }}</p> }
            <button class="btn-iso full" type="button" [disabled]="enviando()" (click)="entrar()">
              {{ enviando() ? 'Registrando…' : 'Entrar na vila' }}
            </button>
          </div>
        }
      } @else if (revelando()) {
        <!-- O Despertar -->
        <section class="revelacao" [class.revelacao--ameaca]="ehAmeaca()">
          <app-icon [name]="ehAmeaca() ? 'alien' : 'shield'" [size]="52" />
          <strong>{{ ehAmeaca() ? 'Você é a Ameaça' : 'Você é um Aldeão' }}</strong>
          <p class="revelacao__codinome">
            Nesta vila, você é <b>{{ meuCodinome() }}</b>
          </p>
          <p>
            @if (ehAmeaca()) {
              Sabote os setores, abduza moradores e espalhe desinformação. Não
              deixe que descubram você.
            } @else {
              Deduza quem é a ameaça e vote nas alternativas corretas para salvar
              a vila.
            }
          </p>
        </section>
      } @else {
        <!-- Em jogo. A cinemática acompanha todas as fases, fora do switch. -->
        <app-isolateus-transicao [noite]="ehNoite()" />
        <app-isolateus-evento [acontecimentos]="p.acontecimentos ?? []" />

        <div class="jogo" [class.jogo--hackeada]="foraDaVila()">
          @if (foraDaVila()) {
            <div class="hack">
              <app-icon name="radio" [size]="16" />
              <span>
                TRANSMISSÃO HACKEADA · você foi
                {{ meuHabitante()?.preso ? 'trancado na Quarentena' : 'abduzido' }}.
                Continue respondendo: seus acertos ainda valem XP.
              </span>
            </div>
          }

          @switch (p.status) {
            @case ('DESLOCAMENTO') {
              @if (foraDaVila()) {
                <section class="espera">
                  <app-lobby-loader />
                  <strong>A noite caiu…</strong>
                  <p class="muted">Você já não caminha por essas ruas. Aguarde o alarme.</p>
                </section>
              } @else {
                <div class="noite">
                  <div class="noite__topo">
                    <span class="noite__tit">Noite {{ p.rodada + 1 }}</span>
                    <span class="timer timer--peq" [class.timer--fim]="restante() <= 5">
                      {{ restante() }}s
                    </span>
                  </div>

                  @if (verMapa()) {
                    <app-isolateus-mapa
                      [setores]="p.setores"
                      [meuSetor]="meuSetor(p)"
                      [reparoEm]="p.reparoSetorId ?? null"
                      [podeAndar]="!posicaoFeita()"
                      [noite]="true"
                      (andarPara)="mover($event)"
                    />
                  } @else if (meuSetorObj(p); as s) {
                    <app-isolateus-setor
                      [setor]="s"
                      [habitantes]="p.habitantes"
                      [meuHabitanteId]="painel()?.habitanteId ?? ''"
                      [emReparo]="p.reparoSetorId === s.id"
                      [podeAndar]="!posicaoFeita()"
                      [noite]="true"
                      [abduzindoId]="abduzindoNoMeuSetor(p)"
                      (andarPara)="mover($event)"
                    />
                  }

                  <button class="btn-mapa" type="button" (click)="verMapa.set(!verMapa())">
                    <app-icon name="grip" [size]="14" />
                    {{ verMapa() ? 'Voltar ao meu setor' : 'Ver o mapa da vila' }}
                  </button>

                  @if (posicaoFeita()) {
                    <p class="muted center">
                      Posição fechada. Aguardando a vila…
                      ({{ p.movimentosRecebidos ?? 0 }} já decidiram)
                    </p>
                  } @else {
                    <div class="acoes-noite">
                      <button class="btn-iso" type="button" [disabled]="enviando()" (click)="ficar()">
                        Ficar onde estou
                      </button>
                      @if (podeReparar(p)) {
                        <button class="btn-reparo" type="button" [disabled]="enviando()" (click)="reparar()">
                          <app-icon name="sparkles" [size]="16" /> Organizar o reparo
                        </button>
                      }
                    </div>
                  }
                  <!-- A Ameaça vê o erro dentro do painel dela, enquanto ele existe. -->
                  @if (erro() && (!ehAmeaca() || acaoFeita())) {
                    <p class="aviso">{{ erro() }}</p>
                  }

                  <!--
                    A jogada da Ameaça vive FORA do bloco de deslocamento: ela
                    ataca antes ou depois de andar, na ordem que quiser. Aninhado
                    aqui dentro, o painel sumia assim que ela se deslocava — e o
                    alienígena passava a noite sem jogada.
                  -->
                  @if (ehAmeaca()) {
                    @if (acaoFeita()) {
                      <p class="muted center">
                        Jogada enviada. Ninguém saberá que foi você.
                      </p>
                    } @else {
                      <section class="turno">
                        <h2 class="turno__tit">Sua jogada, Ameaça</h2>
                        @if (!escolhendoSetor()) {
                          <p class="muted">
                            Você age onde está. Ninguém saberá que foi você — mas o
                            que você atingir dirá onde você passou a noite.
                          </p>
                          <div class="alvos">
                            @if (meuSetorObj(p); as s) {
                              @if (s.intacto) {
                                <button class="alvo" type="button" [disabled]="enviando()" (click)="sabotar()">
                                  <app-icon name="rachadura" [size]="16" /> Sabotar {{ s.nome }}
                                </button>
                              }
                            }
                            <button class="alvo alvo--abd" type="button" [disabled]="enviando()" (click)="escolhendoSetor.set(true)">
                              <app-icon name="nave" [size]="16" /> Abduzir
                            </button>
                            <button class="alvo" type="button" [disabled]="enviando()" (click)="aguardar()">
                              <app-icon name="moon" [size]="16" /> Passar a noite
                            </button>
                          </div>
                        } @else {
                          <p class="muted">
                            Escolha um setor para arriscar uma <b>abdução às cegas</b> —
                            você não sabe quem está lá. Ou aja no <b>seu setor</b>, onde
                            você enxerga cada habitante.
                          </p>
                          <app-isolateus-mapa
                            [setores]="p.setores"
                            [meuSetor]="meuSetor(p)"
                            [reparoEm]="null"
                            [noite]="true"
                          />
                          <div class="alvos">
                            @for (s of p.setores; track s.id) {
                              @if (s.id !== meuSetor(p)) {
                                <button class="alvo alvo--abd" type="button" [disabled]="enviando()" (click)="abduzirAsCegas(s.id)">
                                  <app-icon name="nave" [size]="14" /> {{ s.nome }}
                                </button>
                              }
                            }
                          </div>
                          <span class="grupo__lbl">No seu setor, você escolhe a vítima</span>
                          <div class="alvos">
                            @for (h of vizinhosDeSetor(p); track h.id) {
                              <button class="alvo" type="button" [disabled]="enviando()" (click)="abduzirAqui(h.id)">
                                <app-icon name="user" [size]="14" /> {{ h.nome }}
                              </button>
                            } @empty {
                              <span class="muted">Ninguém ao seu alcance esta noite.</span>
                            }
                          </div>
                          <button class="btn-mapa" type="button" (click)="escolhendoSetor.set(false)">
                            Voltar
                          </button>
                        }
                        @if (erro()) { <p class="aviso">{{ erro() }}</p> }
                      </section>
                    }
                  }
                </div>
              }
            }

            @case ('QUESTAO_ATIVA') {

              @if (p.alerta; as a) {
                <div class="alerta"><app-icon name="alert" [size]="16" /> {{ a.texto }}</div>
              }

              @if (p.questaoPublica; as q) {
                <div class="timer" [class.timer--fim]="restante() <= 10">{{ restante() }}s</div>
                <h2 class="enunciado">{{ q.enunciado }}</h2>

                @if (ehAmeaca()) {
                  <p class="sabe">
                    Você sabe: a correta é a
                    <b>{{ letra(painel()!.corretaIndex ?? 0) }}</b>. Induza a vila ao erro.
                  </p>
                }

                <div class="opts">
                  @for (alt of q.alternativas; track $index) {
                    <button
                      class="opt"
                      [class.opt--sel]="respostaIndex() === $index"
                      type="button"
                      [disabled]="respostaIndex() !== null"
                      (click)="responder($index)"
                    >
                      <span class="opt__l">{{ letra($index) }}</span> {{ alt }}
                    </button>
                  }
                </div>
                @if (respostaIndex() !== null) {
                  <p class="muted center">Voto registrado. Aguardando a vila…</p>
                }
              }

              <!-- O Chat de Rumores -->
              <div class="feed">
                <span class="feed__tit">Rumores</span>
                @for (r of p.rumores; track r.id) {
                  <p class="rumor" [class.rumor--sinal]="r.tipo === 'SINAL'">
                    <strong>{{ r.tipo === 'SINAL' ? '[ Sinal de Rádio ]' : r.autorNome }}</strong>
                    {{ r.texto }}
                  </p>
                } @empty {
                  <p class="muted">Silêncio absoluto…</p>
                }
              </div>

              @if (ehAmeaca() && !rumorEnviado(p)) {
                <form class="composer" (submit)="forjar($event)">
                  <span class="composer__lbl">Interceptar a comunicação (1× por noite)</span>
                  <textarea
                    class="tichr-input"
                    rows="2"
                    maxlength="240"
                    [value]="rumorTexto()"
                    (input)="rumorTexto.set($any($event.target).value)"
                    placeholder="Defenda uma alternativa errada de forma convincente…"
                  ></textarea>
                  <button class="btn-iso" type="submit" [disabled]="enviando() || !rumorTexto().trim()">
                    Transmitir sob nome alheio
                  </button>
                </form>
              }

              @if (foraDaVila()) {
                <form class="composer" (submit)="sinal($event)">
                  <span class="composer__lbl">Sinal de Rádio (anônimo)</span>
                  <textarea
                    class="tichr-input"
                    rows="2"
                    maxlength="240"
                    [value]="sinalTexto()"
                    (input)="sinalTexto.set($any($event.target).value)"
                    placeholder="Tente guiar os sobreviventes contra as mentiras…"
                  ></textarea>
                  <button class="btn-iso" type="submit" [disabled]="enviando() || !sinalTexto().trim()">
                    Enviar sinal
                  </button>
                </form>
              }
            }

            @case ('RESULTADO_RODADA') {
              <!--
                A janela de decisão precisa de relógio aqui também: sem ele o
                aluno via um card parado, sem saber que a noite ia cair sozinha
                nem quando. E ela cai por conta própria — o avanço não espera
                mais o clique do professor.
              -->
              <div class="janela">
                <span class="janela__lbl">A noite cai em</span>
                <span class="timer timer--peq" [class.timer--fim]="restante() <= 5">
                  {{ restante() }}s
                </span>
              </div>

              @if (p.vereditoQuarentena; as v) {
                <div class="card-global" [class.card-global--ok]="v.eraAmeaca">{{ v.texto }}</div>
              }
              @if (p.resumoRodada; as r) {
                <div class="card-global" [class.card-global--ok]="r.defendida">{{ r.texto }}</div>
              }

              <!--
                O mapa continua na tela durante a janela de decisão: é aqui que a
                abdução se materializa (a nave desce para quem está no setor) e é
                olhando as ruínas que a vila decide para onde marchar na próxima
                noite.
              -->
              @if (!foraDaVila() && meuSetorObj(p); as s) {
                <app-isolateus-setor
                  [setor]="s"
                  [habitantes]="p.habitantes"
                  [meuHabitanteId]="painel()?.habitanteId ?? ''"
                  [emReparo]="false"
                  [podeAndar]="false"
                  [abduzindoId]="abduzindoNoMeuSetor(p)"
                />
                <button class="btn-mapa" type="button" (click)="verMapa.set(!verMapa())">
                  <app-icon name="grip" [size]="14" />
                  {{ verMapa() ? 'Esconder o mapa' : 'Ver o mapa da vila' }}
                </button>
                @if (verMapa()) {
                  <app-isolateus-mapa
                    [setores]="p.setores"
                    [meuSetor]="meuSetor(p)"
                    [reparoEm]="null"
                  />
                }
              }
              @if (p.questaoPublica && p.corretaIndex !== null && p.corretaIndex !== undefined) {
                <p class="muted center">
                  Resposta correta:
                  <b>{{ letra(p.corretaIndex) }}) {{ p.questaoPublica.alternativas[p.corretaIndex] }}</b>
                </p>
              }
              <!--
                O botão só existe para quem o servidor vai aceitar: vivo, na
                vila, no Setor de Comunicação e com o rádio de pé. Antes ele
                aparecia para todos e devolvia 403 — e escondia a regra que faz
                da Comunicação o setor mais valioso do mapa.
              -->
              @if (podeConvocar() && !foraDaVila()) {
                @if (impedimentoQuarentena(p); as motivo) {
                  <p class="muted center">{{ motivo }}</p>
                } @else {
                  <button class="btn-quarentena" type="button" [disabled]="enviando()" (click)="convocar()">
                    <app-icon name="alert" [size]="16" /> Convocar Quarentena
                  </button>
                  <p class="muted center">
                    Cabe <b>uma Quarentena por rodada</b>. Prender um inocente
                    custa caro.
                  </p>
                }
              }
              @if (erro()) { <p class="aviso">{{ erro() }}</p> }
            }

            @case ('QUARENTENA_DEBATE') {
              <div class="qtag">Quarentena · Debate</div>
              <div class="timer" [class.timer--fim]="restante() <= 10">{{ restante() }}s</div>
              <div class="feed feed--alto">
                @for (m of p.debate; track m.id) {
                  <p class="rumor"><strong>{{ m.autorNome }}</strong> {{ m.texto }}</p>
                }
              </div>
              @if (!foraDaVila()) {
                <form class="composer" (submit)="debater($event)">
                  <textarea
                    class="tichr-input"
                    rows="2"
                    maxlength="240"
                    [value]="debateTexto()"
                    (input)="debateTexto.set($any($event.target).value)"
                    placeholder="Acuse, defenda-se, aponte quem concordou com o rumor…"
                  ></textarea>
                  <button class="btn-iso" type="submit" [disabled]="enviando() || !debateTexto().trim()">
                    Falar
                  </button>
                </form>
                @if (jaPulei()) {
                  <p class="muted center">
                    Você já está pronto. Aguardando os outros
                    ({{ p.pulosRecebidos ?? 0 }} pularam).
                  </p>
                } @else {
                  <button class="btn-pular" type="button" [disabled]="enviando()" (click)="pular()">
                    Pular o debate
                  </button>
                  <p class="muted center">
                    Se todos pularem, a votação começa na hora.
                    {{ p.pulosRecebidos ?? 0 }} já pularam.
                  </p>
                }
              } @else {
                <p class="muted center">Quem saiu da vila não participa do debate.</p>
              }
            }

            @case ('QUARENTENA_VOTO') {
              <div class="qtag">Quarentena · Veredito</div>
              <div class="timer" [class.timer--fim]="restante() <= 10">{{ restante() }}s</div>
              @if (foraDaVila()) {
                <p class="muted center">Quem saiu da vila não vota.</p>
              } @else if (votei()) {
                <p class="muted center">Voto depositado. Aguardando os outros habitantes…</p>
              } @else {
                <p class="muted center">Toque no habitante que deve ser isolado.</p>
                <div class="suspeitos">
                  @for (h of vivos(p); track h.id) {
                    <button class="suspeito" type="button" [disabled]="enviando()" (click)="votar(h.id)">
                      <app-icon name="user" [size]="16" />
                      {{ h.nome }}
                      @if (h.id === painel()?.habitanteId) { <span class="eu">você</span> }
                    </button>
                  }
                </div>
              }
            }

            @case ('ENCERRADO') {
              @if (p.veredito; as v) {
                <div class="fim" [class.fim--ganhei]="ganhei(v.lado)">
                  <app-icon [name]="v.lado === 'VILA' ? 'trophy' : 'alien'" [size]="34" />
                  <strong>{{ ganhei(v.lado) ? 'Você venceu!' : 'Você perdeu.' }}</strong>
                  <p>{{ v.motivo }}</p>
                </div>
              }
              @if (minhaPosicao(p); as eu) {
                <p class="lead center">
                  Você terminou em {{ eu.posicao }}º com <b>{{ eu.pontos }}</b> pontos,
                  somados ao seu XP do portal.
                </p>
              }
              <a class="btn-outline full sair" routerLink="/aluno/dashboard">Voltar ao início</a>
            }

            @default {
              <p class="lead">Aguardando o Comando Central…</p>
            }
          }

          <!-- O Diário acompanha a partida inteira, em qualquer fase. -->
          @if (p.acontecimentos?.length) {
            <app-isolateus-diario class="diario" [acontecimentos]="p.acontecimentos" />
          }
        </div>
      }
    } @else {
      <section class="vazio">
        <app-icon name="alien" [size]="40" />
        <h1>Nenhuma investigação agora</h1>
        <p class="muted">Quando o professor abrir a vila, ela aparece aqui.</p>
        <a class="btn-outline" routerLink="/aluno/dashboard">Voltar ao início</a>
      </section>
    }
  `,
  styles: `
    :host { display: block; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: #4d7c0f; }
    .lead { font-weight: 700; }
    .muted { color: var(--text-muted); font-size: 0.9rem; }
    .dossie { padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--border); border-left: 4px solid #84cc16; border-radius: 14px; background: var(--surface); }
    .dossie__tag { display: block; margin-bottom: 0.4rem; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.18em; color: #4d7c0f; }
    .dossie p { margin: 0; color: var(--text-muted); line-height: 1.55; font-size: 0.92rem; }
    .espera { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem 1rem; text-align: center; }
    .espera strong { font-size: 1.1rem; }
    .registro { display: flex; flex-direction: column; gap: 0.5rem; }
    .campo > span { display: block; margin-bottom: 0.375rem; font-size: 0.85rem; font-weight: 700; color: var(--text-muted); }
    .aviso { margin: 0; color: var(--danger); font-weight: 600; font-size: 0.9rem; }
    .btn-iso { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.9rem 1.2rem; border: none; border-radius: 12px; cursor: pointer; font: inherit; font-weight: 800; color: #fff; background: linear-gradient(135deg, #84cc16, #4d7c0f); }
    .btn-iso:disabled { opacity: 0.55; cursor: not-allowed; }
    .full { width: 100%; margin-top: 0.5rem; }
    .revelacao {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.75rem; min-height: 60vh; text-align: center; border-radius: 18px; padding: 2rem 1.25rem;
      color: #fff; background: #2563eb; animation: pulsar 1.2s ease-in-out infinite;
    }
    .revelacao--ameaca { background: #4d7c0f; }
    .revelacao strong { font-size: 1.6rem; font-weight: 900; }
    .revelacao p { margin: 0; max-width: 22rem; opacity: 0.95; line-height: 1.5; }
    /* O codinome é a segunda informação mais importante da tela, depois do papel. */
    .revelacao__codinome {
      font-size: 1.05rem;
      opacity: 1 !important;
      border-top: 2px solid rgba(255, 255, 255, 0.35);
      border-bottom: 2px solid rgba(255, 255, 255, 0.35);
      padding: 0.5rem 1.25rem;
    }
    .revelacao__codinome b { font-weight: 900; letter-spacing: 0.02em; }

    /* --- A Noite --- */
    .noite { display: flex; flex-direction: column; gap: 0.7rem; }
    .noite__topo { display: flex; align-items: center; justify-content: space-between; }
    .noite__tit {
      font-size: 0.75rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.75;
    }
    .timer--peq { font-size: 1rem; padding: 0.1rem 0.5rem; }

    .btn-mapa {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      padding: 0.45rem;
      font: inherit;
      font-size: 0.75rem;
      font-weight: 800;
      color: inherit;
      background: none;
      border: 2px dashed var(--border, #cbd5e1);
      cursor: pointer;
    }

    .acoes-noite { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .acoes-noite > * { flex: 1; }

    /* O reparo é a única ação de ganho do jogo: âmbar, não verde tóxico. */
    .btn-reparo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      padding: 0.6rem;
      font: inherit;
      font-weight: 800;
      color: #7c2d12;
      background: #fbbf24;
      border: 2px solid #b45309;
      box-shadow: 3px 3px 0 #b45309;
      cursor: pointer;
    }
    .btn-reparo:disabled { opacity: 0.6; cursor: not-allowed; }

    .diario { margin-top: 0.8rem; }
    @keyframes pulsar { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
    @media (prefers-reduced-motion: reduce) { .revelacao { animation: none; } }
    .vazio { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 3rem 1rem; text-align: center; color: #4d7c0f; }
    .vazio h1 { margin: 0; font-size: 1.2rem; color: var(--text); }
    .vazio .btn-outline { text-decoration: none; margin-top: 0.5rem; }
    /* Em jogo */
    .jogo { display: flex; flex-direction: column; gap: 0.85rem; }
    /* O Pós-Vida: a interface do abduzido vira um terminal hackeado. */
    .jogo--hackeada { padding: 0.75rem; border: 1px solid #4d7c0f; border-radius: 14px; background: color-mix(in srgb, #84cc16 6%, var(--surface)); }
    .hack { display: flex; align-items: center; gap: 0.45rem; padding: 0.5rem 0.7rem; border-radius: 10px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; color: #1a2e05; background: #84cc16; }
    .turno { display: flex; flex-direction: column; gap: 0.5rem; }
    .turno__tit { margin: 0; font-size: 1.2rem; font-weight: 900; color: #4d7c0f; }
    .grupo__lbl { margin-top: 0.4rem; font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    .alvos { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .alvo { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.55rem 0.8rem; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); font: inherit; font-weight: 700; font-size: 0.85rem; color: var(--text); cursor: pointer; }
    .alvo:hover:not(:disabled) { border-color: #84cc16; color: #4d7c0f; }
    .alvo--abd:hover:not(:disabled) { border-color: var(--danger); color: var(--danger); }
    .alvo:disabled { opacity: 0.55; cursor: not-allowed; }
    .alerta { display: flex; align-items: center; gap: 0.45rem; padding: 0.7rem 0.9rem; border-radius: 10px; font-weight: 800; font-size: 0.9rem; color: #fff; background: var(--danger); }
    .timer { align-self: center; font-size: 1.75rem; font-weight: 900; color: #4d7c0f; }
    .timer--fim { color: var(--danger); }
    /* A contagem da janela de decisão: a noite cai sozinha ao fim dela. */
    .janela { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .janela__lbl { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.75; }
    .enunciado { margin: 0; font-size: 1.15rem; font-weight: 800; text-align: center; }
    .sabe { margin: 0; padding: 0.5rem 0.75rem; border-radius: 10px; font-size: 0.85rem; text-align: center; color: #1a2e05; background: color-mix(in srgb, #84cc16 35%, transparent); }
    .opts { display: grid; grid-template-columns: 1fr; gap: 0.5rem; }
    .opt { display: flex; align-items: center; gap: 0.6rem; padding: 0.9rem 1rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); font: inherit; font-weight: 600; text-align: left; color: var(--text); cursor: pointer; }
    .opt:disabled { opacity: 0.6; cursor: not-allowed; }
    .opt--sel { border-color: #4d7c0f; background: color-mix(in srgb, #84cc16 16%, var(--surface)); opacity: 1; }
    .opt__l { display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 26px; border-radius: 8px; font-weight: 800; color: #fff; background: #4d7c0f; }
    .feed { display: flex; flex-direction: column; gap: 0.35rem; max-height: 190px; overflow-y: auto; padding: 0.7rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-alt); }
    .feed__tit { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
    .rumor { margin: 0; font-size: 0.86rem; line-height: 1.45; }
    .rumor strong { color: var(--text-muted); margin-right: 0.3rem; }
    .rumor--sinal { color: #4d7c0f; font-weight: 600; }
    .rumor--sinal strong { color: #4d7c0f; }
    .composer { display: flex; flex-direction: column; gap: 0.4rem; }
    .composer__lbl { font-size: 0.78rem; font-weight: 800; color: var(--text-muted); }
    .composer textarea { resize: vertical; font: inherit; }
    .center { text-align: center; }
    /* Quarentena */
    .card-global { padding: 0.9rem; border-radius: 12px; font-weight: 800; font-size: 0.95rem; text-align: center; color: #fff; background: var(--danger); }
    .card-global--ok { background: var(--success); }
    .btn-quarentena { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; width: 100%; padding: 0.9rem 1.2rem; border: none; border-radius: 12px; cursor: pointer; font: inherit; font-weight: 800; color: #fff; background: var(--danger); }
    .btn-quarentena:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-pular { width: 100%; padding: 0.7rem 1.2rem; border: 1px solid var(--border); border-radius: 12px; cursor: pointer; font: inherit; font-weight: 700; color: var(--text-muted); background: var(--surface); }
    .btn-pular:hover:not(:disabled) { border-color: var(--danger); color: var(--danger); }
    .btn-pular:disabled { opacity: 0.55; cursor: not-allowed; }
    .qtag { align-self: center; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--danger); }
    .feed--alto { max-height: 260px; }
    .suspeitos { display: flex; flex-direction: column; gap: 0.5rem; }
    .suspeito { display: flex; align-items: center; gap: 0.5rem; padding: 0.85rem 1rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); font: inherit; font-weight: 700; text-align: left; color: var(--text); cursor: pointer; }
    .suspeito:hover:not(:disabled) { border-color: var(--danger); color: var(--danger); }
    .eu { margin-left: auto; font-size: 0.72rem; font-weight: 700; color: var(--text-muted); }
    .fim { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem 1.25rem; border-radius: 16px; text-align: center; color: #fff; background: linear-gradient(135deg, #64748b, #334155); }
    .fim--ganhei { background: linear-gradient(135deg, #84cc16, #4d7c0f); }
    .fim strong { font-size: 1.35rem; font-weight: 900; }
    .fim p { margin: 0; opacity: 0.95; line-height: 1.5; }
    .sair { display: block; text-align: center; text-decoration: none; margin-top: 0.5rem; }
  `,
})
export class StudentIsolateusPage {
  private readonly api = inject(IsolateusApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly studentAuth = inject(StudentAuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tema = inject(ThemeService);

  private readonly meuId = this.studentAuth.aluno()?.id ?? '';

  protected readonly partida = signal<IsolateusMatch | null>(null);
  protected readonly painel = signal<PainelIsolateus | null>(null);
  protected readonly carregando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly erro = signal('');
  /** O professor removeu o aluno: ele some dos inscritos e volta ao registro. */
  protected readonly removido = signal(false);

  /** Alterna entre a visão do próprio setor e o mapa da vila (zoom-out). */
  protected readonly verMapa = signal(false);
  /** A Ameaça abriu o overview para escolher onde abduzir. */
  protected readonly escolhendoSetor = signal(false);
  /**
   * As **duas** decisões da noite, contadas separado.
   *
   * `posicaoFeita` é "onde eu passo a noite" (mover, ficar, reparar) e vale para
   * todo mundo; `acaoFeita` é a jogada da Ameaça (sabotar, abduzir, aguardar).
   * Eram um booleano só — e, como o deslocamento é a primeira coisa na tela, o
   * alienígena andava e o painel de ataque sumia antes de ele poder usá-lo: ele
   * ficava com uma das duas jogadas, nunca as duas.
   */
  protected readonly posicaoFeita = signal(false);
  protected readonly acaoFeita = signal(false);
  /** Habitante sendo levado agora — dispara a nave no setor onde ele está. */
  protected readonly abduzindoId = signal<string | null>(null);

  /** É noite? Governa a cinemática e a paleta escura do mapa. */
  protected readonly ehNoite = computed(() =>
    this.partida()?.status === 'DESLOCAMENTO',
  );
  protected readonly revelando = signal(false);

  protected readonly ehAmeaca = computed(
    () => this.painel()?.papel === 'AMEACA',
  );

  /** Voto otimista na questão (trava a UI na hora, como no Qlick). */
  protected readonly respostaIndex = signal<number | null>(null);
  protected readonly rumorTexto = signal('');
  protected readonly sinalTexto = signal('');
  protected readonly debateTexto = signal('');
  protected readonly votei = signal(false);
  /** Pulei o debate desta Quarentena (otimista — o servidor é o juiz). */
  protected readonly jaPulei = signal(false);
  private readonly relogio = signal(Date.now());

  /** A Quarentena volta a cada noite, mas só cabe uma por rodada. */
  protected readonly podeConvocar = computed(() => {
    const p = this.partida();
    return !!p && p.quarentenaRodada !== p.rodada;
  });

  /**
   * O meu habitante, lido do snapshot — é assim que eu descubro que fui abduzido
   * ou preso, sem o servidor precisar me avisar.
   */
  protected readonly meuHabitante = computed(() => {
    const id = this.painel()?.habitanteId;
    return this.partida()?.habitantes.find((h) => h.id === id) ?? null;
  });

  protected readonly foraDaVila = computed(() => {
    const h = this.meuHabitante();
    return !!h && (!h.vivo || h.preso);
  });

  /**
   * Segundos restantes da fase cronometrada (questão, debate ou votação). Os
   * limites da Quarentena espelham as constantes `ISOLATEUS` do backend.
   */
  protected readonly restante = computed(() => {
    const p = this.partida();
    if (!p || !p.faseIniciadaEm) return 0;
    const limite = this.limiteDaFase();
    if (!limite) return 0;
    const fim = Date.parse(p.faseIniciadaEm) + limite * 1000;
    const s = Math.ceil((fim - this.cronometro.agora(this.relogio())) / 1000);
    return Math.max(0, Math.min(limite, s));
  });

  /** Duração da fase corrente, em segundos. `0` = fase sem relógio. */
  private limiteDaFase(): number {
    const p = this.partida();
    if (!p) return 0;
    if (p.status === 'QUESTAO_ATIVA') return p.duracaoSegundos;
    if (p.status === 'DESLOCAMENTO') return LIMITE_DESLOCAMENTO_S;
    if (p.status === 'RESULTADO_RODADA') return JANELA_DECISAO_S;
    if (p.status === 'QUARENTENA_DEBATE') return LIMITE_DEBATE_S;
    if (p.status === 'QUARENTENA_VOTO') return LIMITE_VOTO_S;
    return 0;
  }

  private partidaId: string | null = null;
  private jaEntrei = false;
  private ultimaRodada = -1;
  private readonly cronometro = new RelogioDaFase();

  constructor() {
    this.buscar();
    // Sonda até a investigação aparecer (mesmo padrão do Qlick e do Wor).
    const sonda = setInterval(() => {
      if (!this.partida()) this.buscar();
    }, 4000);
    const tick = setInterval(() => {
      this.relogio.set(Date.now());
      this.checarTempo();
    }, 500);
    this.destroyRef.onDestroy(() => {
      clearInterval(sonda);
      clearInterval(tick);
      // A noite é do jogo, não do app: sair da partida não pode deixar o painel
      // do aluno escuro para sempre.
      this.tema.restaurarPreferencia();
    });
  }

  /**
   * O celular também cobra o prazo vencido — o telão deixou de ser o único
   * cronômetro da partida.
   *
   * Enquanto só o projetor podia, a aula parava se a aba dele dormisse, caísse a
   * rede no segundo do vencimento ou o relógio da máquina estivesse adiantado (o
   * servidor responde "ainda não" e o disparo, único, se perdia). Aqui a
   * cobrança é repetida e sai com um atraso sorteado, para a turma inteira não
   * bater no mesmo instante.
   */
  private checarTempo(): void {
    const p = this.partida();
    this.cronometro.sincronizar(p?.faseIniciadaEm ?? null);
    if (!p || !this.partidaId || !p.faseIniciadaEm) return;
    if (!this.limiteDaFase()) return;
    if (!this.cronometro.devoCobrar(Date.now(), this.restante() <= 0)) return;
    this.api
      .tempoAluno(this.partidaId)
      .subscribe({ next: () => {}, error: () => {} });
  }

  protected letra(i: number): string {
    return ['A', 'B', 'C', 'D', 'E', 'F'][i] ?? '?';
  }

  protected vivos(p: IsolateusMatch) {
    return p.habitantes.filter((h) => h.vivo && !h.preso);
  }

  /**
   * Quem sumiu da vila entre um snapshot e o outro. É o gatilho da nave.
   *
   * Compara `vivo` em vez de escutar um evento porque o diário é intencionalmente
   * ambíguo: o texto de "repelida" cobre também o tiro às cegas no vazio, então
   * ele não serve para saber se **alguém de fato** foi levado. O estado dos
   * habitantes serve.
   */
  private detectarAbducao(
    antes: IsolateusMatch | null,
    agora: IsolateusMatch,
  ): void {
    if (!antes) return;
    const eraVivo = new Map(antes.habitantes.map((h) => [h.id, h.vivo]));
    const levado = agora.habitantes.find(
      (h) => !h.vivo && eraVivo.get(h.id) === true,
    );
    if (!levado) return;

    this.abduzindoId.set(levado.id);
    // A cena dura ~2,4s; depois o avatar simplesmente não está mais na fileira.
    setTimeout(() => this.abduzindoId.set(null), 2600);
  }

  /**
   * O id de quem está sendo levado, **só se ele estiver no meu setor**.
   *
   * Fora dele, o jogador recebe apenas o card e a linha no diário: você vê o que
   * acontece perto de você; o resto você lê no rádio.
   */
  protected abduzindoNoMeuSetor(p: IsolateusMatch): string | null {
    const id = this.abduzindoId();
    if (!id) return null;
    const alvo = p.habitantes.find((h) => h.id === id);
    return alvo && alvo.setorId === this.meuSetor(p) ? id : null;
  }

  // --- A Noite ---

  /** Onde eu estou. Vazio antes do Despertar (ou se já saí da vila). */
  protected meuSetor(p: IsolateusMatch): string {
    return this.meuHabitante()?.setorId ?? '';
  }

  protected meuSetorObj(p: IsolateusMatch) {
    return p.setores.find((s) => s.id === this.meuSetor(p));
  }

  /** Os habitantes do meu setor, exceto eu — os alvos de abdução presencial. */
  protected vizinhosDeSetor(p: IsolateusMatch) {
    const meu = this.meuSetor(p);
    const eu = this.painel()?.habitanteId;
    return this.vivos(p).filter((h) => h.setorId === meu && h.id !== eu);
  }

  /**
   * Por que **eu** não posso convocar a Quarentena agora — ou `null` se posso.
   *
   * Espelha as recusas do servidor (`FORA_DA_COMUNICACAO`,
   * `COMUNICACAO_EM_RUINAS`) e as explica: a regra é parte do jogo, e apenas
   * esconder o botão deixaria a vila sem entender por que o rádio calou.
   */
  protected impedimentoQuarentena(p: IsolateusMatch): string | null {
    if (this.meuSetor(p) !== SETOR_COMUNICACAO) {
      return 'O rádio da vila fica no Setor de Comunicação. É de lá que se convoca a Quarentena.';
    }
    const radio = p.setores.find((s) => s.id === SETOR_COMUNICACAO);
    if (!radio?.intacto) {
      return 'O Setor de Comunicação está em ruínas. Reconstrua o rádio para convocar a Quarentena.';
    }
    return null;
  }

  /** O botão de reparo só existe dentro de uma ruína ainda não mobilizada. */
  protected podeReparar(p: IsolateusMatch): boolean {
    const s = this.meuSetorObj(p);
    return !!s && !s.intacto && !p.reparoSetorId;
  }

  protected mover(setorId: string): void {
    this.acaoDaNoite((id) => this.api.mover(id, setorId));
  }
  protected ficar(): void {
    this.acaoDaNoite((id) => this.api.confirmarPosicao(id));
  }
  protected reparar(): void {
    this.acaoDaNoite((id) => this.api.reparo(id));
  }
  protected sabotar(): void {
    this.acaoDaNoite((id) => this.api.acao(id, { tipo: 'SABOTAR' }), 'acao');
  }
  protected aguardar(): void {
    this.acaoDaNoite((id) => this.api.acao(id, { tipo: 'AGUARDAR' }), 'acao');
  }
  protected abduzirAqui(alvoId: string): void {
    this.acaoDaNoite(
      (id) => this.api.acao(id, { tipo: 'ABDUZIR', alvoId }),
      'acao',
    );
  }
  protected abduzirAsCegas(setorId: string): void {
    this.acaoDaNoite(
      (id) => this.api.acao(id, { tipo: 'ABDUZIR', setorId }),
      'acao',
    );
  }

  /**
   * Toda ação da noite fecha a decisão correspondente localmente na hora
   * (otimista, como o voto do Qlick): o snapshot só devolve a **contagem**, nunca
   * quem confirmou, então nem daria para o próprio cliente descobrir pelo
   * servidor que já jogou.
   *
   * `qual` importa porque a noite tem **duas** decisões independentes: onde eu
   * estou e — só para a Ameaça — o que eu faço. Um booleano só para as duas
   * apagava o painel de ataque assim que ela se deslocava, e o alienígena ficava
   * sem jogada a noite inteira.
   */
  private acaoDaNoite(
    chamada: (partidaId: string) => Observable<IsolateusMatch>,
    qual: 'posicao' | 'acao' = 'posicao',
  ): void {
    if (!this.partidaId || this.enviando()) return;
    this.enviando.set(true);
    this.erro.set('');
    chamada(this.partidaId).subscribe({
      next: () => {
        this.enviando.set(false);
        this.fecharDecisao(qual);
        this.escolhendoSetor.set(false);
        this.verMapa.set(false);
      },
      error: (e: { error?: { message?: string; code?: string } }) => {
        this.enviando.set(false);
        // A jogada já estava registrada no servidor (recarreguei a página, cliquei
        // duas vezes): reconciliar em vez de insistir num botão que não vale mais.
        if (e.error?.code === 'JOGADA_FEITA') {
          this.fecharDecisao(qual);
          return;
        }
        this.erro.set(e.error?.message ?? 'Não foi possível fazer isso agora.');
      },
    });
  }

  private fecharDecisao(qual: 'posicao' | 'acao'): void {
    if (qual === 'acao') this.acaoFeita.set(true);
    else this.posicaoFeita.set(true);
  }

  /** A Ameaça só intercepta a comunicação uma vez por noite. */
  protected rumorEnviado(p: IsolateusMatch): boolean {
    return p.rumores.some((r) => r.tipo === 'FORJADO');
  }

  private buscar(): void {
    this.api.partidaAtual().subscribe({
      next: (p) => {
        this.carregando.set(false);
        if (p && p.id !== this.partidaId) {
          this.partidaId = p.id;
          this.partida.set(p);
          this.escutar(p.id);
        } else if (!p) {
          this.partida.set(null);
        }
      },
      error: () => this.carregando.set(false),
    });
  }

  private escutar(partidaId: string): void {
    this.realtime
      .escutarIsolateus(partidaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          if (!p) return;
          this.reagir(p);
          this.partida.set(p);
        },
        error: () => {},
      });
  }

  /** Reage às transições de estado que exigem buscar o painel (o segredo). */
  private reagir(p: IsolateusMatch): void {
    const anterior = this.partida();
    this.detectarAbducao(anterior, p);

    // Removido no lobby: eu estava inscrito e sumi da lista.
    if (p.status === 'LOBBY' && this.jaEntrei && !this.inscrito(p)) {
      this.jaEntrei = false;
      this.removido.set(true);
    }

    // O Despertar: a partida saiu do lobby → busca o papel e roda a animação.
    const saiuDoLobby = anterior?.status === 'LOBBY' && p.status !== 'LOBBY';
    if (saiuDoLobby || (p.status !== 'LOBBY' && !this.painel())) {
      this.carregarPainel(saiuDoLobby);
      return;
    }

    // Nova noite: libera o voto e os composers, e rebusca a correta da Ameaça
    // (a resposta muda a cada questão, e ela vive só no painel autenticado).
    if (p.rodada !== this.ultimaRodada) {
      this.ultimaRodada = p.rodada;
      this.respostaIndex.set(null);
      this.rumorTexto.set('');
      this.sinalTexto.set('');
      // Cabe uma Quarentena por rodada: a noite nova rearma o voto e o pulo.
      this.votei.set(false);
      this.abduzindoId.set(null);
      this.jaPulei.set(false);
      // E as duas decisões da noite voltam a ficar em aberto.
      this.posicaoFeita.set(false);
      this.acaoFeita.set(false);
      this.escolhendoSetor.set(false);
      this.verMapa.set(false);
      if (this.ehAmeaca()) this.carregarPainel(false);
    }
  }

  /**
   * Busca o papel do aluno. Só a Ameaça recebe a resposta correta e os disfarces
   * — o Aldeão não recebe nada sobre os outros, então nem uma inspeção do
   * payload lhe dá vantagem.
   */
  private carregarPainel(comRevelacao: boolean): void {
    if (!this.partidaId) return;
    this.api.painel(this.partidaId).subscribe({
      next: (pnl) => {
        this.painel.set(pnl);
        if (comRevelacao) {
          this.revelando.set(true);
          setTimeout(() => this.revelando.set(false), REVELACAO_MS);
        }
      },
      error: () => {},
    });
  }

  protected inscrito(p: IsolateusMatch): boolean {
    return p.inscritos.some((i) => i.alunoId === this.meuId);
  }

  /** O codinome de cidade sorteado para mim no Despertar. */
  protected meuCodinome(): string {
    return this.meuHabitante()?.nome ?? '—';
  }

  protected entrar(): void {
    if (!this.partidaId || this.enviando()) return;
    this.enviando.set(true);
    this.erro.set('');
    this.api.entrar(this.partidaId).subscribe({
      next: () => {
        this.enviando.set(false);
        this.jaEntrei = true;
        this.removido.set(false);
      },
      error: (e: { error?: { message?: string } }) => {
        this.enviando.set(false);
        this.erro.set(
          e.error?.message ?? 'Não foi possível entrar na vila.',
        );
      },
    });
  }

  // --- Em jogo ---

  /**
   * A Defesa. Otimista: trava a UI na hora e libera de volta se o servidor
   * recusar — o mesmo comportamento do Qlick.
   */
  protected responder(index: number): void {
    if (!this.partidaId || this.respostaIndex() !== null) return;
    this.respostaIndex.set(index);
    this.api.responder(this.partidaId, index).subscribe({
      error: () => this.respostaIndex.set(null),
    });
  }

  protected forjar(ev: Event): void {
    ev.preventDefault();
    const texto = this.rumorTexto().trim();
    if (!this.partidaId || !texto || this.enviando()) return;
    this.enviando.set(true);
    this.api.forjarRumor(this.partidaId, texto).subscribe({
      next: () => {
        this.enviando.set(false);
        this.rumorTexto.set('');
      },
      error: () => this.enviando.set(false),
    });
  }

  protected sinal(ev: Event): void {
    ev.preventDefault();
    const texto = this.sinalTexto().trim();
    if (!this.partidaId || !texto || this.enviando()) return;
    this.enviando.set(true);
    this.api.sinalDeRadio(this.partidaId, texto).subscribe({
      next: () => {
        this.enviando.set(false);
        this.sinalTexto.set('');
      },
      error: () => this.enviando.set(false),
    });
  }

  // --- A Quarentena ---

  protected convocar(): void {
    if (!this.partidaId || this.enviando()) return;
    this.enviando.set(true);
    this.erro.set('');
    this.api.convocarQuarentena(this.partidaId).subscribe({
      next: () => this.enviando.set(false),
      error: (e: { error?: { message?: string } }) => {
        this.enviando.set(false);
        this.erro.set(
          e.error?.message ?? 'Não foi possível convocar a Quarentena.',
        );
      },
    });
  }

  protected debater(ev: Event): void {
    ev.preventDefault();
    const texto = this.debateTexto().trim();
    if (!this.partidaId || !texto || this.enviando()) return;
    this.enviando.set(true);
    this.api.debater(this.partidaId, texto).subscribe({
      next: () => {
        this.enviando.set(false);
        this.debateTexto.set('');
      },
      error: () => this.enviando.set(false),
    });
  }

  /** Abre mão do debate. Se eu for o último, a votação abre sozinha. */
  protected pular(): void {
    if (!this.partidaId || this.jaPulei() || this.enviando()) return;
    this.enviando.set(true);
    this.jaPulei.set(true);
    this.api.pularDebate(this.partidaId).subscribe({
      next: () => this.enviando.set(false),
      error: () => {
        this.enviando.set(false);
        this.jaPulei.set(false);
      },
    });
  }

  /** Otimista, como a resposta: o voto é único e o servidor é o juiz. */
  protected votar(suspeitoId: string): void {
    if (!this.partidaId || this.votei() || this.enviando()) return;
    this.enviando.set(true);
    this.votei.set(true);
    this.api.votarSuspeito(this.partidaId, suspeitoId).subscribe({
      next: () => this.enviando.set(false),
      error: () => {
        this.enviando.set(false);
        this.votei.set(false);
      },
    });
  }

  /** O lado do aluno venceu? (Aldeões torcem pela Vila; a Ameaça, contra.) */
  protected ganhei(lado: 'VILA' | 'AMEACA'): boolean {
    return this.ehAmeaca() ? lado === 'AMEACA' : lado === 'VILA';
  }

  protected minhaPosicao(p: IsolateusMatch) {
    return p.rankingFinal.find((r) => r.alunoId === this.meuId) ?? null;
  }
}
