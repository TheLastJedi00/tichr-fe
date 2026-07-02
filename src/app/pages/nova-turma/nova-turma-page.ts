import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CriarTurmaPayload } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { TurmaForm } from '../turma-form/turma-form';

/** NovaTurmaPage: cria uma turma reusando o <app-turma-form>. */
@Component({
  selector: 'app-nova-turma-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TurmaForm],
  template: `
    <h1 class="title">Nova turma</h1>
    <app-turma-form
      submitLabel="Criar turma"
      [submitting]="salvando()"
      (save)="criar($event)"
    />
  `,
  styles: `
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
  `,
})
export class NovaTurmaPage {
  private readonly api = inject(TurmaApiService);
  private readonly router = inject(Router);
  protected readonly salvando = signal(false);

  protected criar(payload: CriarTurmaPayload): void {
    this.salvando.set(true);
    this.api.criarTurma(payload).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: () => this.salvando.set(false),
    });
  }
}
