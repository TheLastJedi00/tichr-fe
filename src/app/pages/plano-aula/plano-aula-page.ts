import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlanoAula } from '../../core/models';
import { ProfileService } from '../../core/profile.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Spinner } from '../../ui/spinner/spinner';

/**
 * Plano de Aula — escopo geral (Syllabus) por disciplina (plano Graduado+).
 * Seleciona a disciplina e edita um texto macro (objetivos, ementa, bibliografia).
 */
@Component({
  selector: 'app-plano-aula-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Card, Spinner],
  template: `
    <h1 class="title">Plano de Aula</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (disciplinas().length === 0) {
      <app-card>
        <p class="muted">
          Cadastre suas <strong>disciplinas</strong> em
          <a routerLink="/configuracoes">Configurações</a> para montar o plano de aula.
        </p>
      </app-card>
    } @else {
      <app-card>
        <label class="campo">
          <span>Disciplina</span>
          <select
            class="tichr-input"
            [value]="disciplinaSel()"
            (change)="selecionar($any($event.target).value)"
          >
            @for (d of disciplinas(); track d) {
              <option [value]="d">{{ d }}</option>
            }
          </select>
        </label>

        <label class="campo">
          <span>Contexto geral (objetivos, ementa, bibliografia)</span>
          <textarea
            class="tichr-input"
            rows="12"
            placeholder="Descreva o escopo macro da disciplina…"
            [value]="contexto()"
            (input)="contexto.set($any($event.target).value)"
          ></textarea>
        </label>

        @if (salvo()) {
          <p class="ok">✓ Plano de aula salvo!</p>
        }

        <button class="btn-primary full" type="button" [disabled]="salvando()" (click)="salvar()">
          {{ salvando() ? 'Salvando…' : 'Salvar' }}
        </button>
      </app-card>
    }
  `,
  styles: `
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .campo { display: block; margin-bottom: 1rem; }
    .campo > span { display: block; margin-bottom: 0.375rem; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    textarea.tichr-input { resize: vertical; }
    .muted { color: var(--text-muted); margin: 0; }
    .ok { color: var(--success); font-weight: 600; margin: 0 0 0.75rem; }
    .full { width: 100%; }
  `,
})
export class PlanoAulaPage {
  private readonly api = inject(TurmaApiService);
  private readonly profileService = inject(ProfileService);

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly salvo = signal(false);
  protected readonly disciplinaSel = signal('');
  protected readonly contexto = signal('');
  private readonly planos = signal<PlanoAula[]>([]);

  protected readonly disciplinas = computed(
    () => this.profileService.profile()?.disciplinas ?? [],
  );

  constructor() {
    const carregarPlanos = () =>
      this.api.getPlanosAula().subscribe({
        next: (planos) => {
          this.planos.set(planos);
          const primeira = this.disciplinas()[0] ?? '';
          this.selecionar(primeira);
          this.carregando.set(false);
        },
        error: () => this.carregando.set(false),
      });

    if (this.profileService.profile()) {
      carregarPlanos();
    } else {
      this.profileService.load().subscribe({
        next: () => carregarPlanos(),
        error: () => this.carregando.set(false),
      });
    }
  }

  protected selecionar(disciplina: string): void {
    this.disciplinaSel.set(disciplina);
    this.salvo.set(false);
    const plano = this.planos().find((p) => p.disciplina === disciplina);
    this.contexto.set(plano?.contextoGeral ?? '');
  }

  protected salvar(): void {
    const disciplina = this.disciplinaSel();
    if (!disciplina) {
      return;
    }
    this.salvando.set(true);
    this.salvo.set(false);
    this.api.salvarPlanoAula(disciplina, this.contexto()).subscribe({
      next: (plano) => {
        this.planos.update((atual) => [
          ...atual.filter((p) => p.id !== plano.id && p.disciplina !== plano.disciplina),
          plano,
        ]);
        this.salvando.set(false);
        this.salvo.set(true);
      },
      error: () => this.salvando.set(false),
    });
  }
}
