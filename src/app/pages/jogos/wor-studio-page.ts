import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { WorApiService } from '../../core/wor-api.service';
import { WorJogo } from '../../core/models';
import { Icon } from '../../ui/icon/icon';

/**
 * Wizard de criação do Tichr Wor (Setup + Arsenal). Mobile-first: tudo empilhado
 * com gap; palavras reordenáveis por drag-and-drop; dicas geradas por IA com
 * tratamento amigável do rate limit.
 */
@Component({
  selector: 'app-wor-studio-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, DragDropModule, Icon],
  template: `
    <a class="voltar" routerLink="/jogos/wor">‹ Tichr Wor</a>
    <h1 class="title">{{ editando() ? 'Editar batalha' : 'Forjar nova batalha' }}</h1>

    <form [formGroup]="form" (submit)="$event.preventDefault(); salvar()">
      <!-- Passo 1: Contexto -->
      <section class="bloco">
        <h2 class="bloco__tit">Contexto da batalha</h2>
        <label class="campo">
          <span>Nome da partida</span>
          <input class="tichr-input" formControlName="nome" placeholder="Revisão de História — 2º Bimestre" />
        </label>
        <label class="campo">
          <span>Disciplina <small>(opcional)</small></span>
          <input class="tichr-input" formControlName="disciplina" placeholder="História" />
        </label>
        <label class="campo">
          <span>Tópico principal</span>
          <input class="tichr-input" formControlName="topico" placeholder="Revolução Francesa" />
        </label>
      </section>

      <!-- Passo 2: Arsenal -->
      <section class="bloco">
        <h2 class="bloco__tit">Arsenal (palavras &amp; dicas)</h2>

        <div cdkDropList (cdkDropListDropped)="reordenar($event)" class="lista">
          @for (p of palavras.controls; track p; let i = $index) {
            <div class="palavra" cdkDrag [formGroup]="asGroup(p)">
              <div class="palavra__top">
                <span class="palavra__handle" cdkDragHandle><app-icon name="grip" [size]="18" /></span>
                <input class="tichr-input palavra__inp" formControlName="palavra" placeholder="Palavra secreta (ex.: GUILHOTINA)" />
                <button class="ic-btn" type="button" (click)="remover(i)" aria-label="Remover palavra">
                  <app-icon name="x" [size]="18" />
                </button>
              </div>

              <div class="dicas" formArrayName="dicas">
                @for (d of dicasDe(p).controls; track d; let j = $index) {
                  <input class="tichr-input dica" [formControlName]="j" [placeholder]="'Carta ' + (j + 1)" />
                }
              </div>

              <div class="palavra__acoes">
                <button class="btn-ia" type="button" [disabled]="iaEsgotada() || carregandoIa() === i" (click)="gerarDicas(i)">
                  <app-icon name="sparkles" [size]="15" />
                  {{ carregandoIa() === i ? 'Forjando enigmas…' : 'Gerar Dicas com IA' }}
                </button>
                @if (iaMsg()[i]; as msg) { <span class="ia-msg">{{ msg }}</span> }
              </div>
            </div>
          }
        </div>

        <button class="btn-outline add" type="button" (click)="adicionar()">
          <app-icon name="plus" [size]="16" /> Adicionar palavra
        </button>
      </section>

      @if (erro()) { <p class="erro">{{ erro() }}</p> }

      <div class="rodape">
        <button class="btn-primary" type="submit" [disabled]="salvando()">
          {{ salvando() ? 'Guardando…' : 'Salvar e Guardar no Arsenal' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    :host { display: block; }
    .voltar { display: inline-block; margin-bottom: 0.75rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .title { margin: 0 0 1.25rem; font-size: 1.5rem; font-weight: 800; }
    form { display: flex; flex-direction: column; gap: 1.5rem; }
    .bloco { display: flex; flex-direction: column; gap: 0.9rem; }
    .bloco__tit { margin: 0; font-size: 1.05rem; color: #b45309; }
    .campo { display: flex; flex-direction: column; gap: 0.35rem; }
    .campo > span { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    .campo > span small { font-weight: 500; opacity: 0.8; }
    .lista { display: flex; flex-direction: column; gap: 1rem; }
    .palavra { display: flex; flex-direction: column; gap: 0.6rem; padding: 1rem; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); }
    .palavra.cdk-drag-preview { box-shadow: 0 12px 30px rgba(0,0,0,0.2); }
    .palavra__top { display: flex; align-items: center; gap: 0.5rem; }
    .palavra__handle { display: inline-flex; color: var(--text-muted); cursor: grab; touch-action: none; }
    .palavra__inp { flex: 1; text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em; }
    .ic-btn { display: inline-flex; padding: 0.4rem; border: none; background: none; color: var(--danger); cursor: pointer; border-radius: 8px; }
    .ic-btn:hover { background: color-mix(in srgb, var(--danger) 10%, transparent); }
    .dicas { display: flex; flex-direction: column; gap: 0.5rem; }
    .palavra__acoes { display: flex; flex-direction: column; gap: 0.4rem; align-items: flex-start; }
    .btn-ia {
      display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 0.9rem;
      border-radius: 10px; border: 1px solid #b45309; background: color-mix(in srgb, #b45309 8%, transparent);
      color: #b45309; font-weight: 700; font-size: 0.9rem; cursor: pointer;
    }
    .btn-ia:disabled { opacity: 0.55; cursor: not-allowed; }
    .ia-msg { font-size: 0.82rem; color: var(--text-muted); }
    .add { align-self: flex-start; display: inline-flex; align-items: center; gap: 0.4rem; }
    .erro { margin: 0; color: var(--danger); font-weight: 600; }
    .rodape { display: flex; }
    .rodape .btn-primary { width: 100%; }
  `,
})
export class WorStudioPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(WorApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private id: string | null = null;
  protected readonly editando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly carregandoIa = signal<number | null>(null);
  protected readonly iaEsgotada = signal(false);
  protected readonly iaMsg = signal<Record<number, string>>({});

  protected readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(80)]],
    disciplina: [''],
    topico: ['', [Validators.required, Validators.maxLength(80)]],
    palavras: this.fb.array([this.novaPalavra()]),
  });

  get palavras(): FormArray {
    return this.form.get('palavras') as FormArray;
  }

  constructor() {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.editando.set(true);
      this.api.obterJogo(this.id).subscribe((j) => this.preencher(j));
    }
  }

  protected asGroup(c: unknown): FormGroup {
    return c as FormGroup;
  }
  protected dicasDe(c: unknown): FormArray {
    return (c as FormGroup).get('dicas') as FormArray;
  }

  private novaPalavra(palavra = '', dicas: string[] = []): FormGroup {
    return this.fb.group({
      palavra: [palavra, [Validators.required, Validators.maxLength(40)]],
      dicas: this.fb.array([0, 1, 2].map((i) => this.fb.control(dicas[i] ?? ''))),
    });
  }

  private preencher(j: WorJogo): void {
    this.form.patchValue({ nome: j.nome, disciplina: j.disciplina ?? '', topico: j.topico });
    this.palavras.clear();
    (j.palavras.length ? j.palavras : [{ palavra: '', dicas: [] }]).forEach((p) =>
      this.palavras.push(this.novaPalavra(p.palavra, p.dicas)),
    );
  }

  protected adicionar(): void {
    this.palavras.push(this.novaPalavra());
  }
  protected remover(i: number): void {
    this.palavras.removeAt(i);
    if (this.palavras.length === 0) this.adicionar();
  }
  protected reordenar(e: CdkDragDrop<unknown>): void {
    moveItemInArray(this.palavras.controls, e.previousIndex, e.currentIndex);
    this.palavras.updateValueAndValidity();
  }

  protected gerarDicas(i: number): void {
    const grupo = this.palavras.at(i) as FormGroup;
    const palavra = (grupo.get('palavra')?.value ?? '').trim();
    if (!palavra) {
      this.setIaMsg(i, 'Digite a palavra primeiro.');
      return;
    }
    this.carregandoIa.set(i);
    this.setIaMsg(i, '');
    this.api
      .gerarDicas({
        palavra,
        topico: this.form.get('topico')?.value ?? '',
        disciplina: this.form.get('disciplina')?.value || undefined,
      })
      .subscribe({
        next: ({ dicas }) => {
          const arr = this.dicasDe(grupo);
          [0, 1, 2].forEach((k) => arr.at(k).setValue(dicas[k] ?? ''));
          this.carregandoIa.set(null);
        },
        error: (e: { status: number; error?: { code?: string; message?: string } }) => {
          this.carregandoIa.set(null);
          if (e.error?.code === 'IA_RATE_LIMIT') {
            this.iaEsgotada.set(true);
            this.setIaMsg(i, e.error.message ?? 'Sua magia diária se esgotou. Escreva as dicas manualmente.');
          } else {
            this.setIaMsg(i, 'IA indisponível agora. Escreva as dicas manualmente.');
          }
        },
      });
  }

  private setIaMsg(i: number, msg: string): void {
    this.iaMsg.set({ ...this.iaMsg(), [i]: msg });
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.erro.set('Preencha o nome, o tópico e ao menos uma palavra.');
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      nome: v.nome!,
      disciplina: v.disciplina || undefined,
      topico: v.topico!,
      palavras: (v.palavras as Array<{ palavra: string; dicas: string[] }>).map((p) => ({
        palavra: p.palavra,
        dicas: (p.dicas ?? []).filter((d) => d && d.trim()),
      })),
    };
    this.erro.set(null);
    this.salvando.set(true);
    const req = this.id
      ? this.api.atualizarJogo(this.id, payload)
      : this.api.criarJogo(payload);
    req.subscribe({
      next: () => this.router.navigateByUrl('/jogos/wor/meus'),
      error: () => {
        this.erro.set('Não foi possível salvar. Tente novamente.');
        this.salvando.set(false);
      },
    });
  }
}
