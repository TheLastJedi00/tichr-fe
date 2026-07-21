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
import { IsolateusApiService } from '../../core/isolateus-api.service';
import { CriarIsolateusPayload, Turma } from '../../core/models';
import { ProfileService } from '../../core/profile.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { TurmaSelector } from '../../ui/turma-selector/turma-selector';

/**
 * Estúdio do Tichr Isolateus (PhD): cria/edita a investigação — nome, as questões
 * que defendem os setores da vila, metadados (disciplina/tópico/turma) e a duração
 * de cada defesa. Mesma pegada do estúdio do Qlick, inclusive o modal de IA.
 */
@Component({
  selector: 'app-isolateus-studio-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Card, Icon, Modal, TurmaSelector],
  template: `
    <a class="voltar" routerLink="/jogos/isolateus">← Tichr Isolateus</a>
    <h1 class="title">{{ editId ? 'Editar investigação' : 'Nova investigação' }}</h1>

    <form [formGroup]="form" (ngSubmit)="salvar()">
      <app-card>
        <label class="campo">
          <span>Nome da investigação</span>
          <input class="tichr-input" formControlName="nome" placeholder="Ex: A Noite das Luzes" />
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
          <app-turma-selector
            [turmas]="turmas()"
            [selecionadas]="turmaIdsSel()"
            (selecionadasChange)="turmaIdsSel.set($event)"
          />
        </div>
        <label class="campo">
          <span>Tempo por defesa (s)</span>
          <input class="tichr-input" type="number" min="5" max="600" formControlName="duracaoSegundos" />
        </label>
      </app-card>

      <div class="ia-bar">
        <button class="btn-ia" type="button" (click)="iaAberta.set(true)">
          <app-icon name="sparkles" [size]="16" /> Gerar questões com IA
        </button>
        <span class="ia-hint">Cria 10 questões (você edita depois). 1 geração por dia.</span>
      </div>

      <p class="nota">
        Cada rodada consome uma questão: a vila enfrenta tantas noites quantas
        forem as questões. O padrão da investigação são <b>10</b>.
      </p>

      <div class="questoes" formArrayName="questoes">
        @for (qg of questoes.controls; track $index; let qi = $index) {
          <app-card>
            <div [formGroupName]="qi">
              <div class="pcab">
                <h3>Questão {{ qi + 1 }}</h3>
                <button class="rem" type="button" (click)="removerQuestao(qi)" aria-label="Remover questão">
                  <app-icon name="close" [size]="16" />
                </button>
              </div>
              <label class="campo">
                <span>Enunciado</span>
                <input class="tichr-input" formControlName="enunciado" placeholder="Escreva a questão" />
              </label>

              <span class="campo__lbl">Alternativas (marque a correta)</span>
              <div class="alts" formArrayName="alternativas">
                @for (alt of alternativasDe(qi).controls; track ai; let ai = $index) {
                  <div class="alt">
                    <input
                      class="alt__radio"
                      type="radio"
                      [name]="'correta-' + qi"
                      [checked]="corretaDe(qi) === ai"
                      (change)="setCorreta(qi, ai)"
                      aria-label="Marcar como correta"
                    />
                    <input class="tichr-input" [formControlName]="ai" placeholder="Alternativa {{ ai + 1 }}" />
                    @if (alternativasDe(qi).length > 2) {
                      <button class="rem" type="button" (click)="removerAlternativa(qi, ai)" aria-label="Remover alternativa">
                        <app-icon name="close" [size]="14" />
                      </button>
                    }
                  </div>
                }
              </div>
              @if (alternativasDe(qi).length < 6) {
                <button class="btn-outline btn-sm add-alt" type="button" (click)="addAlternativa(qi)">
                  + Alternativa
                </button>
              }
            </div>
          </app-card>
        }
      </div>

      <button class="btn-outline full" type="button" (click)="addQuestao()">
        <app-icon name="plus" [size]="16" /> Adicionar questão
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
        {{ salvando() ? 'Salvando…' : editId ? 'Salvar alterações' : 'Criar investigação' }}
      </button>
    </form>

    <app-modal
      [open]="iaAberta()"
      title="Gerar questões com IA"
      (close)="iaLoading() || iaAberta.set(false)"
    >
      <p class="ia-sub">
        Descreva o que a investigação deve cobrar — a IA cria <b>10 questões com 4
        alternativas</b> cada, usando a disciplina e o tópico como contexto. O
        conteúdo é da sua matéria; o jogo é só o embrulho. Limite de 1 geração por dia.
      </p>
      <textarea
        class="tichr-input ia-txt"
        rows="4"
        [value]="instrucaoIa()"
        (input)="instrucaoIa.set($any($event.target).value)"
        [disabled]="iaLoading()"
        placeholder="Ex: questões de nível médio sobre o ciclo da água, com alternativas plausíveis — o infiltrado vai tentar defender as erradas."
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
    .voltar { color: #4d7c0f; font-weight: 600; }
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
    .check--on { border-color: #84cc16; color: #4d7c0f; background: color-mix(in srgb, #84cc16 12%, transparent); }
    .dica { color: var(--text-muted); font-size: 0.85rem; margin: 0; }
    .nota { margin: 0.75rem 0 0; color: var(--text-muted); font-size: 0.85rem; }
    app-card + * { margin-top: 1rem; }
    .pcab { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
    .pcab h3 { margin: 0; font-size: 1.05rem; }
    .rem { display: inline-flex; color: var(--text-muted); background: none; border: none; cursor: pointer; padding: 0.15rem; }
    .rem:hover { color: var(--danger); }
    .questoes { display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0; }
    .alts { display: flex; flex-direction: column; gap: 0.5rem; }
    .alt { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .alt__radio { width: 18px; height: 18px; flex: 0 0 auto; }
    .alt .tichr-input { flex: 1; }
    .btn-sm { font-size: 0.85rem; padding: 0.4rem 0.8rem; }
    .add-alt { margin-top: 0.6rem; }
    .full { width: 100%; margin-top: 1rem; }
    .salvar { margin-top: 1rem; background: #4d7c0f; border-color: #4d7c0f; }
    .salvar:hover { background: #3f6212; }
    .erro { color: var(--danger); font-weight: 600; margin: 1rem 0 0; }
    .ia-bar { display: flex; align-items: center; gap: 0.6rem 0.9rem; flex-wrap: wrap; margin-top: 1rem; }
    .btn-ia {
      display: inline-flex; align-items: center; gap: 0.4rem;
      font: inherit; font-weight: 700; cursor: pointer;
      padding: 0.55rem 1rem; border-radius: var(--radius);
      color: #4d7c0f; background: color-mix(in srgb, #84cc16 12%, var(--surface));
      border: 1px solid #84cc16;
    }
    .btn-ia:hover { background: color-mix(in srgb, #84cc16 20%, var(--surface)); }
    .ia-hint { font-size: 0.82rem; color: var(--text-muted); }
    .ia-sub { margin: 0 0 0.75rem; color: var(--text-muted); font-size: 0.9rem; }
    .ia-txt { width: 100%; resize: vertical; font: inherit; }
    .ia-feedback { margin: 0.75rem 0 0; font-weight: 600; color: var(--danger); }
    .ia-feedback.ok { color: var(--success); }
  `,
})
export class IsolateusStudioPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(IsolateusApiService);
  private readonly turmasApi = inject(TurmaApiService);
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

  // Geração por IA (modal): instrução + estados de loading/feedback/cota.
  protected readonly iaAberta = signal(false);
  protected readonly iaLoading = signal(false);
  protected readonly iaEsgotada = signal(false);
  protected readonly iaOk = signal(false);
  protected readonly iaMsg = signal('');
  protected readonly instrucaoIa = signal('');

  protected readonly form = this.fb.group({
    nome: ['', Validators.required],
    disciplina: [''],
    topicoId: [''],
    numeroAula: [null as number | null],
    duracaoSegundos: [60, [Validators.required, Validators.min(5), Validators.max(600)]],
    questoes: this.fb.array<FormGroup>([]),
  });

  /** Disciplina selecionada (signal p/ a validação "turma OU disciplina" reagir). */
  protected readonly disciplinaSel = signal('');

  /** Verdadeiro quando NENHUMA turma e NENHUMA disciplina foram escolhidas (ENH-002). */
  protected readonly semVinculo = computed(
    () => !this.disciplinaSel() && this.turmaIdsSel().length === 0,
  );

  /** Nº de aulas para o select "Aula N": maior `totalAulas` das turmas, ou 20. */
  protected readonly aulasDisponiveis = computed<number[]>(() => {
    const sel = this.turmas().filter((t) => this.turmaIdsSel().includes(t.id));
    const max = Math.max(0, ...sel.map((t) => t.totalAulas ?? 0));
    return Array.from({ length: max > 0 ? max : 20 }, (_, i) => i + 1);
  });


  protected get questoes(): FormArray<FormGroup> {
    return this.form.get('questoes') as FormArray<FormGroup>;
  }
  protected alternativasDe(qi: number): FormArray<FormControl> {
    return this.questoes.at(qi).get('alternativas') as FormArray<FormControl>;
  }
  protected corretaDe(qi: number): number {
    return this.questoes.at(qi).get('corretaIndex')!.value as number;
  }
  protected setCorreta(qi: number, ai: number): void {
    this.questoes.at(qi).get('corretaIndex')!.setValue(ai);
  }

  private novaQuestao(): FormGroup {
    return this.fb.group({
      enunciado: ['', Validators.required],
      corretaIndex: [0],
      alternativas: this.fb.array<FormControl>([
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
      ]),
    });
  }

  /** Monta um FormGroup de questão já com os dados (edição / geração por IA). */
  private questaoComDados(
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

  protected addQuestao(): void {
    this.questoes.push(this.novaQuestao());
  }
  protected removerQuestao(qi: number): void {
    this.questoes.removeAt(qi);
  }
  protected addAlternativa(qi: number): void {
    this.alternativasDe(qi).push(this.fb.control('', Validators.required));
  }
  protected removerAlternativa(qi: number, ai: number): void {
    const arr = this.alternativasDe(qi);
    arr.removeAt(ai);
    if (this.corretaDe(qi) >= arr.length) {
      this.setCorreta(qi, 0);
    }
  }

  constructor() {
    const iniciar = () => {
      this.turmasApi.getTurmas().subscribe((t) => this.turmas.set(t));
      if (this.editId) {
        this.carregarParaEdicao(this.editId);
      } else {
        this.addQuestao();
      }
    };
    if (this.profileService.profile()) {
      iniciar();
    } else {
      this.profileService.load().subscribe({ next: iniciar, error: iniciar });
    }
  }

  /** Carrega tópicos ao trocar a disciplina. */
  protected onDisciplina(): void {
    const disc = this.form.get('disciplina')!.value ?? '';
    this.disciplinaSel.set(disc);
    this.form.get('topicoId')!.setValue('');
    if (disc) {
      this.turmasApi.getTopicos(disc).subscribe((t) => this.topicos.set(t));
    } else {
      this.topicos.set([]);
    }
  }

  private carregarParaEdicao(id: string): void {
    this.api.obterJogo(id).subscribe((j) => {
      this.form.patchValue({
        nome: j.nome,
        disciplina: j.disciplina ?? '',
        numeroAula: j.numeroAula ?? null,
        duracaoSegundos: j.duracaoSegundos,
      });
      this.disciplinaSel.set(j.disciplina ?? '');
      this.turmaIdsSel.set(j.turmaIds ?? (j.turmaId ? [j.turmaId] : []));
      if (j.disciplina) {
        this.turmasApi.getTopicos(j.disciplina).subscribe((t) => {
          this.topicos.set(t);
          this.form.get('topicoId')!.setValue(j.topicoId ?? '');
        });
      }
      this.questoes.clear();
      for (const q of j.questoes) {
        this.questoes.push(
          this.questaoComDados(q.enunciado, q.alternativas, q.corretaIndex),
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
   * Gera as questões por IA. No sucesso, substitui as do estúdio pelas geradas
   * (o professor edita depois). Trata rate limit (429), bloqueio de plano e
   * indisponibilidade — a cota do Isolateus é separada da do Qlick e do Wor.
   */
  protected gerarIa(): void {
    const instrucao = this.instrucaoIa().trim();
    if (!instrucao || this.iaLoading() || this.iaEsgotada()) return;
    this.iaLoading.set(true);
    this.iaOk.set(false);
    this.iaMsg.set('');
    this.api
      .gerarQuestoes({
        instrucao,
        disciplina: this.form.get('disciplina')?.value || undefined,
        topico: this.nomeTopicoSelecionado(),
      })
      .subscribe({
        next: ({ questoes, restantes }) => {
          this.questoes.clear();
          for (const q of questoes) {
            this.questoes.push(
              this.questaoComDados(q.enunciado, q.alternativas, q.corretaIndex),
            );
          }
          this.iaLoading.set(false);
          this.iaEsgotada.set(restantes <= 0); // só trava quando esgota a cota
          this.iaOk.set(true);
          this.iaMsg.set(
            `${questoes.length} questões geradas! ${this.textoRestantes(restantes)} Feche este aviso para revisar e editar.`,
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
                'A transmissão diária com o Comando Central se esgotou. Volte amanhã ou escreva manualmente.',
            );
          } else if (code === 'ISOLATEUS_LOCKED') {
            this.iaMsg.set('A geração por IA é exclusiva do plano PhD.');
          } else {
            this.iaMsg.set('IA indisponível agora. Tente de novo ou escreva manualmente.');
          }
        },
      });
  }

  /** Frase de saldo de gerações de IA para o dia (limite global configurável). */
  protected textoRestantes(restantes: number): string {
    return restantes > 0
      ? `Você ainda tem ${restantes} geração(ões) por IA hoje.`
      : 'Foi sua última geração por IA de hoje.';
  }

  protected salvar(): void {
    if (this.form.invalid || this.questoes.length === 0) {
      this.form.markAllAsTouched();
      this.erro.set('Preencha o nome e ao menos uma questão completa.');
      return;
    }
    if (this.semVinculo()) {
      this.erro.set('Atribua a uma turma ou informe uma disciplina.');
      return;
    }
    const raw = this.form.getRawValue();
    const payload: CriarIsolateusPayload = {
      nome: raw.nome!.trim(),
      duracaoSegundos: Number(raw.duracaoSegundos),
      questoes: this.questoes.controls.map((qg) => ({
        enunciado: qg.get('enunciado')!.value,
        corretaIndex: qg.get('corretaIndex')!.value,
        alternativas: (qg.get('alternativas') as FormArray).controls.map(
          (c) => c.value,
        ),
      })),
      ...(raw.disciplina ? { disciplina: raw.disciplina } : {}),
      ...(raw.topicoId ? { topicoId: raw.topicoId } : {}),
      ...(raw.numeroAula ? { numeroAula: Number(raw.numeroAula) } : {}),
      turmaIds: this.turmaIdsSel(),
    };
    this.salvando.set(true);
    this.erro.set('');
    const req = this.editId
      ? this.api.atualizarJogo(this.editId, payload)
      : this.api.criarJogo(payload);
    req.subscribe({
      next: () => this.router.navigate(['/jogos/isolateus']),
      error: () => {
        this.salvando.set(false);
        this.erro.set('Não foi possível salvar. Tente de novo.');
      },
    });
  }
}
