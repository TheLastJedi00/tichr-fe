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
import { TurmaApiService } from '../../core/turma-api.service';
import { ProfileService } from '../../core/profile.service';
import { Topico, Turma, WorJogo } from '../../core/models';
import { turmaContaComoAtiva } from '../../core/plano.util';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';

/**
 * Wizard de criação do Tichr Wor (Setup + Arsenal). Mobile-first: tudo empilhado
 * com gap; palavras reordenáveis por drag-and-drop; arsenal inteiro (palavras +
 * dicas) forjado por IA num clique, a partir de uma instrução no modal, com
 * tratamento amigável do rate limit. O Contexto (disciplina/tópico/turmas) e o
 * fluxo da IA espelham o estúdio do Tichr Qlick.
 */
@Component({
  selector: 'app-wor-studio-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, DragDropModule, Icon, Modal],
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

        <div class="grid2">
          <label class="campo">
            <span>Disciplina <small>(opcional)</small></span>
            <select class="tichr-input" formControlName="disciplina" (change)="onDisciplina()">
              <option value="">— Nenhuma —</option>
              @for (d of disciplinas(); track d) { <option [value]="d">{{ d }}</option> }
            </select>
          </label>
          @if (topicos().length) {
            <label class="campo">
              <span>Tópico do plano de aula <small>(opcional)</small></span>
              <select class="tichr-input" formControlName="topicoId">
                <option value="">— Nenhum —</option>
                @for (t of topicos(); track t.id) { <option [value]="t.id">{{ t.nome }}</option> }
              </select>
            </label>
          } @else {
            <label class="campo">
              <span>Aula <small>(quando não há tópicos)</small></span>
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
          <span>Turmas <small>— atribua a uma ou mais (ou informe uma disciplina)</small></span>
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
      </section>

      <!-- Passo 2: Arsenal -->
      <section class="bloco">
        <h2 class="bloco__tit">Arsenal (palavras &amp; dicas)</h2>

        <div class="ia-bar">
          <button class="btn-ia" type="button" (click)="iaAberta.set(true)">
            <app-icon name="sparkles" [size]="16" /> Forjar arsenal com IA
          </button>
          <span class="ia-hint">Cria 5 palavras com 3 dicas cada (você edita depois). 1 geração por dia.</span>
        </div>

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
            </div>
          }
        </div>

        <button class="btn-outline add" type="button" (click)="adicionar()">
          <app-icon name="plus" [size]="16" /> Adicionar palavra
        </button>
      </section>

      @if (semVinculo()) {
        <p class="dica">Atribua a uma turma ou informe uma disciplina para salvar.</p>
      }
      @if (erro()) { <p class="erro">{{ erro() }}</p> }

      <div class="rodape">
        <button class="btn-primary" type="submit" [disabled]="salvando() || semVinculo()">
          {{ salvando() ? 'Guardando…' : 'Salvar e Guardar no Arsenal' }}
        </button>
      </div>
    </form>

    <app-modal
      [open]="iaAberta()"
      title="Forjar arsenal com IA"
      (close)="iaLoading() || iaAberta.set(false)"
    >
      <p class="ia-sub">
        Descreva o que a batalha deve cobrar — a IA forja <b>5 palavras secretas
        com 3 dicas</b> cada (da mais difícil à mais fácil), usando a disciplina e
        o tópico selecionados como contexto. Depois é só editar. Limite de 1
        geração por dia.
      </p>
      <textarea
        class="tichr-input ia-txt"
        rows="4"
        [value]="instrucaoIa()"
        (input)="instrucaoIa.set($any($event.target).value)"
        [disabled]="iaLoading()"
        placeholder="Ex: termos-chave da Revolução Francesa, palavras curtas, dicas sem citar datas."
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
          (click)="gerarArsenal()"
          [disabled]="iaLoading() || iaEsgotada() || !instrucaoIa().trim()"
        >
          {{ iaLoading() ? 'Forjando enigmas…' : 'Forjar' }}
        </button>
      </div>
    </app-modal>
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
    .grid2 { display: grid; grid-template-columns: 1fr; gap: 0.9rem; }
    @media (min-width: 560px) { .grid2 { grid-template-columns: 1fr 1fr; } }
    .turmas-check { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .check {
      display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer;
      padding: 0.4rem 0.7rem; border-radius: 999px;
      border: 1px solid var(--border); background: var(--surface); font-weight: 600; font-size: 0.9rem;
    }
    .check--on { border-color: #b45309; color: #b45309; background: color-mix(in srgb, #b45309 10%, transparent); }
    .dica { color: var(--text-muted); font-size: 0.85rem; margin: 0; }
    .lista { display: flex; flex-direction: column; gap: 1rem; }
    .palavra { display: flex; flex-direction: column; gap: 0.6rem; padding: 1rem; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); }
    .palavra.cdk-drag-preview { box-shadow: 0 12px 30px rgba(0,0,0,0.2); }
    .palavra__top { display: flex; align-items: center; gap: 0.5rem; }
    .palavra__handle { display: inline-flex; color: var(--text-muted); cursor: grab; touch-action: none; }
    .palavra__inp { flex: 1; text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em; }
    .ic-btn { display: inline-flex; padding: 0.4rem; border: none; background: none; color: var(--danger); cursor: pointer; border-radius: 8px; }
    .ic-btn:hover { background: color-mix(in srgb, var(--danger) 10%, transparent); }
    .dicas { display: flex; flex-direction: column; gap: 0.5rem; }
    .ia-bar { display: flex; align-items: center; gap: 0.6rem 0.9rem; flex-wrap: wrap; }
    .btn-ia {
      display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 0.9rem;
      border-radius: 10px; border: 1px solid #b45309; background: color-mix(in srgb, #b45309 8%, transparent);
      color: #b45309; font-weight: 700; font-size: 0.9rem; cursor: pointer;
    }
    .btn-ia:hover { background: color-mix(in srgb, #b45309 16%, transparent); }
    .btn-ia:disabled { opacity: 0.55; cursor: not-allowed; }
    .ia-hint { font-size: 0.82rem; color: var(--text-muted); }
    .ia-sub { margin: 0 0 0.75rem; color: var(--text-muted); font-size: 0.9rem; }
    .ia-txt { width: 100%; resize: vertical; font: inherit; }
    .ia-feedback { margin: 0.75rem 0 0; font-weight: 600; color: var(--danger); }
    .ia-feedback.ok { color: var(--success); }
    .add { align-self: flex-start; display: inline-flex; align-items: center; gap: 0.4rem; }
    .erro { margin: 0; color: var(--danger); font-weight: 600; }
    .rodape { display: flex; }
    .rodape .btn-primary { width: 100%; }
  `,
})
export class WorStudioPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(WorApiService);
  private readonly turmaApi = inject(TurmaApiService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private id: string | null = null;
  protected readonly editando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);
  // Geração por IA (modal): instrução + estados de loading/feedback/cota.
  protected readonly iaAberta = signal(false);
  protected readonly iaLoading = signal(false);
  protected readonly iaEsgotada = signal(false);
  protected readonly iaOk = signal(false);
  protected readonly iaMsg = signal('');
  protected readonly instrucaoIa = signal('');

  protected readonly turmas = signal<Turma[]>([]);
  protected readonly turmaIdsSel = signal<string[]>([]);
  /**
   * Só faz sentido vincular uma batalha a turmas ativas. Mantém visíveis as já
   * selecionadas (ex.: ao editar um jogo cuja turma encerrou depois) para não
   * esconder/perder a atribuição existente.
   */
  protected readonly turmasVinculaveis = computed(() =>
    this.turmas().filter(
      (t) => turmaContaComoAtiva(t) || this.turmaIdsSel().includes(t.id),
    ),
  );
  protected readonly topicos = signal<Topico[]>([]);
  protected readonly disciplinas = computed(
    () => this.profileService.profile()?.disciplinas ?? [],
  );

  protected readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(80)]],
    disciplina: [''],
    topicoId: [''],
    numeroAula: [null as number | null],
    palavras: this.fb.array([this.novaPalavra()]),
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

  get palavras(): FormArray {
    return this.form.get('palavras') as FormArray;
  }

  constructor() {
    this.id = this.route.snapshot.paramMap.get('id');
    const iniciar = () => {
      this.turmaApi.getTurmas().subscribe((t) => this.turmas.set(t));
      if (this.id) {
        this.editando.set(true);
        this.api.obterJogo(this.id).subscribe((j) => this.preencher(j));
      }
    };
    if (this.profileService.profile()) {
      iniciar();
    } else {
      this.profileService.load().subscribe({ next: iniciar, error: iniciar });
    }
  }

  protected asGroup(c: unknown): FormGroup {
    return c as FormGroup;
  }
  protected dicasDe(c: unknown): FormArray {
    return (c as FormGroup).get('dicas') as FormArray;
  }

  /** Marca/desmarca uma turma na atribuição N:N da batalha. */
  protected toggleTurma(id: string): void {
    this.turmaIdsSel.update((sel) =>
      sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id],
    );
  }

  /** Carrega os tópicos do plano de aula ao trocar a disciplina. */
  protected onDisciplina(): void {
    const disc = this.form.get('disciplina')!.value ?? '';
    this.disciplinaSel.set(disc);
    this.form.get('topicoId')!.setValue('');
    if (disc) {
      this.turmaApi.getTopicos(disc).subscribe((t) => this.topicos.set(t));
    } else {
      this.topicos.set([]);
    }
  }

  private novaPalavra(palavra = '', dicas: string[] = []): FormGroup {
    return this.fb.group({
      palavra: [palavra, [Validators.required, Validators.maxLength(40)]],
      dicas: this.fb.array([0, 1, 2].map((i) => this.fb.control(dicas[i] ?? ''))),
    });
  }

  private preencher(j: WorJogo): void {
    this.form.patchValue({
      nome: j.nome,
      disciplina: j.disciplina ?? '',
      numeroAula: j.numeroAula ?? null,
    });
    this.disciplinaSel.set(j.disciplina ?? '');
    this.turmaIdsSel.set(j.turmaIds ?? (j.turmaId ? [j.turmaId] : []));
    if (j.disciplina) {
      this.turmaApi.getTopicos(j.disciplina).subscribe((t) => {
        this.topicos.set(t);
        this.form.get('topicoId')!.setValue(j.topicoId ?? '');
      });
    }
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

  /** Nome do tópico selecionado — vira contexto textual da IA (como no free-text antigo). */
  private nomeTopicoSelecionado(): string | undefined {
    const id = this.form.get('topicoId')?.value;
    return id ? this.topicos().find((t) => t.id === id)?.nome : undefined;
  }

  /**
   * Forja o arsenal por IA a partir da instrução + disciplina/tópico. No sucesso,
   * substitui as palavras do estúdio pelas geradas (o professor edita depois).
   * Trata rate limit (429), bloqueio de plano e indisponibilidade.
   */
  protected gerarArsenal(): void {
    const instrucao = this.instrucaoIa().trim();
    if (!instrucao || this.iaLoading() || this.iaEsgotada()) return;
    this.iaLoading.set(true);
    this.iaOk.set(false);
    this.iaMsg.set('');
    this.api
      .gerarArsenal({
        instrucao,
        topico: this.nomeTopicoSelecionado(),
        disciplina: this.form.get('disciplina')?.value || undefined,
      })
      .subscribe({
        next: ({ palavras, restantes }) => {
          this.palavras.clear();
          palavras.forEach((p) =>
            this.palavras.push(this.novaPalavra(p.palavra, p.dicas)),
          );
          this.iaLoading.set(false);
          this.iaEsgotada.set(restantes <= 0); // só trava quando esgota a cota
          this.iaOk.set(true);
          this.iaMsg.set(
            `${palavras.length} palavras forjadas! ${this.textoRestantes(restantes)} Feche este aviso para revisar e editar.`,
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
                'Sua magia diária se esgotou. Volte amanhã ou escreva manualmente.',
            );
          } else if (code === 'WOR_LOCKED') {
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
    if (this.form.invalid) {
      this.erro.set('Preencha o nome e ao menos uma palavra.');
      this.form.markAllAsTouched();
      return;
    }
    if (this.semVinculo()) {
      this.erro.set('Atribua a uma turma ou informe uma disciplina.');
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      nome: v.nome!,
      ...(v.disciplina ? { disciplina: v.disciplina } : {}),
      ...(v.topicoId ? { topicoId: v.topicoId } : {}),
      ...(v.numeroAula ? { numeroAula: Number(v.numeroAula) } : {}),
      turmaIds: this.turmaIdsSel(),
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
      next: () => this.router.navigateByUrl('/jogos/wor'),
      error: () => {
        this.erro.set('Não foi possível salvar. Tente novamente.');
        this.salvando.set(false);
      },
    });
  }
}
