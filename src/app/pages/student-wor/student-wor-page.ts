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
import { RealtimeService } from '../../core/realtime.service';
import { StudentAuthService } from '../../core/student-auth.service';
import { WorApiService } from '../../core/wor-api.service';
import { FREEZE_MS, NarradorCards, cardNoAr } from '../../core/action-card';
import { PlacarEquipe, ResumoRodada, WorMatch, WorTeam } from '../../core/models';
import { ActionCard } from '../../ui/action-card/action-card';
import { Confetti } from '../../ui/confetti/confetti';
import { Icon } from '../../ui/icon/icon';
import { LobbyLoader } from '../../ui/lobby-loader/lobby-loader';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LIMITE_RODADA_S = 60;

/**
 * Cliente do aluno (mobile-first). Escuta o próprio time (dano barato) + a raiz
 * (que carrega o placar de TODAS as equipes, o resumo da última rodada e o
 * cronômetro). Cada membro chuta uma letra e vota o alvo, ou arrisca a palavra.
 */
@Component({
  selector: 'app-student-wor-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Modal, LobbyLoader, Spinner, Confetti, ActionCard, RouterLink],
  template: `
    @if (narrador.card(); as c) {
      <app-action-card [card]="c" />
    }

    <div class="wrap" [class.dano]="piscar()">
      @if (resumoBanner(); as r) {
        <div class="reveal" [class.reveal--eu]="r.acao === 'ATACAR' && souEu(r.alvoEquipeId)">
          <strong>{{ r.equipeNome }}</strong>
          @if (r.acertadores.length) {
            <span class="reveal__ok">acertou {{ acertadoresTxt(r) }}</span>
          } @else {
            <span>não acertou{{ r.porTempo ? ' (tempo!)' : '' }}</span>
          }
          @switch (r.acao) {
            @case ('ATACAR') {
              <span class="reveal__hit">→ atacou {{ r.alvoNome }} (-{{ r.dano }}{{ r.critico ? ' CRÍTICO' : '' }})</span>
            }
            @case ('DICA') { <span>→ comprou dica</span> }
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
            <span class="fort__pontos"><app-icon name="trophy" [size]="14" /> {{ t.pontos ?? 0 }} pts</span>
            <span class="hpbar"><span [style.width.%]="hpPct(t.hp)"></span></span>
            <span class="hp">{{ t.hp }} HP</span>
            <span class="fort__dica">O dano vira pontos: desempata e vale ranking.</span>
          </header>

          @if (m.status === 'EM_ANDAMENTO') {
            <div class="timer" [class.timer--fim]="restante() <= 10">
              <app-icon name="alert" [size]="14" />
              {{ turnoNome() }} · {{ restante() }}s
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
            <a class="btn-primary voltar-btn" routerLink="/aluno/dashboard">Voltar ao início</a>
          } @else if (!ehMeuTurno()) {
            <p class="aguarde">Aguarde o turno da {{ turnoNome() }}…</p>
          } @else if (jaJoguei()) {
            <div class="painel">
              <app-lobby-loader />
              <p class="aguarde">Você jogou! Aguardando os outros membros da sua equipe…</p>
            </div>
          } @else {
            <div class="painel">
              @if (!t.isHorde) {
                <h2>Sua vez — escolha uma letra</h2>
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
                  [class.castelo--turno]="e.id === m.turnoEquipeId"
                  [class.castelo--eu]="souEu(e.id)"
                  [style.--cor]="e.cor"
                >
                  <span class="castelo__nome">
                    <app-icon [name]="e.isHorde ? 'sword' : 'castle'" [size]="14" /> {{ e.nome }}
                    @if (souEu(e.id)) { <span class="castelo__tag">você</span> }
                    @if (e.id === m.turnoEquipeId) { <span class="castelo__tag castelo__tag--turno">jogando</span> }
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
      <app-modal [open]="true" title="Arriscar a palavra?" (close)="modalRisco.set(false)">
        <p class="aviso">
          Se acertar, você {{ team()?.isHorde ? 'invade e rouba o castelo do líder' : 'cura seu castelo massivamente e encerra a rodada' }}.
          Se errar, sofrerá Dano Crítico no seu castelo.
        </p>
        <input class="tichr-input" [value]="palpite()" (input)="palpite.set($any($event.target).value)" placeholder="Digite a palavra inteira" />
        <button modal-actions class="btn-primary" type="button" [disabled]="travado() || !palpite().trim()" (click)="arriscar()">
          Confirmar tentativa
        </button>
      </app-modal>
    }

    <!-- Modal: quem atacou o seu castelo -->
    @if (danoModal(); as r) {
      <app-modal [open]="true" title="Seu castelo foi atacado!" (close)="danoModal.set(null)">
        <p class="aviso">
          <b>{{ r.equipeNome }}</b> atirou no seu castelo · <b>-{{ r.dano }} HP</b>{{ r.critico ? ' (CRÍTICO!)' : '' }}.
        </p>
        <button modal-actions class="btn-primary" type="button" (click)="danoModal.set(null)">Vamos revidar!</button>
      </app-modal>
    }

    @if (modalHorda()) {
      <app-modal [open]="true" title="Seu Castelo Caiu… Mas a Guerra Não Acabou!" (close)="modalHorda.set(false)">
        <p class="aviso">Sua equipe agora é uma <b>Horda Bárbara</b>.</p>
        <p class="aviso">Vocês não podem mais chutar letras nem comprar dicas. No seu turno, a única jogada é a <b>Invasão</b>: adivinhar a palavra inteira.</p>
        <p class="aviso">Se acertarem, roubam o castelo da equipe em 1º lugar e assumem a liderança!</p>
        <button modal-actions class="btn-primary" type="button" (click)="modalHorda.set(false)">Entendido, vamos à forra!</button>
      </app-modal>
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
    .vazio, .lobby { display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); }
    .lobby h1 { margin: 0; color: var(--text); font-size: 1.4rem; }
    .aguarde { text-align: center; color: var(--text-muted); font-weight: 600; }
    .fort { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.9rem; border-radius: 14px; border: 2px solid var(--cor); background: color-mix(in srgb, var(--cor) 8%, var(--surface)); }
    .fort__nome { display: flex; align-items: center; gap: 0.4rem; font-weight: 800; }
    .fort__pontos { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 1.05rem; font-weight: 800; color: var(--cor); font-variant-numeric: tabular-nums; }
    .fort__dica { font-size: 0.72rem; color: var(--text-muted); }
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
    .castelo--turno { border-color: var(--cor); background: color-mix(in srgb, var(--cor) 10%, transparent); }
    .castelo--eu { outline: 2px solid color-mix(in srgb, var(--cor) 60%, var(--border)); }
    .castelo__nome { display: flex; align-items: center; gap: 0.35rem; font-weight: 700; font-size: 0.9rem; color: var(--text); }
    .castelo__tag { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; padding: 0.05rem 0.35rem; border-radius: 999px; background: var(--surface-alt); color: var(--text-muted); }
    .castelo__tag--turno { background: var(--cor); color: #fff; }
    .castelo__bar { grid-column: 1 / -1; height: 8px; border-radius: 999px; background: var(--surface-alt); overflow: hidden; }
    .castelo__bar span { display: block; height: 100%; transition: width 0.4s ease; }
    .castelo__hp { font-size: 0.78rem; font-weight: 800; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .fim { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; border-radius: 12px; background: color-mix(in srgb, #94a3b8 22%, transparent); color: var(--text); font-weight: 800; text-align: center; }
    .fim--win { background: color-mix(in srgb, #f59e0b 22%, transparent); color: #b45309; }
    .voltar-btn { width: 100%; text-align: center; text-decoration: none; }
    .alvos, .painel .btn-primary { width: 100%; }
    .alvos { display: flex; flex-direction: column; gap: 0.5rem; }
    .alvo { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.8rem; border-radius: 12px; border: 2px solid var(--cor); background: color-mix(in srgb, var(--cor) 10%, var(--surface)); color: var(--text); font-weight: 800; cursor: pointer; }
    .alvo--dica { --cor: #b45309; }
    .alvo:disabled { opacity: 0.5; cursor: not-allowed; }
    .aviso { margin: 0 0 0.75rem; color: var(--text-muted); }
    .aviso b { color: var(--text); }

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

  private readonly alunoId = this.studentAuth.aluno()?.id ?? '';

  protected readonly carregando = signal(true);
  protected readonly matchId = signal<string | null>(null);
  protected readonly root = signal<WorMatch | null>(null);
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
  /** Modal: quem atacou o meu castelo. */
  protected readonly danoModal = signal<ResumoRodada | null>(null);
  /** Narração global (Action Cards) — chega pelo doc da própria equipe. */
  protected readonly narrador = new NarradorCards();
  private readonly relogio = signal(Date.now());

  protected readonly letras = LETRAS;
  private myTeamId: string | null = null;
  private ultimoHp = Infinity;
  private jaEraHorda = false;
  private ultimoSeq = 0;

  protected readonly ehMeuTurno = computed(
    () => !!this.myTeamId && this.root()?.turnoEquipeId === this.myTeamId,
  );
  protected readonly jaJoguei = computed(
    () => this.root()?.acoesRodada?.some((a) => a.alunoId === this.alunoId) ?? false,
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
  protected readonly turnoNome = computed(
    () => this.placar().find((e) => e.id === this.root()?.turnoEquipeId)?.nome ?? 'sua equipe',
  );
  /**
   * Segundos restantes da rodada. Congelado, o início vem do FUTURO (o servidor
   * o empurra enquanto o card está no ar): o teto de 60s segura o relógio parado
   * até o card sair, em vez de exibir 62s.
   */
  protected readonly restante = computed(() => {
    const m = this.root();
    if (!m || m.status !== 'EM_ANDAMENTO' || !m.rodadaIniciadaEm) return LIMITE_RODADA_S;
    const fim = Date.parse(m.rodadaIniciadaEm) + LIMITE_RODADA_S * 1000;
    const s = Math.ceil((fim - this.relogio()) / 1000);
    return Math.max(0, Math.min(LIMITE_RODADA_S, s));
  });
  /** Inputs bloqueados: durante a chamada HTTP ou com um card interrompendo o jogo. */
  protected readonly travado = computed(() => this.ocupado() || this.narrador.ativo());

  protected hpPct(hp: number): number {
    return Math.max(0, Math.min(100, hp / 10));
  }
  protected souEu(id?: string): boolean {
    return !!id && id === this.myTeamId;
  }
  protected acertadoresTxt(r: ResumoRodada): string {
    return r.acertadores.map((a) => `${a.nome} (${a.letra})`).join(', ');
  }
  protected letraUsada(l: string): boolean {
    const m = this.root();
    if (!m) return false;
    return (
      m.letrasTentadas.includes(l) ||
      (m.acoesRodada?.some((a) => a.tipo === 'LETRA' && a.letra === l) ?? false)
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
    this.resumoBanner.set(r);
    setTimeout(() => {
      if (this.resumoBanner()?.seq === r.seq) this.resumoBanner.set(null);
    }, 5000);
    if (r.acao === 'ATACAR' && r.alvoEquipeId === this.myTeamId) {
      this.danoModal.set(r);
    }
  }

  private resolverEquipe(teams: WorTeam[]): void {
    const mine = teams.find((t) => t.membros.some((mm) => mm.alunoId === this.alunoId));
    if (!mine || this.myTeamId) return;
    this.myTeamId = mine.id;
    this.team.set(mine);
    this.ultimoHp = mine.hp;
    this.jaEraHorda = mine.isHorde;
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
    if (!p) return;
    this.modalRisco.set(false);
    this.palpite.set('');
    this.acao(this.api.arriscar(this.matchId()!, p));
  }
}
