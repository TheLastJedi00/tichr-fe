import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ProfileService } from '../../core/profile.service';
import { Card } from '../../ui/card/card';
import { Spinner } from '../../ui/spinner/spinner';
import { FeriasManager } from '../ferias/ferias-manager';

/**
 * ConfiguracoesPage (smart): perfil do professor. Carrega o perfil atual,
 * permite editar e salva — refletindo o nome no estado reativo global.
 */
@Component({
  selector: 'app-configuracoes-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Card, Spinner, FeriasManager],
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

          <div class="campo">
            <span>Minhas disciplinas / competências</span>
            @if (disciplinas().length) {
              <div class="chips">
                @for (d of disciplinas(); track d) {
                  <span class="chip">
                    {{ d }}
                    <button type="button" class="chip__x" (click)="removerDisciplina(d)" aria-label="Remover">×</button>
                  </span>
                }
              </div>
            }
            <div class="add">
              <input
                class="tichr-input"
                placeholder="Ex: Programação"
                [value]="nova()"
                (input)="nova.set($any($event.target).value)"
                (keydown.enter)="$event.preventDefault(); adicionarDisciplina()"
              />
              <button type="button" class="btn-outline" (click)="adicionarDisciplina()">Adicionar</button>
            </div>
          </div>

          @if (salvo()) {
            <p class="ok">✓ Perfil atualizado!</p>
          }

          <button class="btn-primary full" type="submit" [disabled]="salvando()">
            {{ salvando() ? 'Salvando…' : 'Salvar' }}
          </button>
        </form>
      </app-card>

      <div class="ferias-wrap">
        <app-ferias-manager />
      </div>
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
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.3rem 0.625rem;
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      border-radius: 999px;
    }
    .chip__x {
      border: none;
      background: none;
      color: inherit;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
      padding: 0;
    }
    .add {
      display: flex;
      gap: 0.5rem;
    }
    .add .tichr-input { flex: 1; }
    .add .btn-outline { white-space: nowrap; }
    .ok {
      color: var(--success);
      font-weight: 600;
      margin: 0 0 0.75rem;
    }
    .full {
      width: 100%;
    }
    .ferias-wrap {
      margin-top: 1rem;
    }
  `,
})
export class ConfiguracoesPage {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly salvo = signal(false);
  protected readonly disciplinas = signal<string[]>([]);
  protected readonly nova = signal('');

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
        this.disciplinas.set(p.disciplinas ?? []);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  protected adicionarDisciplina(): void {
    const d = this.nova().trim();
    if (d && !this.disciplinas().includes(d)) {
      this.disciplinas.update((lista) => [...lista, d]);
    }
    this.nova.set('');
  }

  protected removerDisciplina(d: string): void {
    this.disciplinas.update((lista) => lista.filter((x) => x !== d));
  }

  protected salvar(): void {
    this.salvando.set(true);
    this.salvo.set(false);
    this.profileService
      .update({ ...this.form.getRawValue(), disciplinas: this.disciplinas() })
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.salvo.set(true);
        },
        error: () => this.salvando.set(false),
      });
  }
}
