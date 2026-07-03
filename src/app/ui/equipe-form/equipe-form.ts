import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CriarEquipePayload, Equipe } from '../../core/models';
import { Modal } from '../modal/modal';

/** Paleta de cores de destaque (sólidas, sem gradiente). */
const CORES = [
  '#2563eb', '#0891b2', '#059669', '#65a30d',
  '#d97706', '#dc2626', '#db2777', '#7c3aed',
];

/**
 * Modal de criar/editar equipe (dumb): titulo, descricao e cor de destaque.
 * Recebe a equipe inicial (edicao) ou null (criacao) e emite o payload.
 */
@Component({
  selector: 'app-equipe-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal],
  template: `
    <app-modal
      [open]="open()"
      [title]="initial() ? 'Editar equipe' : 'Nova equipe'"
      (close)="close.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submeter()">
        <label class="campo">
          <span>Título</span>
          <input
            class="tichr-input"
            formControlName="titulo"
            placeholder="Ex: Time Vermelho"
            maxlength="60"
          />
        </label>

        <label class="campo">
          <span>Descrição (opcional)</span>
          <textarea
            class="tichr-input"
            rows="3"
            formControlName="descricao"
            placeholder="Objetivo, integrantes, observações…"
            maxlength="280"
          ></textarea>
        </label>

        <div class="campo">
          <span>Cor de destaque</span>
          <div class="cores">
            @for (c of cores; track c) {
              <button
                type="button"
                class="cor"
                [class.is-on]="cor() === c"
                [style.background]="c"
                [attr.aria-label]="'Cor ' + c"
                (click)="cor.set(c)"
              ></button>
            }
          </div>
        </div>
      </form>

      <div modal-actions>
        <button class="btn-outline" type="button" (click)="close.emit()">
          Cancelar
        </button>
        <button
          class="btn-primary"
          type="button"
          [disabled]="form.invalid || submitting()"
          (click)="submeter()"
        >
          {{ submitting() ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .campo { display: block; margin-bottom: 1rem; }
    .campo > span {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    textarea.tichr-input { resize: vertical; }
    .cores { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .cor {
      width: 32px;
      height: 32px;
      border-radius: 999px;
      border: 2px solid var(--border);
      cursor: pointer;
      padding: 0;
    }
    .cor.is-on { border-color: var(--text); }
  `,
})
export class EquipeForm {
  private readonly fb = inject(FormBuilder);

  readonly open = input(false);
  readonly initial = input<Equipe | null>(null);
  readonly submitting = input(false);
  readonly save = output<CriarEquipePayload>();
  readonly close = output<void>();

  protected readonly cores = CORES;
  protected readonly cor = signal<string>(CORES[0]);

  protected readonly form = this.fb.nonNullable.group({
    titulo: ['', Validators.required],
    descricao: [''],
  });

  constructor() {
    // Sincroniza o form ao abrir: preenche na edicao, limpa na criacao.
    effect(() => {
      if (!this.open()) return;
      const e = this.initial();
      this.form.reset({ titulo: e?.titulo ?? '', descricao: e?.descricao ?? '' });
      this.cor.set(e?.cor ?? CORES[0]);
    });
  }

  protected submeter(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.save.emit({
      titulo: raw.titulo.trim(),
      cor: this.cor(),
      ...(raw.descricao.trim() ? { descricao: raw.descricao.trim() } : {}),
    });
  }
}
