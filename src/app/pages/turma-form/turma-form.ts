import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CriarTurmaPayload, TipoModalidade, Turma } from '../../core/models';
import { Card } from '../../ui/card/card';

const DIAS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

/**
 * Formulário reativo de turma, reutilizado em criar e editar.
 * Recebe os valores iniciais e emite o payload pronto no submit.
 */
@Component({
  selector: 'app-turma-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Card],
  template: `
    <app-card>
      <form [formGroup]="form" (ngSubmit)="submeter()">
        <label class="campo">
          <span>Nome da turma</span>
          <input class="tichr-input" formControlName="nome" placeholder="Ex: Redação 9º ano" />
        </label>

        <label class="campo">
          <span>Modalidade</span>
          <select class="tichr-input" formControlName="tipoModalidade">
            <option value="GRADE_FIXA">Grade fixa (contínua)</option>
            <option value="MODULO_FECHADO">Módulo fechado</option>
          </select>
        </label>

        @if (isModulo()) {
          <label class="campo">
            <span>Total de aulas</span>
            <input class="tichr-input" type="number" min="1" formControlName="totalAulas" />
          </label>
        }

        <label class="campo">
          <span>Data de início</span>
          <input class="tichr-input" type="date" formControlName="dataInicio" />
        </label>

        <div class="campo">
          <span>Dias da semana</span>
          <div class="dias">
            @for (dia of dias; track dia.value) {
              <button
                type="button"
                class="chip"
                [class.is-on]="selecionados().has(dia.value)"
                (click)="toggleDia(dia.value)"
              >
                {{ dia.label }}
              </button>
            }
          </div>
        </div>

        <button class="btn-primary submit" type="submit" [disabled]="!podeSalvar() || submitting()">
          {{ submitting() ? 'Salvando…' : submitLabel() }}
        </button>
      </form>
    </app-card>
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
    .dias { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .chip {
      padding: 0.5rem 0.875rem;
      font-family: inherit;
      font-weight: 600;
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 999px;
      cursor: pointer;
    }
    .chip.is-on {
      color: var(--primary-contrast);
      background: var(--primary);
      border-color: var(--primary);
    }
    .submit { width: 100%; margin-top: 0.5rem; }
  `,
})
export class TurmaForm {
  private readonly fb = inject(FormBuilder);

  readonly initial = input<Turma | null>(null);
  readonly submitting = input(false);
  readonly submitLabel = input('Salvar');
  readonly save = output<CriarTurmaPayload>();

  protected readonly dias = DIAS;
  protected readonly selecionados = signal<Set<number>>(new Set());

  protected readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    tipoModalidade: ['GRADE_FIXA' as TipoModalidade, Validators.required],
    dataInicio: ['', Validators.required],
    totalAulas: [5],
  });

  private readonly modalidade = signal<TipoModalidade>('GRADE_FIXA');
  protected readonly isModulo = computed(() => this.modalidade() === 'MODULO_FECHADO');

  constructor() {
    this.form.controls.tipoModalidade.valueChanges.subscribe((v) =>
      this.modalidade.set(v),
    );
    // preenche o form quando recebe os valores iniciais (edição)
    effect(() => {
      const t = this.initial();
      if (!t) return;
      this.form.patchValue({
        nome: t.nome,
        tipoModalidade: t.tipoModalidade,
        dataInicio: t.dataInicio,
        totalAulas: t.totalAulas ?? 5,
      });
      this.modalidade.set(t.tipoModalidade);
      this.selecionados.set(new Set(t.diasSemana));
    });
  }

  protected toggleDia(dia: number): void {
    const set = new Set(this.selecionados());
    set.has(dia) ? set.delete(dia) : set.add(dia);
    this.selecionados.set(set);
  }

  protected podeSalvar(): boolean {
    return this.form.valid && this.selecionados().size > 0;
  }

  protected submeter(): void {
    if (!this.podeSalvar()) return;
    const raw = this.form.getRawValue();
    this.save.emit({
      nome: raw.nome,
      tipoModalidade: raw.tipoModalidade,
      dataInicio: raw.dataInicio,
      diasSemana: [...this.selecionados()].sort(),
      ...(raw.tipoModalidade === 'MODULO_FECHADO'
        ? { totalAulas: Number(raw.totalAulas) }
        : {}),
    });
  }
}
