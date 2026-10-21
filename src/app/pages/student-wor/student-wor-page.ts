import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RealtimeService } from '../../core/realtime.service';
import { StudentAuthService } from '../../core/student-auth.service';
import { WorApiService } from '../../core/wor-api.service';
import { FREEZE_MS, NarradorCards, cardNoAr } from '../../core/action-card';
import {
  EfeitoRisco,
  ItemFeedWor,
  MensagemChatWor,
  PlacarEquipe,
  ResultadoRodadaWor,
  ResumoRodada,
  RodadaDaEquipeWor,
  WorMatch,
  WorTeam,
} from '../../core/models';
import { ActionCard } from '../../ui/action-card/action-card';
import { Confetti } from '../../ui/confetti/confetti';
import { Icon } from '../../ui/icon/icon';
import { LobbyLoader } from '../../ui/lobby-loader/lobby-loader';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';
import { WorChat } from '../../ui/wor-chat/wor-chat';
import { LogPontuacaoComponent } from '../../ui/log-pontuacao/log-pontuacao';
import { rankingDoLog } from '../../core/log-pontuacao';
import { relogioDaPartida } from '../../core/pausa';
import { PartidaPausadaComponent } from '../../ui/partida-pausada/partida-pausada';

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LIMITE_RODADA_S = 60;
/** Espelham `WOR.CURA_MASSIVA` e `WOR.DANO_CATAPULTA` do backend (só para o texto). */
const CURA_MASSIVA = 400;
const DANO_CATAPULTA = 300;
/** Quanto tempo um item do feed fica na tela do celular. */
const FEED_MS = 4000;

/**
 * Cliente do aluno (mobile-first). Escuta o próprio time (dano barato) + a raiz
 * (que carrega o placar de TODAS as equipes, o resumo da última rodada e o
 * cronômetro). Não há turno (029): todas as equipes jogam a mesma rodada, e
 * cada membro chuta uma letra e vota o alvo, ou arrisca a palavra.
 */
@Component({
  selector: 'app-student-wor-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Icon,
    Modal,
    LobbyLoader,
    Spinner,
    Confetti,
    ActionCard,
    RouterLink,
    NgTemplateOutlet,
    WorChat,
    LogPontuacaoComponent,
    PartidaPausadaComponent,
  ],
  template: `
    @if (narrador.card(); as c) {
      <app-action-card [card]="c" />
    }

    <div class="wrap" [class.dano]="piscar()">
      @if (resumoBanner(); as rr) {
        <div class="reveal-lista" aria-live="polite">
          <span class="reveal-lista__tit">Fim da rodada{{ rr.porTempo ? ' (tempo!)' : '' }}</span>
          @for (r of rr.resultados; track r.equipeId) {
            <div class="reveal" [class.reveal--eu]="r.acao === 'ATACAR' && souEu(r.alvoEquipeId)">
              <span class="reveal__pos">{{ r.ordem }}º</span>
              <strong>{{ r.equipeNome }}</strong>
              @if (r.acertadores.length) {
                <span class="reveal__ok">acertou {{ acertadoresTxt(r) }}</span>
              } @else {
                <span>não acertou</span>
              }
              @switch (r.acao) {
                @case ('ATACAR') {
                  <span class="reveal__hit">→ atacou {{ r.alvoNome }} (-{{ r.dano }}{{ r.critico ? ' CRÍTICO' : '' }})</span>
                }
                @case ('DICA') { <span>→ comprou dica</span> }
                @case ('CAIU') { <span class="reveal__hit">→ caiu antes de atacar</span> }
              }
            </div>
          }
        </div>
      }

      @if (feedToasts().length) {
        <div class="feed" aria-live="polite">
          @for (f of feedToasts(); track f.seq) {
            <div class="feed__item" [class.feed__item--erro]="f.tipo === 'DANO_CRITICO'">{{ f.mensagem }}</div>
          }
        </div>
      }

      @if (carregando()) {
        <div class="loading"><app-spinner [size]="32" /></div>
      } @else if (!matchId()) {
        <div class="vazio">
          <app-icon name="castle" [size]="40" />
          <p>Nenhuma batalha do Tichr Wor agora. Aguarde o professor iniciar.</p>
        </div>
      } @else if (root(); as m) {
        @if (m.status === 'LOBBY') {
          <div class="lobby">
            <app-icon name="castle" [size]="48" />
            <h1>{{ m.nome }}</h1>
            @if ((m.multiplicador ?? 1) > 1) {
              <p class="mult-selo">Partida valendo {{ m.multiplicador }}x: todos os pontos (e o XP) multiplicados</p>
            }
            @if (m.valeRanking === false) {
              <span class="selo-casual">Partida casual: não soma no ranking</span>
            }
            @if (!inscrito()) {
              <button class="btn-primary" type="button" [disabled]="ocupado()" (click)="entrar()">
                Entrar na batalha
              </button>
            } @else {
              <app-lobby-loader />
              <p class="aguarde">Você está dentro! Aguardando o professor formar as equipes…</p>
            }
          </div>
        } @else if (!team()) {
          <p class="aguarde">Entrando na sua equipe…</p>
        } @else if (team(); as t) {
          <header class="fort" [style.--cor]="t.cor">
            <span class="fort__nome">
              <app-icon [name]="t.isHorde ? 'sword' : 'castle'" [size]="18" /> {{ t.nome }}
            </span>
            <span class="fort__pontos">
              <app-icon name="trophy" [size]="14" /> {{ t.pontos ?? 0 }} pts
              @if ((m.multiplicador ?? 1) > 1) { <b class="fort__mult">{{ m.multiplicador }}x</b> }
              @if (m.valeRanking === false) { <span class="selo-casual">Casual</span> }
            </span>
            <span class="hpbar"><span [style.width.%]="hpPct(t.hp)"></span></span>
            <span class="hp">{{ t.hp }} HP</span>
            <span class="fort__membros">
              @for (mb of meusMembros(); track mb.alunoId) {
                <span class="membro" [class.membro--eu]="mb.eu">{{ mb.nome }}</span>
              }
            </span>
            <span class="fort__dica">O dano vira pontos: desempata e vale ranking.</span>
          </header>

          @if (m.status === 'EM_ANDAMENTO') {
            <div class="timer" [class.timer--fim]="restante() <= 10">
              <app-icon name="alert" [size]="14" />
              Rodada · {{ restante() }}s · {{ fechadas() }} de {{ placar().length }} equipes fecharam
            </div>
          }

          <div class="palavra">
            @for (ch of m.mascara; track $index) {
              @if (ch === ' ') { <span class="sp"></span> }
              @else { <span class="box" [class.box--on]="ch !== '_'">{{ ch === '_' ? '' : ch }}</span> }
            }
          </div>

          @if (m.status === 'ENCERRADO') {
            @if (venci()) { <app-confetti /> }
            <div class="fim" [class.fim--win]="venci()">
              <app-icon [name]="venci() ? 'trophy' : 'castle'" [size]="24" />
              {{ venci() ? 'Sua equipe venceu a batalha!' : vencedorNome() + ' venceu a batalha.' }}
            </div>
            <p class="aguarde">Seu castelo terminou com {{ t.hp }} HP.</p>
            @if (meuBonus() > 0) {
              <p class="bonus-pessoal">
                <app-icon name="sparkles" [size]="16" /> +{{ meuBonus() }} de bônus pessoal pelos seus acertos
              </p>
            }
            @if (logOrdenado().length) {
              <ol class="log-lista">
                @for (l of logOrdenado(); track l.alunoId) {
                  <li
                    class="log-lista__row"
                    [class.log-lista__row--eu]="l.alunoId === alunoId"
                    role="button"
                    tabindex="0"
                    (click)="logAberto.set(l.alunoId)"
                    (keydown.enter)="logAberto.set(l.alunoId)"
                  >
                    <span class="log-lista__pos">{{ l.posicao }}º</span>
                    <span class="log-lista__nome">{{ l.nome }}</span>
                    <span class="log-lista__pts">{{ l.pontos }}</span>
                  </li>
                }
              </ol>
              <p class="aguarde">Toque em um colega para ver de onde vieram os pontos.</p>
              <app-log-pontuacao
                modo="sheet"
                [jogador]="logJogador()"
                [posicao]="logPosicao()"
                [unidade]="unidade()"
                [temTurma]="!!m.turmaId"
                [casual]="m.valeRanking === false"
                (fechar)="logAberto.set(null)"
              />
            }
            <a class="btn-primary voltar-btn" routerLink="/aluno/dashboard">Voltar ao início</a>
          } @else if (minhaFechada(); as f) {
            <div class="painel">
              @if (f.resultado === 'CAIU') {
                <p class="aguarde">Seu castelo caiu nesta rodada. Na próxima, a Horda tenta a Invasão.</p>
              } @else {
                <app-lobby-loader />
                <p class="aguarde">Sua equipe fechou em {{ f.ordem }}º! Aguardando as outras equipes…</p>
              }
              <ng-container [ngTemplateOutlet]="pendentes" />
            </div>
          } @else if (jaJoguei()) {
            <div class="painel">
              <app-lobby-loader />
              <p class="aguarde">Você jogou! Aguardando os outros membros da sua equipe…</p>
              <ng-container [ngTemplateOutlet]="pendentes" />
            </div>
          } @else {
            <div class="painel">
              <ng-container [ngTemplateOutlet]="pendentes" />
              @if (!t.isHorde) {
                <h2>Escolha uma letra</h2>
                <div class="teclado">
                  @for (l of letras; track l) {
                    <button
                      class="tecla"
                      type="button"
                      [disabled]="travado() || letraUsada(l)"
                      (click)="escolherLetra(l)"
                    >{{ l }}</button>
                  }
                </div>
              }
              <button class="btn-risco" type="button" [disabled]="travado()" (click)="modalRisco.set(true)">
                <app-icon name="sword" [size]="16" />
                {{ t.isHorde ? 'Tentar Invasão' : 'Arriscar a palavra' }}
              </button>
            </div>
          }

          @if (m.cartasVisiveis.length) {
            <div class="cartas">
              @for (c of m.cartasVisiveis; track $index) {
                <div class="carta"><b>Carta {{ $index + 1 }}:</b> {{ c }}</div>
              }
            </div>
          }

          <!-- Castelos de todas as equipes (lido da raiz) -->
          @if (placar().length) {
            <div class="placar">
              <span class="placar__tit">Castelos</span>
              @for (e of placar(); track e.id) {
                <div
                  class="castelo"
                  [class.castelo--fechou]="!!ordemDe(e.id)"
                  [class.castelo--eu]="souEu(e.id)"
                  [style.--cor]="e.cor"
                >
                  <span class="castelo__nome">
                    <app-icon [name]="e.isHorde ? 'sword' : 'castle'" [size]="14" /> {{ e.nome }}
                    @if (souEu(e.id)) { <span class="castelo__tag">você</span> }
                    @if (ordemDe(e.id); as o) { <span class="castelo__tag castelo__tag--fechou">fechou {{ o }}º</span> }
                  </span>
                  <span class="castelo__bar"><span [style.width.%]="hpPct(e.hp)" [style.background]="e.cor"></span></span>
                  <span class="castelo__hp">{{ e.hp }}</span>
                </div>
              }
            </div>
          }
        }
      }
    </div>

    @if (letraEscolhida(); as l) {
      <app-modal [open]="true" [title]="'Letra ' + l + ' — vote a ação'" (close)="letraEscolhida.set(null)">
        <p class="aviso">
          Se sua equipe acertar, ataca o castelo <b>mais votado</b>. Escolha o alvo — ou vote em comprar uma dica.
        </p>
        <div class="alvos">
          @for (r of rivais(); track r.id) {
            <button class="alvo" type="button" [style.--cor]="r.cor" [disabled]="travado()" (click)="votarAtacar(r)">
              <app-icon name="sword" [size]="16" /> Atacar {{ r.nome }} · {{ r.hp }} HP
            </button>
          }
          <button class="alvo alvo--dica" type="button" [disabled]="travado() || semCartas()" (click)="votarDica()">
            <app-icon name="sparkles" [size]="16" /> Comprar dica (revelar carta)
          </button>
          @if (semCartas()) { <small class="hint">Todas as cartas já foram reveladas.</small> }
        </div>
      </app-modal>
    }

    @if (modalRisco()) {
      <app-modal [open]="true" title="Arriscar a palavra?" (close)="fecharRisco()">
        @if (team()?.isHorde) {
          <p class="aviso">
            Se acertar, você invade e rouba o castelo do líder.
            Se errar, sofrerá Dano Crítico no seu castelo.
          </p>
        } @else {
          <p class="aviso">
            Se acertar, a rodada acaba e sua equipe escolhe a recompensa abaixo.
            Se errar, sofrerá Dano Crítico no seu castelo.
          </p>
          <div class="efeitos">
            <button
              class="efeito"
              type="button"
              [class.efeito--on]="efeitoRisco() === 'CURAR'"
              [attr.aria-pressed]="efeitoRisco() === 'CURAR'"
              (click)="efeitoRisco.set('CURAR')"
            >
              <app-icon name="shield" [size]="18" />
              <b>Recuperar HP</b>
              <small>+{{ curaMassiva }} HP no seu castelo</small>
            </button>
            <button
              class="efeito"
              type="button"
              [class.efeito--on]="efeitoRisco() === 'CATAPULTA'"
              [attr.aria-pressed]="efeitoRisco() === 'CATAPULTA'"
              [disabled]="!alvosCatapulta().length"
              (click)="efeitoRisco.set('CATAPULTA')"
            >
              <app-icon name="castle" [size]="18" />
              <b>Catapulta</b>
              <small>{{ danoCatapulta }} de dano num castelo rival</small>
            </button>
          </div>
          @if (efeitoRisco() === 'CATAPULTA') {
            <div class="alvos">
              @for (r of alvosCatapulta(); track r.id) {
                <button
                  class="alvo"
                  type="button"
                  [style.--cor]="r.cor"
                  [class.alvo--on]="alvoCatapulta() === r.id"
                  [attr.aria-pressed]="alvoCatapulta() === r.id"
                  (click)="alvoCatapulta.set(r.id)"
                >
                  <app-icon name="castle" [size]="16" /> {{ r.nome }} · {{ r.hp }} HP
                </button>
              }
            </div>
          }
        }
        <input class="tichr-input" [value]="palpite()" (input)="palpite.set($any($event.target).value)" placeholder="Digite a palavra inteira" />
        <button modal-actions class="btn-primary" type="button" [disabled]="travado() || !podeArriscar()" (click)="arriscar()">
          Confirmar tentativa
        </button>
      </app-modal>
    }

    <!-- Chat privado da equipe: só os membros recebem o canal. -->
    @if (canalId() && root()?.status !== 'LOBBY') {
      <button class="chat-fab" type="button" (click)="abrirChat()" aria-label="Abrir o chat da equipe">
        <app-icon name="chat" [size]="22" />
        @if (naoLidas()) { <span class="chat-fab__badge">{{ naoLidas() > 9 ? '9+' : naoLidas() }}</span> }
      </button>
    }
    @if (chatAberto()) {
      <app-wor-chat
        [mensagens]="mensagensChat()"
        [alunoId]="alunoIdAtual"
        [equipe]="team()?.nome ?? 'equipe'"
        [enviando]="chatEnviando()"
        [erro]="chatErro()"
        [enviadas]="chatEnviadas()"
        [somenteLeitura]="root()?.status === 'ENCERRADO'"
        (enviar)="enviarChat($event)"
        (fechar)="fecharChat()"
      />
    }

    <!-- Letras que a minha equipe já jogou nesta rodada (sem certo/errado até o reveal) -->
    <ng-template #pendentes>
      @if (pendentesEquipe().length) {
        <div class="pendentes">
          <span class="pendentes__tit">Sua equipe nesta rodada</span>
          @for (p of pendentesEquipe(); track p.alunoId) {
            <span class="pendente">{{ p.nome }}: <b>{{ p.letra ?? 'arriscou' }}</b></span>
          }
        </div>
      }
    </ng-template>

    <!-- Modal: quem atacou o seu castelo -->
    @if (danoModal(); as ataques) {
      <app-modal [open]="true" title="Seu castelo foi atacado!" (close)="danoModal.set(null)">
        @for (r of ataques; track r.equipeId) {
          <p class="aviso">
            <b>{{ r.equipeNome }}</b> (fechou em {{ r.ordem }}º) atirou no seu castelo · <b>-{{ r.dano }} HP</b>{{ r.critico ? ' (CRÍTICO!)' : '' }}.
          </p>
        }
        <button modal-actions class="btn-primary" type="button" (click)="danoModal.set(null)">Vamos revidar!</button>
      </app-modal>
    }

    @if (modalHorda()) {
      <app-modal [open]="true" title="Seu Castelo Caiu… Mas a Guerra Não Acabou!" (close)="modalHorda.set(false)">
        <p class="aviso">Sua equipe agora é uma <b>Horda Bárbara</b>.</p>
        <p class="aviso">Vocês não podem mais chutar letras nem comprar dicas. A cada rodada, a única jogada é a <b>Invasão</b>: adivinhar a palavra inteira.</p>
        <p class="aviso">Se acertarem, roubam o castelo da equipe em 1º lugar e assumem a liderança!</p>
        <button modal-actions class="btn-primary" type="button" (click)="modalHorda.set(false)">Entendido, vamos à forra!</button>
      </app-modal>
    }

    @if (root(); as m) {
      @if (m.pausadaEm) {
        <app-partida-pausada jogo="Tichr Wor" [titulo]="m.nome" />
      }
    }
  `,
  styles: `
    :host { display: block; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: #b45309; }
    .wrap { display: flex; flex-direction: column; gap: 1.25rem; padding: 0.25rem; transition: background-color 0.2s ease; }
    .wrap.dano { animation: flash 0.5s ease; }
    @keyframes flash { 0%, 100% { background: transparent; } 30% { background: color-mix(in srgb, var(--danger) 30%, transparent); } }
    @media (prefers-reduced-motion: reduce) { .wrap.dano { animation: none; } }
    .reveal { padding: 0.6rem 0.8rem; border-radius: 10px; background: var(--surface-alt); font-size: 0.88rem; color: var(--text); display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: baseline; }
    .reveal--eu { background: color-mix(in srgb, var(--danger) 22%, transparent); }
    .reveal strong { color: var(--text); }
    .reveal__ok { color: #16a34a; font-weight: 700; }
    .reveal__hit { font-weight: 800; }
    .reveal-lista { display: flex; flex-direction: column; gap: 0.35rem; }
    .reveal-lista__tit { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
    .reveal__pos { font-weight: 800; color: var(--text-muted); }
    /* Feed da rodada: toasts que não travam nada (029 §3). */
    .feed { display: flex; flex-direction: column; gap: 0.3rem; }
    .feed__item { padding: 0.45rem 0.7rem; border-radius: 8px; border-left: 4px solid var(--primary); background: var(--surface-alt); font-size: 0.82rem; font-weight: 600; color: var(--text); }
    .feed__item--erro { border-left-color: var(--danger); }
    .pendentes { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; justify-content: center; }
    .pendentes__tit { width: 100%; text-align: center; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); }
    .pendente { padding: 0.2rem 0.55rem; border-radius: 999px; border: 1px dashed var(--border); font-size: 0.8rem; color: var(--text); }
    .bonus-pessoal { display: flex; align-items: center; justify-content: center; gap: 0.35rem; margin: 0; font-weight: 800; color: #b45309; }
    .vazio, .lobby { display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); }
    .lobby h1 { margin: 0; color: var(--text); font-size: 1.4rem; }
    .aguarde { text-align: center; color: var(--text-muted); font-weight: 600; }
    /* Multiplicador de pontos da partida (escolhido pelo professor no lobby). */
    .mult-selo {
      margin: 0; padding: 0.35rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 800;
      color: #fff; background: #b45309; text-align: center;
    }
    .fort__mult { margin-left: 0.25rem; padding: 0 0.35rem; border-radius: 999px; color: #fff; background: #b45309; font-size: 0.7rem; }
    .fort { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.9rem; border-radius: 14px; border: 2px solid var(--cor); background: color-mix(in srgb, var(--cor) 8%, var(--surface)); }
    .fort__nome { display: flex; align-items: center; gap: 0.4rem; font-weight: 800; }
    .fort__pontos { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 1.05rem; font-weight: 800; color: var(--cor); font-variant-numeric: tabular-nums; }
    .fort__dica { font-size: 0.72rem; color: var(--text-muted); }
    .fort__membros { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .membro { padding: 0.15rem 0.5rem; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--cor) 35%, var(--border)); background: var(--surface); font-size: 0.72rem; font-weight: 700; color: var(--text-muted); }
    .membro--eu { border-color: var(--cor); background: color-mix(in srgb, var(--cor) 18%, var(--surface)); color: var(--text); }
    .hpbar { height: 12px; border-radius: 999px; background: var(--surface-alt); overflow: hidden; }
    .hpbar span { display: block; height: 100%; background: var(--cor); transition: width 0.4s ease; }
    .hp { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); }
    .timer { align-self: center; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.8rem; border-radius: 999px; background: var(--surface-alt); font-weight: 800; font-size: 0.9rem; font-variant-numeric: tabular-nums; color: var(--text); }
    .timer--fim { color: #fff; background: var(--danger); }
    .palavra { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.35rem; }
    .box { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2.6rem; border-radius: 8px; border-bottom: 4px solid var(--border); background: var(--surface-alt); font-size: 1.3rem; font-weight: 800; color: var(--text); }
    .box--on { border-bottom-color: #b45309; color: #b45309; }
    .sp { width: 1rem; }
    .painel { display: flex; flex-direction: column; gap: 0.75rem; }
    .painel h2 { margin: 0; font-size: 1.05rem; text-align: center; color: var(--text); }
    .teclado { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem; }
    .tecla { padding: 0.7rem 0; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-weight: 800; font-size: 1rem; cursor: pointer; }
    .tecla:hover:not(:disabled) { border-color: #b45309; }
    .tecla:disabled { opacity: 0.35; cursor: not-allowed; }
    .btn-risco { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.8rem; border-radius: 12px; border: none; background: linear-gradient(135deg, #b45309, #7c2d12); color: #fff; font-weight: 800; cursor: pointer; }
    .hint { color: var(--text-muted); text-align: center; }
    .cartas { display: flex; flex-direction: column; gap: 0.5rem; }
    .carta { padding: 0.75rem; border-radius: 10px; background: #fdf6e3; color: #5b3a1a; font-size: 0.9rem; }
    .placar { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
    .placar__tit { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; color: var(--text-muted); }
    .castelo { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 0.2rem 0.6rem; padding: 0.4rem 0.5rem; border-radius: 8px; border: 1px solid transparent; }
    .castelo--fechou { border-color: var(--cor); background: color-mix(in srgb, var(--cor) 10%, transparent); }
    .castelo--eu { outline: 2px solid color-mix(in srgb, var(--cor) 60%, var(--border)); }
    .castelo__nome { display: flex; align-items: center; gap: 0.35rem; font-weight: 700; font-size: 0.9rem; color: var(--text); }
    .castelo__tag { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; padding: 0.05rem 0.35rem; border-radius: 999px; background: var(--surface-alt); color: var(--text-muted); }
    .castelo__tag--fechou { background: var(--cor); color: #fff; }
    .castelo__bar { grid-column: 1 / -1; height: 8px; border-radius: 999px; background: var(--surface-alt); overflow: hidden; }
    .castelo__bar span { display: block; height: 100%; transition: width 0.4s ease; }
    .castelo__hp { font-size: 0.78rem; font-weight: 800; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .fim { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; border-radius: 12px; background: color-mix(in srgb, #94a3b8 22%, transparent); color: var(--text); font-weight: 800; text-align: center; }
    .log-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .log-lista__row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.85rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); cursor: pointer; }
    .log-lista__row:hover, .log-lista__row:focus-visible { border-color: var(--primary); outline: none; }
    .log-lista__row--eu { border-width: 2px; border-color: var(--primary); }
    .log-lista__pos { font-weight: 900; color: var(--text-muted); min-width: 2.5ch; }
    .log-lista__nome { flex: 1 1 auto; font-weight: 700; }
    .log-lista__pts { font-weight: 800; color: var(--primary); font-variant-numeric: tabular-nums; }
    .fim--win { background: color-mix(in srgb, #f59e0b 22%, transparent); color: #b45309; }
    .voltar-btn { width: 100%; text-align: center; text-decoration: none; }
    .alvos, .painel .btn-primary { width: 100%; }
    .alvos { display: flex; flex-direction: column; gap: 0.5rem; }
    .alvo { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.8rem; border-radius: 12px; border: 2px solid var(--cor); background: color-mix(in srgb, var(--cor) 10%, var(--surface)); color: var(--text); font-weight: 800; cursor: pointer; }
    .alvo--dica { --cor: #b45309; }
    .alvo:disabled { opacity: 0.5; cursor: not-allowed; }
    .alvo--on { background: var(--cor); color: #fff; }
    .efeitos { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem; }
    .efeito { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.8rem 0.5rem; border-radius: 12px; border: 2px solid var(--border); background: var(--surface); color: var(--text); font: inherit; cursor: pointer; text-align: center; }
    .efeito small { color: var(--text-muted); font-size: 0.78rem; }
    .efeito--on { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, var(--surface)); }
    .efeito:disabled { opacity: 0.5; cursor: not-allowed; }
    .alvos + .tichr-input, .efeitos + .tichr-input { margin-top: 0.75rem; }
    .aviso { margin: 0 0 0.75rem; color: var(--text-muted); }
    .aviso b { color: var(--text); }
    .chat-fab { position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 50; display: inline-flex; align-items: center; justify-content: center; width: 3.25rem; height: 3.25rem; border-radius: 999px; border: 2px solid var(--primary); background: var(--surface); color: var(--primary); box-shadow: 3px 3px 0 var(--border); cursor: pointer; }
    .chat-fab__badge { position: absolute; top: -4px; right: -4px; min-width: 1.3rem; height: 1.3rem; padding: 0 0.3rem; border-radius: 999px; background: var(--danger); color: #fff; font-size: 0.7rem; font-weight: 800; line-height: 1.3rem; text-align: center; }

    /* Tema escuro: clareia os âmbares que ficariam escuros sobre fundo escuro. */
    :host-context(html[data-theme='dark']) {
      .loading { color: #fbbf24; }
      .box--on { color: #fbbf24; border-bottom-color: #fbbf24; }
      .fim--win { color: #fde68a; }
      .carta { background: #3a2f18; color: #fde68a; }
      .alvo--dica { --cor: #f59e0b; }
    }
  `,
})
export class StudentWorPage {
  private readonly api = inject(WorApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly studentAuth = inject(StudentAuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly alunoId = this.studentAuth.aluno()?.id ?? '';
  protected readonly alunoIdAtual = this.alunoId;

  protected readonly carregando = signal(true);
  protected readonly matchId = signal<string | null>(null);
  protected readonly root = signal<WorMatch | null>(null);

  // --- Log de pontuação (fim de partida): público para toda a sala ---
  protected readonly unidade = this.studentAuth.nomePontuacao;
  protected readonly logOrdenado = computed(() =>
    rankingDoLog(this.root()?.logPontuacao),
  );
  protected readonly logAberto = signal<string | null>(null);
  protected readonly logJogador = computed(
    () => this.logOrdenado().find((l) => l.alunoId === this.logAberto()) ?? null,
  );
  protected readonly logPosicao = computed(() => this.logJogador()?.posicao ?? null);
  protected readonly team = signal<WorTeam | null>(null);
  protected readonly rivais = signal<WorTeam[]>([]);
  protected readonly todosTeams = signal<WorTeam[]>([]);
  protected readonly inscrito = signal(false);
  protected readonly ocupado = signal(false);
  protected readonly piscar = signal(false);
  protected readonly modalHorda = signal(false);
  protected readonly modalRisco = signal(false);
  protected readonly letraEscolhida = signal<string | null>(null);
  protected readonly palpite = signal('');
  /** Banner do resultado da última rodada (todos veem; some sozinho). */
  protected readonly resumoBanner = signal<ResumoRodada | null>(null);
  /** Modal: quem atacou o meu castelo na rodada que acabou de fechar. */
  protected readonly danoModal = signal<ResultadoRodadaWor[] | null>(null);
  /** Eventos da rodada sem congelamento (ataque, dica, erro ao arriscar). */
  protected readonly feedToasts = signal<ItemFeedWor[]>([]);
  /**
   * O que minha equipe já jogou nesta rodada. As letras pendentes não estão na
   * raiz pública (seriam copiadas pelas rivais): vêm do backend, só as nossas.
   */
  private readonly rodadaEquipe = signal<RodadaDaEquipeWor | null>(null);
  /** Narração global (Action Cards) — chega pelo doc da própria equipe. */
  protected readonly narrador = new NarradorCards();
  private readonly relogio = signal(Date.now());

  // ===== Chat da equipe =====
  protected readonly canalId = signal<string | null>(null);
  protected readonly mensagensChat = signal<MensagemChatWor[]>([]);
  protected readonly chatAberto = signal(false);
  protected readonly chatEnviando = signal(false);
  protected readonly chatErro = signal<string | null>(null);
  /** Conta os envios aceitos: o componente limpa o campo a cada mudança. */
  protected readonly chatEnviadas = signal(0);
  /** Instante da última mensagem já vista (as de antes de abrir a tela contam como vistas). */
  private readonly vistoAte = signal<string | null>(null);
  protected readonly naoLidas = computed(() => {
    if (this.chatAberto()) return 0;
    const visto = this.vistoAte() ?? '';
    return this.mensagensChat().filter(
      (m) => m.alunoId !== this.alunoId && m.em > visto,
    ).length;
  });

  protected readonly letras = LETRAS;
  private myTeamId: string | null = null;
  private ultimoHp = Infinity;
  private jaEraHorda = false;
  private ultimoSeq = 0;
  private ultimoFeed = 0;
  /** Quem da minha equipe já agiu, para saber quando recarregar as pendentes. */
  private chaveRodada = '';

  /** Membros da minha equipe, comigo em primeiro e marcado. */
  protected readonly meusMembros = computed(() =>
    (this.team()?.membros ?? [])
      .map((m) => ({ ...m, eu: m.alunoId === this.alunoId }))
      .sort((a, b) => Number(b.eu) - Number(a.eu)),
  );

  protected readonly jaJoguei = computed(
    () => this.root()?.jaAgiram?.includes(this.alunoId) ?? false,
  );
  /** Minha equipe já fechou a rodada (ordem de chegada), ou null. */
  protected readonly minhaFechada = computed(
    () =>
      this.root()?.equipesFechadas?.find((f) => f.equipeId === this.myTeamId) ??
      null,
  );
  protected readonly fechadas = computed(
    () => this.root()?.equipesFechadas?.length ?? 0,
  );
  protected readonly pendentesEquipe = computed(
    () => this.rodadaEquipe()?.acoes ?? [],
  );
  /** Bônus pessoal (+1000 palavra, +300 letra) do aluno nesta partida. */
  protected readonly meuBonus = computed(
    () => this.team()?.pontosIndividuais?.[this.alunoId] ?? 0,
  );
  protected readonly semCartas = computed(() => {
    const m = this.root();
    return !!m && m.cartasVisiveis.length >= m.totalCartas;
  });
  protected readonly venci = computed(
    () => !!this.myTeamId && this.root()?.vencedorEquipeId === this.myTeamId,
  );
  protected readonly vencedorNome = computed(
    () =>
      this.placar().find((e) => e.id === this.root()?.vencedorEquipeId)?.nome ??
      this.todosTeams().find((t) => t.id === this.root()?.vencedorEquipeId)?.nome ??
      'A equipe vencedora',
  );
  protected readonly placar = computed<PlacarEquipe[]>(() => this.root()?.placar ?? []);
  /**
   * Segundos restantes da rodada. Congelado, o início vem do FUTURO (o servidor
   * o empurra enquanto o card está no ar): o teto de 60s segura o relógio parado
   * até o card sair, em vez de exibir 62s.
   */
  protected readonly restante = computed(() => {
    const m = this.root();
    if (!m || m.status !== 'EM_ANDAMENTO' || !m.rodadaIniciadaEm) return LIMITE_RODADA_S;
    const fim = Date.parse(m.rodadaIniciadaEm) + LIMITE_RODADA_S * 1000;
    // Pausada, o relógio para no instante da pausa.
    const s = Math.ceil((fim - relogioDaPartida(this.relogio(), m)) / 1000);
    return Math.max(0, Math.min(LIMITE_RODADA_S, s));
  });
  /** Inputs bloqueados: durante a chamada HTTP ou com um card interrompendo o jogo. */
  protected readonly travado = computed(() => this.ocupado() || this.narrador.ativo());

  // ===== Risco Heroico: Recuperar HP × Catapulta =====
  protected readonly curaMassiva = CURA_MASSIVA;
  protected readonly danoCatapulta = DANO_CATAPULTA;
  protected readonly efeitoRisco = signal<EfeitoRisco>('CURAR');
  protected readonly alvoCatapulta = signal<string | null>(null);
  /**
   * A Catapulta só mira castelo rival de pé: Horda não tem o que derrubar.
   * Lê do placar da raiz (ao vivo) — `rivais` só é preenchido ao escolher uma
   * letra, e quem arrisca a palavra direto via a Catapulta desabilitada.
   */
  protected readonly alvosCatapulta = computed(() =>
    this.placar().filter(
      (e) => e.id !== this.myTeamId && !e.isHorde && e.hp > 0,
    ),
  );
  /** Palpite digitado e, na Catapulta, um alvo escolhido. */
  protected readonly podeArriscar = computed(
    () =>
      !!this.palpite().trim() &&
      (this.team()?.isHorde ||
        this.efeitoRisco() === 'CURAR' ||
        !!this.alvoCatapulta()),
  );
  protected fecharRisco(): void {
    this.modalRisco.set(false);
    this.efeitoRisco.set('CURAR');
    this.alvoCatapulta.set(null);
  }

  protected hpPct(hp: number): number {
    return Math.max(0, Math.min(100, hp / 10));
  }
  protected souEu(id?: string): boolean {
    return !!id && id === this.myTeamId;
  }
  /** Ordem em que a equipe fechou a rodada em curso (0 = ainda não fechou). */
  protected ordemDe(id: string): number {
    return this.root()?.equipesFechadas?.find((f) => f.equipeId === id)?.ordem ?? 0;
  }
  protected acertadoresTxt(r: ResultadoRodadaWor): string {
    return r.acertadores.map((a) => `${a.nome} (${a.letra})`).join(', ');
  }
  protected letraUsada(l: string): boolean {
    const m = this.root();
    if (!m) return false;
    return (
      m.letrasTentadas.includes(l) ||
      this.pendentesEquipe().some((a) => a.letra === l)
    );
  }

  constructor() {
    this.buscar();
    const sonda = setInterval(() => {
      if (!this.matchId()) this.buscar();
    }, 4000);
    const tick = setInterval(() => this.relogio.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => {
      clearInterval(sonda);
      clearInterval(tick);
      this.narrador.destruir();
    });
  }

  private buscar(): void {
    this.api.partidaAtual().subscribe({
      next: (v) => {
        this.carregando.set(false);
        if (!v || this.matchId() === v.match.id) return;
        this.matchId.set(v.match.id);
        this.root.set(v.match);
        this.ultimoSeq = v.match.resumoRodada?.seq ?? 0; // baseline (não replay ao entrar)
        this.ultimoFeed = v.match.feedSeq ?? 0;
        this.narrador.ignorarAtual(v.match.lastGlobalAction);
        this.inscrito.set(v.match.inscritos.some((i) => i.alunoId === this.alunoId));
        this.resolverEquipe(v.teams);
        this.conectarRaiz(v.match.id);
      },
      error: () => this.carregando.set(false),
    });
  }

  private conectarRaiz(matchId: string): void {
    this.realtime
      .escutarMatch(matchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((m) => {
        if (!m) return;
        this.root.set(m);
        this.inscrito.set(m.inscritos.some((i) => i.alunoId === this.alunoId));
        if (!this.myTeamId && m.status !== 'LOBBY') {
          this.api.partidaAtual().subscribe((v) => v && this.resolverEquipe(v.teams));
        }
        if (m.status === 'ENCERRADO' && !this.todosTeams().length) {
          this.api.partidaAtual().subscribe((v) => v && this.todosTeams.set(v.teams));
        }
        this.receberFeed(m);
        this.sincronizarRodada(m);
        // Reveal do resultado quando uma nova rodada resolve. Com um card no ar,
        // o banner espera a narração terminar — os dois não disputam a tela.
        const r = m.resumoRodada;
        if (r && r.seq > this.ultimoSeq) {
          this.ultimoSeq = r.seq;
          if (cardNoAr(m.lastGlobalAction)) {
            setTimeout(() => this.mostrarResumo(r), FREEZE_MS);
          } else {
            this.mostrarResumo(r);
          }
        }
      });
  }

  /** Banner do resultado (todos) + modal de dano quando meu castelo foi o alvo. */
  private mostrarResumo(r: ResumoRodada): void {
    if (!r.resultados?.length) return;
    this.resumoBanner.set(r);
    setTimeout(() => {
      if (this.resumoBanner()?.seq === r.seq) this.resumoBanner.set(null);
    }, 6000);
    const contraMim = r.resultados.filter(
      (x) => x.acao === 'ATACAR' && x.alvoEquipeId === this.myTeamId,
    );
    if (contraMim.length) this.danoModal.set(contraMim);
  }

  /** Itens novos do feed viram toast curto, sem travar os inputs. */
  private receberFeed(m: WorMatch): void {
    const novos = (m.feedRodada ?? []).filter((f) => f.seq > this.ultimoFeed);
    if (!novos.length) return;
    this.ultimoFeed = Math.max(...novos.map((f) => f.seq));
    this.feedToasts.update((atual) => [...novos.reverse(), ...atual].slice(0, 3));
    for (const f of novos) {
      setTimeout(
        () => this.feedToasts.update((atual) => atual.filter((x) => x.seq !== f.seq)),
        FEED_MS,
      );
    }
  }

  /**
   * Recarrega as letras pendentes da minha equipe quando alguém dela age (ou a
   * rodada vira). A raiz só diz QUEM agiu; a letra vem do backend.
   */
  private sincronizarRodada(m: WorMatch): void {
    const matchId = this.matchId();
    const meus = new Set((this.team()?.membros ?? []).map((mb) => mb.alunoId));
    const agiram = (m.jaAgiram ?? []).filter((id) => meus.has(id));
    const chave = `${m.resumoRodada?.seq ?? 0}:${m.ondaIndex}:${agiram.join(',')}`;
    if (!matchId || chave === this.chaveRodada) return;
    this.chaveRodada = chave;
    if (!agiram.length || m.status !== 'EM_ANDAMENTO') {
      this.rodadaEquipe.set(null);
      return;
    }
    this.api.rodadaDaEquipe(matchId).subscribe({
      next: (r) => this.rodadaEquipe.set(r),
      error: () => undefined,
    });
  }

  private resolverEquipe(teams: WorTeam[]): void {
    const mine = teams.find((t) => t.membros.some((mm) => mm.alunoId === this.alunoId));
    if (!mine || this.myTeamId) return;
    this.myTeamId = mine.id;
    this.team.set(mine);
    this.ultimoHp = mine.hp;
    this.jaEraHorda = mine.isHorde;
    const raiz = this.root();
    if (raiz) this.sincronizarRodada(raiz);
    this.realtime
      .escutarTeam(this.matchId()!, mine.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((t) => {
        if (!t) return;
        if (t.hp < this.ultimoHp) this.flash();
        this.ultimoHp = t.hp;
        if (t.isHorde && !this.jaEraHorda) this.modalHorda.set(true);
        this.jaEraHorda = t.isHorde;
        this.team.set(t);
        // O card global chega pelo doc da própria equipe (o aluno só escuta este).
        this.narrador.receber(t.lastGlobalAction);
      });
    this.conectarChat();
  }

  /** Pede o canal da equipe ao backend e passa a escutar o chat em tempo real. */
  private conectarChat(): void {
    const matchId = this.matchId();
    if (!matchId || this.canalId()) return;
    this.api.canalChat(matchId).subscribe({
      next: ({ canalId }) => {
        this.canalId.set(canalId);
        let primeira = true;
        this.realtime
          .escutarChat(canalId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((c) => {
            const msgs = c?.mensagens ?? [];
            // O histórico de antes de abrir a tela não acende o contador.
            if (primeira) {
              primeira = false;
              this.vistoAte.set(msgs.at(-1)?.em ?? '');
            }
            this.mensagensChat.set(msgs);
            if (this.chatAberto()) this.marcarVisto();
          });
      },
      // Sem canal (ex.: aluno fora das equipes), a tela segue sem o chat.
      error: () => undefined,
    });
  }

  private marcarVisto(): void {
    this.vistoAte.set(this.mensagensChat().at(-1)?.em ?? this.vistoAte());
  }

  protected abrirChat(): void {
    this.chatErro.set(null);
    this.chatAberto.set(true);
    this.marcarVisto();
  }

  protected fecharChat(): void {
    this.chatAberto.set(false);
    this.marcarVisto();
  }

  protected enviarChat(texto: string): void {
    const matchId = this.matchId();
    if (!matchId) return;
    this.chatEnviando.set(true);
    this.chatErro.set(null);
    this.api.enviarChat(matchId, texto).subscribe({
      next: () => {
        this.chatEnviando.set(false);
        this.chatEnviadas.update((n) => n + 1);
      },
      error: (e: HttpErrorResponse) => {
        this.chatEnviando.set(false);
        // 422 (palavrão, já penalizado) e 429 (rajada) trazem a mensagem pronta.
        const msg = (e.error as { message?: string } | null)?.message;
        this.chatErro.set(
          typeof msg === 'string' ? msg : 'Não foi possível enviar a mensagem.',
        );
        if (e.status === 422) this.chatEnviadas.update((n) => n + 1);
      },
    });
  }

  private flash(): void {
    this.piscar.set(true);
    setTimeout(() => this.piscar.set(false), 500);
  }

  private acao(obs: { subscribe: (o: { next: () => void; error: () => void }) => void }): void {
    this.ocupado.set(true);
    obs.subscribe({
      next: () => this.ocupado.set(false),
      error: () => this.ocupado.set(false),
    });
  }

  protected entrar(): void {
    const id = this.matchId();
    if (!id) return;
    this.acao(this.api.entrar(id, this.studentAuth.aluno()?.nome ?? 'Aluno'));
    this.inscrito.set(true);
  }

  protected escolherLetra(letra: string): void {
    this.api.partidaAtual().subscribe((v) => {
      if (!v) return;
      this.rivais.set(v.teams.filter((t) => t.id !== this.myTeamId && t.hp > 0));
      this.letraEscolhida.set(letra);
    });
  }

  protected votarAtacar(alvo: WorTeam): void {
    const l = this.letraEscolhida();
    if (!l) return;
    this.letraEscolhida.set(null);
    this.acao(this.api.chutarLetra(this.matchId()!, l, 'ATACAR', alvo.id));
  }

  protected votarDica(): void {
    const l = this.letraEscolhida();
    if (!l) return;
    this.letraEscolhida.set(null);
    this.acao(this.api.chutarLetra(this.matchId()!, l, 'DICA'));
  }

  protected arriscar(): void {
    const p = this.palpite().trim();
    if (!this.podeArriscar()) return;
    const catapulta =
      !this.team()?.isHorde && this.efeitoRisco() === 'CATAPULTA';
    const efeito: EfeitoRisco = catapulta ? 'CATAPULTA' : 'CURAR';
    const alvo = catapulta ? (this.alvoCatapulta() ?? undefined) : undefined;
    this.fecharRisco();
    this.palpite.set('');
    this.acao(this.api.arriscar(this.matchId()!, p, efeito, alvo));
  }
}
