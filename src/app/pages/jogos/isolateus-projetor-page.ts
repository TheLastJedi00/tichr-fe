import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IsolateusApiService } from '../../core/isolateus-api.service';
import { Aluno } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Icon } from '../../ui/icon/icon';
import { LobbyLoader } from '../../ui/lobby-loader/lobby-loader';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';

/** Janelas cronometradas — espelham as constantes `ISOLATEUS` do backend. */
const LIMITE_DEBATE_S = 90;
const LIMITE_VOTO_S = 60;
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
  imports: [RouterLink, Icon, Spinner, LobbyLoader, Modal],
  template: `
    <a class="voltar" routerLink="/jogos/isolateus">‹ Minhas investigações</a>

    @if (partida(); as p) {
      <h1 class="title">{{ p.nome }}</h1>

      @if (p.status === 'LOBBY') {
        <section class="lobby">
          @if (pin(); as pinTurma) {
            <div class="pinbig">
              <span class="pinbig__lbl">PIN da turma</span>
              <strong class="pinbig__val">{{ pinTurma }}</strong>
              <span class="pinbig__hint">Os alunos entram pelo portal com este PIN</span>
              <button class="btn-outline" type="button" (click)="assistencia.set(true)">
                <app-icon name="users" [size]="16" /> Ver detalhes / lista de alunos
              </button>
            </div>
          }

          <div class="espera">
            <div class="lead lead--row">
              <span>Habitantes se registrando…</span>
              <app-lobby-loader class="loader-mini" />
            </div>
            @if (!p.inscritos.length) {
              <p class="muted">Aguardando os primeiros nomes de personagem.</p>
            } @else {
              <p class="muted">
                Toque no nome para <b>trocar o apelido</b>, ou no × para <b>vetar</b>
                — vetar devolve o aluno à tela de registro.
              </p>
              <ul class="inscritos">
                @for (i of p.inscritos; track i.alunoId) {
                  <li>
                    <span class="chip">
                      <button
                        class="chip__nome"
                        type="button"
                        [disabled]="ocupado()"
                        (click)="renomear(i.alunoId, i.nome)"
                      >
                        {{ i.nome }}
                      </button>
                      <button
                        class="chip__x"
                        type="button"
                        aria-label="Vetar {{ i.nome }}"
                        [disabled]="ocupado()"
                        (click)="vetar(i.alunoId, i.nome)"
                      >
                        <app-icon name="close" [size]="12" />
                      </button>
                    </span>
                  </li>
                }
              </ul>
            }
          </div>

          <button
            class="btn-iso full"
            type="button"
            [disabled]="ocupado() || p.inscritos.length < minReais"
            (click)="iniciar()"
          >
            Iniciar investigação ({{ p.inscritos.length }} na vila)
          </button>
          <p class="muted center">
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
        <section class="vila">
          <div class="esperanca">
            <span class="esperanca__lbl">Barra de Esperança</span>
            <span class="esperanca__bar">
              <span [style.width.%]="p.esperanca" [class.baixa]="p.esperanca <= 30"></span>
            </span>
            <span class="esperanca__val">{{ p.esperanca }}</span>
          </div>

          <div class="setores">
            @for (s of p.setores; track s.id) {
              <span class="setor" [class.setor--ruina]="!s.intacto">
                <app-icon [name]="s.intacto ? 'shield' : 'skull'" [size]="14" />
                {{ s.nome }}
              </span>
            }
          </div>

          <p class="noite">
            Noite {{ p.rodada + 1 }} de {{ p.totalRodadas }} ·
            {{ vivos(p).length }} habitante(s) na vila
          </p>

          @switch (p.status) {
            @case ('TURNO_AMEACA') {
              <div class="aguardando">
                <app-icon name="alien" [size]="28" />
                <strong>A Ameaça escolhe seu alvo…</strong>
                <p class="muted">Ninguém sabe quem está decidindo. Aguardem.</p>
                <app-lobby-loader />
              </div>
            }

            @case ('QUESTAO_ATIVA') {
              @if (p.alerta; as a) {
                <div class="alerta"><app-icon name="alert" [size]="18" /> {{ a.texto }}</div>
              }
              @if (p.questaoPublica; as q) {
                <div class="timer" [class.timer--fim]="restante() <= 10">{{ restante() }}s</div>
                <h2 class="enunciado">{{ q.enunciado }}</h2>
                <ol class="alts">
                  @for (alt of q.alternativas; track $index) {
                    <li><span class="letra">{{ letra($index) }}</span> {{ alt }}</li>
                  }
                </ol>
              }
              <div class="feed">
                <span class="feed__tit">Chat de Rumores</span>
                @for (r of p.rumores; track r.id) {
                  <p class="rumor" [class.rumor--sinal]="r.tipo === 'SINAL'">
                    <strong>{{ r.tipo === 'SINAL' ? '[ Sinal Interceptado ]' : r.autorNome }}</strong>
                    {{ r.texto }}
                  </p>
                }
              </div>
            }

            @case ('RESULTADO_RODADA') {
              @if (p.vereditoQuarentena; as v) {
                <div class="card-global" [class.card-global--ok]="v.eraAmeaca">{{ v.texto }}</div>
              }
              @if (p.resumoRodada; as r) {
                <div class="card-global" [class.card-global--ok]="r.defendida">{{ r.texto }}</div>
              }
              @if (p.questaoPublica && p.corretaIndex !== null && p.corretaIndex !== undefined) {
                <p class="reveal">
                  Resposta correta:
                  <b>{{ letra(p.corretaIndex) }}) {{ p.questaoPublica.alternativas[p.corretaIndex] }}</b>
                </p>
              }
              <div class="acoes">
                @if (podeConvocar()) {
                  <button class="btn-quarentena" type="button" [disabled]="ocupado()" (click)="quarentena()">
                    <app-icon name="alert" [size]="16" /> Convocar Quarentena
                  </button>
                }
                <button class="btn-iso" type="button" [disabled]="ocupado()" (click)="proxima()">
                  {{ ultimaNoite(p) ? 'Encerrar e ver o veredito' : 'Próxima noite' }}
                </button>
              </div>
            }

            @case ('QUARENTENA_DEBATE') {
              <div class="quarentena">
                <span class="quarentena__tag">Quarentena · Debate</span>
                <div class="timer" [class.timer--fim]="restante() <= 10">{{ restante() }}s</div>
                <div class="feed">
                  @for (m of p.debate; track m.id) {
                    <p class="rumor"><strong>{{ m.autorNome }}</strong> {{ m.texto }}</p>
                  }
                </div>
                @if (p.pulosRecebidos) {
                  <p class="lead">{{ p.pulosRecebidos }} já pularam o debate.</p>
                }
              </div>
            }

            @case ('QUARENTENA_VOTO') {
              <div class="quarentena">
                <span class="quarentena__tag">Quarentena · Veredito</span>
                <div class="timer" [class.timer--fim]="restante() <= 10">{{ restante() }}s</div>
                <p class="lead">Depositem seus votos. {{ p.votosRecebidos }} voto(s) recebido(s).</p>
                <app-lobby-loader />
              </div>
            }

            @case ('ENCERRADO') {
              @if (p.veredito; as v) {
                <div class="fim" [class.fim--vila]="v.lado === 'VILA'">
                  <app-icon [name]="v.lado === 'VILA' ? 'trophy' : 'alien'" [size]="26" />
                  <strong>{{ v.lado === 'VILA' ? 'A VILA VENCEU' : 'A AMEAÇA VENCEU' }}</strong>
                  <p>{{ v.motivo }}</p>
                </div>
              }
              <ol class="ranking">
                @for (r of p.rankingFinal; track r.alunoId) {
                  <li>
                    <span class="pos">{{ r.posicao }}º</span>
                    <span class="rk-nome">{{ r.nome }}</span>
                    <span class="rk-pts">{{ r.pontos }} XP</span>
                  </li>
                }
              </ol>
            }
          }
        </section>
      }

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
    } @else {
      <div class="loading"><app-spinner [size]="32" /></div>
    }
  `,
  styles: `
    :host { display: block; }
    .voltar { display: inline-block; margin-bottom: 0.75rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 800; }
    .loading { display: flex; justify-content: center; padding: 4rem 0; color: #4d7c0f; }
    .lobby, .vila { display: flex; flex-direction: column; gap: 1rem; }
    .pinbig { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; padding: 1.25rem; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); }
    .pinbig__lbl { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
    .pinbig__val { font-size: 3.5rem; font-weight: 900; line-height: 1; color: #4d7c0f; letter-spacing: 0.08em; }
    .pinbig__hint { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem; }
    .espera { padding: 1rem; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); }
    .lead { font-weight: 700; margin: 0 0 0.5rem; }
    .lead--row { display: flex; align-items: center; gap: 0.25rem; }
    .loader-mini { transform: scale(0.5); margin: -14px -10px; }
    .muted { color: var(--text-muted); font-size: 0.9rem; margin: 0.25rem 0; }
    .center { text-align: center; }
    .inscritos { list-style: none; display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.6rem 0 0; padding: 0; }
    .chip { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.7rem; border-radius: 999px; border: 1px solid var(--border); background: var(--surface-alt); font-weight: 600; font-size: 0.85rem; font-family: inherit; color: var(--text); }
    .chip:hover { border-color: var(--danger); }
    .chip__nome, .chip__x { border: none; background: none; padding: 0; font: inherit; color: inherit; cursor: pointer; display: inline-flex; align-items: center; }
    .chip__nome:hover:not(:disabled) { text-decoration: underline; }
    .chip__x:hover:not(:disabled) { color: var(--danger); }
    .chip__nome:disabled, .chip__x:disabled { cursor: not-allowed; opacity: 0.55; }
    .btn-iso { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.85rem 1.2rem; border: none; border-radius: 12px; cursor: pointer; font: inherit; font-weight: 800; color: #fff; background: linear-gradient(135deg, #84cc16, #4d7c0f); }
    .btn-iso:disabled { opacity: 0.55; cursor: not-allowed; }
    .full { width: 100%; }
    .erro { color: var(--danger); font-weight: 600; }
    /* Vila */
    .esperanca { display: flex; align-items: center; gap: 0.6rem; }
    .esperanca__lbl { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); }
    .esperanca__bar { flex: 1; height: 12px; border-radius: 999px; background: var(--surface-alt); border: 1px solid var(--border); overflow: hidden; }
    .esperanca__bar > span { display: block; height: 100%; background: #84cc16; transition: width 0.4s ease; }
    .esperanca__bar > span.baixa { background: var(--danger); }
    .esperanca__val { font-weight: 800; min-width: 2.5ch; text-align: right; }
    .setores { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .setor { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.6rem; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); font-size: 0.8rem; font-weight: 600; }
    .setor--ruina { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 40%, var(--border)); text-decoration: line-through; opacity: 0.75; }
    .noite { margin: 0; color: var(--text-muted); font-weight: 600; }
    .aguardando { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem 1rem; border: 1px dashed #84cc16; border-radius: 16px; color: #4d7c0f; }
    .aguardando strong { font-size: 1.15rem; }
    .alerta { display: flex; align-items: center; gap: 0.5rem; padding: 0.85rem 1rem; border-radius: 12px; font-weight: 800; color: #fff; background: var(--danger); }
    .timer { align-self: center; font-size: 2rem; font-weight: 900; color: #4d7c0f; }
    .timer--fim { color: var(--danger); }
    .enunciado { margin: 0; font-size: 1.35rem; font-weight: 800; text-align: center; }
    .alts { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr; gap: 0.5rem; }
    @media (min-width: 640px) { .alts { grid-template-columns: 1fr 1fr; } }
    .alts li { display: flex; align-items: center; gap: 0.6rem; padding: 0.85rem 1rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); font-weight: 600; }
    .letra { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; font-weight: 800; color: #fff; background: #4d7c0f; }
    .feed { display: flex; flex-direction: column; gap: 0.4rem; max-height: 240px; overflow-y: auto; padding: 0.75rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-alt); }
    .feed__tit { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
    .rumor { margin: 0; font-size: 0.9rem; line-height: 1.45; }
    .rumor strong { color: var(--text-muted); margin-right: 0.35rem; }
    .rumor--sinal { color: #4d7c0f; font-weight: 600; }
    .rumor--sinal strong { color: #4d7c0f; }
    .card-global { padding: 1rem; border-radius: 14px; font-weight: 800; text-align: center; color: #fff; background: var(--danger); }
    .card-global--ok { background: var(--success); }
    .reveal { text-align: center; margin: 0; color: var(--text-muted); }
    .acoes { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .acoes > * { flex: 1; }
    .btn-quarentena { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.85rem 1.2rem; border: none; border-radius: 12px; cursor: pointer; font: inherit; font-weight: 800; color: #fff; background: var(--danger); }
    .quarentena { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; border: 2px solid var(--danger); border-radius: 16px; }
    .quarentena__tag { align-self: center; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--danger); }
    .fim { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem; border-radius: 16px; text-align: center; color: #fff; background: linear-gradient(135deg, #4d7c0f, #1a2e05); }
    .fim--vila { background: linear-gradient(135deg, #2563eb, #1e40af); }
    .fim strong { font-size: 1.3rem; letter-spacing: 0.04em; }
    .fim p { margin: 0; opacity: 0.92; }
    .ranking { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .ranking li { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.85rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
    .pos { font-weight: 900; color: var(--text-muted); min-width: 2.5ch; }
    .rk-nome { flex: 1; font-weight: 700; }
    .rk-pts { font-weight: 800; color: #4d7c0f; }
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
  protected readonly ocupado = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly assistencia = signal(false);
  protected readonly pin = signal<string | null>(null);
  protected readonly alunos = signal<Aluno[]>([]);
  private readonly reveladosSet = signal<Set<string>>(new Set());

  private readonly relogio = signal(Date.now());
  private tempoDisparadoEm: string | null = null;

  /** A Quarentena volta a cada noite, mas só cabe uma por rodada. */
  protected readonly podeConvocar = computed(() => {
    const p = this.partida();
    return !!p && p.quarentenaRodada !== p.rodada;
  });

  /** Segundos restantes da fase cronometrada corrente. */
  protected readonly restante = computed(() => {
    const p = this.partida();
    const limite = this.limiteDaFase();
    if (!p || !p.faseIniciadaEm || !limite) return limite;
    const fim = Date.parse(p.faseIniciadaEm) + limite * 1000;
    const s = Math.ceil((fim - this.relogio()) / 1000);
    return Math.max(0, Math.min(limite, s));
  });

  /** Duração da fase atual: a questão tem o tempo do jogo; a Quarentena, o seu. */
  private limiteDaFase(): number {
    const p = this.partida();
    if (!p) return 0;
    if (p.status === 'QUESTAO_ATIVA') return p.duracaoSegundos;
    if (p.status === 'QUARENTENA_DEBATE') return LIMITE_DEBATE_S;
    if (p.status === 'QUARENTENA_VOTO') return LIMITE_VOTO_S;
    return 0;
  }

  constructor() {
    // O PIN da turma + roster (PINs dos alunos) para o lobby e a assistência.
    this.api.verPartida(this.matchId).subscribe((p) => {
      if (!p.turmaId) return;
      this.turmas
        .getTurma(p.turmaId)
        .subscribe((t) => this.pin.set(t.pinTurma ?? null));
      this.turmas.getAlunos(p.turmaId).subscribe((a) => this.alunos.set(a));
    });

    // O telão (sempre presente) fecha a fase quando o cronômetro zera — é ele
    // que substitui o timer que o servidor não tem.
    const tick = setInterval(() => {
      this.relogio.set(Date.now());
      this.checarTempo();
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(tick));
  }

  private checarTempo(): void {
    const p = this.partida();
    if (!p || !p.faseIniciadaEm || !this.limiteDaFase()) return;
    if (this.restante() > 0 || this.tempoDisparadoEm === p.faseIniciadaEm) return;
    this.tempoDisparadoEm = p.faseIniciadaEm;
    this.api.tempo(this.matchId).subscribe({ next: () => {}, error: () => {} });
  }

  protected letra(i: number): string {
    return ['A', 'B', 'C', 'D', 'E', 'F'][i] ?? '?';
  }

  protected vivos(p: { habitantes: Array<{ vivo: boolean; preso: boolean }> }) {
    return p.habitantes.filter((h) => h.vivo && !h.preso);
  }

  protected ultimaNoite(p: { rodada: number; totalRodadas: number }): boolean {
    return p.rodada >= p.totalRodadas - 1;
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

  protected vetar(alunoId: string, nome: string): void {
    if (!confirm(`Vetar o nome "${nome}"? O aluno volta para a tela de registro.`)) return;
    this.acao(this.api.vetarNome(this.matchId, alunoId));
  }

  /** Corrige um apelido sem tirar o aluno do lobby (só antes do Despertar). */
  protected renomear(alunoId: string, nome: string): void {
    const novo = prompt(`Novo apelido para "${nome}":`, nome)?.trim();
    if (!novo || novo === nome) return;
    this.acao(this.api.renomearInscrito(this.matchId, alunoId, novo));
  }

  protected iniciar(): void {
    this.acao(this.api.iniciar(this.matchId));
  }
  protected proxima(): void {
    this.acao(this.api.proxima(this.matchId));
  }
  protected quarentena(): void {
    this.acao(this.api.abrirQuarentena(this.matchId));
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
