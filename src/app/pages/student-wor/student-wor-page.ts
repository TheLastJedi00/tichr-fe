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
import { WorMatch, WorTeam } from '../../core/models';
import { Confetti } from '../../ui/confetti/confetti';
import { Icon } from '../../ui/icon/icon';
import { LobbyLoader } from '../../ui/lobby-loader/lobby-loader';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Cliente do aluno (mobile-first). Escuta APENAS o próprio time + a raiz. Cada
 * membro da equipe age uma vez na rodada: chuta uma letra e VOTA o alvo (atacar
 * rival ou comprar dica), ou arrisca a palavra. Dano pisca a tela; a queda abre
 * o modal da Horda; o fim mostra quem venceu.
 */
@Component({
  selector: 'app-student-wor-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Modal, LobbyLoader, Spinner, Confetti, RouterLink],
  template: `
    <div class="wrap" [class.dano]="piscar()">
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
          <!-- Cabeçalho da fortaleza -->
          <header class="fort" [style.--cor]="t.cor">
            <span class="fort__nome">
              <app-icon [name]="t.isHorde ? 'sword' : 'castle'" [size]="18" /> {{ t.nome }}
            </span>
            <span class="hpbar"><span [style.width.%]="hpPct(t.hp)"></span></span>
            <span class="hp">{{ t.hp }} HP</span>
          </header>

          <!-- Palavra mascarada -->
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
            <p class="aguarde">Aguarde o turno da sua equipe…</p>
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
                      [disabled]="ocupado() || letraUsada(l)"
                      (click)="escolherLetra(l)"
                    >{{ l }}</button>
                  }
                </div>
              }
              <button class="btn-risco" type="button" (click)="modalRisco.set(true)">
                <app-icon name="sword" [size]="16" />
                {{ t.isHorde ? 'Tentar Invasão' : 'Arriscar a palavra' }}
              </button>
            </div>
          }

          <!-- Cartas de dica visíveis -->
          @if (m.cartasVisiveis.length) {
            <div class="cartas">
              @for (c of m.cartasVisiveis; track $index) {
                <div class="carta"><b>Carta {{ $index + 1 }}:</b> {{ c }}</div>
              }
            </div>
          }
        }
      }
    </div>

    <!-- Modal: escolher letra → votar o alvo (atacar rival ou comprar dica) -->
    @if (letraEscolhida(); as l) {
      <app-modal [open]="true" [title]="'Letra ' + l + ' — vote a ação'" (close)="letraEscolhida.set(null)">
        <p class="aviso">
          Se sua equipe acertar, ataca o castelo <b>mais votado</b>. Escolha o alvo — ou vote em comprar uma dica.
        </p>
        <div class="alvos">
          @for (r of rivais(); track r.id) {
            <button class="alvo" type="button" [style.--cor]="r.cor" [disabled]="ocupado()" (click)="votarAtacar(r)">
              <app-icon name="sword" [size]="16" /> Atacar {{ r.nome }} · {{ r.hp }} HP
            </button>
          }
          <button class="alvo alvo--dica" type="button" [disabled]="ocupado() || semCartas()" (click)="votarDica()">
            <app-icon name="sparkles" [size]="16" /> Comprar dica (revelar carta)
          </button>
          @if (semCartas()) { <small class="hint">Todas as cartas já foram reveladas.</small> }
        </div>
      </app-modal>
    }

    <!-- Modal: Risco Heroico / Invasão -->
    @if (modalRisco()) {
      <app-modal [open]="true" title="Arriscar a palavra?" (close)="modalRisco.set(false)">
        <p class="aviso">
          Se acertar, você {{ team()?.isHorde ? 'invade e rouba o castelo do líder' : 'cura seu castelo massivamente e encerra a rodada' }}.
          Se errar, sofrerá Dano Crítico no seu castelo.
        </p>
        <input class="tichr-input" [value]="palpite()" (input)="palpite.set($any($event.target).value)" placeholder="Digite a palavra inteira" />
        <button modal-actions class="btn-primary" type="button" [disabled]="ocupado() || !palpite().trim()" (click)="arriscar()">
          Confirmar tentativa
        </button>
      </app-modal>
    }

    <!-- Modal: Queda da Horda -->
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
    .vazio, .lobby { display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); }
    .lobby h1 { margin: 0; color: var(--text); font-size: 1.4rem; }
    .aguarde { text-align: center; color: var(--text-muted); font-weight: 600; }
    .fort { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.9rem; border-radius: 14px; border: 2px solid var(--cor); background: color-mix(in srgb, var(--cor) 8%, var(--surface)); }
    .fort__nome { display: flex; align-items: center; gap: 0.4rem; font-weight: 800; }
    .hpbar { height: 12px; border-radius: 999px; background: var(--surface-alt); overflow: hidden; }
    .hpbar span { display: block; height: 100%; background: var(--cor); transition: width 0.4s ease; }
    .hp { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); }
    .palavra { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.35rem; }
    .box { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2.6rem; border-radius: 8px; border-bottom: 4px solid var(--border); background: var(--surface); font-size: 1.3rem; font-weight: 800; }
    .box--on { border-bottom-color: #b45309; color: #b45309; }
    .sp { width: 1rem; }
    .painel { display: flex; flex-direction: column; gap: 0.75rem; }
    .painel h2 { margin: 0; font-size: 1.05rem; text-align: center; }
    .teclado { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem; }
    .tecla { padding: 0.7rem 0; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); font-weight: 800; font-size: 1rem; cursor: pointer; }
    .tecla:hover:not(:disabled) { border-color: #b45309; }
    .tecla:disabled { opacity: 0.35; cursor: not-allowed; }
    .btn-risco { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.8rem; border-radius: 12px; border: none; background: linear-gradient(135deg, #b45309, #7c2d12); color: #fff; font-weight: 800; cursor: pointer; }
    .hint { color: var(--text-muted); text-align: center; }
    .cartas { display: flex; flex-direction: column; gap: 0.5rem; }
    .carta { padding: 0.75rem; border-radius: 10px; background: #fdf6e3; color: #5b3a1a; font-size: 0.9rem; }
    .fim { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; border-radius: 12px; background: color-mix(in srgb, #94a3b8 18%, transparent); color: var(--text); font-weight: 800; text-align: center; }
    .fim--win { background: color-mix(in srgb, #f59e0b 18%, transparent); color: #b45309; }
    .voltar-btn { width: 100%; text-align: center; text-decoration: none; }
    .alvos, .painel .btn-primary { width: 100%; }
    .alvos { display: flex; flex-direction: column; gap: 0.5rem; }
    .alvo { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.8rem; border-radius: 12px; border: 2px solid var(--cor); background: color-mix(in srgb, var(--cor) 10%, var(--surface)); font-weight: 800; cursor: pointer; }
    .alvo--dica { --cor: #b45309; }
    .alvo:disabled { opacity: 0.5; cursor: not-allowed; }
    .aviso { margin: 0 0 0.75rem; color: var(--text-muted); }
    .aviso b { color: var(--text); }
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
  /** Letra escolhida aguardando o voto do alvo (abre o modal de votação). */
  protected readonly letraEscolhida = signal<string | null>(null);
  protected readonly palpite = signal('');

  protected readonly letras = LETRAS;
  private myTeamId: string | null = null;
  private ultimoHp = Infinity;
  private jaEraHorda = false;

  protected readonly ehMeuTurno = computed(
    () => !!this.myTeamId && this.root()?.turnoEquipeId === this.myTeamId,
  );
  /** Verdadeiro se este aluno já agiu na rodada atual (aguardando os colegas). */
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
      this.todosTeams().find((t) => t.id === this.root()?.vencedorEquipeId)?.nome ??
      'A equipe vencedora',
  );

  /** Barra de HP em % (HP inicial é 1000). */
  protected hpPct(hp: number): number {
    return Math.max(0, Math.min(100, hp / 10));
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
    // Sonda a batalha da turma: quando o professor roda, o lobby aparece em
    // segundos sem recarregar (mesmo padrão do Tichr Qlick). Para ao encontrar.
    const sonda = setInterval(() => {
      if (!this.matchId()) this.buscar();
    }, 4000);
    this.destroyRef.onDestroy(() => clearInterval(sonda));
  }

  /** Busca a partida ativa da turma; ao encontrar, passa a escutar em tempo real. */
  private buscar(): void {
    this.api.partidaAtual().subscribe({
      next: (v) => {
        this.carregando.set(false);
        if (!v || this.matchId() === v.match.id) return;
        this.matchId.set(v.match.id);
        this.root.set(v.match);
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
        // Equipes formadas depois do lobby: descobre a minha equipe uma vez.
        if (!this.myTeamId && m.status !== 'LOBBY') {
          this.api.partidaAtual().subscribe((v) => v && this.resolverEquipe(v.teams));
        }
        // No fim, carrega as equipes uma vez para nomear o vencedor.
        if (m.status === 'ENCERRADO' && !this.todosTeams().length) {
          this.api.partidaAtual().subscribe((v) => v && this.todosTeams.set(v.teams));
        }
      });
  }

  private resolverEquipe(teams: WorTeam[]): void {
    const mine = teams.find((t) => t.membros.some((mm) => mm.alunoId === this.alunoId));
    if (!mine || this.myTeamId) return;
    this.myTeamId = mine.id;
    this.team.set(mine);
    this.ultimoHp = mine.hp;
    this.jaEraHorda = mine.isHorde;
    // Realtime BARATO: escuta só o próprio castelo.
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

  /** Escolhe a letra e abre a votação do alvo (busca os rivais uma vez). */
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
