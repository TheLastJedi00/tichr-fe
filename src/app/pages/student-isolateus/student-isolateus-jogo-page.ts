import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IsolateusCanalService } from '../../core/isolateus-canal.service';
import { MAPA, rotuloBrilho, setoresBrilhando } from '../../core/isolateus-mapa';
import { IsolateusMatch } from '../../core/models';
import { CENA, objetoCentralDe, portasDe, xDaPorta } from '../../isolateus/cenas/cenas.data';
import { HabitanteDaCena } from '../../isolateus/cenas/cena-phaser';
import { mensagemDoTurno } from '../../isolateus/isolateus-mensagens';
import { motivoDaRecusa, textoDoMotivo } from '../../isolateus/isolateus-motivos';
import { IconePixel } from '../../ui/icone-pixel/icone-pixel';
import { IsolateusCena } from '../../ui/isolateus-cena/isolateus-cena';
import { IsolateusMapaPixel } from '../../ui/isolateus-mapa-pixel/isolateus-mapa-pixel';
import { IsolateusVotacao, OpcaoDeVoto } from '../../ui/isolateus-votacao/isolateus-votacao';
import { LogPontuacaoComponent } from '../../ui/log-pontuacao/log-pontuacao';
import { Spinner } from '../../ui/spinner/spinner';
import { StudentIsolateusPage } from './student-isolateus-page';

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Sobreposicao = 'PERSONAGEM' | 'MAPA' | 'DIARIO' | null;
interface Aviso {
  texto: string;
  tipo: '' | 'alien' | 'warn';
}

/** Os eventos do amanhecer que viram aviso na tela (depois da animação). */
const EVENTOS_DO_AMANHECER = new Set([
  'SABOTAGEM',
  'ABDUCAO',
  'REPELIDA',
  'RESTAURADO',
  'REPARO_FALHOU',
  'DELIRIO',
  'BRILHO',
  'RESGATE',
  'QUARENTENA',
  'INVASAO',
]);

/**
 * O Isolateus em pixel art, tela cheia (spec 034). Estende a página atual — que
 * vira o **modo simples** — para reaproveitar toda a lógica (painel, ações da
 * noite, relógio, votos) e troca só o visual: uma cena Phaser por setor, HUD
 * retrô e todos os menus como sobreposições.
 *
 * As regras não mudam: a porta é o `mover`, ficar é o `confirmar-posicao`, e a
 * posição dentro do setor é só visual (canal do RTDB, escrito só pelo backend).
 */
@Component({
  selector: 'app-student-isolateus-jogo-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Spinner,
    IconePixel,
    IsolateusCena,
    IsolateusMapaPixel,
    IsolateusVotacao,
    LogPontuacaoComponent,
  ],
  template: `
    <div class="tela">
      @if (carregando()) {
        <div class="vazio"><app-spinner [size]="30" /></div>
      } @else if (partida(); as p) {
        <div class="px-stage palco" #palco>
          @if (visual(); as v) {
            @if (v.status !== 'LOBBY') {
              <app-isolateus-cena
                class="cena"
                [setorId]="setorPublico()"
                [intacto]="setorIntacto()"
                [habitantes]="habitantesDaCena()"
                [posicoes]="posicoes()"
                [portas]="portas()"
                [portasAbertas]="portasAbertas()"
                [objeto]="objeto()"
                [objetoBloqueado]="!!motivoObjeto()"
                [ocultarMeuNome]="ocultarNome()"
                [pausada]="!!p.pausadaEm"
                [cortina]="cortina()"
                [rotuloDaPorta]="rotuloDaPorta"
                (tocarChao)="aoTocarChao($event)"
                (tocarMeuBoneco)="abrir('PERSONAGEM')"
                (tocarObjeto)="aoTocarObjeto()"
                (tocarPorta)="aoTocarPorta($event.para)"
                (luzDaPorta)="aoLuzDaPorta($event)"
              />
            }
          }

          <div class="hud">
            @if (p.status !== 'LOBBY') {
              <div class="hud-esq">
                <div class="px-box esperanca" title="Esperança da Vila">
                  <span class="px-titulo esperanca__rot">ESPERANÇA</span>
                  <div class="px-barra" [class]="classeEsperanca()">
                    @for (i of segmentos; track i) {
                      <i [class.on]="i < segmentosAcesos()"></i>
                    }
                  </div>
                  <span class="px-titulo esperanca__num">{{ p.esperanca }}</span>
                </div>
                @if (p.esperanca <= 0) {
                  <div class="px-box colapso px-titulo px-blink">COLAPSO</div>
                }
                @if (meuHabitante()) {
                  <div class="px-box chip">
                    <button type="button" aria-label="Abrir meu personagem" (click)="abrir('PERSONAGEM')">
                      <b>{{ meuCodinomeExibido() }}</b>
                      @if (novidadePersonagem() || (energia()?.cheia && ehAmeaca())) {
                        <span class="chip__ponto" [class.chip__ponto--alien]="energia()?.cheia"></span>
                      }
                    </button>
                    <button
                      type="button"
                      [attr.aria-pressed]="ocultarNome()"
                      [attr.aria-label]="ocultarNome() ? 'Mostrar meu codinome' : 'Ocultar meu codinome'"
                      (click)="alternarNome()"
                    >
                      {{ ocultarNome() ? '◌' : '◉' }}
                    </button>
                  </div>
                }
              </div>

              <div class="hud-topo">
                <div class="px-box turno">
                  <div class="px-titulo turno__tt">
                    <span>{{ mensagem().titulo }}</span>
                    @if (relogioVisivel()) {
                      <span class="turno__rel" [class.px-blink]="segundos() <= 10">{{ relogioTexto() }}</span>
                    }
                  </div>
                  <p>{{ mensagem().texto }}</p>
                  @if (linhaExtra(); as extra) {
                    <p class="turno__extra">{{ extra }}</p>
                  }
                  @if (naNoite()) {
                    @if (meuDestino(p); as d) {
                      <p class="turno__ok turno__ok--sai">Saindo para o {{ nomeSetor(p, d) }}</p>
                    } @else if (posicaoFeita()) {
                      <p class="turno__ok">Você fica no {{ nomeSetor(p, setorPublico()) }} esta noite.</p>
                    }
                    <div class="turno__acts">
                      <button class="px-btn" type="button" [disabled]="enviando()" (click)="aoFicar()">
                        Ficar neste setor
                      </button>
                    </div>
                  }
                </div>
              </div>

              <button class="px-box mini" type="button" aria-label="Abrir o mapa da vila" (click)="abrir('MAPA')">
                <app-isolateus-mapa-pixel
                  [setores]="p.setores"
                  [meuSetor]="setorPublico()"
                  [brilhando]="brilhando(p)"
                />
                <span class="mini__exp">[+]</span>
              </button>

              <div class="hud-ferr">
                <button class="px-btn" type="button" (click)="abrir('DIARIO')">DIÁRIO</button>
                <button class="px-btn" type="button" (click)="telaCheia()">TELA CHEIA</button>
                <a class="px-btn" routerLink="/aluno/isolateus/simples" (click)="guardarModo('simples')">MODO SIMPLES</a>
              </div>

              @if (painel()?.ociosidade; as oc) {
                @if (oc.faltas > 0) {
                  <div class="px-box aviso-oc" [class.px-blink]="oc.ocioso">
                    Atenção: {{ oc.faltas }} {{ oc.faltas === 1 ? 'fase' : 'fases' }} sem jogar (limite {{ oc.limite }}).
                  </div>
                }
              }
            }

            @if (aviso$(); as a) {
              <div class="px-box toast" [class.toast--alien]="a.tipo === 'alien'" [class.toast--warn]="a.tipo === 'warn'" role="status">
                {{ a.texto }}
              </div>
            }

            <!-- As sobreposições: menus e telas viram caixas retrô sobre a cena. -->
            @if (sobreposicaoAtual(); as so) {
              <div class="overlay" (click)="fecharSobreposicao()">
                <div class="px-box painel" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
                  @if (podeFechar()) {
                    <button class="px-btn x" type="button" aria-label="Fechar" (click)="fecharSobreposicao()">X</button>
                  }
                  @switch (so) {
                    @case ('LOBBY') {
                      <h2 class="px-titulo tit">ARQUIVO: ISOLATEUS</h2>
                      @if (inscrito(p)) {
                        <p><b>Aguardando Comando Central.</b> Seu codinome será revelado quando a investigação começar.</p>
                        @if (p.valeRanking === false) { <p class="dim">Partida casual: não soma no ranking.</p> }
                      } @else {
                        @if (removido()) { <p class="aviso">O Comando Central tirou você desta investigação. Se foi engano, entre de novo.</p> }
                        <p>
                          A vila está isolada. Moradores desaparecem à noite e a ameaça está entre vocês.
                          Ninguém usa o nome verdadeiro: você será conhecido por um <b>codinome de cidade</b>.
                        </p>
                        @if (erro()) { <p class="aviso">{{ erro() }}</p> }
                        <div class="col">
                          <button class="px-btn px-btn--blue" type="button" [disabled]="enviando()" (click)="entrar()">
                            {{ enviando() ? 'Registrando…' : 'Entrar na vila' }}
                          </button>
                        </div>
                      }
                    }
                    @case ('DESPERTAR') {
                      <h2 class="px-titulo tit">A VILA DESPERTOU</h2>
                      <p>Seu codinome é <b>{{ meuCodinomeExibido() }}</b>.</p>
                      <p>Toque no seu personagem para ver o seu papel e as suas ações. Discrição: ninguém precisa saber o que você é.</p>
                    }
                    @case ('RESULTADO') {
                      <h2 class="px-titulo tit">RESULTADO DA RODADA</h2>
                      @if (p.vereditoQuarentena; as vq) { <p [class.ok]="vq.eraAmeaca">{{ vq.texto }}</p> }
                      @if (p.resumoRodada; as r) { <p [class.ok]="r.defendida">{{ r.texto }}</p> }
                      @if (p.resgateResultado; as rg) {
                        <p class="ok">
                          @if (rg.semVotacao) { {{ rg.nome }} era o único fora da vila e voltou sem votação. }
                          @else { {{ rg.nome }} foi resgatado e voltou à vila. }
                        </p>
                      }
                      @if (p.questaoPublica && p.corretaIndex !== null && p.corretaIndex !== undefined) {
                        <p class="dim">Resposta correta: <b>{{ letra(p.corretaIndex) }}) {{ p.questaoPublica.alternativas[p.corretaIndex] }}</b></p>
                      }
                      <p class="dim">A noite começa em {{ espera() }}s.</p>
                    }
                    @case ('QUESTAO') {
                      @if (p.alerta; as a) { <p class="alerta">{{ a.texto }}</p> }
                      <h2 class="px-titulo tit">QUESTÃO DO COMANDO CENTRAL</h2>
                      @if (p.questaoPublica; as q) {
                        <p>{{ q.enunciado }}</p>
                        <div class="grade2">
                          @for (alt of q.alternativas; track $index) {
                            <button
                              class="px-btn"
                              [class.px-btn--blue]="respostaIndex() === $index"
                              type="button"
                              [disabled]="respostaIndex() !== null"
                              (click)="responder($index)"
                            >{{ letra($index) }}) {{ alt }}</button>
                          }
                        </div>
                        @if (respostaIndex() !== null) { <p class="dim">{{ motivo('JA_RESPONDI') }}</p> }
                      }
                      @if (foraDaVila()) {
                        <p class="dim">{{ motivo('FORA_DA_VILA') }}</p>
                        <h3 class="px-titulo sub">SINAIS DE RÁDIO</h3>
                        @for (r of sinais(p); track r.id) { <p class="sinal">[Sinal] {{ r.texto }}</p> } @empty { <p class="dim">Silêncio absoluto…</p> }
                        <form (submit)="sinal($event)" class="col">
                          <textarea class="entrada" rows="2" maxlength="240" [value]="sinalTexto()" (input)="sinalTexto.set($any($event.target).value)" placeholder="Sinal anônimo para os sobreviventes…"></textarea>
                          @if (avisoSinal()) { <p class="aviso">{{ avisoSinal() }}</p> }
                          <button class="px-btn" type="submit" [disabled]="enviando() || !sinalTexto().trim()">Enviar sinal</button>
                        </form>
                      } @else {
                        @if (sinais(p).length) {
                          <h3 class="px-titulo sub">SINAIS DE RÁDIO</h3>
                          @for (r of sinais(p); track r.id) { <p class="sinal">[Sinal] {{ r.texto }}</p> }
                        }
                      }
                    }
                    @case ('DEBATE') {
                      <h2 class="px-titulo tit">QUARENTENA · DEBATE</h2>
                      @if (p.quarentenaConvocadaPor; as c) { <p class="dim">Convocada por <b>{{ c.nome }}</b></p> }
                      <div class="debate">
                        @for (m of p.debate; track m.id) { <p><b>{{ m.autorNome }}</b> {{ m.texto }}</p> }
                      </div>
                      @if (!foraDaVila()) {
                        <form (submit)="debater($event)" class="col">
                          <textarea class="entrada" rows="2" maxlength="240" [value]="debateTexto()" (input)="debateTexto.set($any($event.target).value)" placeholder="Acuse, defenda-se, diga onde você passou a noite…"></textarea>
                          @if (avisoDebate()) { <p class="aviso">{{ avisoDebate() }}</p> }
                          <button class="px-btn" type="submit" [disabled]="enviando() || !debateTexto().trim()">Falar</button>
                        </form>
                        @if (jaPulei()) { <p class="dim">Você já está pronto. Aguardando os outros ({{ p.pulosRecebidos ?? 0 }} pularam).</p> }
                        @else { <button class="px-btn" type="button" [disabled]="enviando()" (click)="pular()">Pular o debate</button> }
                      } @else { <p class="dim">{{ motivo('FORA_DA_VILA_VOTO') }}</p> }
                    }
                    @case ('VOTO') {
                      <app-isolateus-votacao
                        tipo="QUARENTENA"
                        [opcoes]="opcoesDeVoto(p, 'QUARENTENA')"
                        [motivo]="motivoDoVoto(false)"
                        [desabilitado]="enviando()"
                        (votar)="votar($event)"
                      />
                    }
                    @case ('RESGATE') {
                      <app-isolateus-votacao
                        tipo="RESGATE"
                        [opcoes]="opcoesDeVoto(p, 'RESGATE')"
                        [motivo]="motivoDoVoto(true)"
                        [desabilitado]="enviando()"
                        (votar)="votarResgate($event)"
                      />
                    }
                    @case ('PERSONAGEM') {
                      @if (painel(); as pn) {
                        @if (pn.papel === 'AMEACA') {
                          <h2 class="px-titulo tit tit--alien">SUA JOGADA, AMEAÇA</h2>
                        } @else {
                          <h2 class="px-titulo tit">SEU PERSONAGEM</h2>
                        }
                        <p>Codinome: <b>{{ meuCodinomeExibido() }}</b> · Papel: <b>{{ pn.papel === 'AMEACA' ? 'Ameaça' : 'Aldeão' }}</b></p>
                        @if (aviso(); as msg) {
                          <p class="alerta">{{ msg }} <button class="px-btn mini-x" type="button" (click)="aviso.set(null)">ok</button></p>
                        }
                        @if (pn.papel === 'AMEACA') {
                          @if (energia(); as en) {
                            <div class="energia" [class.energia--cheia]="en.cheia">
                              <app-icone-pixel nome="ENERGIA" class="ico ico--sm" />
                              <span class="px-titulo energia__rot">ENERGIA</span>
                              <div class="energia__segs">
                                @for (i of segmentosEnergia(); track i) { <i [class.on]="i < en.atual"></i> }
                              </div>
                              <span class="energia__txt">{{ en.texto }}</span>
                            </div>
                          }
                          <div class="poderes">
                            @for (card of cardsDePoder; track card.id) {
                              <button
                                class="px-btn px-btn--alien poder"
                                [class.px-btn--off]="!poderLiberado(p, card.id)"
                                type="button"
                                (click)="aoEscolherPoder(p, card.id)"
                              >
                                <app-icone-pixel [nome]="iconeDoPoder(card.id)" class="ico ico--poder" />
                                <b>{{ card.nome.toUpperCase() }}</b>
                                <small>{{ resumoDoPoder(card.id) }}</small>
                                @if (!poderLiberado(p, card.id)) {
                                  <small class="poder__motivo"><app-icone-pixel nome="CADEADO" class="ico ico--mini" /> {{ motivoDoPoder(p, card.id) }}</small>
                                }
                              </button>
                            }
                          </div>
                          @if (escolhendoControle()) {
                            <p>Escolha o habitante que você vai controlar nesta noite.</p>
                            <div class="grade3">
                              @for (h of controlaveis(p); track h.id) {
                                <button class="px-btn px-btn--alien" type="button" [disabled]="enviando()" (click)="usarPoder('CONTROLE', h.id)">{{ h.nome }}</button>
                              } @empty { <span class="dim">Não há ninguém para controlar.</span> }
                            </div>
                          }
                          @if (erroPoder()) { <p class="aviso">{{ erroPoder() }}</p> }
                          @if (naNoite() && !foraDaVila()) {
                            @if (acaoFeita()) {
                              <p class="dim">Jogada enviada. Ninguém saberá que foi você.</p>
                            } @else if (escolhendoSetor()) {
                              <p>Abdução às cegas: escolha um setor (você não sabe quem está lá), ou a vítima no seu setor.</p>
                              <div class="grade3">
                                @for (s of p.setores; track s.id) {
                                  @if (s.id !== setorDeAcao(p)) {
                                    <button class="px-btn px-btn--alien" type="button" [disabled]="enviando()" (click)="abduzirAsCegas(s.id)">{{ s.nome }}</button>
                                  }
                                }
                              </div>
                              <div class="grade3">
                                @for (h of alvosPresenciais(p); track h.id) {
                                  <button class="px-btn px-btn--alien" type="button" [disabled]="enviando()" (click)="abduzirAqui(h.id)">{{ h.nome }}</button>
                                } @empty { <span class="dim">{{ motivo('SEM_ALVO_AQUI') }}</span> }
                              </div>
                              <button class="px-btn" type="button" (click)="escolhendoSetor.set(false)">Voltar</button>
                            } @else {
                              <div class="col">
                                <button class="px-btn px-btn--alien btn-ico" type="button" [class.px-btn--off]="!setorDeAcaoIntacto(p)" [disabled]="enviando()" (click)="aoSabotar(p)">
                                  <app-icone-pixel nome="SABOTAR" class="ico ico--sm" /> Sabotar {{ setorDeAcaoNome(p) }}
                                </button>
                                @if (!setorDeAcaoIntacto(p)) { <small class="dim">{{ motivo('SETOR_EM_RUINAS') }}</small> }
                                <button class="px-btn px-btn--alien btn-ico" type="button" [disabled]="enviando()" (click)="escolhendoSetor.set(true)">
                                  <app-icone-pixel nome="ABDUZIR" class="ico ico--sm" /> Abduzir
                                </button>
                                <button class="px-btn btn-ico" type="button" [disabled]="enviando()" (click)="aguardar()">
                                  <app-icone-pixel nome="AGUARDAR" class="ico ico--sm" /> Passar a noite
                                </button>
                              </div>
                            }
                          } @else if (acaoFeita()) {
                            <p class="dim">{{ motivo('JOGADA_FEITA') }}</p>
                          } @else if (!naNoite()) {
                            <p class="dim">As jogadas da Ameaça acontecem à noite.</p>
                          }
                          @if (pn.invasao; as inv) {
                            @if (inv.declarada) { <p class="ok">Invasão declarada. Prepare-se para a questão.</p> }
                            @else if (inv.disponivel) {
                              <button class="px-btn px-btn--alien" type="button" [disabled]="enviando()" (click)="invadir()">Forçar invasão</button>
                            }
                          }
                          @if (erro()) { <p class="aviso">{{ erro() }}</p> }
                        } @else {
                          <p>
                            Descubra quem é a Ameaça, mantenha os setores funcionando e responda
                            bem às questões para manter a Esperança da Vila.
                          </p>
                          @if (aviso() === null && erro()) { <p class="aviso">{{ erro() }}</p> }
                        }
                        <div class="col">
                          <button class="px-btn" type="button" (click)="alternarNome()">{{ ocultarNome() ? 'Mostrar meu nome' : 'Ocultar meu nome' }}</button>
                        </div>
                      }
                    }
                    @case ('MAPA') {
                      <h2 class="px-titulo tit">MAPA DA VILA</h2>
                      <app-isolateus-mapa-pixel [setores]="p.setores" [meuSetor]="setorPublico()" [brilhando]="brilhando(p)" [grande]="true" />
                      <p class="dim">{{ contagemBrilho(p) }}</p>
                      <div class="legenda">
                        <span><i style="background:#475569"></i>Intacto</span>
                        <span><i style="background:#7f1d1d"></i>Sabotado</span>
                        <span><i style="background:#fcd34d"></i>Você está aqui</span>
                      </div>
                    }
                    @case ('DIARIO') {
                      <h2 class="px-titulo tit">DIÁRIO DA VILA</h2>
                      <div class="diario">
                        @for (e of diarioOrdenado(p); track e.id) {
                          <p><small class="dim">Noite {{ e.noite + 1 }}</small> {{ e.texto }}</p>
                        } @empty { <p class="dim">Nada aconteceu ainda.</p> }
                      </div>
                    }
                    @case ('FIM') {
                      @if (p.veredito; as vd) {
                        <h2 class="px-titulo tit" [class.tit--alien]="!ganhei(vd.lado)">{{ ganhei(vd.lado) ? 'VOCÊ VENCEU!' : 'VOCÊ PERDEU.' }}</h2>
                        <p>{{ vd.motivo }}</p>
                        @if (alien(); as a) {
                          <p class="dim">O Alienígena era <b>{{ a.jogador ?? a.nome }}</b>@if (a.jogador) { ({{ a.nome }}) }</p>
                        }
                      }
                      @if (minhaPosicao(p); as eu) {
                        <p>
                          Você terminou em {{ eu.posicao }}º com <b>{{ eu.pontos }}</b> pontos,
                          @if (p.valeRanking === false) { mas a partida foi casual e eles não somaram no ranking. }
                          @else { somados ao seu XP do portal. }
                        </p>
                      }
                      @if (p.logPontuacao) {
                        <ol class="placar">
                          @for (r of p.rankingFinal; track r.alunoId) {
                            <li [class.placar--eu]="r.alunoId === meuId" (click)="logAberto.set(r.alunoId)">
                              <span>{{ r.posicao }}º</span>
                              <span class="placar__nome">
                                @if (r.jogador) { <small class="dim">{{ r.jogador }}</small> }
                                {{ r.nome }}
                                @if (r.papel; as papel) { <b class="placar__papel">{{ rotuloPapel[papel] }}</b> }
                              </span>
                              <span>{{ r.pontos }}</span>
                            </li>
                          }
                        </ol>
                        <p class="dim">Toque em um habitante para ver de onde vieram os pontos.</p>
                      }
                      <div class="col"><a class="px-btn" routerLink="/aluno/dashboard">Voltar ao início</a></div>
                    }
                  }
                </div>
              </div>
            }

            @if (p.pausadaEm) {
              <div class="overlay overlay--pausa"><div class="px-box painel"><div class="px-titulo px-blink pausado">PAUSADO</div><p class="centro">O professor pausou a partida.</p></div></div>
            }
          </div>

          @if (p.logPontuacao) {
            <app-log-pontuacao
              modo="sheet"
              [jogador]="logJogador()"
              [posicao]="logPosicao()"
              [unidade]="unidade()"
              [temTurma]="!!p.turmaId"
              [casual]="p.valeRanking === false"
              (fechar)="logAberto.set(null)"
            />
          }
        </div>
      } @else {
        <section class="vazio">
          <h1 class="px-titulo">NENHUMA INVESTIGAÇÃO AGORA</h1>
          <p>Quando o professor abrir a vila, ela aparece aqui.</p>
          <a class="px-btn" routerLink="/aluno/dashboard">Voltar ao início</a>
        </section>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    /* Tela cheia sobre o layout do aluno (cabeçalho e menu inferior). */
    .tela { position: fixed; inset: 0; z-index: 60; background: #000; display: flex; align-items: center; justify-content: center; }
    .vazio { color: #e2e8f0; text-align: center; padding: 2rem; font-family: 'Pixelify Sans', system-ui, sans-serif; display: flex; flex-direction: column; gap: 1rem; align-items: center; }
    .vazio .px-btn { text-decoration: none; display: inline-block; padding: 0.6rem 1rem; }
    .palco { --b: max(2px, 0.42cqw); width: min(100vw, calc(100svh * 16 / 9)); aspect-ratio: 16 / 9; min-width: 280px; }
    .palco:fullscreen { width: min(100vw, calc(100vh * 16 / 9)); }
    .cena { position: absolute; inset: 0; }
    .hud { position: absolute; inset: 0; pointer-events: none; font-size: calc(var(--u) * 1.75); }
    .hud > * { pointer-events: auto; }

    .hud-esq { position: absolute; left: calc(var(--u) * 1.6); top: calc(var(--u) * 1.6); display: flex; flex-direction: column; gap: calc(var(--u) * 1.2); pointer-events: none; }
    .hud-esq > * { pointer-events: auto; }
    .esperanca { display: flex; align-items: center; gap: calc(var(--u) * 0.8); padding: calc(var(--u) * 0.6) calc(var(--u) * 0.9); }
    .esperanca__rot, .esperanca__num { font-size: calc(var(--u) * 0.9); }
    .esperanca__rot { color: var(--px-alien); }
    .colapso { width: max-content; padding: calc(var(--u) * 0.5) calc(var(--u) * 1); color: var(--px-red); font-size: calc(var(--u) * 1); }
    .chip { display: flex; align-items: center; gap: calc(var(--u) * 0.6); padding: calc(var(--u) * 0.45) calc(var(--u) * 0.7); width: max-content; }
    .chip button { font: inherit; background: none; border: 0; color: var(--px-txt); cursor: pointer; padding: 0; display: flex; align-items: center; gap: calc(var(--u) * 0.6); }
    .chip b { font-family: 'Press Start 2P', monospace; font-size: calc(var(--u) * 1.05); font-weight: 400; }
    .chip__ponto { width: calc(var(--u) * 1); height: calc(var(--u) * 1); background: var(--px-red); display: inline-block; animation: px-blink 1s steps(2) infinite; }
    .chip__ponto--alien { background: var(--px-alien); }

    .hud-topo { position: absolute; top: calc(var(--u) * 1.6); left: 50%; transform: translateX(-50%); width: 40cqw; }
    .turno { padding: calc(var(--u) * 0.8) calc(var(--u) * 1.2); text-align: center; }
    .turno__tt { font-size: calc(var(--u) * 0.95); color: var(--px-amber-lt); display: flex; justify-content: space-between; gap: var(--u); margin-bottom: calc(var(--u) * 0.5); }
    .turno__rel { color: var(--px-txt); }
    .turno p { margin: 0; font-size: calc(var(--u) * 1.55); line-height: 1.25; }
    .turno__extra { margin-top: calc(var(--u) * 0.5) !important; color: var(--px-txt-dim); font-size: calc(var(--u) * 1.3) !important; }
    .turno__ok { color: var(--px-green); font-weight: 600; margin-top: calc(var(--u) * 0.5) !important; }
    .turno__ok--sai { color: var(--px-amber-lt); }
    .turno__acts { margin-top: calc(var(--u) * 0.8); display: flex; gap: var(--u); justify-content: center; flex-wrap: wrap; }
    .turno__acts .px-btn { font-size: calc(var(--u) * 1.4); }

    .mini { position: absolute; right: calc(var(--u) * 1.6); top: calc(var(--u) * 1.6); padding: calc(var(--u) * 0.5); border: 0; cursor: pointer; width: 18cqw; background: var(--px-box); }
    .mini__exp { position: absolute; right: calc(var(--u) * 0.6); bottom: calc(var(--u) * 0.4); font-family: 'Press Start 2P', monospace; font-size: calc(var(--u) * 0.9); color: var(--px-txt-dim); }
    .hud-ferr { position: absolute; right: calc(var(--u) * 1.6); bottom: calc(var(--u) * 1.4); display: flex; gap: calc(var(--u) * 0.8); }
    .hud-ferr .px-btn { font-size: calc(var(--u) * 1.1); padding: calc(var(--u) * 0.5) calc(var(--u) * 0.9); text-decoration: none; }
    .aviso-oc { position: absolute; left: calc(var(--u) * 1.6); bottom: calc(var(--u) * 1.4); padding: calc(var(--u) * 0.6) calc(var(--u) * 1); color: var(--px-amber-lt); font-size: calc(var(--u) * 1.3); max-width: 40cqw; }

    .toast { position: absolute; left: 50%; bottom: calc(var(--u) * 6); transform: translateX(-50%); padding: calc(var(--u) * 0.9) calc(var(--u) * 1.4); font-size: calc(var(--u) * 1.6); max-width: 66cqw; text-align: center; pointer-events: none !important; }
    .toast--alien { --px-line: var(--px-alien); color: var(--px-alien); }
    .toast--warn { --px-line: var(--px-amber); color: var(--px-amber-lt); }

    .overlay { position: absolute; inset: 0; background: rgba(5, 7, 15, 0.72); display: flex; align-items: center; justify-content: center; }
    .overlay--pausa { z-index: 5; }
    .painel { position: relative; width: min(64cqw, 94%); max-height: 86cqh; overflow: auto; padding: calc(var(--u) * 2) calc(var(--u) * 2.2); font-size: calc(var(--u) * 1.7); }
    .painel p { margin: 0 0 calc(var(--u) * 1.1); }
    .tit { font-size: calc(var(--u) * 1.4); color: var(--px-amber-lt); margin: 0 0 calc(var(--u) * 1.3); padding-right: calc(var(--u) * 3); }
    .tit--alien { color: var(--px-alien); }
    .sub { font-size: calc(var(--u) * 1.1); color: var(--px-txt-dim); margin: calc(var(--u) * 1) 0 calc(var(--u) * 0.6); font-weight: 400; }
    .x { position: absolute; top: calc(var(--u) * 1.2); right: calc(var(--u) * 1.2); font-size: calc(var(--u) * 1.3) !important; padding: calc(var(--u) * 0.3) calc(var(--u) * 0.7) !important; }
    .col { display: flex; flex-direction: column; gap: calc(var(--u) * 1); align-items: stretch; margin-top: calc(var(--u) * 1); }
    .col .px-btn, .panel .px-btn { font-size: calc(var(--u) * 1.5); text-align: left; text-decoration: none; }
    .grade2 { display: grid; grid-template-columns: 1fr 1fr; gap: calc(var(--u) * 1.2); margin-bottom: calc(var(--u) * 1); }
    .grade3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(var(--u) * 1); margin: calc(var(--u) * 0.8) 0; }
    .grade2 .px-btn, .grade3 .px-btn { font-size: calc(var(--u) * 1.45); text-align: left; }
    .dim { color: var(--px-txt-dim); }
    .ok { color: var(--px-green); }
    .aviso { color: var(--px-amber-lt); }
    .alerta { color: var(--px-amber-lt); border-left: var(--b) solid var(--px-amber); padding-left: calc(var(--u) * 1); }
    .sinal { font-size: calc(var(--u) * 1.4); color: var(--px-alien); }
    .debate, .diario { max-height: 30cqh; overflow: auto; margin-bottom: calc(var(--u) * 1); }
    .debate p, .diario p { margin: 0 0 calc(var(--u) * 0.6); font-size: calc(var(--u) * 1.45); }
    .entrada { font: inherit; width: 100%; background: #0a1122; color: var(--px-txt); border: var(--b) solid var(--px-line-dim); padding: calc(var(--u) * 0.6); resize: none; }
    .centro { text-align: center; }
    .pausado { font-size: calc(var(--u) * 3.4); color: var(--px-amber-lt); text-align: center; }
    .legenda { display: flex; gap: calc(var(--u) * 2); flex-wrap: wrap; margin-top: calc(var(--u) * 1); font-size: calc(var(--u) * 1.4); color: var(--px-txt-dim); }
    .legenda i { display: inline-block; width: calc(var(--u) * 1.4); height: calc(var(--u) * 1.4); margin-right: calc(var(--u) * 0.5); vertical-align: middle; }
    .placar { list-style: none; margin: 0 0 var(--u); padding: 0; max-height: 28cqh; overflow: auto; }
    .placar li { display: grid; grid-template-columns: 3em 1fr auto; gap: var(--u); padding: calc(var(--u) * 0.5) 0; border-bottom: var(--b) solid var(--px-line-dim); cursor: pointer; font-size: calc(var(--u) * 1.5); }
    .placar--eu { color: var(--px-amber-lt); }
    .placar__papel { margin-left: calc(var(--u) * 0.6); color: var(--px-alien); font-weight: 600; }

    .energia { display: flex; align-items: center; gap: calc(var(--u) * 1.2); margin: 0 0 calc(var(--u) * 1.2); padding: calc(var(--u) * 0.9) calc(var(--u) * 1.2); background: #0a1122; box-shadow: inset 0 0 0 var(--b) #0f5132; }
    .energia__rot { font-size: calc(var(--u) * 0.95); color: var(--px-alien); }
    .energia__segs { display: flex; gap: calc(var(--u) * 0.5); flex: 1; }
    .energia__segs i { flex: 1; height: calc(var(--u) * 2.2); background: #1f2937; display: block; }
    .energia__segs i.on { background: var(--px-alien); }
    .energia--cheia .energia__segs i.on { animation: px-blink 0.9s steps(2) infinite; }
    .energia__txt { font-size: calc(var(--u) * 1.3); color: var(--px-txt-dim); }
    .energia--cheia .energia__txt { color: var(--px-alien); }
    .poderes { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(var(--u) * 1.2); margin-bottom: calc(var(--u) * 1.4); }
    .poder { display: flex; flex-direction: column; align-items: center; gap: calc(var(--u) * 0.6); text-align: center !important; padding: var(--u) !important; }
    .poder b { font-family: 'Press Start 2P', monospace; font-weight: 400; font-size: calc(var(--u) * 0.8); line-height: 1.5; }
    .poder small { font-size: calc(var(--u) * 1.1); color: var(--px-txt-dim); line-height: 1.25; }
    .poder__motivo { display: flex; align-items: center; gap: calc(var(--u) * 0.4); }
    .ico { display: inline-block; width: calc(var(--u) * 3.2); }
    .ico--sm { width: calc(var(--u) * 2.2); }
    .ico--poder { width: calc(var(--u) * 5); }
    .ico--mini { width: calc(var(--u) * 1.3); }
    .btn-ico { display: flex; align-items: center; gap: var(--u); }
    .mini-x { font-size: calc(var(--u) * 1.1) !important; padding: calc(var(--u) * 0.2) calc(var(--u) * 0.6) !important; }
  `,
})
export class StudentIsolateusJogoPage extends StudentIsolateusPage implements OnDestroy {
  private readonly canal = inject(IsolateusCanalService);
  private readonly router = inject(Router);
  protected readonly cena = viewChild(IsolateusCena);
  protected readonly palco = viewChild<ElementRef<HTMLElement>>('palco');

  protected readonly segmentos = Array.from({ length: 10 }, (_, i) => i);
  protected readonly posicoes = this.canal.posicoes;

  /** O quadro que a cena desenha: segura o estado antigo durante o amanhecer. */
  protected readonly visual = signal<IsolateusMatch | null>(null);
  protected readonly cortina = signal(0);
  protected readonly amanhecendo = signal(false);
  private readonly aberta = signal<Sobreposicao>(null);
  protected readonly aviso$ = signal<Aviso | null>(null);
  private fila: Aviso[] = [];
  private mostrando = false;
  private destruido = false;
  /** O destino da última luz de porta em que eu entrei (evita repetir o `mover`). */
  private luzEnviada: string | null = null;

  // ---------------------------------------------------------------- estado

  /** O setor que a cena mostra: onde a noite começou (a posição pública). */
  protected readonly setorPublico = computed(
    () => this.meuHabitante()?.setorId ?? this.painel()?.setorId ?? 'seguranca',
  );
  protected readonly setorIntacto = computed(
    () => (this.visual()?.setores.find((s) => s.id === this.setorPublico())?.intacto ?? true),
  );
  protected readonly portas = computed(() => portasDe(this.setorPublico()));
  protected readonly naNoite = computed(() => {
    const p = this.partida();
    return !!p && p.status === 'DESLOCAMENTO' && !this.foraDaVila() && !this.amanhecendo();
  });
  protected readonly portasAbertas = computed(
    () => this.naNoite() && !this.esperando() && !this.partida()?.pausadaEm,
  );
  protected readonly habitantesDaCena = computed<HabitanteDaCena[]>(() => {
    const v = this.visual();
    const eu = this.painel()?.habitanteId;
    if (!v) return [];
    const saindo = new Set((v.deslocamentosNoite ?? []).map((d) => d.habitanteId));
    return v.habitantes
      .filter((h) => h.vivo && !h.preso && h.setorId === this.setorPublico())
      .map((h) => ({
        id: h.id,
        nome: h.nome,
        eu: h.id === eu,
        saindo: saindo.has(h.id) || (h.id === eu && this.meuDestino(v) !== null),
      }));
  });
  protected readonly objeto = computed(() => {
    const p = this.partida();
    if (!p || p.status === 'LOBBY' || p.status === 'ENCERRADO' || this.foraDaVila()) return null;
    return objetoCentralDe(this.setorPublico(), this.setorIntacto());
  });

  /** Por que o objeto do centro não está disponível agora (ou `null`). */
  protected readonly motivoObjeto = computed<string | null>(() => this.motivoDoObjeto());

  protected readonly mensagem = computed(() => {
    const p = this.partida();
    if (!p) return { titulo: '', texto: '' };
    const fase = p.pausadaEm
      ? 'PAUSA'
      : this.amanhecendo()
        ? 'AMANHECER'
        : this.esperando()
          ? 'RESULTADO'
          : p.status;
    return mensagemDoTurno(fase, p.rodada, p.totalRodadas);
  });
  protected readonly linhaExtra = computed<string | null>(() => {
    const p = this.partida();
    if (!p || p.status !== 'DESLOCAMENTO' || this.foraDaVila()) return null;
    // Setor em ruínas com ação própria (#67): o objeto é o reparo, e o motivo do
    // resgate ou da Quarentena aparece aqui.
    const aqui = this.setorPublico();
    if (!this.setorIntacto() && aqui === 'saude') {
      return `Resgate indisponível: ${textoDoMotivo('SAUDE_EM_RUINAS').toLowerCase()}`;
    }
    if (!this.setorIntacto() && aqui === 'comunicacao') {
      return `Quarentena indisponível: ${textoDoMotivo('COMUNICACAO_EM_RUINAS').toLowerCase()}`;
    }
    return null;
  });
  protected readonly relogioVisivel = computed(() => {
    const p = this.partida();
    return !!p && this.limiteVisivel(p.status) && !this.amanhecendo();
  });
  protected readonly segundos = computed(() => (this.esperando() ? this.espera() : this.restante()));
  protected readonly relogioTexto = computed(() => {
    const s = this.segundos();
    const t = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    return this.esperando() ? `COMEÇA ${t}` : t;
  });
  protected readonly segmentosAcesos = computed(() =>
    Math.round(Math.max(0, Math.min(100, this.partida()?.esperanca ?? 0)) / 10),
  );
  protected readonly classeEsperanca = computed(() => {
    const e = this.partida()?.esperanca ?? 0;
    return e >= 60 ? 'px-barra--ok' : e >= 30 ? 'px-barra--meio' : 'px-barra--baixo';
  });

  /** O que está em primeiro plano: fases obrigatórias vencem o que o jogador abriu. */
  protected readonly sobreposicaoAtual = computed<
    | 'LOBBY' | 'DESPERTAR' | 'RESULTADO' | 'QUESTAO' | 'DEBATE' | 'VOTO' | 'RESGATE'
    | 'FIM' | 'PERSONAGEM' | 'MAPA' | 'DIARIO' | null
  >(() => {
    const p = this.partida();
    if (!p) return null;
    if (p.status === 'LOBBY') return 'LOBBY';
    if (this.revelando()) return 'DESPERTAR';
    if (p.status === 'ENCERRADO') return 'FIM';
    if (this.amanhecendo()) return null;
    const escolhida = this.aberta();
    if (escolhida) return escolhida;
    if (this.esperando() && (p.resumoRodada || p.vereditoQuarentena) && !this.resultadoLido()) return 'RESULTADO';
    switch (p.status) {
      case 'QUESTAO_ATIVA': return 'QUESTAO';
      case 'QUARENTENA_DEBATE': return 'DEBATE';
      case 'QUARENTENA_VOTO': return 'VOTO';
      case 'RESGATE_VOTO': return 'RESGATE';
      default: return null;
    }
  });
  protected readonly resultadoLido = signal(false);
  protected readonly podeFechar = computed(() => {
    const so = this.sobreposicaoAtual();
    return so === 'PERSONAGEM' || so === 'MAPA' || so === 'DIARIO' || so === 'RESULTADO';
  });

  protected readonly rotuloDaPorta = (para: string): string =>
    (MAPA.find((s) => s.id === para)?.curto ?? para).toUpperCase();

  constructor() {
    super();
    // O quadro da cena acompanha a partida, exceto enquanto o amanhecer anima.
    effect(() => {
      const p = this.partida();
      if (!p) return;
      untracked(() => {
        if (!this.amanhecendo()) this.visual.set(p);
      });
    });
    // O canal de posição do meu setor: um token novo a cada amanhecer.
    effect(() => {
      const p = this.partida();
      const id = this.painel()?.habitanteId;
      const setor = this.setorPublico();
      if (!p || !id || p.status === 'LOBBY' || p.status === 'ENCERRADO' || this.foraDaVila()) {
        untracked(() => this.canal.desligar());
        return;
      }
      untracked(() => {
        if (this.partidaId) void this.canal.conectar(this.partidaId, setor);
      });
    });
    // O card de resultado volta a aparecer a cada noite nova.
    effect(() => {
      const p = this.partida();
      if (p) untracked(() => this.resultadoLido.set(false));
    });
    // Ao voltar de `simples`, lembra a escolha.
    this.guardarModo('jogo');
  }

  // ------------------------------------------------------- amanhecer (#21)

  protected override reagir(p: IsolateusMatch): void {
    const antes = this.partida();
    super.reagir(p);
    if (
      antes &&
      antes.status === 'DESLOCAMENTO' &&
      p.status !== 'DESLOCAMENTO' &&
      p.rodada === antes.rodada &&
      this.painel()
    ) {
      void this.amanhecer(antes, p);
    }
  }

  /**
   * A ordem do amanhecer: portas (saídas e chegadas) → sabotagem → abdução →
   * mensagens. Uma coisa de cada vez, para dar para entender. O Delírio
   * suprime a animação de saída e chegada (#13).
   */
  private async amanhecer(antes: IsolateusMatch, depois: IsolateusMatch): Promise<void> {
    this.amanhecendo.set(true);
    this.aberta.set(null);
    this.luzEnviada = null;
    const eu = this.painel()?.habitanteId;
    const origem = antes.habitantes.find((h) => h.id === eu)?.setorId ?? this.setorPublico();
    const u = depois.ultimosDeslocamentos;
    const animar = !!u && u.rodada === depois.rodada;
    const cena = this.cena();
    try {
      if (animar && cena) {
        const mov = u.movimentos;
        // 1. saídas pelas portas
        const sairam = mov.filter((m) => m.de === origem && m.habitanteId !== eu);
        const euSai = mov.find((m) => m.habitanteId === eu);
        for (const m of sairam) {
          const x = xDaPorta(origem, m.para);
          if (x !== undefined) cena.piscar(x);
        }
        if (euSai) {
          const x = xDaPorta(origem, euSai.para);
          if (x !== undefined) cena.piscar(x);
        }
        await dormir(700);
        // 2. a cortina e a troca de setor (eu e quem chegou entram pela porta de origem)
        await this.mudarCortina(1);
        const novoSetor = euSai?.para ?? origem;
        this.visual.set(this.semEfeitos(antes, depois));
        await dormir(80);
        if (euSai) {
          const volta = xDaPorta(novoSetor, origem) ?? CENA.X_INICIAL;
          cena.posicionarMeuBoneco(volta, volta < CENA.CENTRO ? volta + 26 : volta - 26);
        }
        for (const m of mov.filter((x) => x.para === novoSetor && x.habitanteId !== eu)) {
          const x = xDaPorta(novoSetor, m.de);
          if (x !== undefined) cena.chegada(m.habitanteId, x);
        }
        await dormir(250);
        await this.mudarCortina(0);
        const chegaram = mov.filter((m) => m.para === novoSetor && m.habitanteId !== eu);
        for (const m of chegaram.slice(0, 3)) {
          const nome = depois.habitantes.find((h) => h.id === m.habitanteId)?.nome ?? '—';
          this.avisar(`${nome} chegou do ${this.nomeSetor(depois, m.de)}.`);
        }
        await dormir(1400);
        // 3. sabotagem (luz verde + tremida; o fundo troca quando a luz apaga)
        const sabotados = depois.setores.filter(
          (s) => !s.intacto && antes.setores.find((a) => a.id === s.id)?.intacto,
        );
        for (const s of sabotados) {
          if (s.id === novoSetor) {
            await cena.luzVerde('SABOTAGEM', () =>
              this.visual.update((v) => (v ? { ...v, setores: depois.setores } : v)),
            );
          } else {
            this.visual.update((v) => (v ? { ...v, setores: depois.setores } : v));
          }
          this.avisar(`O ${s.nome} foi sabotado e está em ruínas.`, 'alien');
          await dormir(1500);
        }
        // 4. abdução (luz verde; a pessoa some quando ela apaga)
        const levados = depois.habitantes.filter(
          (h) => !h.vivo && antes.habitantes.find((a) => a.id === h.id)?.vivo,
        );
        for (const h of levados) {
          if (h.setorId === novoSetor && h.id !== eu) {
            await cena.luzVerde('ABDUCAO', () =>
              this.visual.update((v) =>
                v ? { ...v, habitantes: v.habitantes.map((x) => (x.id === h.id ? { ...x, vivo: false } : x)) } : v,
              ),
            );
          }
          await dormir(300);
        }
      }
      // 5. as mensagens do amanhecer
      const vistos = new Set(antes.acontecimentos.map((e) => e.id));
      for (const e of depois.acontecimentos.filter((x) => !vistos.has(x.id) && EVENTOS_DO_AMANHECER.has(x.tipo))) {
        this.avisar(e.texto, e.tipo === 'SABOTAGEM' || e.tipo === 'ABDUCAO' ? 'alien' : '');
      }
    } finally {
      this.visual.set(depois);
      this.cortina.set(0);
      this.amanhecendo.set(false);
    }
  }

  /** O estado de depois do amanhecer SEM os efeitos ainda por animar. */
  private semEfeitos(antes: IsolateusMatch, depois: IsolateusMatch): IsolateusMatch {
    return {
      ...depois,
      setores: antes.setores,
      habitantes: depois.habitantes.map((h) => {
        const a = antes.habitantes.find((x) => x.id === h.id);
        return a && a.vivo && !a.preso ? { ...h, vivo: true, preso: false } : h;
      }),
    };
  }

  private async mudarCortina(alvo: 0 | 1): Promise<void> {
    for (let i = 0; i <= 6; i++) {
      this.cortina.set(alvo ? i / 6 : 1 - i / 6);
      await dormir(70);
    }
  }

  // ------------------------------------------------------ toques na cena

  protected aoTocarChao(x: number): void {
    if (!this.partidaId || this.foraDaVila() || this.partida()?.pausadaEm) return;
    // Só visual: o destino da caminhada vai para o backend (1 por segundo).
    this.api.passo(this.partidaId, x).subscribe({
      error: (e: { error?: { code?: string } }) => {
        if (e.error?.code === 'PASSO_RAPIDO') return;
      },
    });
  }

  protected aoTocarPorta(_para: string): void {
    const p = this.partida();
    if (!p) return;
    this.avisar(this.motivoDasPortas(p) ?? textoDoMotivo('PORTAS_FECHADAS'), 'warn');
  }

  /** O meu boneco entrou na luz de uma porta (aviso de saída) ou saiu dela. */
  protected aoLuzDaPorta(para: string | null): void {
    const p = this.partida();
    if (!p || !this.portasAbertas()) return;
    if (para) {
      if (this.luzEnviada === para) return;
      this.luzEnviada = para;
      this.mover(para);
      this.avisar(
        `Você está na porta do ${this.nomeSetor(p, para)}. Ao amanhecer, você sai. Saia da luz para desistir.`,
        'warn',
      );
    } else if (this.luzEnviada) {
      this.luzEnviada = null;
      // Sair da luz cancela (mover para a origem retira o aviso de saída).
      this.mover(this.origemDaNoite());
      this.avisar('Você desistiu de sair. Continua neste setor.');
    }
  }

  protected aoFicar(): void {
    const p = this.partida();
    if (!p) return;
    const motivo = this.motivoDasPortas(p);
    if (motivo && this.esperando()) {
      this.avisar(motivo, 'warn');
      return;
    }
    if (this.meuDestino(p)) {
      this.cena()?.afastarMeuBoneco();
      this.luzEnviada = null;
      this.mover(this.origemDaNoite()); // desistir da saída
    }
    this.ficar();
    this.avisar(`Posição confirmada: ${this.nomeSetor(p, this.setorPublico())}.`);
  }

  protected aoTocarObjeto(): void {
    const tipo = this.objeto();
    const motivo = this.motivoObjeto();
    if (!tipo) return;
    if (motivo) {
      this.avisar(motivo, 'warn');
      return;
    }
    if (tipo === 'REPARO') {
      this.reparar();
      this.avisar('Reparo organizado: o setor volta a funcionar no amanhecer.');
    } else if (tipo === 'RESGATE') {
      this.resgatar();
      const p = this.partida();
      const naSaude = p ? p.habitantes.filter((h) => h.vivo && !h.preso && h.setorId === 'saude').length : 0;
      if (naSaude < 2) {
        this.avisar(textoDoMotivo('POUCA_GENTE_NA_SAUDE', { n: naSaude }), 'warn');
      }
    } else {
      this.convocar();
    }
  }

  // ------------------------------------------------------- motivos (#63)

  protected motivo(chave: Parameters<typeof textoDoMotivo>[0]): string {
    return textoDoMotivo(chave);
  }

  /** Por que as portas não valem agora (ou `null`). */
  private motivoDasPortas(p: IsolateusMatch): string | null {
    if (p.pausadaEm) return textoDoMotivo('PARTIDA_PAUSADA');
    if (this.foraDaVila()) return textoDoMotivo('FORA_DA_VILA');
    if (p.status !== 'DESLOCAMENTO') return textoDoMotivo('PORTAS_FECHADAS');
    if (this.esperando()) return textoDoMotivo('NOITE_NAO_COMECOU', { n: this.espera() });
    if (this.reparoOrganizado()) return textoDoMotivo('POSICAO_TRAVADA_REPARO');
    if (this.resgateOrganizado()) return textoDoMotivo('POSICAO_TRAVADA_RESGATE');
    return null;
  }

  private motivoDoObjeto(): string | null {
    const p = this.partida();
    const tipo = this.objeto();
    if (!p || !tipo) return null;
    if (p.pausadaEm) return textoDoMotivo('PARTIDA_PAUSADA');
    if (p.status !== 'DESLOCAMENTO') {
      return textoDoMotivo(
        tipo === 'REPARO' ? 'FORA_DA_NOITE_REPARO' : tipo === 'RESGATE' ? 'FORA_DA_NOITE_RESGATE' : 'FORA_DA_NOITE_QUARENTENA',
      );
    }
    if (this.esperando()) return textoDoMotivo('NOITE_NAO_COMECOU', { n: this.espera() });
    if (tipo === 'REPARO') {
      if (this.reparoOrganizado()) return textoDoMotivo('REPARO_JA_ORGANIZADO');
      if (p.reparoSetorId) return textoDoMotivo('REPARO_EM_ANDAMENTO');
    } else if (tipo === 'RESGATE') {
      if (this.resgateOrganizado()) return textoDoMotivo('RESGATE_USADO');
      if (!this.resgataveis(p).length) return textoDoMotivo('SEM_RESGATAVEIS');
    } else {
      return this.impedimentoQuarentena(p);
    }
    return null;
  }

  protected motivoDoVoto(resgate: boolean): string | null {
    if (this.foraDaVila()) return textoDoMotivo('FORA_DA_VILA_VOTO');
    if (resgate ? this.voteiResgate() : this.votei()) return textoDoMotivo('JA_VOTEI');
    return null;
  }

  protected opcoesDeVoto(p: IsolateusMatch, tipo: 'QUARENTENA' | 'RESGATE'): OpcaoDeVoto[] {
    const eu = this.painel()?.habitanteId;
    if (tipo === 'RESGATE') return this.resgataveis(p).map((h) => ({ id: h.id, nome: h.nome }));
    return this.vivos(p).map((h) => ({
      id: h.id,
      nome: h.id === eu ? this.meuCodinomeExibido() : h.nome,
      eu: h.id === eu,
    }));
  }

  // ------------------------------------------------------- menu da Ameaça

  protected iconeDoPoder(id: string): 'CONTROLE' | 'CONTAGIO' | 'DELIRIO' {
    return id === 'CONTAGIO' ? 'CONTAGIO' : id === 'DELIRIO' ? 'DELIRIO' : 'CONTROLE';
  }
  protected resumoDoPoder(id: string): string {
    return id === 'CONTROLE'
      ? 'Joga a partir do setor de outro habitante.'
      : id === 'CONTAGIO'
        ? 'Um aldeão passa a ser Ameaça. Só a original.'
        : 'Todos trocam de codinome no amanhecer.';
  }
  protected segmentosEnergia(): number[] {
    return Array.from({ length: this.energia()?.necessario ?? 3 }, (_, i) => i);
  }
  protected poderLiberado(p: IsolateusMatch, id: string): boolean {
    const opcoes = this.poderDisponivel(p);
    return !!opcoes && !!opcoes[id as 'CONTROLE' | 'CONTAGIO' | 'DELIRIO'];
  }
  /** Por que o cartão do poder está bloqueado (o catálogo, #63). */
  protected motivoDoPoder(p: IsolateusMatch, id: string): string {
    if (p.status !== 'DESLOCAMENTO') return textoDoMotivo('PODER_FORA_DA_NOITE');
    const en = this.painel()?.energia;
    if (en && en.atual < en.necessario) {
      return textoDoMotivo('ENERGIA_INSUFICIENTE', { atual: en.atual, k: en.necessario - en.atual });
    }
    if (id === 'CONTAGIO') return textoDoMotivo('SO_ORIGINAL');
    return textoDoMotivo('PARTIDA_PAUSADA');
  }
  protected aoEscolherPoder(p: IsolateusMatch, id: string): void {
    if (!this.poderLiberado(p, id)) {
      this.erroPoder.set(this.motivoDoPoder(p, id));
      return;
    }
    this.escolherPoder(id as 'CONTROLE' | 'CONTAGIO' | 'DELIRIO');
  }
  protected setorDeAcaoIntacto(p: IsolateusMatch): boolean {
    return this.setorDeAcaoObj(p)?.intacto ?? true;
  }
  protected setorDeAcaoNome(p: IsolateusMatch): string {
    return this.setorDeAcaoObj(p)?.nome ?? 'o setor';
  }
  protected aoSabotar(p: IsolateusMatch): void {
    if (!this.setorDeAcaoIntacto(p)) {
      this.erro.set(textoDoMotivo('SETOR_EM_RUINAS'));
      return;
    }
    this.sabotar();
  }

  // ---------------------------------------------------------------- ferramentas

  protected diarioOrdenado(p: IsolateusMatch) {
    return [...(p.acontecimentos ?? [])].reverse();
  }

  protected readonly brilhandoSetores = setoresBrilhando;
  protected override readonly contagemBrilho = rotuloBrilho;

  protected abrir(so: Exclude<Sobreposicao, null>): void {
    if (so === 'PERSONAGEM') this.abrirPersonagem();
    this.aberta.set(so);
  }

  protected fecharSobreposicao(): void {
    if (this.aberta() === 'PERSONAGEM') this.fecharPersonagem();
    this.aberta.set(null);
    if (this.sobreposicaoAtual() === 'RESULTADO') this.resultadoLido.set(true);
  }

  private limiteVisivel(status: string): boolean {
    return ['DESLOCAMENTO', 'QUESTAO_ATIVA', 'QUARENTENA_DEBATE', 'QUARENTENA_VOTO', 'RESGATE_VOTO'].includes(status);
  }

  /** Um aviso curto na tela (fila: um de cada vez). */
  protected avisar(texto: string, tipo: Aviso['tipo'] = ''): void {
    this.fila.push({ texto, tipo });
    if (!this.mostrando) void this.proximoAviso();
  }

  private async proximoAviso(): Promise<void> {
    const a = this.fila.shift();
    if (!a || this.destruido) {
      this.mostrando = false;
      this.aviso$.set(null);
      return;
    }
    this.mostrando = true;
    this.aviso$.set(a);
    await dormir(2600);
    await this.proximoAviso();
  }

  protected async telaCheia(): Promise<void> {
    const el = this.palco()?.nativeElement;
    try {
      if (!el || !document.fullscreenEnabled) throw new Error('sem tela cheia');
      await el.requestFullscreen();
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await o.lock?.('landscape').catch(() => undefined);
    } catch {
      // iPhone: o Safari não põe a página em tela cheia (spec 034 #37).
      this.avisar('Seu navegador não permite tela cheia aqui. No iPhone, adicione à tela de início.', 'warn');
    }
  }

  /** Lembra se o aparelho prefere o jogo ou o modo simples (celular fraco). */
  protected guardarModo(modo: 'jogo' | 'simples'): void {
    try {
      localStorage.setItem('isolateus:modo', modo);
    } catch {
      /* sem storage: vale só agora */
    }
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.canal.desligar();
  }
}
