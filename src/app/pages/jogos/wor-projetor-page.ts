import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RealtimeService } from '../../core/realtime.service';
import { WorApiService } from '../../core/wor-api.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Aluno, WorTeam } from '../../core/models';
import { Icon } from '../../ui/icon/icon';
import { LobbyLoader } from '../../ui/lobby-loader/lobby-loader';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Tela do projetor (professor/orquestrador). Escuta a raiz + todas as equipes
 * em tempo real. No lobby, distribui equipes e inicia; em jogo, mostra a palavra,
 * as cartas de dica e o HP das fortalezas. Mobile-first (empilhado, com gap).
 */
@Component({
  selector: 'app-wor-projetor-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Spinner, LobbyLoader, Modal],
  template: `
    <a class="voltar" routerLink="/jogos/wor">‹ Minhas batalhas</a>

    @if (match(); as m) {
      <h1 class="title">{{ m.nome }}</h1>

      @if (m.status === 'LOBBY') {
        <section class="lobby">
          @if (pin(); as p) {
            <div class="pinbig">
              <span class="pinbig__lbl">PIN da turma</span>
              <strong class="pinbig__val">{{ p }}</strong>
              <span class="pinbig__hint">Os alunos entram pelo portal com este PIN</span>
              <button class="btn-outline" type="button" (click)="assistencia.set(true)">
                <app-icon name="users" [size]="16" /> Ver detalhes / lista de alunos
              </button>
            </div>
          }

          <div class="espera">
            <div class="lead lead--row">
              <span>Alunos entrando na sala…</span>
              <app-lobby-loader class="loader-mini" />
            </div>
            @if (!m.inscritos.length) {
              <p class="muted">Aguardando os primeiros alunos entrarem.</p>
            } @else {
              <ul class="inscritos">
                @for (i of m.inscritos; track i.alunoId) { <li class="chip">{{ i.nome }}</li> }
              </ul>
            }
          </div>

          @if (!teams().length) {
            <button
              class="btn-primary full"
              type="button"
              [disabled]="ocupado() || m.inscritos.length < 2"
              (click)="distribuir()"
            >
              Distribuir equipes ({{ m.inscritos.length }} na sala)
            </button>
            <p class="muted center">
              @if (m.inscritos.length < 2) {
                É preciso pelo menos 2 alunos na sala. Peça para entrarem pelo portal com o PIN da turma.
              } @else {
                As equipes são formadas automaticamente: duplas a partir de 4 alunos, trios a partir de 6, quartetos a partir de 8.
              }
            </p>
          } @else {
            <div class="teams">
              @for (t of teams(); track t.id) {
                <span class="team-chip" [style.background]="t.cor">{{ t.nome }} · {{ t.membros.length }}</span>
              }
            </div>
            <button class="btn-primary full" type="button" [disabled]="ocupado()" (click)="iniciar()">Iniciar batalha</button>
          }
          @if (erro()) { <p class="erro">{{ erro() }}</p> }
        </section>
      } @else {
        <!-- Em jogo -->
        <section class="jogo">
          <div class="palavra">
            @for (ch of match()!.mascara; track $index) {
              @if (ch === ' ') { <span class="sp"></span> }
              @else { <span class="box" [class.box--on]="ch !== '_'">{{ ch === '_' ? '' : ch }}</span> }
            }
          </div>
          <p class="onda">Onda {{ m.ondaIndex + 1 }} de {{ m.totalOndas }}</p>

          <div class="cartas">
            @for (c of m.cartasVisiveis; track $index) {
              <div class="carta"><span class="carta__n">Carta {{ $index + 1 }}</span>{{ c }}</div>
            }
          </div>

          <div class="fortalezas">
            @for (t of teams(); track t.id) {
              <div class="fort" [class.fort--turno]="t.id === m.turnoEquipeId" [class.fort--horda]="t.isHorde">
                <span class="fort__top">
                  <app-icon [name]="t.isHorde ? 'sword' : 'castle'" [size]="16" />
                  <strong>{{ t.nome }}</strong>
                  @if (t.isHorde) { <span class="tag">Horda</span> }
                  @if (t.id === m.turnoEquipeId) { <span class="tag tag--turno">Turno</span> }
                </span>
                <span class="hpbar"><span [style.width.%]="t.hp / 10" [style.background]="t.cor"></span></span>
                <span class="hp">{{ t.hp }} HP</span>
              </div>
            }
          </div>

          @if (m.status === 'ENCERRADO') {
            <div class="fim">
              <app-icon name="trophy" [size]="22" />
              Vitória: {{ vencedorNome() }}
            </div>
          } @else {
            <button class="btn-outline" type="button" [disabled]="ocupado()" (click)="pular()">Pular palavra</button>
          }
        </section>
      }
    } @else {
      <div class="carregando"><app-spinner [size]="32" /></div>
    }

    <app-modal [open]="assistencia()" title="Lista de alunos" (close)="assistencia.set(false)">
      <p class="muted">Toque no card de um aluno para revelar o PIN e ajudá-lo a entrar.</p>
      <div class="assist">
        @for (a of alunos(); track a.id) {
          <button
            class="acard"
            type="button"
            [class.acard--on]="revelado(a.id)"
            (click)="revelar(a.id)"
          >
            <span class="acard__nome">{{ a.nome }}</span>
            @if (revelado(a.id)) {
              <strong class="acard__pin">{{ a.pinAcesso }}</strong>
            } @else {
              <span class="acard__oculto">•• toque para ver</span>
            }
          </button>
        } @empty {
          <p class="muted">Turma sem alunos.</p>
        }
      </div>
      <div modal-actions>
        <button class="btn-primary" type="button" (click)="assistencia.set(false)">Fechar</button>
      </div>
    </app-modal>
  `,
  styles: `
    :host { display: block; }
    .voltar { display: inline-block; margin-bottom: 0.75rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .title { margin: 0 0 1.25rem; font-size: 1.5rem; font-weight: 800; }
    .lobby, .jogo { display: flex; flex-direction: column; gap: 1.25rem; }
    .pinbig { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; padding: 1.5rem; border-radius: 16px; text-align: center; background: color-mix(in srgb, #b45309 10%, var(--surface)); border: 1px solid color-mix(in srgb, #b45309 30%, transparent); }
    .pinbig__lbl { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .pinbig__val { font-size: 3.5rem; font-weight: 800; line-height: 1; letter-spacing: 0.12em; color: #b45309; font-variant-numeric: tabular-nums; }
    .pinbig__hint { font-size: 0.8rem; color: var(--text-muted); }
    .pinbig .btn-outline { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.25rem; }
    .assist { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
    @media (min-width: 480px) { .assist { grid-template-columns: repeat(3, 1fr); } }
    .acard { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; cursor: pointer; padding: 0.7rem 0.5rem; border-radius: 12px; text-align: center; border: 1px solid var(--border); background: var(--surface); color: inherit; transition: transform 0.15s ease, border-color 0.15s ease; }
    .acard:hover { border-color: #b45309; }
    .acard--on { border-color: #b45309; background: color-mix(in srgb, #b45309 10%, transparent); transform: scale(1.03); }
    .acard__nome { font-weight: 700; font-size: 0.85rem; }
    .acard__pin { font-size: 1.6rem; font-weight: 800; color: #b45309; font-variant-numeric: tabular-nums; }
    .acard__oculto { font-size: 0.7rem; color: var(--text-muted); }
    @media (prefers-reduced-motion: reduce) { .acard { transition: none; } .acard--on { transform: none; } }
    .espera { display: flex; flex-direction: column; gap: 0.6rem; }
    .lead { font-weight: 600; margin: 0; }
    .lead--row { display: flex; align-items: center; gap: 0.2rem; }
    /* Loader colorido do lobby, discreto ao lado do texto de espera. */
    .loader-mini { transform: scale(0.5); margin: -14px -10px; }
    .muted { color: var(--text-muted); margin: 0; }
    .center { text-align: center; }
    .full { width: 100%; }
    .inscritos { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .teams { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .chip { padding: 0.3rem 0.7rem; border-radius: 999px; background: var(--surface-alt); font-size: 0.85rem; font-weight: 600; }
    .team-chip { padding: 0.3rem 0.75rem; border-radius: 999px; color: #fff; font-weight: 700; font-size: 0.85rem; }
    .campo { display: flex; flex-direction: column; gap: 0.35rem; }
    .campo > span { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    .erro { margin: 0; color: var(--danger); font-weight: 600; }
    /* Em jogo */
    .palavra { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; }
    .box { display: inline-flex; align-items: center; justify-content: center; width: 2.4rem; height: 3rem; border-radius: 8px; border-bottom: 4px solid var(--border); background: var(--surface); font-size: 1.6rem; font-weight: 800; }
    .box--on { border-bottom-color: #b45309; color: #b45309; }
    .sp { width: 1.2rem; }
    .onda { margin: 0; text-align: center; color: var(--text-muted); font-weight: 600; }
    .cartas { display: flex; flex-direction: column; gap: 0.6rem; }
    .carta { position: relative; padding: 1rem 1rem 1rem 1.2rem; border-radius: 12px; background: #fdf6e3; color: #5b3a1a; border: 1px solid #e6d3a8; font-weight: 600; }
    .carta__n { display: block; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; margin-bottom: 0.2rem; }
    .fortalezas { display: flex; flex-direction: column; gap: 0.6rem; }
    @media (min-width: 640px) { .fortalezas { display: grid; grid-template-columns: 1fr 1fr; } }
    .fort { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.9rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
    .fort--turno { border-color: #b45309; box-shadow: 0 0 0 2px color-mix(in srgb, #b45309 30%, transparent); }
    .fort--horda { opacity: 0.75; }
    .fort__top { display: flex; align-items: center; gap: 0.4rem; }
    .fort__top strong { flex: 1; min-width: 0; }
    .tag { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; padding: 0.1rem 0.4rem; border-radius: 999px; background: var(--surface-alt); color: var(--text-muted); }
    .tag--turno { background: #b45309; color: #fff; }
    .hpbar { height: 10px; border-radius: 999px; background: var(--surface-alt); overflow: hidden; }
    .hpbar span { display: block; height: 100%; transition: width 0.4s ease; }
    .hp { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); }
    .fim { display: flex; align-items: center; gap: 0.5rem; padding: 1rem; border-radius: 12px; background: color-mix(in srgb, #f59e0b 14%, transparent); color: #b45309; font-weight: 800; justify-content: center; }
    .carregando { display: flex; justify-content: center; padding: 3rem 0; color: #b45309; }
  `,
})
export class WorProjetorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly realtime = inject(RealtimeService);
  private readonly api = inject(WorApiService);
  private readonly turmas = inject(TurmaApiService);

  private readonly matchId = this.route.snapshot.paramMap.get('id')!;
  protected readonly match = toSignal(this.realtime.escutarMatch(this.matchId), {
    initialValue: null,
  });
  protected readonly teams = toSignal(this.realtime.escutarTeams(this.matchId), {
    initialValue: [] as WorTeam[],
  });

  protected readonly ocupado = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly pin = signal<string | null>(null);

  // Assistência de acesso (lista de alunos com o PIN sob flip) — igual ao Qlick.
  protected readonly alunos = signal<Aluno[]>([]);
  protected readonly assistencia = signal(false);
  private readonly reveladosSet = signal<Set<string>>(new Set());

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

  protected readonly vencedorNome = computed(() => {
    const id = this.match()?.vencedorEquipeId;
    return this.teams().find((t) => t.id === id)?.nome ?? '—';
  });

  constructor() {
    // Busca o PIN da turma + roster (PINs dos alunos) uma vez, para o lobby/assistência.
    this.api.verPartida(this.matchId).subscribe((v) => {
      const turmaId = v.match.turmaId;
      if (!turmaId) return;
      this.turmas.getTurma(turmaId).subscribe((t) => this.pin.set(t.pinTurma ?? null));
      this.turmas.getAlunos(turmaId).subscribe((a) => this.alunos.set(a));
    });
  }

  protected distribuir(): void {
    this.acao(this.api.distribuir(this.matchId));
  }
  protected iniciar(): void {
    this.acao(this.api.iniciar(this.matchId));
  }
  protected pular(): void {
    this.acao(this.api.pular(this.matchId));
  }

  private acao(obs: { subscribe: (o: { next: () => void; error: (e: unknown) => void }) => void }): void {
    this.ocupado.set(true);
    this.erro.set(null);
    obs.subscribe({
      next: () => this.ocupado.set(false),
      error: () => {
        this.ocupado.set(false);
        this.erro.set('Não foi possível concluir a ação.');
      },
    });
  }
}
