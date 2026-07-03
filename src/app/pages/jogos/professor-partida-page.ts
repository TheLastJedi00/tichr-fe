import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Partida } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Sala do professor (tempo real). Escuta a partida via onSnapshot e comanda a
 * dinâmica: lobby, pergunta no ar (com timer + revelar), ranking da rodada e
 * pódio final.
 */
@Component({
  selector: 'app-professor-partida-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Spinner],
  template: `
    @if (partida(); as p) {
      <header class="head">
        <h1 class="title">{{ p.titulo }}</h1>
        <span class="status status--{{ p.status.toLowerCase() }}">{{ rotulo(p.status) }}</span>
      </header>

      @switch (p.status) {
        @case ('LOBBY') {
          <app-card>
            <p class="lead">Alunos entrando na sala…</p>
            @if (p.inscritos.length === 0) {
              <p class="muted">Aguardando os primeiros inscritos.</p>
            } @else {
              <ul class="inscritos">
                @for (i of p.inscritos; track i.alunoId) {
                  <li class="chip">{{ i.nome }}</li>
                }
              </ul>
            }
            <button
              class="btn-primary full"
              type="button"
              [disabled]="p.inscritos.length === 0 || processando()"
              (click)="comando('iniciar')"
            >
              Iniciar Qlick ({{ p.inscritos.length }} inscritos)
            </button>
          </app-card>
        }

        @case ('QUESTAO_ATIVA') {
          <app-card>
            <div class="q__top">
              <span class="q__conta">Pergunta {{ p.perguntaAtual + 1 }} de {{ p.totalPerguntas }}</span>
              <span class="timer" [class.timer--fim]="restante() <= 5">{{ restante() }}s</span>
            </div>
            <h2 class="q__enun">{{ p.perguntaPublica?.enunciado }}</h2>
            <ul class="alts">
              @for (a of p.perguntaPublica?.alternativas ?? []; track $index) {
                <li class="alt"><span class="alt__key">{{ letra($index) }}</span>{{ a }}</li>
              }
            </ul>
            <button class="btn-primary full" type="button" [disabled]="processando()" (click)="comando('apurar')">
              Revelar resposta
            </button>
          </app-card>
        }

        @case ('RANKING_PARCIAL') {
          <app-card>
            <span class="q__conta">Resposta da pergunta {{ p.perguntaAtual + 1 }}</span>
            <ul class="alts">
              @for (a of p.perguntaPublica?.alternativas ?? []; track $index) {
                <li class="alt" [class.alt--correta]="$index === p.corretaIndex">
                  <span class="alt__key">{{ letra($index) }}</span>{{ a }}
                  @if ($index === p.corretaIndex) { <span class="alt__ok">✓ correta</span> }
                </li>
              }
            </ul>
          </app-card>

          <app-card>
            <h3 class="rk__tit">Ranking geral</h3>
            <ol class="rank">
              @for (r of p.placar; track r.alunoId) {
                <li class="rank__row">
                  <span class="rank__pos">{{ $index + 1 }}</span>
                  <span class="rank__nome">{{ r.nome }}</span>
                  <span class="rank__pts">{{ r.pontos }}</span>
                </li>
              }
            </ol>
          </app-card>

          @if (ehUltima(p)) {
            <button class="btn-primary full" type="button" [disabled]="processando()" (click)="comando('encerrar')">
              Encerrar e ver o pódio
            </button>
          } @else {
            <button class="btn-primary full" type="button" [disabled]="processando()" (click)="comando('proxima')">
              Próxima pergunta
            </button>
          }
        }

        @case ('ENCERRADO') {
          <app-card>
            <h2 class="podio__tit">Pódio final</h2>
            <ol class="podio">
              @for (r of (p.rankingFinal ?? []); track r.alunoId) {
                <li class="podio__row podio__row--{{ r.posicao }}">
                  <span class="podio__medal">{{ medalha(r.posicao) }}</span>
                  <span class="rank__nome">{{ r.nome }}</span>
                  <span class="rank__pts">{{ r.pontos }}</span>
                </li>
              }
            </ol>
          </app-card>
        }
      }
    } @else {
      <div class="loading"><app-spinner [size]="32" /></div>
    }
  `,
  styles: `
    .head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .title { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .status { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; padding: 0.2rem 0.55rem; border-radius: 999px; color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .lead { font-weight: 600; margin: 0 0 0.75rem; }
    .muted { color: var(--text-muted); }
    .inscritos { list-style: none; margin: 0 0 1.25rem; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .chip { padding: 0.35rem 0.7rem; border-radius: 999px; background: var(--surface-alt); font-weight: 600; font-size: 0.9rem; }
    .full { width: 100%; }
    .q__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
    .q__conta { font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); }
    .timer { font-size: 1.4rem; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--primary); }
    .timer--fim { color: #dc2626; }
    .q__enun { margin: 0 0 1rem; font-size: 1.25rem; }
    .alts { list-style: none; margin: 0 0 1rem; padding: 0; display: grid; gap: 0.5rem; }
    .alt { display: flex; align-items: center; gap: 0.6rem; padding: 0.75rem 0.9rem; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); font-weight: 600; }
    .alt--correta { border-color: #16a34a; background: color-mix(in srgb, #16a34a 12%, transparent); }
    .alt__key { flex: 0 0 auto; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 999px; background: var(--surface-alt); font-size: 0.8rem; font-weight: 800; }
    .alt__ok { margin-left: auto; font-size: 0.8rem; font-weight: 800; color: #16a34a; }
    .rk__tit { margin: 0 0 0.75rem; font-size: 1.05rem; }
    .rank { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
    .rank__row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.6rem; border-radius: 10px; background: var(--surface-alt); }
    .rank__pos { flex: 0 0 auto; width: 24px; text-align: center; font-weight: 800; color: var(--text-muted); }
    .rank__nome { font-weight: 600; }
    .rank__pts { margin-left: auto; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--primary); }
    .podio__tit { margin: 0 0 1rem; font-size: 1.3rem; text-align: center; }
    .podio { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
    .podio__row { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 0.9rem; border-radius: 12px; background: var(--surface-alt); }
    .podio__row--1 { background: color-mix(in srgb, #f59e0b 18%, transparent); }
    .podio__row--2 { background: color-mix(in srgb, #94a3b8 20%, transparent); }
    .podio__row--3 { background: color-mix(in srgb, #b45309 16%, transparent); }
    .podio__medal { font-size: 1.3rem; }
  `,
})
export class ProfessorPartidaPage {
  private readonly api = inject(TurmaApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly partida = signal<Partida | null>(null);
  protected readonly processando = signal(false);
  private readonly agora = signal(Date.now());
  private readonly partidaId = this.route.snapshot.paramMap.get('id')!;

  /** Segundos restantes da pergunta corrente (0 quando esgotado). */
  protected readonly restante = computed(() => {
    const p = this.partida();
    if (!p || p.status !== 'QUESTAO_ATIVA' || !p.perguntaIniciadaEm) return 0;
    const fim = Date.parse(p.perguntaIniciadaEm) + p.duracaoSegundos * 1000;
    return Math.max(0, Math.ceil((fim - this.agora()) / 1000));
  });

  constructor() {
    this.realtime
      .escutarPartida(this.partidaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (p) => this.partida.set(p), error: () => {} });

    const tick = setInterval(() => this.agora.set(Date.now()), 500);
    this.destroyRef.onDestroy(() => clearInterval(tick));
  }

  protected comando(cmd: 'iniciar' | 'proxima' | 'apurar' | 'encerrar'): void {
    this.processando.set(true);
    this.api.comandoPartida(this.partidaId, cmd).subscribe({
      next: () => this.processando.set(false),
      error: () => this.processando.set(false),
    });
  }

  protected ehUltima(p: Partida): boolean {
    return p.perguntaAtual >= p.totalPerguntas - 1;
  }

  protected letra(i: number): string {
    return String.fromCharCode(65 + i);
  }

  protected medalha(pos: number): string {
    return { 1: '🥇', 2: '🥈', 3: '🥉' }[pos] ?? `${pos}º`;
  }

  protected rotulo(status: string): string {
    return {
      LOBBY: 'Sala aberta',
      QUESTAO_ATIVA: 'Pergunta no ar',
      RANKING_PARCIAL: 'Ranking da rodada',
      ENCERRADO: 'Encerrado',
    }[status] ?? status;
  }
}
