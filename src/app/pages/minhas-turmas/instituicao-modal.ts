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
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { InstituicaoApiService } from '../../core/instituicao-api.service';
import {
  CriarInstituicaoPayload,
  GradeSlot,
  Instituicao,
  IntervaloGrade,
} from '../../core/models';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';

/**
 * Modal reutilizável de criar/editar instituição, com prévia ao vivo da grade
 * (mesmo algoritmo do backend). Self-contained: faz a chamada à API e emite a
 * instituição salva. Usado na tela Minhas Turmas.
 */
@Component({
  selector: 'app-instituicao-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, Icon],
  template: `
    <app-modal
      [open]="open()"
      [title]="instituicao() ? 'Editar instituição' : 'Nova instituição'"
      (close)="fechar.emit()"
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

        <div class="campo">
          <span>Intervalos / recreios</span>
          <div class="intervalos" formArrayName="intervalos">
            @for (iv of intervalos.controls; track $index; let i = $index) {
              <div class="intervalo" [formGroupName]="i">
                <input class="tichr-input" type="time" formControlName="inicio" aria-label="Início do intervalo" />
                <input class="tichr-input" type="number" min="1" max="120" formControlName="duracao" aria-label="Duração (min)" />
                <span class="intervalo__un">min</span>
                <button type="button" class="rm" (click)="removerIntervalo(i)" aria-label="Remover intervalo">
                  <app-icon name="x" [size]="16" />
                </button>
              </div>
            }
          </div>
          <button type="button" class="btn-outline add-int" (click)="adicionarIntervalo()">
            <app-icon name="plus" [size]="15" /> Adicionar intervalo
          </button>
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
        <button class="btn-outline" type="button" (click)="fechar.emit()">Cancelar</button>
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
  `,
  styles: `
    .grade { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.5rem; }
    .slot { display: inline-flex; flex-direction: column; padding: 0.35rem 0.55rem; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-alt); min-width: 84px; }
    .slot b { font-size: 0.78rem; }
    .slot i { font-style: normal; font-size: 0.72rem; color: var(--text-muted); }
    .slot--int { background: color-mix(in srgb, var(--warning) 16%, var(--surface)); border-color: color-mix(in srgb, var(--warning) 40%, var(--border)); }
    .form { display: grid; gap: 0.25rem; }
    .campo { display: block; margin-bottom: 0.75rem; flex: 1; }
    .campo > span { display: block; margin-bottom: 0.3rem; font-size: 0.82rem; font-weight: 600; color: var(--text-muted); }
    .linha { display: flex; gap: 0.75rem; }
    .intervalos { display: grid; gap: 0.5rem; margin-bottom: 0.5rem; }
    .intervalo { display: flex; align-items: center; gap: 0.5rem; }
    .intervalo input[type='time'] { flex: 1 1 auto; }
    .intervalo input[type='number'] { width: 5rem; }
    .intervalo__un { font-size: 0.8rem; color: var(--text-muted); }
    .rm { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; flex: 0 0 auto; }
    .rm:hover { color: var(--danger); border-color: var(--danger); }
    .add-int { display: inline-flex; align-items: center; gap: 0.4rem; }
    .preview { margin-top: 0.5rem; padding: 0.75rem; border: 1px dashed var(--border); border-radius: var(--radius); background: var(--surface-alt); }
    .preview__t { font-size: 0.82rem; font-weight: 700; color: var(--text-muted); }
    .hint { margin: 0.4rem 0 0; font-size: 0.82rem; color: var(--text-muted); }
    .erro { color: var(--danger); font-size: 0.85rem; margin: 0.5rem 0 0; }
  `,
})
export class InstituicaoModal {
  private readonly api = inject(InstituicaoApiService);
  private readonly fb = inject(FormBuilder);

  readonly open = input(false);
  readonly instituicao = input<Instituicao | null>(null);
  readonly salvo = output<Instituicao>();
  readonly fechar = output<void>();

  protected readonly salvando = signal(false);
  protected readonly erro = signal('');

  protected readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    inicioPrimeiroPeriodo: ['07:00', Validators.required],
    fimUltimoPeriodo: ['12:00', Validators.required],
    duracaoAula: [50, [Validators.required, Validators.min(5)]],
    intervalos: this.fb.array<
      ReturnType<InstituicaoModal['novoIntervalo']>
    >([]),
  });

  protected get intervalos(): FormArray {
    return this.form.controls.intervalos;
  }

  private novoIntervalo(inicio = '09:30', duracao = 20) {
    return this.fb.nonNullable.group({
      inicio: [inicio, Validators.required],
      duracao: [duracao, [Validators.required, Validators.min(1)]],
    });
  }

  protected adicionarIntervalo(): void {
    this.intervalos.push(this.novoIntervalo());
  }

  protected removerIntervalo(i: number): void {
    this.intervalos.removeAt(i);
  }

  private readonly valores = signal(this.form.getRawValue());
  protected readonly previa = computed<GradeSlot[]>(() =>
    gerarGradePreview(this.valores()),
  );

  constructor() {
    this.form.valueChanges.subscribe(() =>
      this.valores.set(this.form.getRawValue()),
    );
    // Ao abrir, hidrata o form com a instituição em edição (ou os defaults).
    effect(() => {
      if (!this.open()) return;
      this.erro.set('');
      const inst = this.instituicao();
      this.intervalos.clear();
      const lista = inst ? intervalosDaInstituicao(inst) : [{ inicio: '09:30', duracao: 20 }];
      for (const iv of lista) {
        this.intervalos.push(this.novoIntervalo(iv.inicio, iv.duracao));
      }
      this.form.patchValue({
        nome: inst?.nome ?? '',
        inicioPrimeiroPeriodo: inst?.inicioPrimeiroPeriodo ?? '07:00',
        fimUltimoPeriodo: inst?.fimUltimoPeriodo ?? '12:00',
        duracaoAula: inst?.duracaoAula ?? 50,
      });
    });
  }

  private montarPayload(): CriarInstituicaoPayload {
    const v = this.form.getRawValue();
    const intervalos = v.intervalos
      .filter((iv) => !!iv.inicio && Number(iv.duracao) > 0)
      .map((iv) => ({ inicio: iv.inicio, duracao: Number(iv.duracao) }));
    return {
      nome: v.nome.trim(),
      inicioPrimeiroPeriodo: v.inicioPrimeiroPeriodo,
      fimUltimoPeriodo: v.fimUltimoPeriodo,
      duracaoAula: Number(v.duracaoAula),
      intervalos,
    };
  }

  protected salvar(): void {
    if (this.form.invalid) return;
    this.salvando.set(true);
    this.erro.set('');
    const payload = this.montarPayload();
    const alvo = this.instituicao();
    const req = alvo
      ? this.api.atualizarInstituicao(alvo.id, payload)
      : this.api.criarInstituicao(payload);
    req.subscribe({
      next: (inst) => {
        this.salvando.set(false);
        this.salvo.emit(inst);
      },
      error: () => {
        this.salvando.set(false);
        this.erro.set('Não foi possível salvar. Verifique os horários.');
      },
    });
  }
}

// ===== Prévia da grade (espelho puro do InstituicaoEntity.gerarGrade do BE) =====

interface GradeParams {
  inicioPrimeiroPeriodo: string;
  fimUltimoPeriodo: string;
  duracaoAula: number;
  intervalos?: IntervaloGrade[];
}

/** Intervalos de uma instituição, com fallback para o campo legado único. */
export function intervalosDaInstituicao(inst: Instituicao): IntervaloGrade[] {
  if (inst.intervalos?.length) return inst.intervalos;
  if (inst.inicioIntervalo && (inst.duracaoIntervalo ?? 0) > 0) {
    return [{ inicio: inst.inicioIntervalo, duracao: inst.duracaoIntervalo! }];
  }
  return [];
}

function toMin(h: string): number {
  const [a, b] = h.split(':').map(Number);
  return a * 60 + b;
}
function toHora(m: number): string {
  const t = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Gera a grade localmente — mesmo algoritmo do backend (múltiplos intervalos). */
export function gerarGradePreview(p: GradeParams): GradeSlot[] {
  if (
    !/^\d{2}:\d{2}$/.test(p.inicioPrimeiroPeriodo || '') ||
    !/^\d{2}:\d{2}$/.test(p.fimUltimoPeriodo || '')
  ) {
    return [];
  }
  const inicio = toMin(p.inicioPrimeiroPeriodo);
  const fim = toMin(p.fimUltimoPeriodo);
  const dur = Number(p.duracaoAula);
  const intervalos = (p.intervalos ?? [])
    .filter((iv) => /^\d{2}:\d{2}$/.test(iv.inicio || '') && Number(iv.duracao) > 0)
    .map((iv) => ({ inicio: toMin(iv.inicio), duracao: Number(iv.duracao) }))
    .sort((a, b) => a.inicio - b.inicio);

  const slots: GradeSlot[] = [];
  if (!dur || dur <= 0 || fim <= inicio) return slots;

  let cursor = inicio;
  let periodo = 1;
  let idx = 0;
  while (slots.length < 40) {
    const prox = intervalos[idx];
    if (prox && cursor >= prox.inicio && cursor + prox.duracao <= fim) {
      slots.push({ ordem: slots.length, tipo: 'INTERVALO', rotulo: 'Intervalo', horaInicio: toHora(cursor), horaFim: toHora(cursor + prox.duracao) });
      cursor += prox.duracao;
      idx++;
      continue;
    }
    if (cursor + dur > fim) break;
    slots.push({ ordem: slots.length, tipo: 'AULA', periodo, rotulo: `${periodo}º Horário`, horaInicio: toHora(cursor), horaFim: toHora(cursor + dur) });
    cursor += dur;
    periodo++;
  }
  return slots;
}
