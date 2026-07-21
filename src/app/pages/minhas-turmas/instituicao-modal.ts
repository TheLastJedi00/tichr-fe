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
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { InstituicaoApiService } from '../../core/instituicao-api.service';
import {
  CriarInstituicaoPayload,
  GradeSlot,
  Instituicao,
  IntervaloGrade,
  TipoTurno,
  TurnoInstituicao,
} from '../../core/models';
import { DEFAULTS_TURNO, rotuloTurno, TURNOS } from '../../core/turno.util';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';

/**
 * Modal reutilizável de criar/editar instituição. A escola tem **turnos**
 * (matutino/vespertino/noturno): marque os que existem e, para cada um,
 * configure horários e recreios — a **prévia da grade daquele turno** é
 * recalculada ao vivo (mesmo algoritmo do backend).
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

        <span class="secao">Turnos</span>
        <div formArrayName="turnos">
          @for (g of turnos.controls; track $index; let i = $index) {
            <fieldset class="turno" [class.turno--on]="g.value.ativo" [formGroupName]="i">
              <label class="turno__head">
                <input type="checkbox" formControlName="ativo" />
                <strong>{{ rotulo(g.value.tipo) }}</strong>
              </label>

              @if (g.value.ativo) {
                <div class="linha">
                  <label class="campo">
                    <span>Início</span>
                    <input class="tichr-input" type="time" formControlName="inicioPrimeiroPeriodo" />
                  </label>
                  <label class="campo">
                    <span>Fim</span>
                    <input class="tichr-input" type="time" formControlName="fimUltimoPeriodo" />
                  </label>
                  <label class="campo campo--dur">
                    <span>Aula (min)</span>
                    <input class="tichr-input" type="number" min="5" max="240" formControlName="duracaoAula" />
                  </label>
                </div>

                <div class="intervalos" formArrayName="intervalos">
                  <span class="mini">Recreios</span>
                  @for (iv of intervalosDe(i).controls; track $index; let k = $index) {
                    <div class="intervalo" [formGroupName]="k">
                      <input class="tichr-input" type="time" formControlName="inicio" aria-label="Início do recreio" />
                      <input class="tichr-input" type="number" min="1" max="120" formControlName="duracao" aria-label="Duração (min)" />
                      <span class="intervalo__un">min</span>
                      <button type="button" class="rm" (click)="removerIntervalo(i, k)" aria-label="Remover recreio">
                        <app-icon name="x" [size]="15" />
                      </button>
                    </div>
                  }
                  <button type="button" class="btn-outline add-int" (click)="adicionarIntervalo(i)">
                    <app-icon name="plus" [size]="14" /> Recreio
                  </button>
                </div>

                <div class="preview">
                  <span class="preview__t">Grade do {{ rotulo(g.value.tipo) }}</span>
                  @if (previa(i).length) {
                    <div class="grade">
                      @for (s of previa(i); track s.ordem) {
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
              }
            </fieldset>
          }
        </div>

        @if (erro()) { <p class="erro">{{ erro() }}</p> }
      </form>
      <div modal-actions>
        <button class="btn-outline" type="button" (click)="fechar.emit()">Cancelar</button>
        <button
          class="btn-primary"
          type="button"
          [disabled]="!podeSalvar() || salvando()"
          (click)="salvar()"
        >
          {{ salvando() ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .form { display: grid; gap: 0.4rem; }
    .campo { display: block; margin-bottom: 0.5rem; flex: 1; }
    .campo > span { display: block; margin-bottom: 0.3rem; font-size: 0.82rem; font-weight: 600; color: var(--text-muted); }
    .campo--dur { flex: 0 0 5.5rem; }
    .secao { font-size: 0.82rem; font-weight: 700; color: var(--text-muted); margin-top: 0.3rem; }
    .linha { display: flex; gap: 0.6rem; }
    .turno { border: 1px solid var(--border); border-radius: var(--radius); padding: 0.6rem 0.75rem; margin: 0 0 0.6rem; }
    .turno--on { border-color: color-mix(in srgb, var(--primary) 45%, var(--border)); }
    .turno__head { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; cursor: pointer; }
    .turno__head input { width: 18px; height: 18px; }
    .intervalos { display: grid; gap: 0.4rem; margin: 0.4rem 0; }
    .mini { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); }
    .intervalo { display: flex; align-items: center; gap: 0.5rem; }
    .intervalo input[type='time'] { flex: 1 1 auto; }
    .intervalo input[type='number'] { width: 4.5rem; }
    .intervalo__un { font-size: 0.8rem; color: var(--text-muted); }
    .rm { display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; flex: 0 0 auto; }
    .rm:hover { color: var(--danger); border-color: var(--danger); }
    .add-int { width: fit-content; display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; padding: 0.35rem 0.7rem; }
    .preview { margin-top: 0.3rem; padding: 0.6rem; border: 1px dashed var(--border); border-radius: var(--radius); background: var(--surface-alt); }
    .preview__t { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); }
    .grade { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.4rem; }
    .slot { display: inline-flex; flex-direction: column; padding: 0.3rem 0.5rem; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); min-width: 78px; }
    .slot b { font-size: 0.75rem; }
    .slot i { font-style: normal; font-size: 0.7rem; color: var(--text-muted); }
    .slot--int { background: color-mix(in srgb, var(--warning) 16%, var(--surface)); border-color: color-mix(in srgb, var(--warning) 40%, var(--border)); }
    .hint { margin: 0.3rem 0 0; font-size: 0.8rem; color: var(--text-muted); }
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
  protected readonly rotulo = rotuloTurno;

  protected readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    turnos: this.fb.array(TURNOS.map((t) => this.novoTurno(t.value, t.value === 'MATUTINO'))),
  });

  private novoTurno(tipo: TipoTurno, ativo: boolean) {
    const d = DEFAULTS_TURNO[tipo];
    return this.fb.nonNullable.group({
      tipo: [tipo],
      ativo: [ativo],
      inicioPrimeiroPeriodo: [d.inicio],
      fimUltimoPeriodo: [d.fim],
      duracaoAula: [50],
      intervalos: this.fb.array<
        FormGroup<{ inicio: FormControl<string>; duracao: FormControl<number> }>
      >([]),
    });
  }

  protected get turnos(): FormArray {
    return this.form.controls.turnos;
  }
  protected intervalosDe(i: number): FormArray {
    return this.turnos.at(i).get('intervalos') as FormArray;
  }
  protected adicionarIntervalo(i: number): void {
    this.intervalosDe(i).push(this.novoIntervalo());
  }
  protected removerIntervalo(i: number, k: number): void {
    this.intervalosDe(i).removeAt(k);
  }
  private novoIntervalo(inicio = '09:30', duracao = 20) {
    return this.fb.nonNullable.group({
      inicio: [inicio, Validators.required],
      duracao: [duracao, [Validators.required, Validators.min(1)]],
    });
  }

  private readonly valores = signal(this.form.getRawValue());
  /** Prévia da grade do turno i (recalcula ao vivo). */
  protected previa(i: number): GradeSlot[] {
    const t = this.valores().turnos[i];
    if (!t?.ativo) return [];
    return gerarGradePreview({
      inicioPrimeiroPeriodo: t.inicioPrimeiroPeriodo,
      fimUltimoPeriodo: t.fimUltimoPeriodo,
      duracaoAula: t.duracaoAula,
      intervalos: t.intervalos,
    });
  }

  protected podeSalvar(): boolean {
    if (!this.form.controls.nome.valid) return false;
    return this.valores().turnos.some((t) => t.ativo);
  }

  constructor() {
    this.form.valueChanges.subscribe(() =>
      this.valores.set(this.form.getRawValue()),
    );
    effect(() => {
      if (!this.open()) return;
      this.erro.set('');
      const inst = this.instituicao();
      const porTipo = new Map<TipoTurno, TurnoInstituicao>(
        turnosDeInstituicao(inst).map((t) => [t.tipo, t]),
      );
      this.form.controls.nome.setValue(inst?.nome ?? '');
      TURNOS.forEach((meta, i) => {
        const g = this.turnos.at(i);
        const t = porTipo.get(meta.value);
        const d = DEFAULTS_TURNO[meta.value];
        g.patchValue({
          tipo: meta.value,
          ativo: !!t,
          inicioPrimeiroPeriodo: t?.inicioPrimeiroPeriodo ?? d.inicio,
          fimUltimoPeriodo: t?.fimUltimoPeriodo ?? d.fim,
          duracaoAula: t?.duracaoAula ?? 50,
        });
        const arr = this.intervalosDe(i);
        arr.clear();
        for (const iv of t?.intervalos ?? []) {
          arr.push(this.novoIntervalo(iv.inicio, iv.duracao));
        }
      });
    });
  }

  private montarPayload(): CriarInstituicaoPayload {
    const v = this.form.getRawValue();
    const turnos: TurnoInstituicao[] = v.turnos
      .filter((t) => t.ativo)
      .map((t) => ({
        tipo: t.tipo,
        inicioPrimeiroPeriodo: t.inicioPrimeiroPeriodo,
        fimUltimoPeriodo: t.fimUltimoPeriodo,
        duracaoAula: Number(t.duracaoAula),
        intervalos: t.intervalos
          .filter((iv) => !!iv.inicio && Number(iv.duracao) > 0)
          .map((iv) => ({ inicio: iv.inicio, duracao: Number(iv.duracao) })),
      }));
    return { nome: v.nome.trim(), turnos };
  }

  protected salvar(): void {
    if (!this.podeSalvar()) return;
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

// ===== Helpers =====

/** Turnos de uma instituição, com fallback (turno único legado → MATUTINO). */
function turnosDeInstituicao(inst?: Instituicao | null): TurnoInstituicao[] {
  if (!inst) return [];
  if (inst.turnos?.length) return inst.turnos;
  if (inst.inicioPrimeiroPeriodo && inst.fimUltimoPeriodo && inst.duracaoAula) {
    const legado =
      inst.intervalos?.length
        ? inst.intervalos
        : inst.inicioIntervalo && (inst.duracaoIntervalo ?? 0) > 0
          ? [{ inicio: inst.inicioIntervalo, duracao: inst.duracaoIntervalo! }]
          : [];
    return [
      {
        tipo: 'MATUTINO',
        inicioPrimeiroPeriodo: inst.inicioPrimeiroPeriodo,
        fimUltimoPeriodo: inst.fimUltimoPeriodo,
        duracaoAula: inst.duracaoAula,
        intervalos: legado,
      },
    ];
  }
  return [];
}

// ===== Prévia da grade (espelho puro do gerarSlots do BE) =====

interface GradeParams {
  inicioPrimeiroPeriodo: string;
  fimUltimoPeriodo: string;
  duracaoAula: number;
  intervalos?: IntervaloGrade[];
}

function toMin(h: string): number {
  const [a, b] = h.split(':').map(Number);
  return a * 60 + b;
}
function toHora(m: number): string {
  const t = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Gera a grade de um turno localmente — mesmo algoritmo do backend. */
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