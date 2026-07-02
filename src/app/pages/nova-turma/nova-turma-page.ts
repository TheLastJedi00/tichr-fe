import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CriarTurmaPayload, TipoModalidade } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
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
 * NovaTurmaPage: formulario reativo simples que monta o payload
 * e envia para o backend criar a turma (e projetar as sessoes).
 */
@Component({
  selector: 'app-nova-turma-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Card],
  template: `
    <h1 class="title">Nova turma</h1>

    <app-card>
      <form [formGroup]="form" (ngSubmit)="salvar()">
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

        @if (erro()) {
          <p class="error">{{ erro() }}</p>
        }

        <button class="btn-primary submit" type="submit" [disabled]="!podeSalvar() || salvando()">
          {{ salvando() ? 'Criando…' : 'Criar turma' }}
        </button>
      </form>
    </app-card>
  `,
  styles: `
    .title {
      margin: 0 0 1rem;
      font-size: 1.5rem;
      font-weight: 700;
    }
    .campo {
      display: block;
      margin-bottom: 1rem;
    }
    .campo > span {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .dias {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
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
    .submit {
      width: 100%;
      margin-top: 0.5rem;
    }
    .error {
      color: var(--danger);
      margin: 0 0 0.75rem;
    }
  `,
})
export class NovaTurmaPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(TurmaApiService);
  private readonly router = inject(Router);

  protected readonly dias = DIAS;
  protected readonly selecionados = signal<Set<number>>(new Set());
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);

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
  }

  protected toggleDia(dia: number): void {
    const set = new Set(this.selecionados());
    set.has(dia) ? set.delete(dia) : set.add(dia);
    this.selecionados.set(set);
  }

  protected podeSalvar(): boolean {
    return this.form.valid && this.selecionados().size > 0;
  }

  protected salvar(): void {
    if (!this.podeSalvar()) {
      return;
    }
    const raw = this.form.getRawValue();
    const payload: CriarTurmaPayload = {
      nome: raw.nome,
      tipoModalidade: raw.tipoModalidade,
      dataInicio: raw.dataInicio,
      diasSemana: [...this.selecionados()].sort(),
      ...(raw.tipoModalidade === 'MODULO_FECHADO'
        ? { totalAulas: Number(raw.totalAulas) }
        : {}),
    };

    this.salvando.set(true);
    this.erro.set(null);
    this.api.criarTurma(payload).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: () => {
        this.erro.set('Não foi possível criar a turma. Tente novamente.');
        this.salvando.set(false);
      },
    });
  }
}
