import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IsolateusApiService } from '../../core/isolateus-api.service';
import { rotuloBrilho, setoresBrilhando } from '../../core/isolateus-mapa';
import { alienDoPlacar, ROTULO_PAPEL } from '../../core/isolateus-placar';
import { RelogioDaFase, antecedenciaDaFase } from '../../core/isolateus-relogio';
import { Aluno, IsolateusMatch, LIMITE_OCIOSIDADE_PADRAO } from '../../core/models';
import { OciosidadeApiService } from '../../core/ociosidade-api.service';
import { LimiteOciosidadeComponent } from '../../ui/limite-ociosidade/limite-ociosidade';
import { DescontoOciosidadeComponent } from '../../ui/desconto-ociosidade/desconto-ociosidade';
import { RealtimeService } from '../../core/realtime.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Icon } from '../../ui/icon/icon';
import { IsolateusDiario } from '../../ui/isolateus-diario/isolateus-diario';
import { IsolateusEvento } from '../../ui/isolateus-evento/isolateus-evento';
import { IsolateusBrilho } from '../../ui/isolateus-brilho/isolateus-brilho';
import { IsolateusMapaPixel } from '../../ui/isolateus-mapa-pixel/isolateus-mapa-pixel';
import { IconePixel } from '../../ui/icone-pixel/icone-pixel';
import { mensagemDoTurno } from '../../isolateus/isolateus-mensagens';
import { LobbyLoader } from '../../ui/lobby-loader/lobby-loader';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';
import { ValeRankingComponent } from '../../ui/vale-ranking/vale-ranking';
import { LogPontuacaoComponent } from '../../ui/log-pontuacao/log-pontuacao';
import { PartidaPausadaComponent } from '../../ui/partida-pausada/partida-pausada';
import { podePausar } from '../../core/pausa';

/** Janelas cronometradas — espelham as constantes `ISOLATEUS` do backend. */
const LIMITE_DEBATE_S = 90;
const LIMITE_VOTO_S = 60;
const LIMITE_DESLOCAMENTO_S = 60;
const JANELA_DECISAO_S = 15;
const RESGATE_VOTO_S = 60;
/** O pulso da noite: libera os avisos de saída dos NPCs (026 §2.3). */
const PULSO_DESLOCAMENTO_MS = 3000;
const PULSO_JITTER_MS = 1000;
/** Mínimo de investigadores reais para o Despertar (§2). */
const MIN_REAIS = 4;

/**
 * O telão do Comando Central. Escuta a partida em tempo real e conduz a
 * investigação: audita os pseudônimos no lobby, desperta a vila, fecha as fases
 * cronometradas (não há timer no servidor) e narra os cards globais.
 *
 * O que aparece aqui é exatamente o que a vila inteira pode ver — o professor
 * também não sabe quem é a Ameaça, e é isso que mantém a mesa honesta.
 */
@Component({
  selector: 'app-isolateus-projetor-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LimiteOciosidadeComponent,
    DescontoOciosidadeComponent,
    RouterLink,
    Icon,
    Spinner,
    LobbyLoader,
    Modal,
    IsolateusMapaPixel,
    IconePixel,
    IsolateusBrilho,
    IsolateusDiario,
    IsolateusEvento,
    ValeRankingComponent,
    LogPontuacaoComponent,
    PartidaPausadaComponent,
  ],
  template: `
    <div class="px-stage telao">
      <a class="voltar" routerLink="/jogos/isolateus">‹ MINHAS INVESTIGAÇÕES</a>

      @if (partida(); as p) {
        <header class="px-box topo">
          <h1 class="px-titulo topo__nome">
            {{ p.nome }}
            @if (p.status !== 'LOBBY' && p.valeRanking === false) {
              <span class="selo-casual" title="Os pontos desta partida não somam no ranking da turma">CASUAL</span>
            }
          </h1>
          @if (p.status !== 'LOBBY') {
            <div class="esperanca" title="Esperança da Vila">
              <span class="px-titulo esperanca__rot">ESPERANÇA</span>
              <div class="px-barra" [class]="classeEsperanca()">
                @for (i of segmentos; track i) {
                  <i [class.on]="i < segmentosAcesos()"></i>
                }
              </div>
              <span class="px-titulo esperanca__num">{{ p.esperanca }}</span>
              @if (p.esperanca <= 0) {
                <span class="px-titulo colapso px-blink">COLAPSO</span>
              }
            </div>
          }
        </header>

        @if (p.status === 'LOBBY') {
          <section class="lobby">
            @if (pin(); as pinTurma) {
              <div class="px-box pinbig">
                <span class="px-titulo pinbig__lbl">PIN DA TURMA</span>
                <strong class="px-titulo pinbig__val">{{ pinTurma }}</strong>
                <span class="pinbig__hint">Os alunos entram pelo portal com este PIN</span>
                <button class="px-btn" type="button" (click)="assistencia.set(true)">
                  <app-icon name="users" [size]="16" /> Ver detalhes / lista de alunos
                </button>
              </div>
            }

            <div class="px-box espera">
              <div class="lead lead--row">
                <span class="px-titulo">HABITANTES SE REGISTRANDO…</span>
                <app-lobby-loader class="loader-mini" />
              </div>
              @if (!p.inscritos.length) {
                <p class="dim">Aguardando os primeiros habitantes.</p>
              } @else {
                <!--
                  O telão NÃO mostra nomes aqui de propósito: os codinomes só são
                  sorteados no Despertar. Se a turma visse a lista real enchendo,
                  saberia por eliminação quem é habitante virtual.
                -->
                <p class="dim">
                  Os <b>codinomes</b> são sorteados ao iniciar. Toque no × para tirar
                  alguém que entrou por engano.
                </p>
                <ul class="inscritos">
                  @for (i of p.inscritos; track i.alunoId; let idx = $index) {
                    <li>
                      <span class="chip">
                        <span class="chip__nome">
                          <app-icon name="user" [size]="12" />
                          Habitante {{ idx + 1 }}
                        </span>
                        <button
                          class="chip__x"
                          type="button"
                          aria-label="Remover habitante {{ idx + 1 }}"
                          [disabled]="ocupado()"
                          (click)="remover(i.alunoId, idx + 1)"
                        >
                          <app-icon name="close" [size]="12" />
                        </button>
                      </span>
                    </li>
                  }
                </ul>
              }
            </div>

            <label class="px-box opcao">
              <input
                type="checkbox"
                [checked]="debateHabilitado()"
                (change)="debateHabilitado.set($any($event.target).checked)"
              />
              <span>
                <b>Debate antes da votação</b>
                <small>Desmarque para a Quarentena ir direto à votação.</small>
              </span>
            </label>

            <!-- Os ajustes do lobby são componentes do app: ficam num cartão claro. -->
            <div class="ajustes">
              @if (p.turmaId) {
                <app-vale-ranking
                  [valor]="valeRanking()"
                  [desabilitado]="salvandoValeRanking()"
                  (mudou)="mudarValeRanking($event)"
                />
              }
              <app-limite-ociosidade
                unidadeSingular="fase"
                unidadePlural="fases"
                [valor]="limiteOcioso()"
                [desabilitado]="salvandoLimite()"
                (mudou)="mudarLimite($event)"
              />
            </div>

            <button
              class="px-btn px-btn--alien full"
              type="button"
              [disabled]="ocupado() || salvandoValeRanking() || p.inscritos.length < minReais"
              (click)="iniciar()"
            >
              INICIAR INVESTIGAÇÃO ({{ p.inscritos.length }} NA VILA)
            </button>
            <p class="dim center">
              @if (p.inscritos.length < minReais) {
                A investigação exige no mínimo {{ minReais }} investigadores reais.
              } @else {
                Ao iniciar, a vila é preenchida com habitantes virtuais e a Ameaça é sorteada em segredo.
              }
            </p>
            @if (erro()) { <p class="erro">{{ erro() }}</p> }
          </section>
        } @else {
          <!-- A vila em jogo -->
          <app-isolateus-evento [acontecimentos]="p.acontecimentos ?? []" />
          @if (avisoBrilho(); as nomes) {
            <app-isolateus-brilho [setores]="nomes" (fechar)="avisoBrilho.set(null)" />
          }

          <section class="vila">
            <!--
              O telão é a visão da turma inteira: o mapa da vila (setores de pé
              ou sabotados, o brilho) e quantos habitantes há em cada setor. Não
              mostra posições na cena — elas só existem nos celulares do setor.
            -->
            <div class="col-mapa">
              <div class="px-box mapa">
                <app-isolateus-mapa-pixel
                  [setores]="p.setores"
                  [brilhando]="brilhando(p)"
                  [grande]="true"
                />
                <p class="dim mapa__info">{{ contagemBrilho(p) }}</p>
                @if (setorDoReparo(p); as r) {
                  <p class="mapa__reparo">Reparo em andamento: {{ r }}</p>
                }
              </div>

              <div class="setores">
                @for (s of setoresComGente(p); track s.id) {
                  <span class="setor" [class.setor--ruina]="!s.intacto">
                    <app-icon [name]="s.intacto ? 'shield' : 'skull'" [size]="14" />
                    {{ s.nome }}
                    <b class="setor__gente">{{ s.gente }}</b>
                  </span>
                }
              </div>
              <p class="dim">{{ vivos(p).length }} habitante(s) na vila</p>
            </div>

            <div class="px-box painel">
              <div class="px-titulo painel__tt">
                <span>{{ mensagem().titulo }}</span>
                @if (relogioPainel(); as t) {
                  <span class="painel__rel" [class.px-blink]="segundosPainel() <= 10">{{ t }}</span>
                }
              </div>

              @switch (p.status) {
                @case ('DESLOCAMENTO') {
                  <!--
                    A noite espera o card de resultado da rodada anterior (034
                    #55): o telão mostra o resultado antes de a noite contar.
                  -->
                  @if (espera() > 0) {
                    @if (p.vereditoQuarentena; as v) {
                      <div class="card-global" [class.card-global--ok]="v.eraAmeaca">{{ v.texto }}</div>
                    }
                    @if (p.resumoRodada; as r) {
                      <div class="card-global" [class.card-global--ok]="r.defendida">{{ r.texto }}</div>
                    }
                    @if (p.resgateResultado; as rg) {
                      <div class="card-global card-global--ok">
                        @if (rg.semVotacao) { {{ rg.nome }} era o único fora da vila e voltou sem votação. }
                        @else { {{ rg.nome }} foi resgatado e voltou à vila. }
                      </div>
                    }
                    @if (p.questaoPublica && p.corretaIndex !== null && p.corretaIndex !== undefined) {
                      <p class="correta">
                        Resposta correta:
                        <b>{{ letra(p.corretaIndex) }}) {{ p.questaoPublica.alternativas[p.corretaIndex] }}</b>
                      </p>
                    }
                    <p class="dim center">A noite começa em {{ espera() }}s.</p>
                  } @else {
                    <div class="aguardando">
                      <app-icone-pixel nome="AGUARDAR" class="aguardando__ico" />
                      <strong class="px-titulo">A VILA SE MOVIMENTA NA ESCURIDÃO…</strong>
                      <p class="dim">
                        Cada habitante escolhe onde passar a noite.
                        {{ p.movimentosRecebidos ?? 0 }} já decidiram.
                        A Quarentena é convocada pelo botão vermelho da Comunicação.
                      </p>
                    </div>
                  }
                }

                @case ('QUESTAO_ATIVA') {
                  @if (p.alerta; as a) {
                    <div class="alerta"><app-icon name="alert" [size]="18" /> {{ a.texto }}</div>
                  }
                  @if (p.resgatePendente) {
                    <p class="resgate__aviso">Resgate em jogo: a maioria dos aldeões precisa acertar.</p>
                  }
                  @if (p.questaoPublica; as q) {
                    <h2 class="enunciado">{{ q.enunciado }}</h2>
                    <ol class="alts">
                      @for (alt of q.alternativas; track $index) {
                        <li><span class="letra px-titulo">{{ letra($index) }}</span> {{ alt }}</li>
                      }
                    </ol>
                  }
                  <!--
                    Só os Sinais de quem saiu da vila. O Chat de Rumores saiu: os
                    autores eram sempre NPCs, e o telão mostrava à turma quem era
                    virtual.
                  -->
                  @if (sinais(p).length) {
                    <div class="feed">
                      <span class="px-titulo feed__tit">SINAIS INTERCEPTADOS</span>
                      @for (r of sinais(p); track r.id) {
                        <p class="rumor rumor--sinal">{{ r.texto }}</p>
                      }
                    </div>
                  }
                }

                @case ('RESULTADO_RODADA') {
                  <!-- Só partidas antigas (034 #43): o Dia saiu e avança sozinho. -->
                  @if (p.vereditoQuarentena; as v) {
                    <div class="card-global" [class.card-global--ok]="v.eraAmeaca">{{ v.texto }}</div>
                  }
                  @if (p.resumoRodada; as r) {
                    <div class="card-global" [class.card-global--ok]="r.defendida">{{ r.texto }}</div>
                  }
                  @if (p.questaoPublica && p.corretaIndex !== null && p.corretaIndex !== undefined) {
                    <p class="correta">
                      Resposta correta:
                      <b>{{ letra(p.corretaIndex) }}) {{ p.questaoPublica.alternativas[p.corretaIndex] }}</b>
                    </p>
                  }
                }

                @case ('QUARENTENA_DEBATE') {
                  <div class="quarentena">
                    <span class="px-titulo quarentena__tag">QUARENTENA · DEBATE</span>
                    @if (p.quarentenaConvocadaPor; as c) {
                      <p>Convocada por <b>{{ c.nome }}</b></p>
                    }
                    <div class="feed">
                      @for (m of p.debate; track m.id) {
                        <p class="rumor"><strong>{{ m.autorNome }}</strong> {{ m.texto }}</p>
                      }
                    </div>
                    @if (p.pulosRecebidos) {
                      <p>{{ p.pulosRecebidos }} já pularam o debate.</p>
                    }
                  </div>
                }

                @case ('QUARENTENA_VOTO') {
                  <div class="quarentena">
                    <span class="px-titulo quarentena__tag">QUARENTENA · VEREDITO</span>
                    @if (p.quarentenaConvocadaPor; as c) {
                      <p>Convocada por <b>{{ c.nome }}</b></p>
                    }
                    <p>Depositem seus votos. {{ p.votosRecebidos }} voto(s) recebido(s).</p>
                  </div>
                }

                @case ('RESGATE_VOTO') {
                  <div class="quarentena quarentena--resgate">
                    <span class="px-titulo quarentena__tag">RESGATE · QUEM VOLTA?</span>
                    <p>A vila acertou a questão do resgate. Votem pelo celular em quem deve voltar.</p>
                    <div class="setores">
                      @for (h of resgataveis(p); track h.id) {
                        <span class="setor">{{ h.nome }}</span>
                      }
                    </div>
                    <p>{{ p.votosResgateRecebidos ?? 0 }} voto(s) recebido(s).</p>
                  </div>
                }

                @case ('ENCERRADO') {
                  @if (p.veredito; as v) {
                    <div class="fim" [class.fim--vila]="v.lado === 'VILA'">
                      <app-icon [name]="v.lado === 'VILA' ? 'trophy' : 'alien'" [size]="26" />
                      <strong class="px-titulo">{{ v.lado === 'VILA' ? 'A VILA VENCEU' : 'A AMEAÇA VENCEU' }}</strong>
                      <p>{{ v.motivo }}</p>
                      @if (alien(); as a) {
                        <p class="fim__alien">
                          O Alienígena era
                          @if (a.jogador) { <b>{{ a.jogador }}</b> ({{ a.nome }}) } @else { <b>{{ a.nome }}</b> }
                        </p>
                      }
                    </div>
                  }
                  <ol class="ranking">
                    @for (r of p.rankingFinal; track r.alunoId) {
                      <li
                        [class.rk-alien]="r.papel === 'ALIEN'"
                        [class.log-lista__row--ocioso]="!!logDe(r.alunoId)?.ocioso"
                        [class.clicavel]="!!p.logPontuacao"
                        [attr.role]="p.logPontuacao ? 'button' : null"
                        [attr.tabindex]="p.logPontuacao ? 0 : null"
                        (click)="abrirLog(r.alunoId)"
                        (keydown.enter)="abrirLog(r.alunoId)"
                      >
                        <span class="pos px-titulo">{{ r.posicao }}º</span>
                        <span class="rk-quem">
                          @if (r.jogador) { <span class="rk-jogador">{{ r.jogador }}</span> }
                          <span class="rk-nome">
                            {{ r.nome }}
                            @if (r.papel; as papel) {
                              <span class="selo-papel" [class.selo-papel--contagiado]="papel === 'CONTAGIADO'">
                                <app-icon name="alien" [size]="13" /> {{ rotuloPapel[papel] }}
                              </span>
                            }
                          </span>
                        </span>
                        @if (logDe(r.alunoId)?.ocioso) {
                          <span class="ocioso-tag">
                            <app-icon name="alert" [size]="12" /> {{ logDe(r.alunoId)?.faltasOciosidade }} fases sem jogar
                          </span>
                        }
                        <span class="rk-pts">{{ r.pontos }} {{ unidade() }}</span>
                        @if (logDe(r.alunoId)?.ocioso && podeDescontar()) {
                          @if (p.descontosOciosidade?.[r.alunoId] !== undefined) {
                            <span class="descontado">−{{ p.descontosOciosidade?.[r.alunoId] }}</span>
                          } @else {
                            <button
                              type="button"
                              class="px-btn btn-desc"
                              (click)="$event.stopPropagation(); descontarDe.set(r.alunoId)"
                              (keydown.enter)="$event.stopPropagation()"
                            >Descontar</button>
                          }
                        }
                      </li>
                    }
                  </ol>
                  <app-desconto-ociosidade
                    [jogador]="jogadorDesconto()"
                    [unidade]="unidade()"
                    [ocupado]="descontando()"
                    (confirmar)="confirmarDesconto($event)"
                    (fechar)="descontarDe.set(null)"
                  />
                  @if (p.logPontuacao) {
                    <p class="dim center">Toque em um habitante para ver de onde vieram os pontos.</p>
                  }
                  <app-log-pontuacao
                    [jogador]="logJogador()"
                    [posicao]="logPosicao()"
                    [unidade]="unidade()"
                    [temTurma]="!!p.turmaId"
                    [casual]="p.valeRanking === false"
                    (fechar)="logAberto.set(null)"
                  />
                }
              }
              @if (erro()) { <p class="erro">{{ erro() }}</p> }
            </div>
          </section>

          <!--
            O controle de ritmo do professor: toda fase cronometrada pode ser
            pulada. O clique vale pela unanimidade e o jogo segue como se o
            relógio tivesse zerado. A pausa para todo relógio; o Delírio
            coletivo embaralha os codinomes (anti-trapaça, o Diário não diz quem
            causou).
          -->
          <div class="acoes">
            @if (rotuloPular(p); as rotulo) {
              <button class="px-btn px-btn--blue" type="button" [disabled]="ocupado()" (click)="pular(p)">
                {{ rotulo }}
              </button>
            }
            @if (podePausar(p.status) && !p.pausadaEm) {
              <button class="px-btn" type="button" [disabled]="ocupado()" (click)="pausar()">
                <app-icon name="pause" [size]="14" /> Pausar
              </button>
            }
            @if (p.status !== 'ENCERRADO') {
              <button class="px-btn btn-delirio" type="button" [disabled]="ocupado()" (click)="confirmarDelirio.set(true)">
                <app-icon name="dice" [size]="14" /> Delírio coletivo
              </button>
            }
          </div>

          <!-- O Diário fica sempre à vista: é sobre ele que a turma argumenta. -->
          @if (p.acontecimentos?.length) {
            <div class="px-box diario">
              <app-isolateus-diario [acontecimentos]="p.acontecimentos" />
            </div>
          }

          <!--
            A saída de emergência da aula: o sinal bate no meio da noite e a
            turma dispersa. Fica discreto e no rodapé de propósito — é uma ação
            sem volta, não um controle de ritmo (esse é o botão de pular da fase).
          -->
          @if (p.status !== 'ENCERRADO') {
            <button class="btn-encerrar" type="button" [disabled]="ocupado()" (click)="confirmarFim.set(true)">
              <app-icon name="close" [size]="14" /> Encerrar investigação agora
            </button>
          }
        }
      } @else {
        <div class="loading"><app-spinner [size]="32" /></div>
      }
    </div>

    @if (partida(); as p) {
      <app-modal
        [open]="confirmarDelirio()"
        title="Causar um delírio coletivo?"
        (close)="confirmarDelirio.set(false)"
      >
        <p>
          <b>Agora</b>, todos os habitantes trocam de codinome entre si. Útil
          quando a turma está mostrando a tela ou combinando por fora.
        </p>
        <p class="muted">
          O Diário anuncia o delírio sem dizer quem o causou. O que foi dito de
          cada um fica preso ao nome antigo.
        </p>
        <div modal-actions>
          <button class="btn-outline" type="button" (click)="confirmarDelirio.set(false)">
            Cancelar
          </button>
          <button class="btn-primary" type="button" [disabled]="ocupado()" (click)="delirio()">
            Causar delírio
          </button>
        </div>
      </app-modal>

      <app-modal
        [open]="confirmarFim()"
        title="Encerrar a investigação?"
        (close)="confirmarFim.set(false)"
      >
        <p>
          A partida termina <b>agora</b>, para toda a turma. O veredito sai pelo
          estado da vila neste momento — setores de pé, habitantes na vila — e o
          XP já acumulado é creditado.
        </p>
        <p class="muted">Não dá para voltar atrás.</p>
        <div modal-actions>
          <button class="btn-outline" type="button" (click)="confirmarFim.set(false)">
            Continuar jogando
          </button>
          <button class="btn-perigo" type="button" [disabled]="ocupado()" (click)="encerrar()">
            Encerrar agora
          </button>
        </div>
      </app-modal>

      <app-modal [open]="assistencia()" title="Alunos da turma" (close)="assistencia.set(false)">
        <p class="muted">Toque no card para revelar o PIN individual do aluno.</p>
        <div class="agrid">
          @for (a of alunos(); track a.id) {
            <button class="acard" type="button" (click)="revelar(a.id)">
              <span class="acard__nome">{{ a.nome }}</span>
              @if (revelado(a.id)) {
                <strong class="acard__pin">{{ a.pinAcesso }}</strong>
              } @else {
                <span class="acard__oculto">•• toque para ver</span>
              }
            </button>
          }
        </div>
        <div modal-actions>
          <button class="btn-primary" type="button" (click)="assistencia.set(false)">Fechar</button>
        </div>
      </app-modal>
      @if (p.pausadaEm) {
        <app-partida-pausada
          jogo="Tichr Isolateus"
          [titulo]="p.nome"
          [professor]="true"
          [carregando]="ocupado()"
          (retomar)="retomar()"
        />
      }
    }
  `,
  styles: `
    :host { display: block; }
    /*
     * O telão herda as cores e a fonte do palco pixel (034), mas rola como uma
     * página: o tamanho vem da largura (inline-size), não de um 16:9 fixo.
     */
    .telao {
      container-type: inline-size;
      overflow: visible;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      min-height: 100%;
      background: var(--px-ink);
      font-size: 16px;
      --u: 8px;
      --b: 3px;
    }
    .voltar { align-self: flex-start; color: var(--px-txt-dim); text-decoration: none; font-family: 'Press Start 2P', monospace; font-size: 10px; }
    .voltar:hover { color: var(--px-amber-lt); }
    .loading { display: flex; justify-content: center; padding: 4rem 0; color: var(--px-alien); }
    .dim { color: var(--px-txt-dim); margin: 0; }
    .center { text-align: center; }
    .full { width: 100%; }
    .erro { color: var(--px-red); font-weight: 600; margin: 0; }
    .px-titulo { letter-spacing: 0.02em; }

    /* Topo: nome + Esperança + RODADA */
    .topo { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 24px; padding: 12px 16px; }
    .topo__nome { margin: 0; font-size: clamp(12px, 1.6cqw, 20px); color: var(--px-amber-lt); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .selo-casual { font-size: 0.6em; padding: 4px 6px; color: var(--px-ink); background: var(--px-txt-dim); }
    .esperanca { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .esperanca__rot, .esperanca__num { font-size: 11px; }
    .esperanca__rot { color: var(--px-alien); }
    .esperanca .px-barra i { width: 10px; height: 20px; }
    .colapso { font-size: 12px; color: var(--px-red); padding: 4px 8px; box-shadow: 0 0 0 var(--b) var(--px-red); }

    /* Lobby */
    .lobby { display: flex; flex-direction: column; gap: 16px; max-width: 760px; width: 100%; margin: 0 auto; }
    .pinbig { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px; text-align: center; }
    .pinbig__lbl { font-size: 11px; color: var(--px-txt-dim); }
    .pinbig__val { font-size: clamp(28px, 6cqw, 56px); color: var(--px-alien); letter-spacing: 0.1em; }
    .pinbig__hint { color: var(--px-txt-dim); }
    .pinbig .px-btn { display: inline-flex; align-items: center; gap: 6px; }
    .espera { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .lead--row { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--px-alien); }
    .loader-mini { transform: scale(0.5); margin: -14px -10px; }
    .inscritos { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 0; padding: 0; }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; background: var(--px-box2); box-shadow: 0 0 0 2px var(--px-line-dim); }
    .chip__nome { display: inline-flex; align-items: center; gap: 4px; opacity: 0.85; }
    .chip__x { border: none; background: none; padding: 0; font: inherit; color: var(--px-txt-dim); cursor: pointer; display: inline-flex; }
    .chip__x:hover:not(:disabled) { color: var(--px-red); }
    .chip__x:disabled { cursor: not-allowed; opacity: 0.55; }
    .opcao { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; cursor: pointer; }
    .opcao input { margin-top: 3px; width: 18px; height: 18px; accent-color: var(--px-green); cursor: pointer; }
    .opcao span { display: flex; flex-direction: column; gap: 2px; }
    .opcao small { color: var(--px-txt-dim); }
    /* Componentes do app (claros) dentro do palco escuro. */
    .ajustes { display: flex; flex-direction: column; gap: 12px; padding: 12px; background: var(--surface); color: var(--text); font-family: Inter, system-ui, sans-serif; box-shadow: 0 0 0 var(--b) var(--px-line); }
    .lobby > .px-btn { padding: 14px; font-size: 16px; }

    /* Vila */
    .vila { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
    @container (min-width: 900px) { .vila { grid-template-columns: minmax(320px, 2fr) 3fr; } }
    .col-mapa { display: flex; flex-direction: column; gap: 10px; }
    .mapa { padding: 10px; display: flex; flex-direction: column; gap: 6px; }
    .mapa__info { font-size: 14px; }
    .mapa__reparo { margin: 0; color: var(--px-amber-lt); font-size: 14px; }
    .setores { display: flex; flex-wrap: wrap; gap: 8px; }
    .setor { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; background: var(--px-box2); box-shadow: 0 0 0 2px var(--px-line-dim); font-size: 14px; }
    .setor--ruina { color: var(--px-red); box-shadow: 0 0 0 2px var(--px-red-dk); text-decoration: line-through; }
    .setor__gente { padding: 0 4px; box-shadow: 0 0 0 1px currentColor; font-size: 12px; }

    .painel { display: flex; flex-direction: column; gap: 14px; padding: 16px; min-height: 280px; }
    .painel__tt { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--px-amber-lt); }
    .painel__rel { color: var(--px-txt); }
    .aguardando { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 24px 8px; text-align: center; }
    .aguardando strong { font-size: 12px; color: var(--px-alien); }
    .aguardando__ico { width: 48px; height: 48px; }
    .alerta { display: flex; align-items: center; gap: 8px; padding: 10px 12px; font-weight: 700; color: #fff; background: var(--px-red-dk); }
    .resgate__aviso { margin: 0; color: #fb7185; font-weight: 700; }
    .enunciado { margin: 0; font-size: clamp(18px, 2.2cqw, 28px); font-weight: 700; text-align: center; line-height: 1.3; }
    .alts { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr; gap: 10px; }
    @container (min-width: 640px) { .alts { grid-template-columns: 1fr 1fr; } }
    .alts li { display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--px-box2); box-shadow: 0 0 0 2px var(--px-line-dim); font-size: 18px; }
    .letra { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: none; font-size: 11px; color: var(--px-ink); background: var(--px-amber-lt); }
    .feed { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; padding: 10px; background: var(--px-ink); box-shadow: 0 0 0 2px var(--px-line-dim); }
    .feed__tit { font-size: 9px; color: var(--px-txt-dim); }
    .rumor { margin: 0; line-height: 1.45; }
    .rumor strong { color: var(--px-txt-dim); margin-right: 6px; }
    .rumor--sinal { color: var(--px-alien); }
    .card-global { padding: 12px; font-weight: 700; text-align: center; color: #fff; background: var(--px-red-dk); font-size: 18px; }
    .card-global--ok { background: #166534; }
    .correta { text-align: center; margin: 0; color: var(--px-txt-dim); }
    .correta b { color: var(--px-txt); }
    .quarentena { display: flex; flex-direction: column; gap: 10px; padding: 12px; box-shadow: 0 0 0 var(--b) var(--px-red); }
    .quarentena p { margin: 0; }
    .quarentena__tag { align-self: center; font-size: 11px; color: var(--px-red); }
    .quarentena--resgate { box-shadow: 0 0 0 var(--b) #fb7185; }
    .quarentena--resgate .quarentena__tag { color: #fb7185; }
    .fim { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 18px; text-align: center; color: var(--px-alien); background: #052e16; box-shadow: 0 0 0 var(--b) var(--px-alien); }
    .fim--vila { color: #bfdbfe; background: #1e3a8a; box-shadow: 0 0 0 var(--b) #93c5fd; }
    .fim strong { font-size: 16px; }
    .fim p { margin: 0; color: var(--px-txt); }
    .fim__alien { font-size: 17px; }
    .ranking { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .ranking li { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 8px 12px; background: var(--px-box2); box-shadow: 0 0 0 2px var(--px-line-dim); }
    .pos { font-size: 11px; color: var(--px-amber-lt); min-width: 3ch; }
    .rk-quem { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .rk-jogador { font-size: 13px; color: var(--px-txt-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rk-nome { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-weight: 700; }
    .ranking li.rk-alien { box-shadow: 0 0 0 var(--b) var(--px-alien); }
    .selo-papel { display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--px-ink); background: var(--px-alien); }
    .selo-papel--contagiado { color: var(--px-alien); background: #052e16; }
    .rk-pts { font-weight: 700; color: var(--px-alien); }
    .ocioso-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--px-amber); }
    .descontado { color: var(--px-red); font-weight: 700; }
    .btn-desc { font-size: 13px; padding: 4px 8px; }
    .ranking li.clicavel { cursor: pointer; }
    .ranking li.clicavel:hover, .ranking li.clicavel:focus-visible { box-shadow: 0 0 0 var(--b) var(--px-amber-lt); outline: none; }

    .acoes { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; }
    .acoes .px-btn { display: inline-flex; align-items: center; gap: 6px; }
    .btn-delirio { color: #c4b5fd; }
    .diario { padding: 12px; }
    /* Discreto de propósito: é saída de emergência, não controle de ritmo. */
    .btn-encerrar { align-self: center; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 2px solid var(--px-line-dim); background: none; font: inherit; font-size: 14px; color: var(--px-txt-dim); cursor: pointer; }
    .btn-encerrar:hover:not(:disabled) { border-color: var(--px-red); color: var(--px-red); }
    .btn-encerrar:disabled { opacity: 0.55; cursor: not-allowed; }

    /* Modais (fora do palco: estética do app). */
    .muted { color: var(--text-muted); font-size: 0.9rem; margin: 0.25rem 0; }
    .btn-perigo { padding: 0.6rem 1.1rem; border: none; border-radius: 10px; font: inherit; font-weight: 800; color: #fff; background: var(--danger); cursor: pointer; }
    .btn-perigo:disabled { opacity: 0.55; cursor: not-allowed; }
    .agrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.5rem; }
    .acard { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.6rem; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); cursor: pointer; font: inherit; text-align: left; color: var(--text); }
    .acard__nome { font-weight: 700; font-size: 0.9rem; }
    .acard__pin { color: #4d7c0f; font-size: 1.1rem; letter-spacing: 0.1em; }
    .acard__oculto { font-size: 0.78rem; color: var(--text-muted); }
  `,
})
export class IsolateusProjetorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly realtime = inject(RealtimeService);
  private readonly api = inject(IsolateusApiService);
  private readonly turmas = inject(TurmaApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly matchId = this.route.snapshot.paramMap.get('id')!;
  protected readonly partida = toSignal(
    this.realtime.escutarIsolateus(this.matchId),
    { initialValue: null },
  );

  protected readonly minReais = MIN_REAIS;
  protected readonly contagemBrilho = rotuloBrilho;
  protected readonly brilhando = setoresBrilhando;
  /** O aviso do brilho misterioso no telão (nomes dos setores). */
  protected readonly avisoBrilho = signal<string[] | null>(null);
  /** A noite do último brilho já visto; `undefined` = ainda sem linha de base. */
  private ultimoBrilho: number | null | undefined = undefined;
  protected readonly ocupado = signal(false);
  /**
   * Opção do lobby: local ao telão até o clique em "Iniciar" (vai no próprio
   * Despertar — nada a sincronizar enquanto a sala enche).
   */
  protected readonly debateHabilitado = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly assistencia = signal(false);
  /** Confirmação do encerramento antecipado — a ação não tem volta. */
  protected readonly confirmarFim = signal(false);
  /** Confirmação do Delírio Coletivo (dentro do app, nada de confirm()). */
  protected readonly confirmarDelirio = signal(false);
  protected readonly pin = signal<string | null>(null);
  protected readonly alunos = signal<Aluno[]>([]);
  private readonly reveladosSet = signal<Set<string>>(new Set());

  private readonly relogio = signal(Date.now());
  private readonly cronometro = new RelogioDaFase();

  /**
   * A fase tem relógio correndo? Sem base (`faseIniciadaEm` nulo) o número
   * ficaria congelado no limite — melhor não exibir timer nenhum do que um
   * "15s" parado que parece a partida travada.
   */
  protected readonly relogioAtivo = computed(
    () => !!this.partida()?.faseIniciadaEm && this.limiteDaFase() > 0,
  );

  /** Segundos restantes da fase cronometrada corrente. */
  protected readonly restante = computed(() => {
    const p = this.partida();
    const limite = this.limiteDaFase();
    if (!p || !p.faseIniciadaEm || !limite) return limite;
    const fim = Date.parse(p.faseIniciadaEm) + limite * 1000;
    // Pausada, o relógio para no instante da pausa (já no relógio do servidor).
    const agora = p.pausadaEm
      ? Date.parse(p.pausadaEm)
      : this.cronometro.agora(this.relogio());
    const s = Math.ceil((fim - agora) / 1000);
    return Math.max(0, Math.min(limite, s));
  });

  /**
   * Duração da fase atual: a questão tem o tempo do jogo; a Quarentena, o seu.
   *
   * `RESULTADO_RODADA` entra aqui porque é o que faz o **avanço automático**
   * acontecer: zerada a janela de decisão, o telão dispara `tempo()` e o
   * backend faz a noite cair. O professor não precisa mais clicar em nada.
   */
  private limiteDaFase(): number {
    const p = this.partida();
    if (!p) return 0;
    if (p.status === 'DESLOCAMENTO') return LIMITE_DESLOCAMENTO_S;
    if (p.status === 'RESULTADO_RODADA') return JANELA_DECISAO_S;
    if (p.status === 'QUESTAO_ATIVA') return p.duracaoSegundos;
    if (p.status === 'QUARENTENA_DEBATE') return LIMITE_DEBATE_S;
    if (p.status === 'QUARENTENA_VOTO') return LIMITE_VOTO_S;
    if (p.status === 'RESGATE_VOTO') return RESGATE_VOTO_S;
    return 0;
  }

  /** Segundos até a noite começar (ela espera o card de resultado, #55). */
  protected readonly espera = computed(() => {
    const p = this.partida();
    if (!p || p.status !== 'DESLOCAMENTO' || !p.faseIniciadaEm) return 0;
    const agora = p.pausadaEm
      ? Date.parse(p.pausadaEm)
      : this.cronometro.agora(this.relogio());
    return Math.max(0, Math.ceil((Date.parse(p.faseIniciadaEm) - agora) / 1000));
  });

  /** A barra de Esperança em 10 segmentos (mesma do HUD do celular). */
  protected readonly segmentos = Array.from({ length: 10 }, (_, i) => i);
  protected readonly segmentosAcesos = computed(() =>
    Math.round(Math.max(0, Math.min(100, this.partida()?.esperanca ?? 0)) / 10),
  );
  protected readonly classeEsperanca = computed(() => {
    const e = this.partida()?.esperanca ?? 0;
    return e >= 60 ? 'px-barra--ok' : e >= 30 ? 'px-barra--meio' : 'px-barra--baixo';
  });

  /** O título do painel: a fase e o progresso ("RODADA 3/10"), como no celular. */
  protected readonly mensagem = computed(() => {
    const p = this.partida();
    if (!p) return { titulo: '', texto: '' };
    const fase = p.pausadaEm ? 'PAUSA' : this.espera() > 0 ? 'RESULTADO' : p.status;
    return mensagemDoTurno(fase, p.rodada, p.totalRodadas);
  });

  /** Os segundos do relógio do painel: a espera do card ou o prazo da fase. */
  protected readonly segundosPainel = computed(() =>
    this.espera() > 0 ? this.espera() : this.restante(),
  );
  protected readonly relogioPainel = computed<string | null>(() => {
    if (this.espera() <= 0 && !this.relogioAtivo()) return null;
    const s = this.segundosPainel();
    const t = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    return this.espera() > 0 ? `NOITE EM ${t}` : t;
  });

  /** Os Sinais de quem saiu da vila (o feed só aparece se houver algum). */
  protected sinais(p: IsolateusMatch) {
    return p.rumores.filter((r) => r.tipo === 'SINAL');
  }

  /** O nome do setor em reparo (o mapa antigo marcava; o pixel não). */
  protected setorDoReparo(p: IsolateusMatch): string | null {
    if (!p.reparoSetorId) return null;
    return p.setores.find((s) => s.id === p.reparoSetorId)?.nome ?? null;
  }

  /**
   * Os setores com a contagem de quem está em cada um (visão onisciente).
   *
   * Durante a noite, a contagem fica como estava ao anoitecer: as posições só
   * chegam ao doc público no fechamento, todas de uma vez. Ao vivo, ela mudava
   * enquanto os alunos andavam — e o projetor contava à turma que quem se mexeu
   * era real, já que os NPCs só andam no fechamento.
   */
  protected setoresComGente(p: IsolateusMatch) {
    return p.setores.map((s) => ({
      ...s,
      gente: p.habitantes.filter(
        (h) => h.vivo && !h.preso && h.setorId === s.id,
      ).length,
    }));
  }

  constructor() {
    // O PIN da turma + roster (PINs dos alunos) para o lobby e a assistência.
    this.api.verPartida(this.matchId).subscribe((p) => {
      if (!p.turmaId) return;
      this.turmas
        .getTurma(p.turmaId)
        .subscribe((t) => {
          this.pin.set(t.pinTurma ?? null);
          this.unidade.set(t.nomePontuacao || 'XP');
        });
      this.turmas.getAlunos(p.turmaId).subscribe((a) => this.alunos.set(a));
    });

    // Brilho novo acende o aviso; o primeiro snapshot é só a linha de base.
    effect(() => {
      const p = this.partida();
      if (!p) return;
      const noite = p.brilho?.rodada ?? null;
      if (this.ultimoBrilho === undefined) {
        this.ultimoBrilho = noite;
        return;
      }
      if (noite === null || noite === this.ultimoBrilho) return;
      this.ultimoBrilho = noite;
      const nomes = (p.brilho?.setorIds ?? []).map(
        (id) => p.setores.find((s) => s.id === id)?.nome ?? id,
      );
      this.avisoBrilho.set(nomes);
      setTimeout(() => {
        if (this.avisoBrilho() === nomes) this.avisoBrilho.set(null);
      }, 6000);
    });

    // O telão (sempre presente) fecha a fase quando o cronômetro zera — é ele
    // que substitui o timer que o servidor não tem.
    const tick = setInterval(() => {
      this.relogio.set(Date.now());
      this.checarTempo();
      this.pulsoDaNoite();
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(tick));
  }

  private proximoPulso = 0;

  /**
   * O pulso da noite (026 §2.3): o servidor só libera os avisos de saída dos
   * NPCs quando alguém fala com ele. O telão pulsa junto dos celulares, para os
   * NPCs não pararem de "anunciar" se poucos alunos estiverem com a tela aberta.
   */
  private pulsoDaNoite(): void {
    const p = this.partida();
    if (p?.status !== 'DESLOCAMENTO' || p.pausadaEm) return;
    const agora = Date.now();
    if (agora < this.proximoPulso) return;
    this.proximoPulso =
      agora + PULSO_DESLOCAMENTO_MS + (Math.random() * 2 - 1) * PULSO_JITTER_MS;
    this.api.tempo(this.matchId).subscribe({ next: () => {}, error: () => {} });
  }

  /**
   * Cobra do servidor a fase cujo prazo venceu — e **insiste** até a fase virar.
   *
   * Antes era um disparo só por fase, gravado antes da resposta e com o erro
   * engolido: uma falha de rede, uma aba dormindo ou um relógio adiantado (que
   * faz o cliente cobrar cedo e ouvir "ainda não") congelavam a partida até
   * alguém recarregar a página. A retentativa transforma isso em 2s de atraso.
   */
  private checarTempo(): void {
    const p = this.partida();
    this.cronometro.sincronizar(
      p?.faseIniciadaEm ?? null,
      p ? antecedenciaDaFase(p.status, p.rodada) : 0,
    );
    if (!p || !p.faseIniciadaEm || !this.limiteDaFase()) return;
    if (p.pausadaEm) return; // pausada: o telão não cobra o prazo
    if (!this.cronometro.devoCobrar(Date.now(), this.restante() <= 0)) return;
    this.api.tempo(this.matchId).subscribe({ next: () => {}, error: () => {} });
  }

  protected letra(i: number): string {
    return ['A', 'B', 'C', 'D', 'E', 'F'][i] ?? '?';
  }

  /** Quem pode voltar pelo resgate: abduzidos e presos. */
  protected resgataveis(p: IsolateusMatch) {
    return p.habitantes.filter((h) => !h.vivo || h.preso);
  }

  protected vivos(p: { habitantes: Array<{ vivo: boolean; preso: boolean }> }) {
    return p.habitantes.filter((h) => h.vivo && !h.preso);
  }

  /**
   * A última noite é a que esgota o **banco de questões** — não a contagem de
   * noites, que deixou de ser o orçamento da partida (só há questão quando há
   * disputa).
   */
  protected ultimaNoite(p: { questaoIndex: number; totalRodadas: number }): boolean {
    return p.questaoIndex >= p.totalRodadas;
  }

  protected revelado(alunoId: string): boolean {
    return this.reveladosSet().has(alunoId);
  }

  protected revelar(alunoId: string): void {
    this.reveladosSet.update((s) => {
      const n = new Set(s);
      n.has(alunoId) ? n.delete(alunoId) : n.add(alunoId);
      return n;
    });
  }

  /** Tira do lobby quem entrou por engano (só antes do Despertar). */
  protected remover(alunoId: string, posicao: number): void {
    if (
      !confirm(
        `Remover o habitante ${posicao}? Ele volta para a tela de entrada e pode entrar de novo.`,
      )
    ) {
      return;
    }
    this.acao(this.api.removerInscrito(this.matchId, alunoId));
  }

  // --- Log de pontuação (fim de partida) ---
  /** O nome da pontuação da turma (padrão "XP"). */
  protected readonly unidade = signal('XP');
  protected readonly logAberto = signal<string | null>(null);
  protected readonly logJogador = computed(() => {
    const id = this.logAberto();
    return this.partida()?.logPontuacao?.find((l) => l.alunoId === id) ?? null;
  });
  protected readonly logPosicao = computed(() => {
    const id = this.logAberto();
    return this.partida()?.rankingFinal.find((r) => r.alunoId === id)?.posicao ?? null;
  });
  // --- Revelação (spec 030): quem era a Ameaça e quem jogava cada cidade ---
  protected readonly alien = computed(() => alienDoPlacar(this.partida()?.rankingFinal ?? []));
  protected readonly rotuloPapel = ROTULO_PAPEL;
  protected abrirLog(alunoId: string): void {
    if (this.partida()?.logPontuacao) this.logAberto.set(alunoId);
  }

  // --- Partida casual (lobby) ---
  /** O valor escolhido aqui, antes de o snapshot confirmar. */
  private readonly valeRankingLocal = signal<boolean | null>(null);
  protected readonly valeRanking = computed(
    () => this.valeRankingLocal() ?? this.partida()?.valeRanking !== false,
  );
  protected readonly salvandoValeRanking = signal(false);

  // --- Ociosidade (032) ---
  private readonly ociosidadeApi = inject(OciosidadeApiService);
  private readonly limiteLocal = signal<number | null>(null);
  protected readonly limiteOcioso = computed(
    () =>
      this.limiteLocal() ??
      this.partida()?.limiteOciosidade ??
      LIMITE_OCIOSIDADE_PADRAO.ISOLATEUS,
  );
  protected readonly salvandoLimite = signal(false);
  protected readonly descontarDe = signal<string | null>(null);
  protected readonly descontando = signal(false);
  protected readonly jogadorDesconto = computed(() => {
    const id = this.descontarDe();
    return id ? this.logDe(id) : null;
  });
  protected readonly podeDescontar = computed(
    () => !!this.partida()?.turmaId && this.partida()?.valeRanking !== false,
  );
  protected logDe(alunoId: string) {
    return this.partida()?.logPontuacao?.find((l) => l.alunoId === alunoId) ?? null;
  }

  protected mudarLimite(limite: number): void {
    this.limiteLocal.set(limite);
    this.salvandoLimite.set(true);
    this.ociosidadeApi.definirLimite('ISOLATEUS', this.matchId, limite).subscribe({
      next: () => this.salvandoLimite.set(false),
      error: () => {
        this.limiteLocal.set(null);
        this.salvandoLimite.set(false);
      },
    });
  }

  protected confirmarDesconto(d: { modo: 'ZERAR_PARTIDA' | 'VALOR'; pontos?: number }): void {
    const alunoId = this.descontarDe();
    if (!alunoId) return;
    this.descontando.set(true);
    this.ociosidadeApi.descontar('ISOLATEUS', this.matchId, { alunoId, ...d }).subscribe({
      next: () => {
        this.descontando.set(false);
        this.descontarDe.set(null);
      },
      error: () => this.descontando.set(false),
    });
  }

  protected mudarValeRanking(vale: boolean): void {
    this.valeRankingLocal.set(vale);
    this.salvandoValeRanking.set(true);
    this.erro.set(null);
    this.api.definirValeRanking(this.matchId, vale).subscribe({
      next: () => this.salvandoValeRanking.set(false),
      error: () => {
        // O servidor recusou (ex.: a partida começou): volta ao valor real.
        this.valeRankingLocal.set(null);
        this.salvandoValeRanking.set(false);
        this.erro.set('Não foi possível mudar se a partida vale para o ranking.');
      },
    });
  }

  protected iniciar(): void {
    this.acao(
      this.api.iniciar(this.matchId, {
        debateHabilitado: this.debateHabilitado(),
      }),
    );
  }
  /** O rótulo do pulo na fase corrente; `null` = fase sem cronômetro. */
  protected rotuloPular(p: IsolateusMatch): string | null {
    switch (p.status) {
      case 'DESLOCAMENTO':
        return 'Pular noite';
      case 'QUESTAO_ATIVA':
        return 'Encerrar questão';
      // O Dia saiu (034 #43): sem "Adiantar noite". Uma partida antiga parada
      // aqui avança sozinha pelo relógio.
      case 'RESULTADO_RODADA':
        return null;
      case 'QUARENTENA_DEBATE':
        return 'Pular debate';
      case 'QUARENTENA_VOTO':
        return 'Encerrar votação';
      case 'RESGATE_VOTO':
        return 'Encerrar resgate';
      default:
        return null;
    }
  }

  /**
   * Pula o tempo restante. Manda a fase exibida: se a partida já virou (o
   * relógio zerou no mesmo instante), o servidor ignora o clique atrasado.
   */
  protected pular(p: IsolateusMatch): void {
    this.acao(this.api.pularFase(this.matchId, p.status));
  }
  /** Delírio Coletivo imediato: todos trocam de codinome (anti-trapaça). */
  protected delirio(): void {
    this.confirmarDelirio.set(false);
    this.acao(this.api.delirio(this.matchId));
  }
  protected readonly podePausar = podePausar;
  protected pausar(): void {
    this.acao(this.api.pausar(this.matchId));
  }
  protected retomar(): void {
    this.acao(this.api.retomar(this.matchId));
  }
  /** O sinal da aula bateu: a investigação termina onde está. */
  protected encerrar(): void {
    this.confirmarFim.set(false);
    this.acao(this.api.encerrar(this.matchId));
  }

  private acao(obs: {
    subscribe: (o: {
      next: () => void;
      error: (e: { error?: { message?: string } }) => void;
    }) => void;
  }): void {
    this.ocupado.set(true);
    this.erro.set(null);
    obs.subscribe({
      next: () => this.ocupado.set(false),
      error: (e) => {
        this.ocupado.set(false);
        this.erro.set(e.error?.message ?? 'Não foi possível concluir a ação.');
      },
    });
  }
}
