import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RealtimeService } from '../../core/realtime.service';
import { StudentAuthService } from '../../core/student-auth.service';
import { WorApiService } from '../../core/wor-api.service';
import { WorMatch, WorTeam } from '../../core/models';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Cliente do aluno (mobile-first). Escuta APENAS o próprio time + a raiz. Tudo
 * empilhado com gap; ações via REST. Dano pisca a tela; a queda abre o modal da Horda.
 */
@Component({
  selector: 'app-student-wor-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Modal],
  template: `
    <div class="wrap" [class.dano]="piscar()">
      @if (!matchId()) {
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
            <span class="hpbar"><span [style.width.%]="t.hp"></span></span>
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
            <div class="fim"><app-icon name="trophy" [size]="20" /> Batalha encerrada!</div>
          } @else if (aguardandoMeuDilema()) {
            <!-- Dilema Tático -->
            <div class="painel">
              <h2>Você acertou! Escolha sua ação:</h2>
              <button class="btn-primary" type="button" (click)="abrirAtaque()">
                <app-icon name="sword" [size]="16" /> Atacar um rival
              </button>
              <button class="btn-outline" type="button" [disabled]="semCartas()" (click)="confirmarDica()">
                <app-icon name="sparkles" [size]="16" /> Comprar dica (sacrifício)
              </button>
              @if (semCartas()) { <small class="hint">Todas as cartas já foram reveladas.</small> }
            </div>
          } @else if (ehMeuTurno()) {
            <div class="painel">
              @if (!t.isHorde) {
                <h2>Seu turno — escolha uma letra</h2>
                <div class="teclado">
                  @for (l of letras; track l) {
                    <button
                      class="tecla"
                      type="button"
                      [disabled]="ocupado() || m.letrasTentadas.includes(l)"
                      (click)="chutar(l)"
                    >{{ l }}</button>
                  }
                </div>
              }
              <button class="btn-risco" type="button" (click)="modalRisco.set(true)">
                <app-icon name="sword" [size]="16" />
                {{ t.isHorde ? 'Tentar Invasão' : 'Arriscar a palavra' }}
              </button>
            </div>
          } @else {
            <p class="aguarde">Aguarde o seu turno…</p>
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

    <!-- Modal: escolher rival para atacar -->
    @if (escolhendoAlvo()) {
      <app-modal [open]="true" title="Atacar qual castelo?" (close)="escolhendoAlvo.set(false)">
        <div class="alvos">
          @for (r of rivais(); track r.id) {
            <button class="alvo" type="button" [style.--cor]="r.cor" (click)="atacar(r)">
              {{ r.nome }} · {{ r.hp }} HP
            </button>
          }
        </div>
      </app-modal>
    }

    <!-- Modal: Risco Heroico / Invasão -->
    @if (modalRisco()) {
      <app-modal [open]="true" title="Arriscar a palavra?" (close)="modalRisco.set(false)">
        <p class="aviso">
          Se acertar, você {{ team()?.isHorde ? 'invade e rouba o castelo do líder' : 'cura seu castelo massivamente e encerra a rodada' }}.
          Se errar, sofrerá Dano Crítico do sistema.
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
    .fim { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; border-radius: 12px; background: color-mix(in srgb, #f59e0b 14%, transparent); color: #b45309; font-weight: 800; }
    .alvos, .painel .btn-primary, .painel .btn-outline { width: 100%; }
    .alvos { display: flex; flex-direction: column; gap: 0.5rem; }
    .alvo { padding: 0.8rem; border-radius: 12px; border: 2px solid var(--cor); background: color-mix(in srgb, var(--cor) 10%, var(--surface)); font-weight: 800; cursor: pointer; }
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

  protected readonly matchId = signal<string | null>(null);
  protected readonly root = signal<WorMatch | null>(null);
  protected readonly team = signal<WorTeam | null>(null);
  protected readonly rivais = signal<WorTeam[]>([]);
  protected readonly inscrito = signal(false);
  protected readonly ocupado = signal(false);
  protected readonly piscar = signal(false);
  protected readonly modalHorda = signal(false);
  protected readonly modalRisco = signal(false);
  protected readonly escolhendoAlvo = signal(false);
  protected readonly palpite = signal('');

  protected readonly letras = LETRAS;
  private myTeamId: string | null = null;
  private ultimoHp = Infinity;
  private jaEraHorda = false;

  protected readonly ehMeuTurno = computed(
    () => !!this.myTeamId && this.root()?.turnoEquipeId === this.myTeamId,
  );
  protected readonly aguardandoMeuDilema = computed(
    () =>
      !!this.myTeamId &&
      !!this.root()?.aguardandoDilema &&
      this.root()?.dilemaEquipeId === this.myTeamId,
  );
  protected readonly semCartas = computed(() => {
    const m = this.root();
    return !!m && m.cartasVisiveis.length >= m.totalCartas;
  });

  constructor() {
    this.api.partidaAtual().subscribe((v) => {
      if (!v) return;
      this.matchId.set(v.match.id);
      this.root.set(v.match);
      this.inscrito.set(v.match.inscritos.some((i) => i.alunoId === this.alunoId));
      this.resolverEquipe(v.teams);
      this.conectarRaiz(v.match.id);
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

  protected chutar(letra: string): void {
    this.acao(this.api.chutarLetra(this.matchId()!, letra));
  }

  protected abrirAtaque(): void {
    // Busca as equipes (uma vez) para escolher o alvo — leitura pontual, não realtime.
    this.api.partidaAtual().subscribe((v) => {
      if (!v) return;
      this.rivais.set(v.teams.filter((t) => t.id !== this.myTeamId && t.hp > 0));
      this.escolhendoAlvo.set(true);
    });
  }

  protected atacar(alvo: WorTeam): void {
    this.escolhendoAlvo.set(false);
    this.acao(this.api.dilema(this.matchId()!, 'ATACAR', alvo.id));
  }

  protected confirmarDica(): void {
    this.acao(this.api.dilema(this.matchId()!, 'COMPRAR_DICA'));
  }

  protected arriscar(): void {
    const p = this.palpite().trim();
    if (!p) return;
    this.modalRisco.set(false);
    this.palpite.set('');
    this.acao(this.api.arriscar(this.matchId()!, p));
  }
}
