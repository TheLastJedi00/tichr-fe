import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CriarTurmaPayload, Turma } from '../../core/models';
import { turmaContaComoAtiva } from '../../core/plano.util';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Modal } from '../../ui/modal/modal';
import { Spinner } from '../../ui/spinner/spinner';
import { FeriasManager } from '../ferias/ferias-manager';
import { TurmaForm } from '../turma-form/turma-form';

/** EditarTurmaPage: carrega a turma e reusa o <app-turma-form> pré-preenchido. */
@Component({
  selector: 'app-editar-turma-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TurmaForm, Spinner, FeriasManager, Card, Modal, RouterLink],
  template: `
    <a class="voltar" [routerLink]="['/turmas', id]">‹ Voltar à turma</a>
    <h1 class="title">Editar turma</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (turma()) {
      @if (encerrada()) {
        <app-card title="Turma encerrada">
          <div class="reabrir-box">
            <p class="reabrir muted">
              @if (encerradaPorFim()) {
                As aulas agendadas desta turma já terminaram. Reabra para reagendar
                a grade a partir de <strong>hoje</strong> — ou ajuste a
                <strong>data de início</strong> abaixo e salve.
              } @else {
                Esta turma está arquivada no Hall da Fama. Reabra para voltar a usá-la.
              }
            </p>
            <button class="btn-primary" type="button" [disabled]="reabrindo()" (click)="reabrir()">
              {{ reabrindo() ? 'Reabrindo…' : 'Reabrir turma' }}
            </button>
          </div>
        </app-card>
      }
      <app-turma-form
        [initial]="turma()"
        submitLabel="Salvar alterações"
        [submitting]="salvando()"
        (save)="salvar($event)"
      />
      <div class="ferias-wrap">
        <app-ferias-manager [turmaId]="id" />
      </div>

      @if (ativa()) {
        <div class="perigo-wrap">
          <app-card title="Encerrar turma">
            <div class="perigo">
              <p class="muted">
                A turma vira <strong>somente leitura</strong> (sem novos jogos ou alunos) e vai para o
                <strong>Hall da Fama</strong>. O PIN de 2 dígitos volta ao pool.
              </p>
              <button class="btn-danger" type="button" (click)="encerrarAberto.set(true)">
                Encerrar turma
              </button>
            </div>
          </app-card>
        </div>
      }
    }

    <app-modal
      [open]="encerrarAberto()"
      title="Encerrar turma"
      (close)="encerrando() || encerrarAberto.set(false)"
    >
      <p class="muted">
        Encerrar <strong>{{ turma()?.nome }}</strong>? Ela vira somente leitura e vai para o Hall da Fama.
      </p>
      <div modal-actions>
        <button class="btn-outline" type="button" [disabled]="encerrando()" (click)="encerrarAberto.set(false)">
          Cancelar
        </button>
        <button class="btn-danger" type="button" [disabled]="encerrando()" (click)="encerrar()">
          {{ encerrando() ? 'Encerrando…' : 'Encerrar turma' }}
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .voltar { display: inline-block; margin-bottom: 0.5rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .voltar:hover { color: var(--primary); }
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    app-card + app-turma-form { display: block; margin-top: 1rem; }
    .reabrir-box { display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start; }
    .reabrir { margin: 0; line-height: 1.5; }
    .ferias-wrap { margin-top: 1rem; }
    .perigo-wrap { margin-top: 1rem; }
    .perigo { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .perigo .muted { margin: 0; flex: 1; min-width: 220px; }
    .btn-danger {
      padding: 0.6rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 700; white-space: nowrap;
      color: #fff; background: var(--danger); border: 1px solid var(--danger);
    }
    .btn-danger:disabled { opacity: 0.6; cursor: default; }
  `,
})
export class EditarTurmaPage {
  private readonly api = inject(TurmaApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly id = this.route.snapshot.paramMap.get('id')!;

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly reabrindo = signal(false);
  protected readonly turma = signal<Turma | null>(null);
  protected readonly encerrarAberto = signal(false);
  protected readonly encerrando = signal(false);

  /** Só oferece "Encerrar" para turmas ainda ativas. */
  protected readonly ativa = computed(() => {
    const t = this.turma();
    return !!t && turmaContaComoAtiva(t);
  });

  /** Turma encerrada (por fim das aulas ou arquivamento manual). */
  protected readonly encerrada = computed(() => {
    const t = this.turma();
    return !!t && !this.ativa();
  });

  /**
   * Encerrada por fim das aulas (módulo cujo cronograma acabou), não por
   * arquivamento manual. Nesse caso, mover a data de início reabre a turma.
   */
  protected readonly encerradaPorFim = computed(() => {
    const t = this.turma();
    return !!t && !this.ativa() && !t.encerradaManualmente;
  });

  constructor() {
    this.api.getTurma(this.id).subscribe({
      next: (t) => {
        this.turma.set(t);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  protected salvar(payload: CriarTurmaPayload): void {
    this.salvando.set(true);
    this.api.atualizarTurma(this.id, payload).subscribe({
      next: () => this.router.navigateByUrl('/turmas'),
      error: () => this.salvando.set(false),
    });
  }

  protected encerrar(): void {
    this.encerrando.set(true);
    this.api.encerrarTurma(this.id).subscribe({
      next: () => this.router.navigateByUrl('/turmas'),
      error: () => this.encerrando.set(false),
    });
  }

  /** Reabre a turma (fallback de 1 clique) e volta à lista, já como ativa. */
  protected reabrir(): void {
    const t = this.turma();
    if (!t) return;
    this.reabrindo.set(true);
    this.api.reabrirTurma(t).subscribe({
      next: () => this.router.navigateByUrl('/turmas'),
      error: () => this.reabrindo.set(false),
    });
  }
}
