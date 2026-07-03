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
 * Tela do aluno no Tichr Qlick (tempo real). Fase 3: inscrição + lobby.
 * As telas de pergunta/ranking entram na Fase 4.
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
        @default {
          <app-card><p class="muted">Jogo em andamento…</p></app-card>
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
    .q__tit { margin: 0 0 0.5rem; font-size: 1.2rem; }
    .full { width: 100%; }
    .espera { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 2.5rem 0; color: var(--primary); text-align: center; }
    .espera p { color: var(--text-muted); margin: 0; }
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
  private readonly meuId = this.studentAuth.aluno()?.id ?? '';

  protected readonly inscrito = computed(() =>
    this.partida()?.inscritos.some((i) => i.alunoId === this.meuId) ?? false,
  );

  constructor() {
    this.api.getQlickDoDia().subscribe({
      next: (q) => {
        this.qlick.set(q);
        this.carregando.set(false);
        if (q) {
          this.escutar(q.partidaId);
        }
      },
      error: () => this.carregando.set(false),
    });
  }

  private escutar(partidaId: string): void {
    this.realtime
      .escutarPartida(partidaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (p) => this.partida.set(p), error: () => {} });
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
}
