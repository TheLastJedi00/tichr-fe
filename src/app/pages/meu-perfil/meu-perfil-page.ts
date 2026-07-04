import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ProfileService } from '../../core/profile.service';
import { Card } from '../../ui/card/card';
import { Spinner } from '../../ui/spinner/spinner';
import { FeriasManager } from '../ferias/ferias-manager';

/**
 * Meu Perfil (smart): dados pessoais, @username e disciplinas do professor.
 * Acessível pelo Hub de Configurações.
 */
@Component({
  selector: 'app-meu-perfil-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Card, Spinner, FeriasManager],
  template: `
    <a class="voltar" routerLink="/configuracoes">‹ Configurações</a>
    <h1 class="title">Meu Perfil</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else {
      <app-card title="Dados do perfil">
        <form [formGroup]="form" (submit)="$event.preventDefault(); salvar()">
          <label class="campo">
            <span>Usuário do portal (@username)</span>
            <div class="user">
              <span class="user__at">&#64;</span>
              <input
                class="tichr-input"
                formControlName="username"
                placeholder="prof.marina"
                autocapitalize="none"
                autocomplete="off"
              />
            </div>
            @switch (usernameStatus()) {
              @case ('checando') { <span class="dica">Verificando…</span> }
              @case ('ok') { <span class="dica dica--ok">✓ Disponível</span> }
              @case ('tomado') { <span class="dica dica--erro">Já está em uso</span> }
              @default {
                <span class="dica">Escolha um termo simples — é a chave que seus alunos vão buscar.</span>
              }
            }
          </label>

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

          <button
            class="btn-primary full"
            type="submit"
            [disabled]="salvando() || usernameStatus() === 'tomado'"
          >
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
    .voltar { display: inline-block; margin-bottom: 0.5rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .voltar:hover { color: var(--primary); }
    .title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .campo { display: block; margin-bottom: 1rem; }
    .campo > span { display: block; margin-bottom: 0.375rem; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    textarea.tichr-input { resize: vertical; }
    .user { display: flex; align-items: center; gap: 0.4rem; }
    .user__at { font-weight: 700; color: var(--text-muted); }
    .user .tichr-input { flex: 1; }
    .dica { display: block; margin-top: 0.35rem; font-size: 0.8rem; color: var(--text-muted); }
    .dica--ok { color: var(--success); font-weight: 600; }
    .dica--erro { color: var(--danger); font-weight: 600; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem; }
    .chip { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.3rem 0.625rem; font-weight: 600; font-size: 0.85rem; color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); border-radius: 999px; }
    .chip__x { border: none; background: none; color: inherit; font-size: 1rem; line-height: 1; cursor: pointer; padding: 0; }
    .add { display: flex; gap: 0.5rem; }
    .add .tichr-input { flex: 1; }
    .add .btn-outline { white-space: nowrap; }
    .ok { color: var(--success); font-weight: 600; margin: 0 0 0.75rem; }
    .full { width: 100%; }
    .ferias-wrap { margin-top: 1rem; }
  `,
})
export class MeuPerfilPage {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly salvo = signal(false);
  protected readonly disciplinas = signal<string[]>([]);
  protected readonly nova = signal('');
  protected readonly usernameStatus = signal<'vazio' | 'checando' | 'ok' | 'tomado'>(
    'vazio',
  );

  protected readonly form = this.fb.nonNullable.group({
    nomeExibicao: [''],
    username: [''],
    disciplina: [''],
    bio: [''],
  });

  constructor() {
    this.profileService.load().subscribe({
      next: (p) => {
        this.form.patchValue({
          nomeExibicao: p.nomeExibicao ?? '',
          username: p.username ?? '',
          disciplina: p.disciplina ?? '',
          bio: p.bio ?? '',
        });
        this.disciplinas.set(p.disciplinas ?? []);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });

    this.form.controls.username.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((raw) => {
          const u = raw.trim().replace(/^@/, '');
          if (u.length < 3) {
            this.usernameStatus.set('vazio');
            return [];
          }
          this.usernameStatus.set('checando');
          return this.profileService.checkUsername(u);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) =>
        this.usernameStatus.set(res.disponivel ? 'ok' : 'tomado'),
      );
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
    const raw = this.form.getRawValue();
    const username = raw.username.trim().replace(/^@/, '');
    this.profileService
      .update({
        nomeExibicao: raw.nomeExibicao,
        disciplina: raw.disciplina,
        bio: raw.bio,
        disciplinas: this.disciplinas(),
        ...(username ? { username } : {}),
      })
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.salvo.set(true);
        },
        error: () => this.salvando.set(false),
      });
  }
}
