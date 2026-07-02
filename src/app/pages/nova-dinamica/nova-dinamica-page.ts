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
import { Squad } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { ChipsInput } from '../../ui/chips-input/chips-input';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Nova Dinâmica: monta os parâmetros de um sorteio de squads.
 * Formulário reativo (número de equipes) + chips de papéis/temas (Task 14) +
 * roleta de sorteio (Task 15).
 */
@Component({
  selector: 'app-nova-dinamica-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Card, ChipsInput, Spinner],
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
          {{ squads() ? 'Sortear novamente' : 'Sortear grupos' }}
        </button>
      </form>
    </app-card>

    @if (sorteando()) {
      <div class="roleta">
        <span class="roleta__dado">🎲</span>
        <span class="roleta__msg">Sorteando as equipes…</span>
      </div>
    } @else if (squads(); as lista) {
      <div class="squads">
        @for (squad of lista; track squad.numero) {
          <article class="squad">
            <header class="squad__head">
              <h3 class="squad__nome">Equipe {{ squad.numero }}</h3>
              @if (squad.tema) {
                <span class="squad__tema">{{ squad.tema }}</span>
              }
            </header>
            <ul class="squad__membros">
              @for (m of squad.membros; track m.alunoId) {
                <li>
                  <span class="squad__aluno">{{ m.nome }}</span>
                  @if (m.papel) {
                    <span class="squad__papel">{{ m.papel }}</span>
                  }
                </li>
              } @empty {
                <li class="muted">Sem alunos.</li>
              }
            </ul>
          </article>
        }
      </div>
    }
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

    .roleta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 3rem 0;
    }
    .roleta__dado {
      font-size: 3rem;
      animation: girar 0.8s ease-in-out infinite;
    }
    @keyframes girar {
      0% { transform: rotate(0) scale(1); }
      50% { transform: rotate(180deg) scale(1.15); }
      100% { transform: rotate(360deg) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .roleta__dado { animation: none; }
    }
    .roleta__msg { color: var(--text-muted); font-weight: 600; }

    .squads {
      margin-top: 1.25rem;
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    @media (min-width: 560px) {
      .squads { grid-template-columns: 1fr 1fr; }
    }
    @media (min-width: 900px) {
      .squads { grid-template-columns: repeat(3, 1fr); }
    }
    .squad {
      padding: 1rem;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
      box-shadow: 0 8px 24px rgba(2, 6, 23, 0.08);
    }
    .squad__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .squad__nome { margin: 0; font-size: 1.1rem; }
    .squad__tema {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
    }
    .squad__membros { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .squad__membros li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .squad__aluno { font-weight: 500; }
    .squad__papel {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .muted { color: var(--text-muted); }
  `,
})
export class NovaDinamicaPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(TurmaApiService);
  protected readonly turmaId = this.route.snapshot.paramMap.get('id')!;
  protected readonly sorteando = signal(false);
  protected readonly papeis = signal<string[]>([]);
  protected readonly temas = signal<string[]>([]);
  protected readonly squads = signal<Squad[] | null>(null);

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
    this.sorteando.set(true);
    this.api
      .sortearAgrupamento(this.turmaId, {
        numeroEquipes: this.form.controls.numeroEquipes.value,
        papeis: this.papeis(),
        temas: this.temas(),
      })
      .subscribe({
        next: (res) => {
          this.squads.set(res.squads);
          this.sorteando.set(false);
        },
        error: () => this.sorteando.set(false),
      });
  }
}
