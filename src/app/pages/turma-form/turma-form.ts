import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CriarTurmaPayload,
  GradeHorariaItem,
  Instituicao,
  NivelEnsino,
  TipoModalidade,
  Turma,
} from '../../core/models';
import { InstituicaoApiService } from '../../core/instituicao-api.service';
import { NIVEIS_DEFAULT } from '../../core/nivel.util';
import { podeGamificar } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { NIVEIS_ENSINO, seriesDoNivel } from '../../core/serie.util';
import { Card } from '../../ui/card/card';
import { FormBlocker } from '../../ui/form-blocker/form-blocker';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';

const DIAS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

/** Paleta de cores de destaque (sólidas, sem gradiente). */
const CORES = [
  '#2563eb', '#0891b2', '#059669', '#65a30d',
  '#d97706', '#dc2626', '#db2777', '#7c3aed',
];

/** Dias úteis usados na grade do ensino regular (Segunda a Sexta). */
const DIAS_UTEIS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
];

/**
 * Formulário reativo de turma, reutilizado em criar e editar.
 * Recebe os valores iniciais e emite o payload pronto no submit.
 */
@Component({
  selector: 'app-turma-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Card, Icon, Modal, FormBlocker],
  template: `
    <app-form-blocker [busy]="submitting()">
    <app-card>
      <form [formGroup]="form" (ngSubmit)="submeter()">
        <label class="campo">
          <span>Nome da turma</span>
          <input class="tichr-input" formControlName="nome" placeholder="Ex: Redação 9º ano" />
        </label>

        <label class="campo">
          <span>Disciplina</span>
          @if (disciplinasDisponiveis().length) {
            <select class="tichr-input" formControlName="disciplina">
              <option value="">— Nenhuma —</option>
              @for (d of disciplinasDisponiveis(); track d) {
                <option [value]="d">{{ d }}</option>
              }
            </select>
          } @else {
            <p class="hint">
              Cadastre suas disciplinas em
              <a routerLink="/configuracoes">Configurações</a> para vinculá-las.
            </p>
          }
        </label>

        <fieldset class="grupo">
          <legend>Ensino Regular (escola)</legend>
          <label class="toggle">
            <input type="checkbox" formControlName="ensinoRegular" />
            <span>Esta turma é de uma escola de ensino regular</span>
          </label>

          @if (ehRegular()) {
            @if (instituicoes().length) {
              <label class="campo">
                <span>Instituição (escola)</span>
                <select class="tichr-input" formControlName="instituicaoId">
                  <option value="">— Selecione —</option>
                  @for (i of instituicoes(); track i.id) {
                    <option [value]="i.id">{{ i.nome }}</option>
                  }
                </select>
              </label>
            } @else {
              <p class="hint">
                Você ainda não tem escolas. Cadastre em
                <a routerLink="/configuracoes/instituicoes">Configurações › Instituições</a>.
              </p>
            }

            <div class="campo rotulos">
              <label>
                <span>Nível</span>
                <select class="tichr-input" formControlName="nivelEnsino">
                  <option value="">— Selecione —</option>
                  @for (n of niveisEnsino; track n.value) {
                    <option [value]="n.value">{{ n.label }}</option>
                  }
                </select>
              </label>
              <label>
                <span>Ano/Série</span>
                <select class="tichr-input" formControlName="anoSerie" [disabled]="!seriesDisponiveis().length">
                  <option value="">— Selecione —</option>
                  @for (s of seriesDisponiveis(); track s) {
                    <option [value]="s">{{ s }}</option>
                  }
                </select>
              </label>
            </div>

            @if (slotsAula().length) {
              <div class="campo">
                <span>Horários na grade — marque quando esta turma tem aula</span>
                <div class="grade-aloc">
                  @for (dia of diasUteis; track dia.value) {
                    <div class="dia-linha">
                      <span class="dia-nome">{{ dia.label }}</span>
                      <div class="periodos">
                        @for (s of slotsAula(); track s.ordem) {
                          <button
                            type="button"
                            class="chip pchip"
                            [class.is-on]="temAloc(dia.value, s.periodo!)"
                            (click)="toggleAloc(dia.value, s.periodo!)"
                            [attr.title]="s.horaInicio + '–' + s.horaFim"
                          >
                            {{ s.periodo }}º
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            } @else if (instituicaoSel()) {
              <p class="hint">A grade desta escola está vazia. Ajuste os horários na instituição.</p>
            }
          }
        </fieldset>

        @if (!ehRegular()) {
          <label class="campo">
            <span>Modalidade</span>
            <select class="tichr-input" formControlName="tipoModalidade">
              <option value="GRADE_FIXA">Grade fixa (contínua)</option>
              <option value="MODULO_FECHADO">Módulo fechado</option>
            </select>
          </label>

          @if (isModulo()) {
            <label class="campo">
              <span>Total de aulas</span>
              <input class="tichr-input" type="number" min="1" formControlName="totalAulas" />
            </label>
          }
        }

        <label class="campo">
          <span>Data de início</span>
          <input class="tichr-input" type="date" formControlName="dataInicio" />
        </label>

        @if (!ehRegular()) {
          <div class="campo horarios">
            <label>
              <span>Início da aula</span>
              <input class="tichr-input" type="time" formControlName="horaInicio" />
            </label>
            <label>
              <span>Fim da aula</span>
              <input class="tichr-input" type="time" formControlName="horaFim" />
            </label>
          </div>

          <div class="campo">
            <span>Dias da semana</span>
            <div class="dias">
              @for (dia of dias; track dia.value) {
                <button
                  type="button"
                  class="chip"
                  [class.is-on]="selecionados().has(dia.value)"
                  (click)="toggleDia(dia.value)"
                >
                  {{ dia.label }}
                </button>
              }
            </div>
          </div>
        }

        <div class="campo">
          <span>Cor de destaque</span>
          <div class="cores">
            @for (c of cores; track c) {
              <button
                type="button"
                class="cor"
                [class.is-on]="cor() === c"
                [style.background]="c"
                [attr.aria-label]="'Cor ' + c"
                (click)="cor.set(c)"
              ></button>
            }
          </div>
        </div>

        <fieldset class="grupo">
          <legend>Pontuação & Gamificação</legend>

          @if (podeGamif()) {
            <label class="toggle">
              <input type="checkbox" formControlName="pontuacaoAtiva" />
              <span>Habilitar Portal Gamificado</span>
            </label>
          } @else {
            <button type="button" class="toggle toggle--lock" (click)="abrirUpsell()">
              <app-icon name="lock" [size]="16" />
              <span>Habilitar Portal Gamificado — exclusivo do plano PhD</span>
            </button>
          }

          @if (podeGamif() && pontuacaoAtiva()) {
            <label class="campo">
              <span>Nome da pontuação</span>
              <input
                class="tichr-input"
                formControlName="nomePontuacao"
                placeholder="Ex: XP, Aura…"
                maxlength="24"
              />
            </label>

            <div class="campo rotulos">
              <label>
                <span>Rótulo de adicionar</span>
                <input
                  class="tichr-input"
                  formControlName="rotuloAdicionar"
                  placeholder="Ex: Moggar"
                  maxlength="24"
                />
              </label>
              <label>
                <span>Rótulo de remover</span>
                <input
                  class="tichr-input"
                  formControlName="rotuloRemover"
                  placeholder="Ex: Punir"
                  maxlength="24"
                />
              </label>
            </div>

            <label class="toggle">
              <input type="checkbox" formControlName="rankingAtivo" />
              <span>Ranking ativo</span>
            </label>

            <div class="campo">
              <span>Níveis — XP para alcançar cada tier</span>
              <div class="niveis">
                <label>
                  <span>Prata</span>
                  <input class="tichr-input" type="number" min="1" formControlName="nivelPrata" />
                </label>
                <label>
                  <span>Ouro</span>
                  <input class="tichr-input" type="number" min="1" formControlName="nivelOuro" />
                </label>
                <label>
                  <span>Diamante</span>
                  <input class="tichr-input" type="number" min="1" formControlName="nivelDiamante" />
                </label>
                <label>
                  <span>Platina</span>
                  <input class="tichr-input" type="number" min="1" formControlName="nivelPlatina" />
                </label>
              </div>
              <p class="hint">
                Bronze começa em 0. Use valores crescentes: Prata &lt; Ouro &lt; Diamante &lt; Platina.
              </p>
            </div>
          }
        </fieldset>

        <button class="btn-primary submit" type="submit" [disabled]="!podeSalvar() || submitting()">
          {{ submitting() ? 'Salvando…' : submitLabel() }}
        </button>
      </form>
    </app-card>
    </app-form-blocker>

    <app-modal
      [open]="upsell()"
      title="Recurso do plano PhD"
      (close)="upsell.set(false)"
    >
      <p class="upsell-txt">
        O <strong>Portal do Aluno com gamificação</strong> (pontuação, níveis e
        ranking) é exclusivo do plano <strong>PhD</strong>.
      </p>
      <div modal-actions>
        <button class="btn-outline" type="button" (click)="upsell.set(false)">
          Agora não
        </button>
        <button class="btn-primary" type="button" (click)="irParaPlanos()">
          Fazer upgrade
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .campo { display: block; margin-bottom: 1rem; }
    .toggle--lock { width: 100%; justify-content: flex-start; opacity: 0.7; cursor: not-allowed; text-align: left; border: 1px dashed var(--border); border-radius: var(--radius); padding: 0.6rem 0.75rem; background: var(--surface); color: var(--text); }
    .upsell-txt { margin: 0; color: var(--text); }
    .campo > span {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .dias { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .chip {
      padding: 0.5rem 0.875rem;
      font-family: inherit;
      font-weight: 600;
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 999px;
      cursor: pointer;
    }
    .chip.is-on {
      color: var(--primary-contrast);
      background: var(--primary);
      border-color: var(--primary);
    }
    .grade-aloc { display: grid; gap: 0.5rem; }
    .dia-linha { display: flex; align-items: center; gap: 0.6rem; }
    .dia-nome { flex: 0 0 2.4rem; font-weight: 700; font-size: 0.85rem; color: var(--text-muted); }
    .periodos { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .pchip { padding: 0.35rem 0.6rem; border-radius: 8px; font-size: 0.85rem; min-width: 2.2rem; }
    .horarios { display: flex; gap: 0.75rem; }
    .horarios label { flex: 1; display: block; }
    .horarios label > span {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .hint { margin: 0; font-size: 0.85rem; color: var(--text-muted); }
    .hint a { font-weight: 600; }
    .cores { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .cor {
      width: 32px;
      height: 32px;
      border-radius: 999px;
      border: 2px solid var(--border);
      cursor: pointer;
      padding: 0;
    }
    .cor.is-on {
      border-color: var(--text);
      box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--text);
    }
    .submit { width: 100%; margin-top: 0.5rem; }
    .grupo {
      margin: 0 0 1rem;
      padding: 0.75rem 1rem 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .grupo legend {
      padding: 0 0.4rem;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
    }
    .toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .toggle input { width: 18px; height: 18px; }
    .rotulos { display: flex; gap: 0.75rem; }
    .rotulos label { flex: 1; display: block; }
    .rotulos label > span {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .niveis { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 0.75rem; }
    @media (min-width: 520px) { .niveis { grid-template-columns: repeat(4, 1fr); } }
    .niveis label { display: block; }
    .niveis label > span {
      display: block;
      margin-bottom: 0.3rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
    }
  `,
})
export class TurmaForm {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);

  readonly initial = input<Turma | null>(null);
  readonly submitting = input(false);
  readonly submitLabel = input('Salvar');
  readonly save = output<CriarTurmaPayload>();

  private readonly instituicaoApi = inject(InstituicaoApiService);

  protected readonly dias = DIAS;
  protected readonly diasUteis = DIAS_UTEIS;
  protected readonly cores = CORES;
  protected readonly niveisEnsino = NIVEIS_ENSINO;
  protected readonly selecionados = signal<Set<number>>(new Set());
  protected readonly cor = signal<string>(CORES[0]);
  protected readonly disciplinasDisponiveis = computed(
    () => this.profileService.profile()?.disciplinas ?? [],
  );

  // Ensino regular
  protected readonly instituicoes = signal<Instituicao[]>([]);
  /** Alocações da grade: chaves 'diaSemana:periodo'. */
  protected readonly alocacoes = signal<Set<string>>(new Set());
  private readonly ensinoRegularSig = signal(false);
  private readonly instituicaoIdSig = signal('');
  private readonly nivelSig = signal<NivelEnsino | ''>('');
  protected readonly ehRegular = computed(() => this.ensinoRegularSig());
  protected readonly seriesDisponiveis = computed(() =>
    seriesDoNivel(this.nivelSig() || null),
  );
  protected readonly instituicaoSel = computed(() =>
    this.instituicoes().find((i) => i.id === this.instituicaoIdSig()),
  );
  protected readonly slotsAula = computed(
    () => this.instituicaoSel()?.grade.filter((s) => s.tipo === 'AULA') ?? [],
  );

  protected readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    tipoModalidade: ['GRADE_FIXA' as TipoModalidade, Validators.required],
    dataInicio: ['', Validators.required],
    totalAulas: [5],
    disciplina: [''],
    horaInicio: [''],
    horaFim: [''],
    ensinoRegular: [false],
    instituicaoId: [''],
    nivelEnsino: ['' as NivelEnsino | ''],
    anoSerie: [''],
    pontuacaoAtiva: [true],
    nomePontuacao: ['XP'],
    rankingAtivo: [true],
    rotuloAdicionar: ['Adicionar'],
    rotuloRemover: ['Remover'],
    nivelPrata: [NIVEIS_DEFAULT.prata],
    nivelOuro: [NIVEIS_DEFAULT.ouro],
    nivelDiamante: [NIVEIS_DEFAULT.diamante],
    nivelPlatina: [NIVEIS_DEFAULT.platina],
  });

  private readonly modalidade = signal<TipoModalidade>('GRADE_FIXA');
  protected readonly isModulo = computed(() => this.modalidade() === 'MODULO_FECHADO');
  private readonly pontuacaoAtivaSig = signal(true);
  protected readonly pontuacaoAtiva = computed(() => this.pontuacaoAtivaSig());

  private readonly router = inject(Router);
  protected readonly upsell = signal(false);
  /** Gamificação só no PhD — trava o toggle e a config nos planos inferiores. */
  protected readonly podeGamif = computed(() =>
    podeGamificar(this.profileService.profile()?.planoAtual),
  );

  protected abrirUpsell(): void {
    this.upsell.set(true);
  }

  protected irParaPlanos(): void {
    this.upsell.set(false);
    this.router.navigate(['/planos'], {
      queryParams: { recurso: 'GAMIFICACAO' },
    });
  }

  constructor() {
    // garante que a lista de disciplinas do perfil esteja carregada
    if (!this.profileService.profile()) {
      this.profileService.load().subscribe({ error: () => {} });
    }
    this.form.controls.tipoModalidade.valueChanges.subscribe((v) =>
      this.modalidade.set(v),
    );
    this.form.controls.pontuacaoAtiva.valueChanges.subscribe((v) =>
      this.pontuacaoAtivaSig.set(v),
    );
    this.form.controls.ensinoRegular.valueChanges.subscribe((v) =>
      this.ensinoRegularSig.set(v),
    );
    this.form.controls.instituicaoId.valueChanges.subscribe((v) =>
      this.instituicaoIdSig.set(v),
    );
    this.form.controls.nivelEnsino.valueChanges.subscribe((v) => {
      this.nivelSig.set(v);
      // Troca de nível invalida a série escolhida (dropdown dinâmico).
      if (v && !seriesDoNivel(v).includes(this.form.controls.anoSerie.value)) {
        this.form.controls.anoSerie.setValue('');
      }
    });
    this.instituicaoApi.getInstituicoes().subscribe({
      next: (l) => this.instituicoes.set(l),
      error: () => {},
    });
    // preenche o form quando recebe os valores iniciais (edição)
    effect(() => {
      const t = this.initial();
      if (!t) return;
      this.form.patchValue({
        nome: t.nome,
        tipoModalidade: t.tipoModalidade,
        dataInicio: t.dataInicio,
        totalAulas: t.totalAulas ?? 5,
        disciplina: t.disciplina ?? '',
        horaInicio: t.horaInicio ?? '',
        horaFim: t.horaFim ?? '',
        ensinoRegular: t.ensinoRegular ?? false,
        instituicaoId: t.instituicaoId ?? '',
        nivelEnsino: t.nivelEnsino ?? '',
        anoSerie: t.anoSerie ?? '',
        pontuacaoAtiva: t.pontuacaoAtiva ?? true,
        nomePontuacao: t.nomePontuacao ?? 'XP',
        rankingAtivo: t.rankingAtivo ?? true,
        rotuloAdicionar: t.rotuloAdicionar ?? 'Adicionar',
        rotuloRemover: t.rotuloRemover ?? 'Remover',
        nivelPrata: t.nivelPrata ?? NIVEIS_DEFAULT.prata,
        nivelOuro: t.nivelOuro ?? NIVEIS_DEFAULT.ouro,
        nivelDiamante: t.nivelDiamante ?? NIVEIS_DEFAULT.diamante,
        nivelPlatina: t.nivelPlatina ?? NIVEIS_DEFAULT.platina,
      });
      this.modalidade.set(t.tipoModalidade);
      this.pontuacaoAtivaSig.set(t.pontuacaoAtiva ?? true);
      this.ensinoRegularSig.set(t.ensinoRegular ?? false);
      this.instituicaoIdSig.set(t.instituicaoId ?? '');
      this.nivelSig.set(t.nivelEnsino ?? '');
      this.selecionados.set(new Set(t.diasSemana));
      this.alocacoes.set(
        new Set((t.gradeHoraria ?? []).map((g) => `${g.diaSemana}:${g.periodo}`)),
      );
      if (t.cor) this.cor.set(t.cor);
    });
  }

  protected toggleDia(dia: number): void {
    const set = new Set(this.selecionados());
    set.has(dia) ? set.delete(dia) : set.add(dia);
    this.selecionados.set(set);
  }

  // ===== Grade do ensino regular =====

  private chaveAloc(dia: number, periodo: number): string {
    return `${dia}:${periodo}`;
  }

  protected temAloc(dia: number, periodo: number): boolean {
    return this.alocacoes().has(this.chaveAloc(dia, periodo));
  }

  protected toggleAloc(dia: number, periodo: number): void {
    const set = new Set(this.alocacoes());
    const k = this.chaveAloc(dia, periodo);
    set.has(k) ? set.delete(k) : set.add(k);
    this.alocacoes.set(set);
  }

  private gradeHoraria(): GradeHorariaItem[] {
    return [...this.alocacoes()].map((k) => {
      const [diaSemana, periodo] = k.split(':').map(Number);
      return { diaSemana, periodo };
    });
  }

  protected podeSalvar(): boolean {
    if (!this.form.valid) return false;
    if (this.ehRegular()) {
      const raw = this.form.getRawValue();
      return (
        !!raw.instituicaoId &&
        !!raw.nivelEnsino &&
        !!raw.anoSerie &&
        this.alocacoes().size > 0
      );
    }
    return this.selecionados().size > 0;
  }

  protected submeter(): void {
    if (!this.podeSalvar()) return;
    const raw = this.form.getRawValue();

    // Turma regular: modalidade contínua e dias derivados das alocações.
    const grade = this.ehRegular() ? this.gradeHoraria() : [];
    const diasSemana = this.ehRegular()
      ? [...new Set(grade.map((g) => g.diaSemana))].sort((a, b) => a - b)
      : [...this.selecionados()].sort();
    const tipoModalidade: TipoModalidade = this.ehRegular()
      ? 'GRADE_FIXA'
      : raw.tipoModalidade;

    this.save.emit({
      nome: raw.nome,
      tipoModalidade,
      dataInicio: raw.dataInicio,
      diasSemana,
      cor: this.cor(),
      pontuacaoAtiva: this.podeGamif() && raw.pontuacaoAtiva,
      nomePontuacao: raw.nomePontuacao.trim() || 'XP',
      rankingAtivo: this.podeGamif() && raw.rankingAtivo,
      rotuloAdicionar: raw.rotuloAdicionar.trim() || 'Adicionar',
      rotuloRemover: raw.rotuloRemover.trim() || 'Remover',
      nivelPrata: Number(raw.nivelPrata) || NIVEIS_DEFAULT.prata,
      nivelOuro: Number(raw.nivelOuro) || NIVEIS_DEFAULT.ouro,
      nivelDiamante: Number(raw.nivelDiamante) || NIVEIS_DEFAULT.diamante,
      nivelPlatina: Number(raw.nivelPlatina) || NIVEIS_DEFAULT.platina,
      ...(raw.disciplina ? { disciplina: raw.disciplina } : {}),
      ...(this.ehRegular()
        ? {
            ensinoRegular: true,
            instituicaoId: raw.instituicaoId,
            nivelEnsino: raw.nivelEnsino as NivelEnsino,
            anoSerie: raw.anoSerie,
            gradeHoraria: grade,
          }
        : { ensinoRegular: false }),
      ...(!this.ehRegular() && raw.horaInicio ? { horaInicio: raw.horaInicio } : {}),
      ...(!this.ehRegular() && raw.horaFim ? { horaFim: raw.horaFim } : {}),
      ...(tipoModalidade === 'MODULO_FECHADO'
        ? { totalAulas: Number(raw.totalAulas) }
        : {}),
    });
  }
}
