import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InstituicaoApiService } from '../../core/instituicao-api.service';
import {
  CriarInstituicaoPayload,
  GradeSlot,
  Instituicao,
} from '../../core/models';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { Skeleton } from '../../ui/skeleton/skeleton';

/**
 * Gestão de instituições (escolas do ensino regular). Lista as escolas do
 * professor e permite criar/editar em modal, com **prévia ao vivo da grade**
 * horária calculada a partir dos parâmetros informados.
 */
@Component({
  selector: 'app-instituicoes-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Card, Icon, Modal, Skeleton],
  template: `
    <a class="voltar" routerLink="/configuracoes">‹ Configurações</a>
    <div class="cab">
      <h1 class="title">Instituições</h1>
      <button class="btn-primary" type="button" (click)="abrirCriar()">
        <app-icon name="plus" [size]="18" /> Nova
      </button>
    </div>
    <p class="sub">
      Escolas do ensino regular. Defina os horários e o Tichr monta a grade
      (1º Horário, Intervalo, …) automaticamente.
    </p>

    @if (carregando()) {
      <div class="sk">
        <app-skeleton height="88px" />
        <app-skeleton height="88px" />
      </div>
    } @else if (!instituicoes().length) {
      <app-card>
        <div class="vazio">
          <app-icon name="building" [size]="40" />
          <p>Nenhuma instituição cadastrada ainda.</p>
          <button class="btn-primary" type="button" (click)="abrirCriar()">
            Cadastrar escola
          </button>
        </div>
      </app-card>
    } @else {
      <div class="lista">
        @for (inst of instituicoes(); track inst.id) {
          <app-card>
            <div class="item">
              <div class="item__cab">
                <span class="item__ic"><app-icon name="building" [size]="22" /></span>
                <div class="item__txt">
                  <strong>{{ inst.nome }}</strong>
                  <small>
                    {{ inst.inicioPrimeiroPeriodo }}–{{ inst.fimUltimoPeriodo }} ·
                    aulas de {{ inst.duracaoAula }}min
                    @if (inst.inicioIntervalo) {
                      · intervalo {{ inst.inicioIntervalo }} ({{ inst.duracaoIntervalo }}min)
                    }
                  </small>
                </div>
              </div>
              <div class="item__acoes">
                <button class="btn-outline sm" type="button" (click)="abrirEditar(inst)">
                  Editar
                </button>
                <button class="btn-ghost sm" type="button" (click)="confirmarRemover(inst)">
                  <app-icon name="x" [size]="16" />
                </button>
              </div>
            </div>
            <div class="grade">
              @for (s of inst.grade; track s.ordem) {
                <span class="slot" [class.slot--int]="s.tipo === 'INTERVALO'">
                  <b>{{ s.rotulo }}</b>
                  <i>{{ s.horaInicio }}–{{ s.horaFim }}</i>
                </span>
              }
            </div>
          </app-card>
        }
      </div>
    }

    <!-- Criar/editar -->
    <app-modal
      [open]="modalAberto()"
      [title]="editando() ? 'Editar instituição' : 'Nova instituição'"
      (close)="fechar()"
    >
      <form [formGroup]="form" class="form">
        <label class="campo">
          <span>Nome da escola</span>
          <input class="tichr-input" formControlName="nome" placeholder="Ex: Escola Municipal João Silva" />
        </label>
        <div class="linha">
          <label class="campo">
            <span>Início do 1º período</span>
            <input class="tichr-input" type="time" formControlName="inicioPrimeiroPeriodo" />
          </label>
          <label class="campo">
            <span>Fim do último período</span>
            <input class="tichr-input" type="time" formControlName="fimUltimoPeriodo" />
          </label>
        </div>
        <label class="campo">
          <span>Duração de cada aula (min)</span>
          <input class="tichr-input" type="number" min="5" max="240" formControlName="duracaoAula" />
        </label>
        <div class="linha">
          <label class="campo">
            <span>Início do intervalo</span>
            <input class="tichr-input" type="time" formControlName="inicioIntervalo" />
          </label>
          <label class="campo">
            <span>Duração do intervalo (min)</span>
            <input class="tichr-input" type="number" min="0" max="120" formControlName="duracaoIntervalo" />
          </label>
        </div>

        <div class="preview">
          <span class="preview__t">Prévia da grade</span>
          @if (previa().length) {
            <div class="grade">
              @for (s of previa(); track s.ordem) {
                <span class="slot" [class.slot--int]="s.tipo === 'INTERVALO'">
                  <b>{{ s.rotulo }}</b>
                  <i>{{ s.horaInicio }}–{{ s.horaFim }}</i>
                </span>
              }
            </div>
          } @else {
            <p class="hint">Preencha os horários para ver a grade.</p>
          }
        </div>

        @if (erro()) { <p class="erro">{{ erro() }}</p> }
      </form>
      <div modal-actions>
        <button class="btn-outline" type="button" (click)="fechar()">Cancelar</button>
        <button
          class="btn-primary"
          type="button"
          [disabled]="form.invalid || salvando()"
          (click)="salvar()"
        >
          {{ salvando() ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </app-modal>

    <!-- Remover -->
    <app-modal [open]="removendo() !== null" title="Remover instituição" (close)="removendo.set(null)">
      <p>
        Remover <strong>{{ removendo()?.nome }}</strong>? As turmas continuam
        existindo, mas deixam de ficar vinculadas a esta escola.
      </p>
      <div modal-actions>
        <button class="btn-outline" type="button" (click)="removendo.set(null)">Cancelar</button>
        <button class="btn-danger" type="button" (click)="remover()">Remover</button>
      </div>
    </app-modal>
  `,
  styles: `
    .voltar { display: inline-block; margin-bottom: 0.75rem; color: var(--text-muted); text-decoration: none; font-weight: 600; }
    .cab { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .title { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .sub { margin: 0.35rem 0 1.25rem; color: var(--text-muted); font-size: 0.9rem; }
    .sk { display: grid; gap: 0.75rem; }
    .lista { display: grid; gap: 0.75rem; }
    .vazio { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 1.5rem 0; color: var(--text-muted); text-align: center; }
    .item { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .item__cab { display: flex; gap: 0.75rem; align-items: center; }
    .item__ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); flex: 0 0 auto; }
    .item__txt { display: flex; flex-direction: column; gap: 0.1rem; }
    .item__txt small { color: var(--text-muted); font-size: 0.8rem; }
    .item__acoes { display: flex; gap: 0.4rem; align-items: center; }
    .btn-ghost { background: transparent; border: 1px solid transparent; color: var(--text-muted); border-radius: var(--radius); cursor: pointer; display: inline-flex; align-items: center; }
    .btn-ghost:hover { color: var(--danger); border-color: var(--border); }
    .btn-danger { background: var(--danger); color: #fff; border: none; border-radius: var(--radius); padding: 0.55rem 1rem; font-weight: 600; cursor: pointer; }
    .sm { padding: 0.4rem 0.7rem; font-size: 0.85rem; }
    .grade { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.9rem; }
    .slot { display: inline-flex; flex-direction: column; padding: 0.35rem 0.55rem; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-alt); min-width: 84px; }
    .slot b { font-size: 0.78rem; }
    .slot i { font-style: normal; font-size: 0.72rem; color: var(--text-muted); }
    .slot--int { background: color-mix(in srgb, var(--warning) 16%, var(--surface)); border-color: color-mix(in srgb, var(--warning) 40%, var(--border)); }
    .form { display: grid; gap: 0.25rem; }
    .campo { display: block; margin-bottom: 0.75rem; flex: 1; }
    .campo > span { display: block; margin-bottom: 0.3rem; font-size: 0.82rem; font-weight: 600; color: var(--text-muted); }
    .linha { display: flex; gap: 0.75rem; }
    .preview { margin-top: 0.5rem; padding: 0.75rem; border: 1px dashed var(--border); border-radius: var(--radius); background: var(--surface-alt); }
    .preview__t { font-size: 0.82rem; font-weight: 700; color: var(--text-muted); }
    .hint { margin: 0.4rem 0 0; font-size: 0.82rem; color: var(--text-muted); }
    .erro { color: var(--danger); font-size: 0.85rem; margin: 0.5rem 0 0; }
  `,
})
export class InstituicoesPage {
  private readonly api = inject(InstituicaoApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly instituicoes = signal<Instituicao[]>([]);
  protected readonly carregando = signal(true);
  protected readonly modalAberto = signal(false);
  protected readonly editando = signal<Instituicao | null>(null);
  protected readonly removendo = signal<Instituicao | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erro = signal('');

  protected readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    inicioPrimeiroPeriodo: ['07:00', Validators.required],
    fimUltimoPeriodo: ['12:00', Validators.required],
    duracaoAula: [50, [Validators.required, Validators.min(5)]],
    inicioIntervalo: ['09:30'],
    duracaoIntervalo: [20],
  });

  /** Espelha o algoritmo do backend p/ a prévia ao vivo (sem ida ao servidor). */
  private readonly valores = signal(this.form.getRawValue());
  protected readonly previa = computed<GradeSlot[]>(() =>
    gerarGradePreview(this.valores()),
  );

  constructor() {
    this.form.valueChanges.subscribe(() =>
      this.valores.set(this.form.getRawValue()),
    );
    this.carregar();
  }

  private carregar(): void {
    this.carregando.set(true);
    this.api.getInstituicoes().subscribe({
      next: (l) => {
        this.instituicoes.set(l);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  protected abrirCriar(): void {
    this.editando.set(null);
    this.erro.set('');
    this.form.reset({
      nome: '',
      inicioPrimeiroPeriodo: '07:00',
      fimUltimoPeriodo: '12:00',
      duracaoAula: 50,
      inicioIntervalo: '09:30',
      duracaoIntervalo: 20,
    });
    this.modalAberto.set(true);
  }

  protected abrirEditar(inst: Instituicao): void {
    this.editando.set(inst);
    this.erro.set('');
    this.form.reset({
      nome: inst.nome,
      inicioPrimeiroPeriodo: inst.inicioPrimeiroPeriodo,
      fimUltimoPeriodo: inst.fimUltimoPeriodo,
      duracaoAula: inst.duracaoAula,
      inicioIntervalo: inst.inicioIntervalo ?? '',
      duracaoIntervalo: inst.duracaoIntervalo ?? 0,
    });
    this.modalAberto.set(true);
  }

  protected fechar(): void {
    this.modalAberto.set(false);
  }

  private montarPayload(): CriarInstituicaoPayload {
    const v = this.form.getRawValue();
    const temIntervalo = !!v.inicioIntervalo && Number(v.duracaoIntervalo) > 0;
    return {
      nome: v.nome.trim(),
      inicioPrimeiroPeriodo: v.inicioPrimeiroPeriodo,
      fimUltimoPeriodo: v.fimUltimoPeriodo,
      duracaoAula: Number(v.duracaoAula),
      ...(temIntervalo
        ? {
            inicioIntervalo: v.inicioIntervalo,
            duracaoIntervalo: Number(v.duracaoIntervalo),
          }
        : {}),
    };
  }

  protected salvar(): void {
    if (this.form.invalid) return;
    this.salvando.set(true);
    this.erro.set('');
    const payload = this.montarPayload();
    const alvo = this.editando();
    const req = alvo
      ? this.api.atualizarInstituicao(alvo.id, payload)
      : this.api.criarInstituicao(payload);
    req.subscribe({
      next: () => {
        this.salvando.set(false);
        this.modalAberto.set(false);
        this.carregar();
      },
      error: () => {
        this.salvando.set(false);
        this.erro.set('Não foi possível salvar. Verifique os horários.');
      },
    });
  }

  protected confirmarRemover(inst: Instituicao): void {
    this.removendo.set(inst);
  }

  protected remover(): void {
    const alvo = this.removendo();
    if (!alvo) return;
    this.api.removerInstituicao(alvo.id).subscribe({
      next: () => {
        this.removendo.set(null);
        this.carregar();
      },
      error: () => this.removendo.set(null),
    });
  }
}

// ===== Prévia da grade (espelho puro do InstituicaoEntity.gerarGrade do BE) =====

interface GradeParams {
  inicioPrimeiroPeriodo: string;
  fimUltimoPeriodo: string;
  duracaoAula: number;
  inicioIntervalo?: string;
  duracaoIntervalo?: number;
}

function toMin(h: string): number {
  const [a, b] = h.split(':').map(Number);
  return a * 60 + b;
}
function toHora(m: number): string {
  const t = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Gera a grade localmente — mesmo algoritmo do backend (fronteira do intervalo). */
export function gerarGradePreview(p: GradeParams): GradeSlot[] {
  if (!/^\d{2}:\d{2}$/.test(p.inicioPrimeiroPeriodo || '') ||
      !/^\d{2}:\d{2}$/.test(p.fimUltimoPeriodo || '')) {
    return [];
  }
  const inicio = toMin(p.inicioPrimeiroPeriodo);
  const fim = toMin(p.fimUltimoPeriodo);
  const dur = Number(p.duracaoAula);
  const temInt = !!p.inicioIntervalo && Number(p.duracaoIntervalo) > 0;
  const intInicio = temInt ? toMin(p.inicioIntervalo!) : null;
  const intDur = Number(p.duracaoIntervalo) || 0;

  const slots: GradeSlot[] = [];
  if (!dur || dur <= 0 || fim <= inicio) return slots;

  let cursor = inicio;
  let periodo = 1;
  let intInserido = false;
  while (slots.length < 40) {
    if (intInicio !== null && !intInserido && cursor >= intInicio && cursor + intDur <= fim) {
      slots.push({ ordem: slots.length, tipo: 'INTERVALO', rotulo: 'Intervalo', horaInicio: toHora(cursor), horaFim: toHora(cursor + intDur) });
      cursor += intDur;
      intInserido = true;
      continue;
    }
    if (cursor + dur > fim) break;
    slots.push({ ordem: slots.length, tipo: 'AULA', periodo, rotulo: `${periodo}º Horário`, horaInicio: toHora(cursor), horaFim: toHora(cursor + dur) });
    cursor += dur;
    periodo++;
  }
  return slots;
}
