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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InstituicaoApiService } from '../../core/instituicao-api.service';
import {
  CriarInstituicaoPayload,
  GradeSlot,
  Instituicao,
} from '../../core/models';
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
  imports: [ReactiveFormsModule, Modal],
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
    inicioIntervalo: ['09:30'],
    duracaoIntervalo: [20],
  });

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
      this.form.reset(
        inst
          ? {
              nome: inst.nome,
              inicioPrimeiroPeriodo: inst.inicioPrimeiroPeriodo,
              fimUltimoPeriodo: inst.fimUltimoPeriodo,
              duracaoAula: inst.duracaoAula,
              inicioIntervalo: inst.inicioIntervalo ?? '',
              duracaoIntervalo: inst.duracaoIntervalo ?? 0,
            }
          : {
              nome: '',
              inicioPrimeiroPeriodo: '07:00',
              fimUltimoPeriodo: '12:00',
              duracaoAula: 50,
              inicioIntervalo: '09:30',
              duracaoIntervalo: 20,
            },
      );
    });
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
  if (
    !/^\d{2}:\d{2}$/.test(p.inicioPrimeiroPeriodo || '') ||
    !/^\d{2}:\d{2}$/.test(p.fimUltimoPeriodo || '')
  ) {
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
    if (
      intInicio !== null &&
      !intInserido &&
      cursor >= intInicio &&
      cursor + intDur <= fim
    ) {
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
