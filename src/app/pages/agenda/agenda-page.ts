import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { formatarData } from '../../core/date-format';
import { hojeISO } from '../../core/greeting';
import { Sessao, Turma } from '../../core/models';
import { TurmaApiService } from '../../core/turma-api.service';
import { Modal } from '../../ui/modal/modal';
import { Skeleton } from '../../ui/skeleton/skeleton';

type Modo = 'calendario' | 'detalhado';

interface DiaCal {
  iso: string;
  dia: number;
  sessoes: Sessao[];
  hoje: boolean;
}
interface AulaDet {
  sessao: Sessao;
  turma?: Turma;
}
interface Turno {
  nome: string;
  aulas: AulaDet[];
}
interface DiaDet {
  iso: string;
  label: string;
  turnos: Turno[];
}

const CABECALHOS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MODO_KEY = 'tichr-agenda-modo';

function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function toISO(dt: Date): string {
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}
function addDays(iso: string, n: number): string {
  const dt = parse(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return toISO(dt);
}
/** Domingo da semana da data. */
function domingo(iso: string): string {
  return addDays(iso, -parse(iso).getUTCDay());
}

/**
 * AgendaPage (smart): duas visões — Calendário (grade de 5 semanas) e Detalhado
 * (próximos 15 dias por turnos). A escolha é memorizada no localStorage.
 */
@Component({
  selector: 'app-agenda-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton, Modal],
  template: `
    <header class="head">
      <h1 class="title">Minha Agenda</h1>
      <div class="toggle" role="tablist">
        <button
          class="toggle__btn"
          [class.is-on]="modo() === 'calendario'"
          type="button"
          (click)="setModo('calendario')"
        >
          Calendário
        </button>
        <button
          class="toggle__btn"
          [class.is-on]="modo() === 'detalhado'"
          type="button"
          (click)="setModo('detalhado')"
        >
          Detalhado
        </button>
      </div>
    </header>

    @if (loading()) {
      <div class="grid-wrap">
        <div class="grid cabecalho">
          @for (c of cabecalhos; track $index) {
            <div class="col-head">{{ c }}</div>
          }
        </div>
        @for (i of [1, 2, 3, 4, 5]; track i) {
          <div class="grid">
            @for (j of [0, 1, 2, 3, 4, 5, 6]; track j) {
              <div class="sk-cell"><app-skeleton height="68px" radius="8px" /></div>
            }
          </div>
        }
      </div>
    } @else if (modo() === 'calendario') {
      <div class="grid-wrap">
        <div class="grid cabecalho">
          @for (c of cabecalhos; track $index) {
            <div class="col-head">{{ c }}</div>
          }
        </div>
        @for (semana of semanas(); track semana[0].iso) {
          <div class="grid">
            @for (dia of semana; track dia.iso) {
              <div
                class="cell"
                [class.tem-aula]="dia.sessoes.length"
                [class.hoje]="dia.hoje"
                [class.clicavel]="dia.sessoes.length"
                (click)="dia.sessoes.length && diaSelecionado.set(dia)"
              >
                <span class="cell__dia">{{ dia.dia }}</span>
                @for (s of dia.sessoes; track s.id) {
                  <span
                    class="badge"
                    [class.badge--cancelada]="s.status === 'CANCELADA'"
                    [style.background]="s.status === 'CANCELADA' ? null : corDaTurma(s.turmaId)"
                    [style.border-color]="s.status === 'CANCELADA' ? null : corDaTurma(s.turmaId)"
                  >Aula {{ s.numero }}</span>
                }
              </div>
            }
          </div>
        }
      </div>
    } @else {
      @if (dias().length === 0) {
        <p class="muted">Nenhuma aula nos próximos 15 dias.</p>
      } @else {
        <div class="dias">
          @for (dia of dias(); track dia.iso) {
            <article class="cartao">
              <header class="cartao__head">{{ dia.label }}</header>
              @for (turno of dia.turnos; track turno.nome) {
                <div class="turno">
                  <span class="turno__nome">{{ turno.nome }}</span>
                  @for (a of turno.aulas; track a.sessao.id) {
                    <div class="det" [class.det--cancelada]="a.sessao.status === 'CANCELADA'">
                      <span class="dot" [style.background]="corDaTurma(a.sessao.turmaId)"></span>
                      <div class="det__txt">
                        <strong>{{ a.turma?.nome ?? 'Turma' }}</strong>
                        <span class="det__meta">
                          @if (a.turma?.disciplina) { {{ a.turma?.disciplina }} · }
                          @if (a.turma?.horaInicio) { {{ a.turma?.horaInicio }}–{{ a.turma?.horaFim }} }
                          @else { Aula {{ a.sessao.numero }} }
                        </span>
                      </div>
                    </div>
                  }
                </div>
              }
            </article>
          }
        </div>
      }
    }

    <app-modal
      [open]="!!diaSelecionado()"
      [title]="diaSelecionado() ? formatarData(diaSelecionado()!.iso) : ''"
      (close)="diaSelecionado.set(null)"
    >
      @if (diaSelecionado(); as dia) {
        <ul class="detalhes">
          @for (s of dia.sessoes; track s.id) {
            <li class="detli">
              <div class="det__turma">
                <span class="dot" [style.background]="corDaTurma(s.turmaId)"></span>
                <strong>{{ turmaDe(s.turmaId)?.nome ?? 'Turma' }}</strong>
              </div>
              <div class="det__meta">
                <span>Aula {{ s.numero }}</span>
                <span class="badge-status" [class]="'st--' + s.status.toLowerCase()">{{ s.status }}</span>
                @if (turmaDe(s.turmaId)?.disciplina) {
                  <span>{{ turmaDe(s.turmaId)?.disciplina }}</span>
                }
                @if (turmaDe(s.turmaId)?.horaInicio && turmaDe(s.turmaId)?.horaFim) {
                  <span>{{ turmaDe(s.turmaId)?.horaInicio }}–{{ turmaDe(s.turmaId)?.horaFim }}</span>
                }
              </div>
            </li>
          }
        </ul>
      }
      <button modal-actions class="btn-primary" type="button" (click)="diaSelecionado.set(null)">Fechar</button>
    </app-modal>
  `,
  styles: `
    .head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .title { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .toggle { display: inline-flex; gap: 0.25rem; padding: 0.2rem; border-radius: 999px; background: var(--surface-alt); }
    .toggle__btn { font: inherit; font-size: 0.85rem; font-weight: 600; padding: 0.35rem 0.8rem; border: none; border-radius: 999px; background: none; color: var(--text-muted); cursor: pointer; }
    .toggle__btn.is-on { background: var(--surface); color: var(--primary); }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .sk-cell { min-height: 68px; }
    .muted { color: var(--text-muted); }
    .grid-wrap { overflow-x: auto; }
    .grid { display: grid; grid-template-columns: repeat(7, minmax(44px, 1fr)); gap: 4px; }
    .grid + .grid { margin-top: 4px; }
    .col-head { text-align: center; font-weight: 700; color: var(--text-muted); padding: 0.375rem 0; }
    .cell { min-height: 68px; padding: 0.375rem; background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius); }
    .cell.tem-aula { background: var(--surface); border-color: var(--primary); }
    .cell.hoje { outline: 2px solid var(--primary); outline-offset: -1px; }
    .cell__dia { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .cell.hoje .cell__dia { color: var(--primary); }
    .badge { display: block; margin-top: 0.25rem; padding: 0.1rem 0.3rem; font-size: 0.68rem; font-weight: 700; color: var(--primary-contrast); background: var(--primary); border-radius: 4px; white-space: nowrap; }
    .badge--cancelada { background: var(--danger); text-decoration: line-through; }
    .cell.clicavel { cursor: pointer; }

    /* ===== Modo detalhado ===== */
    .dias { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
    @media (min-width: 720px) { .dias { grid-template-columns: 1fr 1fr; } }
    .cartao { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 0.85rem 1rem; }
    .cartao__head { font-weight: 800; margin-bottom: 0.5rem; }
    .turno { margin-bottom: 0.5rem; }
    .turno:last-child { margin-bottom: 0; }
    .turno__nome { display: block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.3rem; }
    .det { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0; flex-wrap: wrap; }
    .det--cancelada { opacity: 0.55; text-decoration: line-through; }
    .det__txt { display: flex; flex-direction: column; }
    .det__meta { font-size: 0.82rem; color: var(--text-muted); }
    .dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; flex: 0 0 auto; }

    .detalhes { list-style: none; margin: 0; padding: 0; }
    .detli { padding: 0.625rem 0; }
    .detli + .detli { border-top: 1px solid var(--border); }
    .det__turma { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.25rem; }
    .badge-status { font-weight: 700; font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 999px; border: 1px solid var(--border); }
    .st--agendada { color: var(--primary); border-color: var(--primary); }
    .st--cancelada { color: var(--danger); border-color: var(--danger); }
    .st--realizada { color: var(--success); border-color: var(--success); }
  `,
})
export class AgendaPage {
  private readonly api = inject(TurmaApiService);
  protected readonly cabecalhos = CABECALHOS;
  protected readonly formatarData = formatarData;
  protected readonly loading = signal(true);
  protected readonly sessoes = signal<Sessao[]>([]);
  protected readonly diaSelecionado = signal<DiaCal | null>(null);
  private readonly turmasMap = signal<Map<string, Turma>>(new Map());

  protected readonly modo = signal<Modo>(
    (localStorage.getItem(MODO_KEY) as Modo) || 'calendario',
  );

  protected setModo(m: Modo): void {
    this.modo.set(m);
    localStorage.setItem(MODO_KEY, m);
  }

  protected turmaDe(turmaId: string): Turma | undefined {
    return this.turmasMap().get(turmaId);
  }
  protected corDaTurma(turmaId: string): string {
    return this.turmasMap().get(turmaId)?.cor ?? 'var(--primary)';
  }

  /** Calendário: semana atual + 4 seguintes (5 semanas). */
  protected readonly semanas = computed<DiaCal[][]>(() => {
    const hoje = hojeISO(new Date());
    const porData = new Map<string, Sessao[]>();
    for (const s of this.sessoes()) {
      porData.set(s.data, [...(porData.get(s.data) ?? []), s]);
    }
    const semanas: DiaCal[][] = [];
    let cursor = domingo(hoje);
    for (let w = 0; w < 5; w++) {
      const semana: DiaCal[] = [];
      for (let i = 0; i < 7; i++) {
        semana.push({
          iso: cursor,
          dia: parse(cursor).getUTCDate(),
          sessoes: porData.get(cursor) ?? [],
          hoje: cursor === hoje,
        });
        cursor = addDays(cursor, 1);
      }
      semanas.push(semana);
    }
    return semanas;
  });

  /** Detalhado: hoje + 14 dias (com aulas), por turnos. */
  protected readonly dias = computed<DiaDet[]>(() => {
    const hoje = hojeISO(new Date());
    const fim = addDays(hoje, 14);
    const porData = new Map<string, Sessao[]>();
    for (const s of this.sessoes()) {
      if (s.data >= hoje && s.data <= fim) {
        porData.set(s.data, [...(porData.get(s.data) ?? []), s]);
      }
    }
    const dias: DiaDet[] = [];
    for (let iso = hoje; iso <= fim; iso = addDays(iso, 1)) {
      const doDia = porData.get(iso);
      if (!doDia?.length) continue;
      const turnos = this.montarTurnos(doDia);
      if (turnos.length) {
        dias.push({
          iso,
          label: `${DIAS_SEMANA[parse(iso).getUTCDay()]} · ${formatarData(iso)}`,
          turnos,
        });
      }
    }
    return dias;
  });

  /** Agrupa aulas em Manhã/Tarde/Noite pelo horaInicio da turma. */
  private montarTurnos(sessoes: Sessao[]): Turno[] {
    const baldes: Record<string, AulaDet[]> = { Manhã: [], Tarde: [], Noite: [] };
    for (const s of sessoes) {
      const turma = this.turmasMap().get(s.turmaId);
      const h = Number((turma?.horaInicio ?? '08:00').slice(0, 2));
      const turno = h < 12 ? 'Manhã' : h < 18 ? 'Tarde' : 'Noite';
      baldes[turno].push({ sessao: s, turma });
    }
    const ordenar = (a: AulaDet, b: AulaDet) =>
      (a.turma?.horaInicio ?? '').localeCompare(b.turma?.horaInicio ?? '');
    return ['Manhã', 'Tarde', 'Noite']
      .map((nome) => ({ nome, aulas: baldes[nome].sort(ordenar) }))
      .filter((t) => t.aulas.length > 0);
  }

  constructor() {
    forkJoin({
      sessoes: this.api.getSessoesSemana(),
      turmas: this.api.getTurmas(),
    }).subscribe({
      next: ({ sessoes, turmas }) => {
        this.turmasMap.set(new Map(turmas.map((t: Turma) => [t.id, t])));
        this.sessoes.set(sessoes);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
