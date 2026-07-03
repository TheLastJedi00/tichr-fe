import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Partida, QlickDoDia } from '../../core/models';
import { RealtimeService } from '../../core/realtime.service';
import { StudentAuthService } from '../../core/student-auth.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Tela do aluno no Tichr Qlick (tempo real): inscrição no lobby, resposta da
 * pergunta com timer, revelação do acerto e pódio final.
 */
@Component({
  selector: 'app-student-qlick-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Spinner],
  template: `
    <h1 class="title">Tichr Qlick</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (!qlick()) {
      <app-card>
        <p class="muted">Nenhum Qlick disponível agora. Ele aparece no horário da sua aula.</p>
      </app-card>
    } @else if (partida(); as p) {
      @switch (p.status) {
        @case ('LOBBY') {
          @if (inscrito()) {
            <div class="espera">
              <app-spinner [size]="28" />
              <p>Você está na sala! Aguardando o professor iniciar…</p>
            </div>
          } @else {
            <app-card>
              <h2 class="q__tit">{{ p.titulo }}</h2>
              <p class="muted">O professor vai começar em instantes. Entre na sala!</p>
              <button class="btn-primary full" type="button" [disabled]="inscrevendo()" (click)="inscrever()">
                Inscrever-se
              </button>
            </app-card>
          }
        }

        @case ('QUESTAO_ATIVA') {
          <app-card>
            <div class="q__top">
              <span class="q__conta">Pergunta {{ p.perguntaAtual + 1 }} de {{ p.totalPerguntas }}</span>
              <span class="timer" [class.timer--fim]="restante() <= 5">{{ restante() }}s</span>
            </div>
            <h2 class="q__enun">{{ p.perguntaPublica?.enunciado }}</h2>
            @if (respostaIndex() === null && restante() > 0) {
              <div class="grid">
                @for (a of p.perguntaPublica?.alternativas ?? []; track $index) {
                  <button class="opt" type="button" [disabled]="enviando()" (click)="responder($index)">
                    <span class="opt__key">{{ letra($index) }}</span>{{ a }}
                  </button>
                }
              </div>
            } @else {
              <div class="espera">
                <app-spinner [size]="28" />
                <p>
                  @if (respostaIndex() !== null) {
                    Resposta enviada! Aguardando os colegas…
                  } @else {
                    Tempo esgotado. Aguardando a revelação…
                  }
                </p>
              </div>
            }
          </app-card>
        }

        @case ('RANKING_PARCIAL') {
          <app-card>
            @if (acertou(p)) {
              <div class="veredito veredito--ok"><span class="veredito__ic">✓</span> Você acertou!</div>
            } @else {
              <div class="veredito veredito--erro"><span class="veredito__ic">✕</span> Não foi dessa vez</div>
            }
            <ul class="alts">
              @for (a of p.perguntaPublica?.alternativas ?? []; track $index) {
                <li class="alt" [class.alt--correta]="$index === p.corretaIndex">
                  <span class="alt__key">{{ letra($index) }}</span>{{ a }}
                  @if ($index === p.corretaIndex) { <span class="alt__ok">correta</span> }
                </li>
              }
            </ul>
          </app-card>

          @if (minhaPos(p); as pos) {
            <app-card>
              <div class="minha">
                <span>Sua posição</span>
                <strong>{{ pos.posicao }}º · {{ pos.pontos }} pts</strong>
              </div>
            </app-card>
          }

          <app-card>
            <h3 class="rk__tit">Top 3 da rodada</h3>
            <ol class="rank">
              @for (r of (p.rankingParcial ?? []); track r.alunoId) {
                <li class="rank__row">
                  <span class="rank__pos">{{ $index + 1 }}</span>
                  <span class="rank__nome">{{ r.nome }}</span>
                  <span class="rank__pts">{{ r.pontos }}</span>
                </li>
              }
            </ol>
            <p class="muted center">Aguarde o professor seguir…</p>
          </app-card>
        }

        @case ('ENCERRADO') {
          <app-card>
            <h2 class="podio__tit">Pódio final</h2>
            @if (minhaPosFinal(p); as pos) {
              <p class="center destaque">Você terminou em {{ pos }}º!</p>
            }
            <ol class="podio">
              @for (r of (p.rankingFinal ?? []); track r.alunoId) {
                <li class="podio__row podio__row--{{ r.posicao }}" [class.podio__row--eu]="r.alunoId === meuId">
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
      <app-card>
        <h2 class="q__tit">{{ qlick()?.titulo }}</h2>
        <button class="btn-primary full" type="button" [disabled]="inscrevendo()" (click)="inscrever()">
          Inscrever-se
        </button>
      </app-card>
    }
  `,
  styles: `
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 800; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .muted { color: var(--text-muted); margin: 0 0 1rem; }
    .center { text-align: center; margin: 0.75rem 0 0; }
    .q__tit { margin: 0 0 0.5rem; font-size: 1.2rem; }
    .full { width: 100%; }
    .espera { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 2rem 0; color: var(--primary); text-align: center; }
    .espera p { color: var(--text-muted); margin: 0; }
    .q__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
    .q__conta { font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); }
    .timer { font-size: 1.4rem; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--primary); }
    .timer--fim { color: #dc2626; }
    .q__enun { margin: 0 0 1rem; font-size: 1.25rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
    .opt { display: flex; align-items: center; gap: 0.6rem; padding: 1rem 0.9rem; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); font-weight: 700; text-align: left; cursor: pointer; }
    .opt:hover:not(:disabled) { border-color: var(--primary); }
    .opt:disabled { opacity: 0.6; }
    .opt__key { flex: 0 0 auto; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 999px; background: var(--surface-alt); font-size: 0.85rem; font-weight: 800; }
    .veredito { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 1.1rem; margin-bottom: 1rem; }
    .veredito__ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 999px; color: #fff; }
    .veredito--ok { color: #16a34a; }
    .veredito--ok .veredito__ic { background: #16a34a; }
    .veredito--erro { color: #dc2626; }
    .veredito--erro .veredito__ic { background: #dc2626; }
    .alts { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
    .alt { display: flex; align-items: center; gap: 0.6rem; padding: 0.75rem 0.9rem; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); font-weight: 600; }
    .alt--correta { border-color: #16a34a; background: color-mix(in srgb, #16a34a 12%, transparent); }
    .alt__key { flex: 0 0 auto; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 999px; background: var(--surface-alt); font-size: 0.8rem; font-weight: 800; }
    .alt__ok { margin-left: auto; font-size: 0.8rem; font-weight: 800; color: #16a34a; }
    .minha { display: flex; align-items: center; justify-content: space-between; font-weight: 700; }
    .minha strong { color: var(--primary); font-variant-numeric: tabular-nums; }
    .rk__tit { margin: 0 0 0.75rem; font-size: 1.05rem; }
    .rank { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
    .rank__row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.6rem; border-radius: 10px; background: var(--surface-alt); }
    .rank__pos { flex: 0 0 auto; width: 24px; text-align: center; font-weight: 800; color: var(--text-muted); }
    .rank__nome { font-weight: 600; }
    .rank__pts { margin-left: auto; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--primary); }
    .podio__tit { margin: 0 0 0.5rem; font-size: 1.3rem; text-align: center; }
    .destaque { font-weight: 800; color: var(--primary); }
    .podio { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; gap: 0.5rem; }
    .podio__row { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 0.9rem; border-radius: 12px; background: var(--surface-alt); }
    .podio__row--1 { background: color-mix(in srgb, #f59e0b 18%, transparent); }
    .podio__row--2 { background: color-mix(in srgb, #94a3b8 20%, transparent); }
    .podio__row--3 { background: color-mix(in srgb, #b45309 16%, transparent); }
    .podio__row--eu { outline: 2px solid var(--primary); }
    .podio__medal { font-size: 1.3rem; }
  `,
})
export class StudentQlickPage {
  private readonly api = inject(TurmaApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly studentAuth = inject(StudentAuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly carregando = signal(true);
  protected readonly qlick = signal<QlickDoDia | null>(null);
  protected readonly partida = signal<Partida | null>(null);
  protected readonly inscrevendo = signal(false);
  protected readonly enviando = signal(false);
  /** Índice respondido na pergunta corrente (null = ainda não respondeu). */
  protected readonly respostaIndex = signal<number | null>(null);
  private readonly agora = signal(Date.now());
  protected readonly meuId = this.studentAuth.aluno()?.id ?? '';
  private ultimaPergunta = -1;

  protected readonly inscrito = computed(() =>
    this.partida()?.inscritos.some((i) => i.alunoId === this.meuId) ?? false,
  );

  protected readonly restante = computed(() => {
    const p = this.partida();
    if (!p || p.status !== 'QUESTAO_ATIVA' || !p.perguntaIniciadaEm) return 0;
    const fim = Date.parse(p.perguntaIniciadaEm) + p.duracaoSegundos * 1000;
    return Math.max(0, Math.ceil((fim - this.agora()) / 1000));
  });

  constructor() {
    this.api.getQlickDoDia().subscribe({
      next: (q) => {
        this.qlick.set(q);
        this.carregando.set(false);
        if (q) this.escutar(q.partidaId);
      },
      error: () => this.carregando.set(false),
    });

    const tick = setInterval(() => this.agora.set(Date.now()), 500);
    this.destroyRef.onDestroy(() => clearInterval(tick));
  }

  private escutar(partidaId: string): void {
    this.realtime
      .escutarPartida(partidaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          // Nova pergunta: limpa a resposta anterior.
          if (p && p.perguntaAtual !== this.ultimaPergunta) {
            this.ultimaPergunta = p.perguntaAtual;
            this.respostaIndex.set(null);
          }
          this.partida.set(p);
        },
        error: () => {},
      });
  }

  protected inscrever(): void {
    const q = this.qlick();
    if (!q) return;
    this.inscrevendo.set(true);
    this.api.inscreverQlick(q.partidaId).subscribe({
      next: () => this.inscrevendo.set(false),
      error: () => this.inscrevendo.set(false),
    });
  }

  protected responder(index: number): void {
    const q = this.qlick();
    if (!q || this.respostaIndex() !== null) return;
    this.respostaIndex.set(index); // otimista: trava a UI de imediato
    this.enviando.set(true);
    this.api.responderQlick(q.partidaId, index).subscribe({
      next: () => this.enviando.set(false),
      error: () => {
        this.enviando.set(false);
        this.respostaIndex.set(null); // libera para nova tentativa
      },
    });
  }

  protected acertou(p: Partida): boolean {
    return this.respostaIndex() !== null && this.respostaIndex() === p.corretaIndex;
  }

  protected minhaPos(p: Partida): { posicao: number; pontos: number } | null {
    const i = p.placar.findIndex((r) => r.alunoId === this.meuId);
    return i < 0 ? null : { posicao: i + 1, pontos: p.placar[i].pontos };
  }

  protected minhaPosFinal(p: Partida): number | null {
    return p.rankingFinal?.find((r) => r.alunoId === this.meuId)?.posicao ?? null;
  }

  protected letra(i: number): string {
    return String.fromCharCode(65 + i);
  }

  protected medalha(pos: number): string {
    return { 1: '🥇', 2: '🥈', 3: '🥉' }[pos] ?? `${pos}º`;
  }
}
