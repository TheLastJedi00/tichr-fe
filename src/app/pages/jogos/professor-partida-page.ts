import {
  ChangeDetectionStrategy,
  Component,
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
 * dinâmica. Fase 3: lobby (inscritos + Iniciar). As telas de questão/ranking
 * entram na Fase 4.
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
        @default {
          <app-card><p class="muted">Partida em andamento…</p></app-card>
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
  `,
})
export class ProfessorPartidaPage {
  private readonly api = inject(TurmaApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly partida = signal<Partida | null>(null);
  protected readonly processando = signal(false);
  private readonly partidaId = this.route.snapshot.paramMap.get('id')!;

  constructor() {
    this.realtime
      .escutarPartida(this.partidaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => this.partida.set(p),
        error: () => {},
      });
  }

  protected comando(cmd: 'iniciar' | 'proxima' | 'apurar' | 'encerrar'): void {
    this.processando.set(true);
    this.api.comandoPartida(this.partidaId, cmd).subscribe({
      next: () => this.processando.set(false),
      error: () => this.processando.set(false),
    });
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
