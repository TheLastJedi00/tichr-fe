import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card } from '../../ui/card/card';
import { ChipsInput } from '../../ui/chips-input/chips-input';

/**
 * Nova Dinâmica: monta os parâmetros de um sorteio de squads.
 * Formulário reativo (número de equipes) + chips de papéis/temas (Task 14) +
 * roleta de sorteio (Task 15).
 */
@Component({
  selector: 'app-nova-dinamica-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Card, ChipsInput],
  template: `
    <header class="head">
      <h1 class="title">Nova dinâmica</h1>
      <a class="btn-outline" [routerLink]="['/turmas', turmaId]">Voltar</a>
    </header>

    <app-card>
      <form [formGroup]="form" (ngSubmit)="sortear()">
        <label class="campo">
          <span class="campo__label">Número de equipes</span>
          <input
            class="tichr-input"
            type="number"
            min="1"
            max="50"
            formControlName="numeroEquipes"
          />
          @if (invalido('numeroEquipes')) {
            <span class="erro">Informe ao menos 1 equipe.</span>
          }
        </label>

        <app-chips-input
          class="campo"
          label="Papéis na equipe"
          placeholder="Ex.: Líder, Revisor, Orador…"
          [(chips)]="papeis"
        />

        <app-chips-input
          class="campo"
          label="Temas (sorteados por equipe)"
          placeholder="Adicione temas e pressione Enter"
          [(chips)]="temas"
        />

        <button class="btn-primary sortear" type="submit" [disabled]="sorteando()">
          Sortear grupos
        </button>
      </form>
    </app-card>
  `,
  styles: `
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .title { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .campo { display: block; margin-bottom: 1rem; }
    .campo__label { display: block; font-weight: 600; margin-bottom: 0.35rem; }
    .erro { display: block; margin-top: 0.35rem; color: var(--danger); font-size: 0.85rem; }
    .sortear { width: 100%; }
  `,
})
export class NovaDinamicaPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly turmaId = this.route.snapshot.paramMap.get('id')!;
  protected readonly sorteando = signal(false);
  protected readonly papeis = signal<string[]>([]);
  protected readonly temas = signal<string[]>([]);

  protected readonly form = new FormGroup({
    numeroEquipes: new FormControl<number>(2, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(50)],
    }),
  });

  protected invalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  protected sortear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // O sorteio real (chamada ao endpoint + roleta) chega na Task 15.
  }
}
