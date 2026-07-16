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
import { IsolateusApiService } from '../../core/isolateus-api.service';
import { IsolateusMatch, PainelIsolateus } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { StudentAuthService } from '../../core/student-auth.service';
import { Icon } from '../../ui/icon/icon';
import { LobbyLoader } from '../../ui/lobby-loader/lobby-loader';
import { Spinner } from '../../ui/spinner/spinner';

/** Duração da animação do Despertar (revelação de papéis). */
const REVELACAO_MS = 3000;
/** Janelas da Quarentena — espelham as constantes `ISOLATEUS` do backend. */
const LIMITE_DEBATE_S = 90;
const LIMITE_VOTO_S = 60;

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
  imports: [RouterLink, Icon, Spinner, LobbyLoader],
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
              Você entrou como <b>{{ meuPseudonimo(p) }}</b>. O professor está
              auditando os nomes.
            </p>
          </div>
        } @else {
          <form class="registro" (submit)="entrar($event)">
            @if (vetado()) {
              <p class="aviso">Seu nome foi vetado pelo Comando Central. Escolha outro.</p>
            }
            <label class="campo">
              <span>Seu nome de personagem</span>
              <input
                class="tichr-input"
                maxlength="24"
                [value]="pseudonimo()"
                (input)="pseudonimo.set($any($event.target).value)"
                placeholder="Ex: Corvo Pálido"
              />
            </label>
            <p class="muted">
              Ninguém usa o nome verdadeiro. O pseudônimo evita perseguições
              pessoais e mantém o foco na lógica.
            </p>
            @if (erro()) { <p class="aviso">{{ erro() }}</p> }
            <button class="btn-iso full" type="submit" [disabled]="enviando() || pseudonimo().trim().length < 2">
              {{ enviando() ? 'Registrando…' : 'Entrar na vila' }}
            </button>
          </form>
        }
      } @else if (revelando()) {
        <!-- O Despertar -->
        <section class="revelacao" [class.revelacao--ameaca]="ehAmeaca()">
          <app-icon [name]="ehAmeaca() ? 'alien' : 'shield'" [size]="52" />
          <strong>{{ ehAmeaca() ? 'Você é a Ameaça' : 'Você é um Aldeão' }}</strong>
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
        <!-- Em jogo -->
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
            @case ('TURNO_AMEACA') {
              @if (ehAmeaca() && !foraDaVila()) {
                <section class="turno">
                  <h2 class="turno__tit">Seu turno, Ameaça</h2>
                  <p class="muted">Escolha o alvo desta noite. Ninguém saberá que foi você.</p>

                  <span class="grupo__lbl">Sabotar um setor</span>
                  <div class="alvos">
                    @for (s of p.setores; track s.id) {
                      @if (s.intacto) {
                        <button class="alvo" type="button" [disabled]="enviando()" (click)="agir('SABOTAR', s.id)">
                          <app-icon name="shield" [size]="16" /> {{ s.nome }}
                        </button>
                      }
                    }
                  </div>

                  <span class="grupo__lbl">Ou abduzir um morador</span>
                  <div class="alvos">
                    @for (h of vivos(p); track h.id) {
                      @if (h.id !== painel()?.habitanteId) {
                        <button class="alvo alvo--abd" type="button" [disabled]="enviando()" (click)="agir('ABDUZIR', h.id)">
                          <app-icon name="user" [size]="16" /> {{ h.nome }}
                        </button>
                      }
                    }
                  </div>
                  @if (erro()) { <p class="aviso">{{ erro() }}</p> }
                </section>
              } @else {
                <section class="espera">
                  <app-lobby-loader />
                  <strong>A noite caiu…</strong>
                  <p class="muted">Algo se move na vila. Aguarde o alarme.</p>
                </section>
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
              @if (p.vereditoQuarentena; as v) {
                <div class="card-global" [class.card-global--ok]="v.eraAmeaca">{{ v.texto }}</div>
              }
              @if (p.resumoRodada; as r) {
                <div class="card-global" [class.card-global--ok]="r.defendida">{{ r.texto }}</div>
              }
              @if (p.questaoPublica && p.corretaIndex !== null && p.corretaIndex !== undefined) {
                <p class="muted center">
                  Resposta correta:
                  <b>{{ letra(p.corretaIndex) }}) {{ p.questaoPublica.alternativas[p.corretaIndex] }}</b>
                </p>
              }
              @if (podeConvocar() && !foraDaVila()) {
                <button class="btn-quarentena" type="button" [disabled]="enviando()" (click)="convocar()">
                  <app-icon name="alert" [size]="16" /> Convocar Quarentena
                </button>
                <p class="muted center">
                  Cabe <b>uma Quarentena por rodada</b>. Prender um inocente
                  custa caro.
                </p>
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

  private readonly meuId = this.studentAuth.aluno()?.id ?? '';

  protected readonly partida = signal<IsolateusMatch | null>(null);
  protected readonly painel = signal<PainelIsolateus | null>(null);
  protected readonly carregando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly erro = signal('');
  protected readonly pseudonimo = signal('');
  /** O professor vetou o pseudônimo: o aluno some dos inscritos e volta ao registro. */
  protected readonly vetado = signal(false);
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
    const limite =
      p.status === 'QUESTAO_ATIVA'
        ? p.duracaoSegundos
        : p.status === 'QUARENTENA_DEBATE'
          ? LIMITE_DEBATE_S
          : p.status === 'QUARENTENA_VOTO'
            ? LIMITE_VOTO_S
            : 0;
    if (!limite) return 0;
    const fim = Date.parse(p.faseIniciadaEm) + limite * 1000;
    const s = Math.ceil((fim - this.relogio()) / 1000);
    return Math.max(0, Math.min(limite, s));
  });

  private partidaId: string | null = null;
  private jaEntrei = false;
  private ultimaRodada = -1;

  constructor() {
    this.buscar();
    // Sonda até a investigação aparecer (mesmo padrão do Qlick e do Wor).
    const sonda = setInterval(() => {
      if (!this.partida()) this.buscar();
    }, 4000);
    const tick = setInterval(() => this.relogio.set(Date.now()), 500);
    this.destroyRef.onDestroy(() => {
      clearInterval(sonda);
      clearInterval(tick);
    });
  }

  protected letra(i: number): string {
    return ['A', 'B', 'C', 'D', 'E', 'F'][i] ?? '?';
  }

  protected vivos(p: IsolateusMatch) {
    return p.habitantes.filter((h) => h.vivo && !h.preso);
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

    // Vetado no lobby: eu estava inscrito e sumi da lista.
    if (p.status === 'LOBBY' && this.jaEntrei && !this.inscrito(p)) {
      this.jaEntrei = false;
      this.vetado.set(true);
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
      this.jaPulei.set(false);
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

  protected meuPseudonimo(p: IsolateusMatch): string {
    return p.inscritos.find((i) => i.alunoId === this.meuId)?.nome ?? '—';
  }

  protected entrar(ev: Event): void {
    ev.preventDefault();
    const nome = this.pseudonimo().trim();
    if (!this.partidaId || nome.length < 2 || this.enviando()) return;
    this.enviando.set(true);
    this.erro.set('');
    this.api.entrar(this.partidaId, nome).subscribe({
      next: () => {
        this.enviando.set(false);
        this.jaEntrei = true;
        this.vetado.set(false);
      },
      error: (e: { error?: { message?: string } }) => {
        this.enviando.set(false);
        this.erro.set(
          e.error?.message ?? 'Não foi possível registrar esse nome.',
        );
      },
    });
  }

  // --- Em jogo ---

  /** O Turno da Ameaça: sabotar um setor ou abduzir um morador. */
  protected agir(tipo: 'SABOTAR' | 'ABDUZIR', alvoId: string): void {
    if (!this.partidaId || this.enviando()) return;
    this.enviando.set(true);
    this.erro.set('');
    this.api.acao(this.partidaId, tipo, alvoId).subscribe({
      next: () => this.enviando.set(false),
      error: (e: { error?: { message?: string } }) => {
        this.enviando.set(false);
        this.erro.set(e.error?.message ?? 'Não foi possível agir agora.');
      },
    });
  }

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
