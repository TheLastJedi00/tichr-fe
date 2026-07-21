import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { formatarData } from '../../core/date-format';
import { hojeISO } from '../../core/greeting';
import { InstituicaoApiService } from '../../core/instituicao-api.service';
import {
  Ferias,
  GradeSlot,
  Instituicao,
  Sessao,
  TipoTurno,
  Turma,
} from '../../core/models';
import { gradeDoTurno, rotuloTurno, turnosDaInstituicao } from '../../core/turno.util';
import { TurmaApiService } from '../../core/turma-api.service';
import { Icon } from '../../ui/icon/icon';
import { Modal } from '../../ui/modal/modal';
import { Skeleton } from '../../ui/skeleton/skeleton';

type Modo = 'calendario' | 'detalhado';

interface DiaCal {
  iso: string;
  dia: number;
  hoje: boolean;
  ferias: boolean;
  temAula: boolean;
}
/** Um horário da grade num dia: o slot + a turma que o ocupa (ou vazio = janela). */
interface SlotDia {
  slot: GradeSlot;
  turma?: Turma;
}
interface InstDia {
  nome: string;
  slots: SlotDia[];
}
interface ModularDia {
  sessao: Sessao;
  turma?: Turma;
}
/** Agenda consolidada de um dia (ensino regular por grade + aulas modulares). */
interface AgendaDia {
  instituicoes: InstDia[];
  modulares: ModularDia[];
  ferias: boolean;
  vazio: boolean;
}
interface Slide {
  iso: string;
  diaSemana: string;
  dataCurta: string;
  hoje: boolean;
  agenda: AgendaDia;
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
 * AgendaPage (smart): duas visões.
 * - **Calendário** (5 semanas): dias com aula ganham cor de destaque + um ícone
 *   "i"; clicar abre um modal com a grade horária daquele dia. Sem nomes de
 *   turma no calendário (limpeza visual — ENH-008 §3.4).
 * - **Detalhado** (swipe): carrossel por dia da semana (Seg–Sex da semana atual),
 *   focado em hoje, com a grade vertical do ensino regular (Horário → turma /
 *   Janela / Intervalo) + as aulas modulares daquela data (§3.3).
 *
 * A agenda do ensino regular é montada cruzando a **grade da instituição** com as
 * **alocações da turma** por dia da semana; as turmas modulares seguem baseadas
 * nas sessões projetadas.
 */
@Component({
  selector: 'app-agenda-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton, Modal, Icon, RouterLink, NgTemplateOutlet],
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
              <div class="sk-cell"><app-skeleton height="60px" radius="8px" /></div>
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
              <button
                type="button"
                class="cell"
                [class.tem-aula]="dia.temAula"
                [class.hoje]="dia.hoje"
                [class.ferias]="dia.ferias"
                [class.clicavel]="dia.temAula"
                [disabled]="!dia.temAula"
                [attr.title]="dia.ferias ? 'Férias' : (dia.temAula ? 'Ver horários' : null)"
                (click)="abrirDia(dia.iso)"
              >
                <span class="cell__dia">{{ dia.dia }}</span>
                @if (dia.temAula) {
                  <span class="cell__i"><app-icon name="info" [size]="14" /></span>
                }
              </button>
            }
          </div>
        }
      </div>
      <p class="legenda">
        <span class="leg leg--aula"></span> dia com aula &nbsp;·&nbsp;
        Toque num dia para ver os horários.
      </p>
    } @else {
      <div class="track" #track>
        @for (s of slides(); track s.iso) {
          <article class="slide" [class.is-hoje]="s.hoje" [attr.data-hoje]="s.hoje">
            <header class="slide__head">
              <strong>{{ s.diaSemana }}</strong>
              <span>{{ s.dataCurta }}</span>
              @if (s.hoje) { <span class="tag-hoje">Hoje</span> }
            </header>
            <div class="slide__corpo">
              <ng-container [ngTemplateOutlet]="corpoDia" [ngTemplateOutletContext]="{ $implicit: s.agenda }" />
            </div>
          </article>
        }
      </div>
      <p class="legenda">Arraste para o lado para ver os outros dias.</p>
    }

    <app-modal
      [open]="!!diaModal()"
      [title]="tituloModal()"
      (close)="diaModal.set(null)"
    >
      @if (diaModal(); as iso) {
        <ng-container [ngTemplateOutlet]="corpoDia" [ngTemplateOutletContext]="{ $implicit: agendaDoDia(iso) }" />
      }
      <button modal-actions class="btn-primary" type="button" (click)="diaModal.set(null)">Fechar</button>
    </app-modal>

    <!-- Renderização compartilhada da grade de um dia (modal + swipe) -->
    <ng-template #corpoDia let-ag>
      @if (ag.ferias && ag.vazio) {
        <p class="muted">Férias — sem aulas neste dia.</p>
      } @else if (ag.vazio) {
        <p class="muted">Sem aulas neste dia.</p>
      } @else {
        @if (ag.ferias) {
          <p class="recesso">Recesso — com aula(s) agendada(s) neste dia:</p>
        }
        @for (inst of ag.instituicoes; track inst.nome) {
          <section class="inst">
            <h3 class="inst__nome"><app-icon name="building" [size]="15" /> {{ inst.nome }}</h3>
            <ul class="slots">
              @for (s of inst.slots; track s.slot.ordem) {
                @if (s.slot.tipo === 'INTERVALO') {
                  <li class="slot slot--int">
                    <span class="slot__hora">{{ s.slot.horaInicio }}</span>
                    <span class="slot__corpo intervalo">Intervalo</span>
                  </li>
                } @else {
                  <li class="slot">
                    <span class="slot__hora">{{ s.slot.horaInicio }}</span>
                    <span class="slot__rot">{{ s.slot.periodo }}º</span>
                    @if (s.turma) {
                      <a class="slot__turma" [routerLink]="['/turmas', s.turma.id]">
                        <span class="dot" [style.background]="s.turma.cor || 'var(--primary)'"></span>
                        {{ s.turma.anoSerie || s.turma.nome }}
                      </a>
                    } @else {
                      <span class="slot__livre">Janela / Livre</span>
                    }
                  </li>
                }
              }
            </ul>
          </section>
        }
        @if (ag.modulares.length) {
          <section class="inst">
            @if (ag.instituicoes.length) { <h3 class="inst__nome">Outras aulas</h3> }
            <ul class="detalhes">
              @for (m of ag.modulares; track m.sessao.id) {
                <li class="detli" [class.det--cancelada]="m.sessao.status === 'CANCELADA'">
                  <div class="detli__top">
                    <div class="det__turma">
                      <span class="dot" [style.background]="m.turma?.cor || 'var(--primary)'"></span>
                      <strong>{{ m.turma?.nome ?? 'Turma' }}</strong>
                    </div>
                    <a class="det__ver" [routerLink]="['/turmas', m.sessao.turmaId]">Ver turma ›</a>
                  </div>
                  <div class="det__meta">
                    <span>Aula {{ m.sessao.numero }}</span>
                    @if (m.sessao.status === 'CANCELADA') {
                      <span class="badge-status st--cancelada">Cancelada</span>
                    }
                    @if (m.turma?.disciplina) { <span>{{ m.turma?.disciplina }}</span> }
                    @if (m.turma?.horaInicio && m.turma?.horaFim) {
                      <span>{{ m.turma?.horaInicio }}–{{ m.turma?.horaFim }}</span>
                    }
                  </div>
                </li>
              }
            </ul>
          </section>
        }
      }
    </ng-template>
  `,
  styles: `
    .head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .title { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .toggle { display: inline-flex; gap: 0.25rem; padding: 0.2rem; border-radius: 999px; background: var(--surface-alt); }
    .toggle__btn { font: inherit; font-size: 0.85rem; font-weight: 600; padding: 0.35rem 0.8rem; border: none; border-radius: 999px; background: none; color: var(--text-muted); cursor: pointer; }
    .toggle__btn.is-on { background: var(--surface); color: var(--primary); }
    .sk-cell { min-height: 60px; }
    .muted { color: var(--text-muted); }
    .recesso { margin: 0 0 0.6rem; font-size: 0.8rem; font-weight: 700; color: color-mix(in srgb, var(--danger) 70%, var(--text)); }
    .legenda { margin: 0.9rem 0 0; font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
    .leg { width: 12px; height: 12px; border-radius: 4px; display: inline-block; }
    .leg--aula { background: color-mix(in srgb, var(--success) 22%, var(--surface)); border: 1px solid color-mix(in srgb, var(--success) 55%, var(--border)); }

    /* ===== Calendário ===== */
    .grid-wrap { overflow-x: auto; }
    .grid { display: grid; grid-template-columns: repeat(7, minmax(44px, 1fr)); gap: 4px; }
    .grid + .grid { margin-top: 4px; }
    .col-head { text-align: center; font-weight: 700; color: var(--text-muted); padding: 0.375rem 0; }
    .cell { position: relative; min-height: 60px; padding: 0.375rem; background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius); text-align: left; font: inherit; cursor: default; }
    .cell.tem-aula { background: color-mix(in srgb, var(--success) 18%, var(--surface)); border-color: color-mix(in srgb, var(--success) 50%, var(--border)); }
    .cell.hoje { outline: 2px solid var(--primary); outline-offset: -1px; }
    .cell.ferias { box-shadow: inset 0 0 0 2px var(--danger); }
    .cell__dia { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .cell.hoje .cell__dia { color: var(--primary); }
    .cell__i { position: absolute; right: 4px; bottom: 4px; color: var(--success); display: inline-flex; }
    .cell.clicavel { cursor: pointer; }
    .cell.clicavel:hover { border-color: var(--primary); }

    /* ===== Detalhado (swipe) ===== */
    .track { display: flex; gap: 0.75rem; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; padding: 0.25rem 0.1rem 1rem; margin: 0 -0.1rem; scrollbar-width: thin; }
    .slide { flex: 0 0 85%; max-width: 420px; scroll-snap-align: center; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 0.9rem 1rem; }
    .slide.is-hoje { border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
    @media (min-width: 760px) { .slide { flex-basis: 46%; } }
    .slide__head { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 0.6rem; }
    .slide__head strong { font-size: 1.05rem; }
    .slide__head span { color: var(--text-muted); font-size: 0.85rem; }
    .tag-hoje { margin-left: auto; background: var(--primary); color: var(--primary-contrast); font-size: 0.68rem; font-weight: 700; padding: 0.1rem 0.5rem; border-radius: 999px; }

    /* ===== Grade de um dia (compartilhado) ===== */
    .inst + .inst { margin-top: 0.9rem; padding-top: 0.75rem; border-top: 1px solid var(--border); }
    .inst__nome { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.5rem; font-size: 0.85rem; font-weight: 700; color: var(--text-muted); }
    .slots { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.3rem; }
    .slot { display: flex; align-items: center; gap: 0.6rem; padding: 0.35rem 0.5rem; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-alt); }
    .slot__hora { font-size: 0.72rem; color: var(--text-muted); flex: 0 0 2.6rem; font-variant-numeric: tabular-nums; }
    .slot__rot { font-weight: 700; font-size: 0.8rem; flex: 0 0 1.6rem; }
    .slot__turma { display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 600; color: inherit; text-decoration: none; }
    .slot__turma:hover { color: var(--primary); }
    .slot__livre { color: var(--text-muted); font-size: 0.85rem; font-style: italic; }
    .slot--int { background: color-mix(in srgb, var(--warning) 14%, var(--surface)); border-color: color-mix(in srgb, var(--warning) 40%, var(--border)); }
    .slot--int .intervalo { font-weight: 700; font-size: 0.82rem; color: color-mix(in srgb, var(--warning) 60%, var(--text)); }
    .dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; flex: 0 0 auto; }

    .detalhes { list-style: none; margin: 0; padding: 0; }
    .detli { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.5rem 0; }
    .detli + .detli { border-top: 1px solid var(--border); }
    .det--cancelada { opacity: 0.55; }
    .detli__top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .det__turma { display: flex; align-items: center; gap: 0.4rem; min-width: 0; }
    .det__ver { color: var(--primary); font-weight: 600; text-decoration: none; white-space: nowrap; font-size: 0.85rem; }
    .det__ver:hover { text-decoration: underline; }
    .det__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.8rem; font-size: 0.82rem; color: var(--text-muted); }
    .badge-status { font-weight: 700; font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 999px; border: 1px solid var(--danger); color: var(--danger); }
  `,
})
export class AgendaPage {
  private readonly api = inject(TurmaApiService);
  private readonly instApi = inject(InstituicaoApiService);
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  protected readonly cabecalhos = CABECALHOS;
  protected readonly loading = signal(true);
  protected readonly sessoes = signal<Sessao[]>([]);
  protected readonly diaModal = signal<string | null>(null);
  private readonly turmasMap = signal<Map<string, Turma>>(new Map());
  private readonly turmasRegulares = signal<Turma[]>([]);
  private readonly instituicoes = signal<Instituicao[]>([]);
  private readonly ferias = signal<Ferias[]>([]);

  protected readonly modo = signal<Modo>(
    (localStorage.getItem(MODO_KEY) as Modo) || 'calendario',
  );

  protected setModo(m: Modo): void {
    this.modo.set(m);
    localStorage.setItem(MODO_KEY, m);
    if (m === 'detalhado') setTimeout(() => this.centralizarHoje(), 0);
  }

  protected turmaDe(turmaId: string): Turma | undefined {
    return this.turmasMap().get(turmaId);
  }

  protected abrirDia(iso: string): void {
    if (this.temAula(iso) || this.ehFerias(iso)) this.diaModal.set(iso);
  }

  protected tituloModal(): string {
    const iso = this.diaModal();
    if (!iso) return '';
    return `${DIAS_SEMANA[parse(iso).getUTCDay()]}, ${formatarData(iso)}`;
  }

  /** Só férias GLOBAIS dominam o calendário (contorno vermelho). */
  private ehFerias(iso: string): boolean {
    return this.ferias().some(
      (f) =>
        !f.turmaId &&
        !f.instituicaoId &&
        f.dataInicio <= iso &&
        iso <= f.dataFim,
    );
  }

  /**
   * Há aula no dia? Independe de férias — uma aula forçada no recesso deve
   * aparecer (a aula tem peso maior que o status de férias).
   */
  private temAula(iso: string): boolean {
    const w = parse(iso).getUTCDay();
    const regular = this.turmasRegulares().some(
      (t) =>
        iso >= t.dataInicio &&
        (t.gradeHoraria ?? []).some((g) => g.diaSemana === w),
    );
    if (regular) return true;
    return this.sessoes().some(
      (s) => s.data === iso && !this.turmaDe(s.turmaId)?.ensinoRegular,
    );
  }

  /** Monta a agenda consolidada de um dia (grade regular + aulas modulares). */
  protected agendaDoDia(iso: string): AgendaDia {
    // Férias (global) NÃO some com as aulas — elas prevalecem na renderização.
    const ferias = this.ehFerias(iso);
    const w = parse(iso).getUTCDay();

    const instituicoes: InstDia[] = [];
    for (const inst of this.instituicoes()) {
      const turmasInst = this.turmasRegulares().filter(
        (t) =>
          t.instituicaoId === inst.id &&
          iso >= t.dataInicio &&
          (t.gradeHoraria ?? []).some((g) => g.diaSemana === w),
      );
      if (!turmasInst.length) continue;

      const turnos = turnosDaInstituicao(inst);
      const mostrarTurno = turnos.length > 1;
      // Agrupa as turmas do dia por turno (legado sem turno → 1º turno).
      const porTurno = new Map<TipoTurno | '', Turma[]>();
      for (const t of turmasInst) {
        const tr: TipoTurno | '' =
          t.turno && turnos.includes(t.turno) ? t.turno : (turnos[0] ?? '');
        porTurno.set(tr, [...(porTurno.get(tr) ?? []), t]);
      }
      for (const [tr, turmasTurno] of porTurno) {
        const slots: SlotDia[] = gradeDoTurno(inst, tr || null).map((slot) => {
          if (slot.tipo === 'INTERVALO') return { slot };
          const turma = turmasTurno.find((t) =>
            (t.gradeHoraria ?? []).some(
              (g) => g.diaSemana === w && g.periodo === slot.periodo,
            ),
          );
          return { slot, turma };
        });
        instituicoes.push({
          nome:
            mostrarTurno && tr ? `${inst.nome} · ${rotuloTurno(tr)}` : inst.nome,
          slots,
        });
      }
    }

    const modulares: ModularDia[] = this.sessoes()
      .filter((s) => s.data === iso)
      .map((s) => ({ sessao: s, turma: this.turmaDe(s.turmaId) }))
      .filter((m) => !m.turma?.ensinoRegular)
      .sort((a, b) =>
        (a.turma?.horaInicio ?? '').localeCompare(b.turma?.horaInicio ?? ''),
      );

    return {
      instituicoes,
      modulares,
      ferias,
      vazio: !instituicoes.length && !modulares.length,
    };
  }

  /** Calendário: semana atual + 4 seguintes (5 semanas). */
  protected readonly semanas = computed<DiaCal[][]>(() => {
    // dependências reativas
    this.sessoes();
    this.turmasRegulares();
    this.instituicoes();
    this.ferias();
    const hoje = hojeISO(new Date());
    const semanas: DiaCal[][] = [];
    let cursor = domingo(hoje);
    for (let w = 0; w < 5; w++) {
      const semana: DiaCal[] = [];
      for (let i = 0; i < 7; i++) {
        semana.push({
          iso: cursor,
          dia: parse(cursor).getUTCDate(),
          hoje: cursor === hoje,
          ferias: this.ehFerias(cursor),
          temAula: this.temAula(cursor),
        });
        cursor = addDays(cursor, 1);
      }
      semanas.push(semana);
    }
    return semanas;
  });

  /** Detalhado: dias da semana atual (Seg–Sex + fim de semana com aula), focando hoje. */
  protected readonly slides = computed<Slide[]>(() => {
    this.sessoes();
    this.turmasRegulares();
    this.instituicoes();
    this.ferias();
    const hoje = hojeISO(new Date());
    const segunda = addDays(domingo(hoje), 1);
    const slides: Slide[] = [];
    for (let i = 0; i < 7; i++) {
      const iso = addDays(segunda, i);
      const w = parse(iso).getUTCDay();
      const ehSemana = w >= 1 && w <= 5;
      const agenda = this.agendaDoDia(iso);
      const ativo =
        agenda.instituicoes.length > 0 || agenda.modulares.length > 0;
      if (!ehSemana && !ativo && iso !== hoje) continue;
      slides.push({
        iso,
        diaSemana: DIAS_SEMANA[w],
        dataCurta: `${String(parse(iso).getUTCDate()).padStart(2, '0')}/${String(parse(iso).getUTCMonth() + 1).padStart(2, '0')}`,
        hoje: iso === hoje,
        agenda,
      });
    }
    return slides;
  });

  private centralizarHoje(): void {
    const el = this.track()?.nativeElement;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('.slide.is-hoje');
    if (!card) return;
    el.scrollLeft =
      card.offsetLeft - (el.clientWidth - card.clientWidth) / 2;
  }

  constructor() {
    forkJoin({
      sessoes: this.api.getSessoesSemana(),
      turmas: this.api.getTurmas(),
      ferias: this.api.getFerias(),
      instituicoes: this.instApi.getInstituicoes(),
    }).subscribe({
      next: ({ sessoes, turmas, ferias, instituicoes }) => {
        this.turmasMap.set(new Map(turmas.map((t: Turma) => [t.id, t])));
        this.turmasRegulares.set(turmas.filter((t) => t.ensinoRegular));
        this.sessoes.set(sessoes);
        this.ferias.set(ferias);
        this.instituicoes.set(instituicoes);
        this.loading.set(false);
        if (this.modo() === 'detalhado') {
          setTimeout(() => this.centralizarHoje(), 0);
        }
      },
      error: () => this.loading.set(false),
    });
  }
}
