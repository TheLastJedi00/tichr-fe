import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CriarQlickPayload, Turma } from '../../core/models';
import { ProfileService } from '../../core/profile.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';

/**
 * Estúdio do Tichr Qlick (PhD): cria/edita o questionário — título, perguntas
 * dinâmicas com alternativas e correta, metadados (disciplina/tópico/turma) e
 * duração por questão.
 */
@Component({
  selector: 'app-qlick-studio-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Card, Icon],
  template: `
    <a class="voltar" routerLink="/jogos/qlick">← Tichr Qlick</a>
    <h1 class="title">{{ editId ? 'Editar Qlick' : 'Novo Qlick' }}</h1>

    <form [formGroup]="form" (ngSubmit)="salvar()">
      <app-card>
        <label class="campo">
          <span>Título</span>
          <input class="tichr-input" formControlName="titulo" placeholder="Ex: Revisão de HTML" />
        </label>

        <div class="grid2">
          <label class="campo">
            <span>Disciplina</span>
            <select class="tichr-input" formControlName="disciplina" (change)="onDisciplina()">
              <option value="">— Nenhuma —</option>
              @for (d of disciplinas(); track d) { <option [value]="d">{{ d }}</option> }
            </select>
          </label>
          @if (topicos().length) {
            <label class="campo">
              <span>Tópico do plano de aula</span>
              <select class="tichr-input" formControlName="topicoId">
                <option value="">— Nenhum —</option>
                @for (t of topicos(); track t.id) { <option [value]="t.id">{{ t.nome }}</option> }
              </select>
            </label>
          }
        </div>

        <div class="campo">
          <span>Turmas (opcional) — pode atribuir a várias</span>
          @if (turmas().length) {
            <div class="turmas-check">
              @for (t of turmas(); track t.id) {
                <label class="check" [class.check--on]="turmaIdsSel().includes(t.id)">
                  <input type="checkbox" [checked]="turmaIdsSel().includes(t.id)" (change)="toggleTurma(t.id)" />
                  {{ t.nome }}
                </label>
              }
            </div>
          } @else {
            <p class="dica">Você ainda não tem turmas.</p>
          }
        </div>
        <label class="campo">
          <span>Tempo por questão (s)</span>
          <input class="tichr-input" type="number" min="5" max="600" formControlName="duracaoSegundos" />
        </label>
      </app-card>

      <div formArrayName="perguntas">
        @for (pg of perguntas.controls; track $index; let pi = $index) {
          <app-card>
            <div [formGroupName]="pi">
              <div class="pcab">
                <h3>Pergunta {{ pi + 1 }}</h3>
                <button class="rem" type="button" (click)="removerPergunta(pi)" aria-label="Remover pergunta">
                  <app-icon name="close" [size]="16" />
                </button>
              </div>
              <label class="campo">
                <span>Enunciado</span>
                <input class="tichr-input" formControlName="enunciado" placeholder="Escreva a pergunta" />
              </label>

              <span class="campo__lbl">Alternativas (marque a correta)</span>
              <div class="alts" formArrayName="alternativas">
                @for (alt of alternativasDe(pi).controls; track ai; let ai = $index) {
                  <div class="alt">
                    <input
                      class="alt__radio"
                      type="radio"
                      [name]="'correta-' + pi"
                      [checked]="corretaDe(pi) === ai"
                      (change)="setCorreta(pi, ai)"
                      aria-label="Marcar como correta"
                    />
                    <input class="tichr-input" [formControlName]="ai" placeholder="Alternativa {{ ai + 1 }}" />
                    @if (alternativasDe(pi).length > 2) {
                      <button class="rem" type="button" (click)="removerAlternativa(pi, ai)" aria-label="Remover alternativa">
                        <app-icon name="close" [size]="14" />
                      </button>
                    }
                  </div>
                }
              </div>
              @if (alternativasDe(pi).length < 6) {
                <button class="btn-outline btn-sm" type="button" (click)="addAlternativa(pi)">
                  + Alternativa
                </button>
              }
            </div>
          </app-card>
        }
      </div>

      <button class="btn-outline full" type="button" (click)="addPergunta()">
        <app-icon name="plus" [size]="16" /> Adicionar pergunta
      </button>

      @if (erro()) { <p class="erro">{{ erro() }}</p> }
      <button class="btn-primary full salvar" type="submit" [disabled]="salvando()">
        {{ salvando() ? 'Salvando…' : editId ? 'Salvar alterações' : 'Criar Qlick' }}
      </button>
    </form>
  `,
  styles: `
    .voltar { color: var(--primary); font-weight: 600; }
    .title { margin: 0.5rem 0 1rem; font-size: 1.5rem; font-weight: 700; }
    .campo { display: block; margin-bottom: 1rem; }
    .campo > span, .campo__lbl { display: block; margin-bottom: 0.375rem; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    .campo__lbl { margin-top: 0.5rem; }
    .grid2 { display: grid; grid-template-columns: 1fr; gap: 0 1rem; }
    @media (min-width: 560px) { .grid2 { grid-template-columns: 1fr 1fr; } }
    .turmas-check { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .check {
      display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer;
      padding: 0.4rem 0.7rem; border-radius: 999px;
      border: 1px solid var(--border); background: var(--surface); font-weight: 600; font-size: 0.9rem;
    }
    .check--on { border-color: var(--primary); color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent); }
    .dica { color: var(--text-muted); font-size: 0.85rem; margin: 0; }
    app-card + * { margin-top: 1rem; }
    .pcab { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
    .pcab h3 { margin: 0; font-size: 1.05rem; }
    .rem { display: inline-flex; color: var(--text-muted); background: none; border: none; cursor: pointer; padding: 0.15rem; }
    .rem:hover { color: var(--danger); }
    .alts { display: flex; flex-direction: column; gap: 0.5rem; }
    .alt { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .alt__radio { width: 18px; height: 18px; flex: 0 0 auto; }
    .alt .tichr-input { flex: 1; }
    .btn-sm { font-size: 0.85rem; padding: 0.4rem 0.8rem; }
    .full { width: 100%; margin-top: 1rem; }
    .salvar { margin-top: 1rem; }
    .erro { color: var(--danger); font-weight: 600; margin: 1rem 0 0; }
  `,
})
export class QlickStudioPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(TurmaApiService);
  private readonly profileService = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly editId = this.route.snapshot.paramMap.get('id');
  protected readonly salvando = signal(false);
  protected readonly erro = signal('');
  protected readonly turmas = signal<Turma[]>([]);
  protected readonly turmaIdsSel = signal<string[]>([]);
  protected readonly topicos = signal<Array<{ id: string; nome: string }>>([]);
  protected readonly disciplinas = computed(
    () => this.profileService.profile()?.disciplinas ?? [],
  );

  protected readonly form = this.fb.group({
    titulo: ['', Validators.required],
    disciplina: [''],
    topicoId: [''],
    duracaoSegundos: [60, [Validators.required, Validators.min(5), Validators.max(600)]],
    perguntas: this.fb.array<FormGroup>([]),
  });

  /** Marca/desmarca uma turma na atribuição N:N do Qlick. */
  protected toggleTurma(id: string): void {
    this.turmaIdsSel.update((sel) =>
      sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id],
    );
  }

  protected get perguntas(): FormArray<FormGroup> {
    return this.form.get('perguntas') as FormArray<FormGroup>;
  }
  protected alternativasDe(pi: number): FormArray<FormControl> {
    return this.perguntas.at(pi).get('alternativas') as FormArray<FormControl>;
  }
  protected corretaDe(pi: number): number {
    return this.perguntas.at(pi).get('corretaIndex')!.value as number;
  }
  protected setCorreta(pi: number, ai: number): void {
    this.perguntas.at(pi).get('corretaIndex')!.setValue(ai);
  }

  private novaPergunta(): FormGroup {
    return this.fb.group({
      enunciado: ['', Validators.required],
      corretaIndex: [0],
      alternativas: this.fb.array<FormControl>([
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
      ]),
    });
  }

  protected addPergunta(): void {
    this.perguntas.push(this.novaPergunta());
  }
  protected removerPergunta(pi: number): void {
    this.perguntas.removeAt(pi);
  }
  protected addAlternativa(pi: number): void {
    this.alternativasDe(pi).push(this.fb.control('', Validators.required));
  }
  protected removerAlternativa(pi: number, ai: number): void {
    const arr = this.alternativasDe(pi);
    arr.removeAt(ai);
    if (this.corretaDe(pi) >= arr.length) {
      this.setCorreta(pi, 0);
    }
  }

  constructor() {
    const iniciar = () => {
      this.api.getTurmas().subscribe((t) => this.turmas.set(t));
      if (this.editId) {
        this.carregarParaEdicao(this.editId);
      } else {
        this.addPergunta();
      }
    };
    if (this.profileService.profile()) {
      iniciar();
    } else {
      this.profileService.load().subscribe({ next: iniciar, error: iniciar });
    }
  }

  /** Carrega tópicos ao trocar a disciplina (Mestre+ têm tópicos). */
  protected onDisciplina(): void {
    const disc = this.form.get('disciplina')!.value ?? '';
    this.form.get('topicoId')!.setValue('');
    if (disc) {
      this.api.getTopicos(disc).subscribe((t) => this.topicos.set(t));
    } else {
      this.topicos.set([]);
    }
  }

  private carregarParaEdicao(id: string): void {
    this.api.getQlick(id).subscribe((q) => {
      this.form.patchValue({
        titulo: q.titulo,
        disciplina: q.disciplina ?? '',
        duracaoSegundos: q.duracaoSegundos,
      });
      this.turmaIdsSel.set(q.turmaIds ?? (q.turmaId ? [q.turmaId] : []));
      if (q.disciplina) {
        this.api.getTopicos(q.disciplina).subscribe((t) => {
          this.topicos.set(t);
          this.form.get('topicoId')!.setValue(q.topicoId ?? '');
        });
      }
      this.perguntas.clear();
      for (const p of q.perguntas) {
        const alts = this.fb.array<FormControl>(
          p.alternativas.map((a) => this.fb.control(a, Validators.required)),
        );
        this.perguntas.push(
          this.fb.group({
            enunciado: [p.enunciado, Validators.required],
            corretaIndex: [p.corretaIndex],
            alternativas: alts,
          }),
        );
      }
    });
  }

  protected salvar(): void {
    if (this.form.invalid || this.perguntas.length === 0) {
      this.form.markAllAsTouched();
      this.erro.set('Preencha o título e ao menos uma pergunta completa.');
      return;
    }
    const raw = this.form.getRawValue();
    const payload: CriarQlickPayload = {
      titulo: raw.titulo!.trim(),
      duracaoSegundos: Number(raw.duracaoSegundos),
      perguntas: this.perguntas.controls.map((pg) => ({
        enunciado: pg.get('enunciado')!.value,
        corretaIndex: pg.get('corretaIndex')!.value,
        alternativas: (pg.get('alternativas') as FormArray).controls.map((c) => c.value),
      })),
      ...(raw.disciplina ? { disciplina: raw.disciplina } : {}),
      ...(raw.topicoId ? { topicoId: raw.topicoId } : {}),
      turmaIds: this.turmaIdsSel(),
    };
    this.salvando.set(true);
    this.erro.set('');
    const req = this.editId
      ? this.api.atualizarQlick(this.editId, payload)
      : this.api.criarQlick(payload);
    req.subscribe({
      next: () => this.router.navigate(['/jogos/qlick']),
      error: () => {
        this.salvando.set(false);
        this.erro.set('Não foi possível salvar. Tente de novo.');
      },
    });
  }
}
