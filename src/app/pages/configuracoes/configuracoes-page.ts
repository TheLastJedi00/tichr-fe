import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ProfileService } from '../../core/profile.service';
import { Card } from '../../ui/card/card';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * ConfiguracoesPage (smart): perfil do professor. Carrega o perfil atual,
 * permite editar e salva — refletindo o nome no estado reativo global.
 */
@Component({
  selector: 'app-configuracoes-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Card, Spinner],
  template: `
    <h1 class="title">Configurações</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <app-card title="Meu perfil">
        <form [formGroup]="form" (submit)="$event.preventDefault(); salvar()">
          <label class="campo">
            <span>Nome de exibição</span>
            <input class="tichr-input" formControlName="nomeExibicao" placeholder="Como quer ser chamado?" />
          </label>
          <label class="campo">
            <span>Área de atuação / disciplina</span>
            <input class="tichr-input" formControlName="disciplina" placeholder="Ex: Programação, Redação…" />
          </label>
          <label class="campo">
            <span>Minha bio</span>
            <textarea class="tichr-input" rows="3" formControlName="bio" placeholder="Um texto curto de apresentação"></textarea>
          </label>

          @if (salvo()) {
            <p class="ok">✓ Perfil atualizado!</p>
          }

          <button class="btn-primary full" type="submit" [disabled]="salvando()">
            {{ salvando() ? 'Salvando…' : 'Salvar' }}
          </button>
        </form>
      </app-card>
    }
  `,
  styles: `
    .title {
      margin: 0 0 1rem;
      font-size: 1.5rem;
      font-weight: 700;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
      color: var(--primary);
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
    textarea.tichr-input {
      resize: vertical;
    }
    .ok {
      color: var(--success);
      font-weight: 600;
      margin: 0 0 0.75rem;
    }
    .full {
      width: 100%;
    }
  `,
})
export class ConfiguracoesPage {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly salvo = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nomeExibicao: [''],
    disciplina: [''],
    bio: [''],
  });

  constructor() {
    this.profileService.load().subscribe({
      next: (p) => {
        this.form.patchValue({
          nomeExibicao: p.nomeExibicao ?? '',
          disciplina: p.disciplina ?? '',
          bio: p.bio ?? '',
        });
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  protected salvar(): void {
    this.salvando.set(true);
    this.salvo.set(false);
    this.profileService.update(this.form.getRawValue()).subscribe({
      next: () => {
        this.salvando.set(false);
        this.salvo.set(true);
      },
      error: () => this.salvando.set(false),
    });
  }
}
