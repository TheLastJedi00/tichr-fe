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
import { turmaContaComoAtiva } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';

/**
 * Estúdio do Tichr Qlick (PhD): cria/edita o questionário — título, perguntas
 * dinâmicas com alternativas e correta, metadados (disciplina/tópico/turma) e
 * duração por questão.
 */
@Component({
  selector: 'app-qlick-studio-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Card, Icon, Modal],
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
          } @else {
            <label class="campo">
              <span>Aula (quando não há tópicos)</span>
              <select class="tichr-input" formControlName="numeroAula">
                <option [ngValue]="null">— Nenhuma —</option>
                @for (n of aulasDisponiveis(); track n) {
                  <option [ngValue]="n">Aula {{ n }}</option>
                }
              </select>
            </label>
          }
        </div>

        <div class="campo">
          <span>Turmas — atribua a uma ou mais (ou informe uma disciplina acima)</span>
          @if (turmasVinculaveis().length) {
            <div class="turmas-check">
              @for (t of turmasVinculaveis(); track t.id) {
                <label class="check" [class.check--on]="turmaIdsSel().includes(t.id)">
                  <input type="checkbox" [checked]="turmaIdsSel().includes(t.id)" (change)="toggleTurma(t.id)" />
                  {{ t.nome }}
                </label>
              }
            </div>
          } @else {
            <p class="dica">Nenhuma turma ativa para vincular.</p>
          }
        </div>
        <label class="campo">
          <span>Tempo por questão (s)</span>
          <input class="tichr-input" type="number" min="5" max="600" formControlName="duracaoSegundos" />
        </label>
      </app-card>

      <div class="ia-bar">
        <button class="btn-ia" type="button" (click)="iaAberta.set(true)">
          <app-icon name="sparkles" [size]="16" /> Gerar perguntas com IA
        </button>
        <span class="ia-hint">Cria 10 perguntas (você edita depois). 1 geração por dia.</span>
      </div>

      <div class="perguntas" formArrayName="perguntas">
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
                <button class="btn-outline btn-sm add-alt" type="button" (click)="addAlternativa(pi)">
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

      @if (semVinculo()) {
        <p class="dica aviso-vinculo">
          Atribua a uma turma ou informe uma disciplina para salvar.
        </p>
      }
      @if (erro()) { <p class="erro">{{ erro() }}</p> }
      <button
        class="btn-primary full salvar"
        type="submit"
        [disabled]="salvando() || semVinculo()"
      >
        {{ salvando() ? 'Salvando…' : editId ? 'Salvar alterações' : 'Criar Qlick' }}
      </button>
    </form>

    <app-modal
      [open]="iaAberta()"
      title="Gerar perguntas com IA"
      (close)="iaLoading() || iaAberta.set(false)"
    >
      <p class="ia-sub">
        Descreva como você quer as perguntas — a IA cria <b>10 perguntas com 4
        alternativas</b> cada, usando a disciplina e o tópico selecionados como
        contexto. Depois é só editar. Limite de 1 geração por dia.
      </p>
      <textarea
        class="tichr-input ia-txt"
        rows="4"
        [value]="instrucaoIa()"
        (input)="instrucaoIa.set($any($event.target).value)"
        [disabled]="iaLoading()"
        placeholder="Ex: perguntas de nível médio, objetivas, evitando pegadinhas; foque em datas e causas."
      ></textarea>
      @if (iaMsg()) {
        <p class="ia-feedback" [class.ok]="iaOk()">{{ iaMsg() }}</p>
      }
      <div modal-actions>
        <button class="btn-outline" type="button" (click)="iaAberta.set(false)" [disabled]="iaLoading()">
          Fechar
        </button>
        <button
          class="btn-primary"
          type="button"
          (click)="gerarIa()"
          [disabled]="iaLoading() || iaEsgotada() || !instrucaoIa().trim()"
        >
          {{ iaLoading() ? 'Gerando…' : 'Gerar' }}
        </button>
      </div>
    </app-modal>
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
    .perguntas { display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0; }
    .alts { display: flex; flex-direction: column; gap: 0.5rem; }
    .alt { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .alt__radio { width: 18px; height: 18px; flex: 0 0 auto; }
    .alt .tichr-input { flex: 1; }
    .btn-sm { font-size: 0.85rem; padding: 0.4rem 0.8rem; }
    .add-alt { margin-top: 0.6rem; }
    .full { width: 100%; margin-top: 1rem; }
    .salvar { margin-top: 1rem; }
    .erro { color: var(--danger); font-weight: 600; margin: 1rem 0 0; }
    .ia-bar { display: flex; align-items: center; gap: 0.6rem 0.9rem; flex-wrap: wrap; margin-top: 1rem; }
    .btn-ia {
      display: inline-flex; align-items: center; gap: 0.4rem;
      font: inherit; font-weight: 700; cursor: pointer;
      padding: 0.55rem 1rem; border-radius: var(--radius);
      color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, var(--surface));
      border: 1px solid var(--primary);
    }
    .btn-ia:hover { background: color-mix(in srgb, var(--primary) 16%, var(--surface)); }
    .ia-hint { font-size: 0.82rem; color: var(--text-muted); }
    .ia-sub { margin: 0 0 0.75rem; color: var(--text-muted); font-size: 0.9rem; }
    .ia-txt { width: 100%; resize: vertical; font: inherit; }
    .ia-feedback { margin: 0.75rem 0 0; font-weight: 600; color: var(--danger); }
    .ia-feedback.ok { color: var(--success); }
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
  /**
   * Só faz sentido vincular um jogo a turmas ativas. Mantém visíveis as já
   * selecionadas (ex.: ao editar um jogo cuja turma encerrou depois) para não
   * esconder/perder a atribuição existente.
   */
  protected readonly turmasVinculaveis = computed(() =>
    this.turmas().filter(
      (t) => turmaContaComoAtiva(t) || this.turmaIdsSel().includes(t.id),
    ),
  );
  protected readonly topicos = signal<Array<{ id: string; nome: string }>>([]);
  protected readonly disciplinas = computed(
    () => this.profileService.profile()?.disciplinas ?? [],
  );

  // Geração por IA (modal): instrução + estados de loading/feedback/cota.
  protected readonly iaAberta = signal(false);
  protected readonly iaLoading = signal(false);
  protected readonly iaEsgotada = signal(false);
  protected readonly iaOk = signal(false);
  protected readonly iaMsg = signal('');
  protected readonly instrucaoIa = signal('');

  protected readonly form = this.fb.group({
    titulo: ['', Validators.required],
    disciplina: [''],
    topicoId: [''],
    numeroAula: [null as number | null],
    duracaoSegundos: [60, [Validators.required, Validators.min(5), Validators.max(600)]],
    perguntas: this.fb.array<FormGroup>([]),
  });

  /** Disciplina selecionada (signal p/ a validação "turma OU disciplina" reagir). */
  protected readonly disciplinaSel = signal('');

  /** Verdadeiro quando NENHUMA turma e NENHUMA disciplina foram escolhidas (ENH-002). */
  protected readonly semVinculo = computed(
    () => !this.disciplinaSel() && this.turmaIdsSel().length === 0,
  );

  /**
   * Nº de aulas disponíveis para fixar o jogo (select "Aula N" quando não há
   * tópicos): o maior `totalAulas` entre as turmas selecionadas, ou 20 de base.
   */
  protected readonly aulasDisponiveis = computed<number[]>(() => {
    const sel = this.turmas().filter((t) => this.turmaIdsSel().includes(t.id));
    const max = Math.max(0, ...sel.map((t) => t.totalAulas ?? 0));
    return Array.from({ length: max > 0 ? max : 20 }, (_, i) => i + 1);
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

  /** Monta um FormGroup de pergunta já com os dados (edição / geração por IA). */
  private perguntaComDados(
    enunciado: string,
    alternativas: string[],
    corretaIndex: number,
  ): FormGroup {
    return this.fb.group({
      enunciado: [enunciado, Validators.required],
      corretaIndex: [corretaIndex],
      alternativas: this.fb.array<FormControl>(
        alternativas.map((a) => this.fb.control(a, Validators.required)),
      ),
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
    this.disciplinaSel.set(disc);
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
        numeroAula: q.numeroAula ?? null,
        duracaoSegundos: q.duracaoSegundos,
      });
      this.disciplinaSel.set(q.disciplina ?? '');
      this.turmaIdsSel.set(q.turmaIds ?? (q.turmaId ? [q.turmaId] : []));
      if (q.disciplina) {
        this.api.getTopicos(q.disciplina).subscribe((t) => {
          this.topicos.set(t);
          this.form.get('topicoId')!.setValue(q.topicoId ?? '');
        });
      }
      this.perguntas.clear();
      for (const p of q.perguntas) {
        this.perguntas.push(
          this.perguntaComDados(p.enunciado, p.alternativas, p.corretaIndex),
        );
      }
    });
  }

  /** Nome (texto) do tópico selecionado — enviado à IA como contexto. */
  private nomeTopicoSelecionado(): string | undefined {
    const id = this.form.get('topicoId')?.value;
    return id ? this.topicos().find((t) => t.id === id)?.nome : undefined;
  }

  /**
   * Gera as perguntas por IA a partir da instrução + disciplina/tópico. No
   * sucesso, substitui as perguntas do estúdio pelas geradas (o professor edita
   * depois). Trata rate limit (429), bloqueio de plano e indisponibilidade.
   */
  protected gerarIa(): void {
    const instrucao = this.instrucaoIa().trim();
    if (!instrucao || this.iaLoading() || this.iaEsgotada()) return;
    this.iaLoading.set(true);
    this.iaOk.set(false);
    this.iaMsg.set('');
    this.api
      .gerarPerguntasIa({
        instrucao,
        disciplina: this.form.get('disciplina')?.value || undefined,
        topico: this.nomeTopicoSelecionado(),
      })
      .subscribe({
        next: ({ perguntas }) => {
          this.perguntas.clear();
          for (const p of perguntas) {
            this.perguntas.push(
              this.perguntaComDados(p.enunciado, p.alternativas, p.corretaIndex),
            );
          }
          this.iaLoading.set(false);
          this.iaEsgotada.set(true); // cota diária consumida
          this.iaOk.set(true);
          this.iaMsg.set(
            `${perguntas.length} perguntas geradas! Feche este aviso para revisar e editar.`,
          );
        },
        error: (e: { error?: { code?: string; message?: string } }) => {
          this.iaLoading.set(false);
          this.iaOk.set(false);
          const code = e.error?.code;
          if (code === 'IA_RATE_LIMIT') {
            this.iaEsgotada.set(true);
            this.iaMsg.set(
              e.error?.message ??
                'Sua geração diária se esgotou. Volte amanhã ou escreva manualmente.',
            );
          } else if (code === 'QLICK_LOCKED') {
            this.iaMsg.set('A geração por IA é exclusiva do plano PhD.');
          } else {
            this.iaMsg.set('IA indisponível agora. Tente de novo ou escreva manualmente.');
          }
        },
      });
  }

  protected salvar(): void {
    if (this.form.invalid || this.perguntas.length === 0) {
      this.form.markAllAsTouched();
      this.erro.set('Preencha o título e ao menos uma pergunta completa.');
      return;
    }
    if (this.semVinculo()) {
      this.erro.set('Atribua a uma turma ou informe uma disciplina.');
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
      ...(raw.numeroAula ? { numeroAula: Number(raw.numeroAula) } : {}),
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
