import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CriarTurmaPayload, Turma } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { Spinner } from '../../ui/spinner/spinner';
import { TurmaForm } from '../turma-form/turma-form';

/** EditarTurmaPage: carrega a turma e reusa o <app-turma-form> pré-preenchido. */
@Component({
  selector: 'app-editar-turma-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TurmaForm, Spinner],
  template: `
    <h1 class="title">Editar turma</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (turma()) {
      <app-turma-form
        [initial]="turma()"
        submitLabel="Salvar alterações"
        [submitting]="salvando()"
        (save)="salvar($event)"
      />
    }
  `,
  styles: `
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
  `,
})
export class EditarTurmaPage {
  private readonly api = inject(TurmaApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly id = this.route.snapshot.paramMap.get('id')!;

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly turma = signal<Turma | null>(null);

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
}
