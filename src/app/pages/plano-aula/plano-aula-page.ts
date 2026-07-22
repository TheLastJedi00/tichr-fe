import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatarData } from '../../core/date-format';
import {
  Alocacao,
  PlanoAula,
  Sessao,
  Topico,
  Turma,
  UnidadeAlocacao,
} from '../../core/models';
import { planoAtendeMinimo } from '../../core/plano.util';
import { ProfileService } from '../../core/profile.service';
import { TurmaApiService } from '../../core/turma-api.service';
import { Card } from '../../ui/card/card';
import { Icon } from '../../ui/icon/icon';
import { Spinner } from '../../ui/spinner/spinner';

/** Board regular: tópicos por Unidade Eletiva + o backlog (pool) da disciplina. */
interface BoardRegular {
  pool: Topico[];
  unidades: { [unidade: number]: Topico[] };
}

/** Semestre → Unidades Eletivas que ele agrupa. */
interface Semestre {
  numero: number;
  rotulo: string;
  unidades: number[];
}

/**
 * Plano de Aula (Graduado): escopo geral por disciplina + backlog de tópicos e
 * quadro de alocação (drag & drop).
 *
 * - Turmas comuns: alocação linear por aula (numeroAula).
 * - Turmas de Ensino Regular: alocação em Unidades Eletivas (accordion
 *   Ano → Semestres → Unidades), com numeração automática por unidade.
 */
@Component({
  selector: 'app-plano-aula-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Card,
    Icon,
    Spinner,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
  ],
  template: `
    <h1 class="title">Plano de Aula</h1>

    @if (carregando()) {
      <div class="loading"><app-spinner [size]="32" /></div>
    } @else if (disciplinas().length === 0) {
      <app-card>
        <p class="muted">
          Cadastre suas <strong>disciplinas</strong> em
          <a routerLink="/configuracoes">Configurações</a> para montar o plano de aula.
        </p>
      </app-card>
    } @else {
      <app-card>
        <label class="campo">
          <span>Disciplina</span>
          <select
            class="tichr-input"
            [value]="disciplinaSel()"
            (change)="selecionar($any($event.target).value)"
          >
            @for (d of disciplinas(); track d) {
              <option [value]="d">{{ d }}</option>
            }
          </select>
        </label>

        <label class="campo">
          <span>Contexto geral (objetivos, ementa, bibliografia)</span>
          <textarea
            class="tichr-input"
            rows="8"
            placeholder="Descreva o escopo macro da disciplina…"
            [value]="contexto()"
            (input)="contexto.set($any($event.target).value)"
          ></textarea>
        </label>

        @if (salvo()) { <p class="ok"><app-icon name="check" [size]="15" /> Plano de aula salvo!</p> }
        <button class="btn-primary full" type="button" [disabled]="salvando()" (click)="salvar()">
          {{ salvando() ? 'Salvando…' : 'Salvar' }}
        </button>
      </app-card>

      @if (podeModular()) {
        @if (turmasDaDisciplina().length === 0) {
          <app-card><p class="hint">Nenhuma turma com esta disciplina para montar o plano.</p></app-card>
        } @else {
          <app-card>
            <label class="campo">
              <span>Turma</span>
              <select
                class="tichr-input"
                [value]="turmaSel()"
                (change)="selecionarTurma($any($event.target).value)"
              >
                @for (t of turmasDaDisciplina(); track t.id) {
                  <option [value]="t.id">{{ t.nome }}</option>
                }
              </select>
            </label>
          </app-card>

          @if (turmaRegular()) {
            <!-- ===== Ensino Regular: Unidades Eletivas (accordion) ===== -->
            <div cdkDropListGroup class="regular">
              <app-card>
                <h2 class="sub">Tópicos da disciplina</h2>
                <form class="add" (submit)="$event.preventDefault(); adicionarTopico()">
                  <input
                    class="tichr-input"
                    placeholder="Tópicos separados por vírgula (ex: Frações, Equações)"
                    [value]="entradaTopico()"
                    (input)="entradaTopico.set($any($event.target).value)"
                  />
                  <button class="btn-outline" type="submit" [disabled]="salvandoTopico()">
                    Adicionar
                  </button>
                </form>

                <div
                  class="pool"
                  cdkDropList
                  [cdkDropListData]="board().pool"
                  (cdkDropListDropped)="soltarRegular($event)"
                >
                  @for (t of board().pool; track t.id) {
                    <div class="topico" cdkDrag [cdkDragData]="t">
                      <app-icon name="grip" [size]="14" />
                      <span class="topico__nome">{{ t.nome }}</span>
                      <button class="x" type="button" (click)="removerTopico(t)" aria-label="Excluir tópico">
                        <app-icon name="close" [size]="14" />
                      </button>
                    </div>
                  } @empty {
                    <p class="hint">Tudo distribuído — ou cadastre novos tópicos acima.</p>
                  }
                </div>
              </app-card>

              <app-card>
                <h2 class="sub">Ano Letivo</h2>
                <div class="ano">
                  @for (sem of semestres; track sem.numero) {
                    <div class="semestre">
                      <button
                        class="semestre__head"
                        type="button"
                        [class.aberto]="aberto(sem.numero)"
                        (click)="alternar(sem.numero)"
                      >
                        <span>{{ sem.rotulo }}</span>
                        <app-icon name="chevron-down" [size]="18" />
                      </button>

                      @if (aberto(sem.numero)) {
                        <div class="semestre__corpo">
                          @for (u of sem.unidades; track u) {
                            <div class="unidade">
                              <h3 class="unidade__titulo">{{ u }}ª Unidade</h3>
                              <div
                                class="unidade__drop"
                                cdkDropList
                                [cdkDropListData]="board().unidades[u]"
                                (cdkDropListDropped)="soltarRegular($event)"
                              >
                                @for (t of board().unidades[u]; track t.id; let i = $index) {
                                  <div class="item" cdkDrag [cdkDragData]="t">
                                    <span class="item__n">{{ i + 1 }}</span>
                                    <app-icon name="grip" [size]="14" />
                                    <span class="item__nome">{{ t.nome }}</span>
                                    <button
                                      class="x"
                                      type="button"
                                      (click)="devolverAoPool(u, t)"
                                      aria-label="Remover da unidade"
                                    >
                                      <app-icon name="close" [size]="13" />
                                    </button>
                                  </div>
                                } @empty {
                                  <p class="hint">Arraste tópicos para esta unidade.</p>
                                }
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              </app-card>
            </div>
          } @else {
            <!-- ===== Turma comum: alocação linear por aula ===== -->
            <div cdkDropListGroup class="micro">
              <app-card>
                <h2 class="sub">Tópicos da disciplina</h2>
                <form class="add" (submit)="$event.preventDefault(); adicionarTopico()">
                  <input
                    class="tichr-input"
                    placeholder="Tópicos separados por vírgula (ex: Tags HTML, Atributos)"
                    [value]="entradaTopico()"
                    (input)="entradaTopico.set($any($event.target).value)"
                  />
                  <button class="btn-outline" type="submit" [disabled]="salvandoTopico()">
                    Adicionar
                  </button>
                </form>

                <div
                  class="backlog"
                  cdkDropList
                  [cdkDropListData]="topicos()"
                  [cdkDropListConnectedTo]="[]"
                >
                  @for (t of topicos(); track t.id) {
                    <div class="topico" cdkDrag [cdkDragData]="t">
                      <app-icon name="grip" [size]="14" />
                      <span class="topico__nome">{{ t.nome }}</span>
                      <button class="x" type="button" (click)="removerTopico(t)" aria-label="Remover">
                        <app-icon name="close" [size]="14" />
                      </button>
                    </div>
                  } @empty {
                    <p class="hint">Cadastre tópicos e arraste-os para as aulas.</p>
                  }
                </div>
              </app-card>

              <app-card>
                <h2 class="sub">Alocar na turma</h2>
                <div class="aulas">
                  @for (s of sessoesTurma(); track s.id) {
                    <div
                      class="aula"
                      cdkDropList
                      [cdkDropListData]="s.numero"
                      (cdkDropListDropped)="soltar($event, s.numero)"
                    >
                      <span class="aula__n">Aula {{ s.numero }}</span>
                      <span class="aula__d">{{ formatarData(s.data) }}</span>
                      @if (topicoDaAula(s.numero); as nome) {
                        <span class="aula__topico">
                          {{ nome }}
                          <button class="x" type="button" (click)="desalocar(s.numero)" aria-label="Remover">
                            <app-icon name="close" [size]="13" />
                          </button>
                        </span>
                      } @else {
                        <span class="aula__vazio">Solte um tópico</span>
                      }
                    </div>
                  } @empty {
                    <p class="hint">Sem aulas projetadas nesta turma.</p>
                  }
                </div>
              </app-card>
            </div>
          }
        }
      }
    }
  `,
  styles: `
    /* Gap padrão entre os blocos da página (igual ao dashboard) — os blocos não
       usam margin vertical própria; o espaçamento é sempre este gap. */
    :host { display: flex; flex-direction: column; gap: 1.25rem; }
    .title { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .sub { margin: 0 0 0.75rem; font-size: 1.1rem; font-weight: 700; }
    .loading { display: flex; justify-content: center; padding: 3rem 0; color: var(--primary); }
    .campo { display: block; margin-bottom: 1rem; }
    .campo:last-child { margin-bottom: 0; }
    .campo > span { display: block; margin-bottom: 0.375rem; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    textarea.tichr-input { resize: vertical; }
    .muted { color: var(--text-muted); margin: 0; }
    .hint { color: var(--text-muted); font-size: 0.85rem; margin: 0.25rem 0; }
    .ok { color: var(--success); font-weight: 600; margin: 0 0 0.75rem; }
    .full { width: 100%; }
    .add { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .add .tichr-input { flex: 1 1 240px; }
    .micro, .regular { display: grid; gap: 1rem; }
    @media (min-width: 800px) { .micro { grid-template-columns: 300px 1fr; align-items: start; } }
    @media (min-width: 800px) { .regular { grid-template-columns: 300px 1fr; align-items: start; } }

    .backlog, .pool { display: flex; flex-wrap: wrap; gap: 0.4rem; min-height: 2.5rem; }
    /* Regular: pool empilhado em coluna (mobile-first, sem quebra horizontal). */
    .pool { flex-direction: column; flex-wrap: nowrap; }
    .topico {
      display: inline-flex; align-items: center; gap: 0.3rem;
      padding: 0.35rem 0.6rem; border-radius: 999px;
      border: 1px solid var(--border); background: var(--surface); cursor: grab;
      min-width: 0;
    }
    .pool .topico { border-radius: var(--radius); width: 100%; }
    .topico:active { cursor: grabbing; }
    .topico__nome { font-weight: 600; font-size: 0.85rem; overflow-wrap: anywhere; }
    .pool .topico__nome { flex: 1 1 auto; }

    /* ===== Ensino Regular: accordion Ano → Semestres → Unidades ===== */
    .ano { display: flex; flex-direction: column; gap: 0.75rem; }
    .semestre { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .semestre__head {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      width: 100%; padding: 0.75rem 0.9rem; border: none; cursor: pointer;
      background: var(--surface-alt); color: var(--text); font-weight: 700; font-size: 1rem;
    }
    .semestre__head app-icon { transition: transform 0.15s ease; color: var(--text-muted); }
    .semestre__head.aberto app-icon { transform: rotate(180deg); }
    .semestre__corpo { display: flex; flex-direction: column; gap: 0.75rem; padding: 0.75rem; }
    .unidade { display: flex; flex-direction: column; gap: 0.4rem; }
    .unidade__titulo { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--primary); }
    .unidade__drop {
      display: flex; flex-direction: column; gap: 0.4rem; min-height: 3rem;
      padding: 0.5rem; border: 1px dashed var(--border);
      border-radius: var(--radius); background: var(--surface-alt);
    }
    .item {
      display: flex; align-items: center; gap: 0.45rem; min-width: 0;
      padding: 0.5rem 0.6rem; border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--surface); cursor: grab;
    }
    .item:active { cursor: grabbing; }
    .item__n {
      flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
      min-width: 1.5rem; height: 1.5rem; padding: 0 0.35rem; border-radius: 999px;
      background: color-mix(in srgb, var(--primary) 14%, transparent);
      color: var(--primary); font-weight: 700; font-size: 0.8rem;
      font-variant-numeric: tabular-nums;
    }
    .item__nome { flex: 1 1 auto; font-weight: 600; font-size: 0.88rem; overflow-wrap: anywhere; }

    .aulas { display: flex; flex-direction: column; gap: 0.4rem; }
    .aula {
      display: flex; align-items: center; gap: 0.35rem 0.6rem; flex-wrap: wrap;
      padding: 0.55rem 0.7rem; border: 1px dashed var(--border);
      border-radius: var(--radius); background: var(--surface-alt);
    }
    .aula__n { font-weight: 700; flex: 0 0 auto; }
    .aula__d { color: var(--text-muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; flex: 0 0 auto; }
    .aula__vazio { margin-left: auto; color: var(--text-muted); font-size: 0.8rem; }
    .aula__topico {
      margin-left: auto; display: inline-flex; align-items: center; gap: 0.3rem;
      max-width: 100%; overflow-wrap: anywhere;
      padding: 0.2rem 0.55rem; border-radius: 12px; font-weight: 600; font-size: 0.82rem;
      color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent);
    }
    .x { display: inline-flex; border: none; background: none; color: inherit; cursor: pointer; padding: 0; flex: 0 0 auto; }
    .cdk-drag-preview {
      display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.35rem 0.6rem;
      border-radius: var(--radius); border: 1px solid var(--primary); background: var(--surface);
      box-shadow: 4px 4px 0 var(--border);
    }
    .cdk-drag-placeholder { opacity: 0.4; }
    .cdk-drop-list-receiving { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); }
    .cdk-drag-animating { transition: transform 0.2s cubic-bezier(0, 0, 0.2, 1); }
    @media (prefers-reduced-motion: reduce) { .cdk-drag, .cdk-drag-animating, .semestre__head app-icon { transition: none !important; } }
  `,
})
export class PlanoAulaPage {
  private readonly api = inject(TurmaApiService);
  private readonly profileService = inject(ProfileService);
  protected readonly formatarData = formatarData;

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly salvo = signal(false);
  protected readonly disciplinaSel = signal('');
  protected readonly contexto = signal('');
  private readonly planos = signal<PlanoAula[]>([]);

  // Graduado: tópicos + alocação (quadro modular).
  protected readonly topicos = signal<Topico[]>([]);
  protected readonly entradaTopico = signal('');
  protected readonly salvandoTopico = signal(false);
  protected readonly turmaSel = signal('');
  private readonly turmas = signal<Turma[]>([]);
  private readonly sessoes = signal<Sessao[]>([]);
  private readonly alocacoes = signal<Alocacao[]>([]);

  // Ensino Regular: board por Unidade Eletiva.
  protected readonly semestres: Semestre[] = [
    { numero: 1, rotulo: '1º Semestre', unidades: [1, 2] },
    { numero: 2, rotulo: '2º Semestre', unidades: [3, 4] },
  ];
  protected readonly board = signal<BoardRegular>({
    pool: [],
    unidades: { 1: [], 2: [], 3: [], 4: [] },
  });
  /** Semestres colapsados por padrão (spec: dois cards colapsados). */
  private readonly semestresAbertos = signal<Set<number>>(new Set());

  protected readonly disciplinas = computed(
    () => this.profileService.profile()?.disciplinas ?? [],
  );
  /** Quadro modular (tópicos + alocação): liberado já no plano Graduado. */
  protected readonly podeModular = computed(() =>
    planoAtendeMinimo(this.profileService.profile()?.planoAtual, 'GRADUADO'),
  );
  protected readonly turmasDaDisciplina = computed(() =>
    this.turmas().filter((t) => t.disciplina === this.disciplinaSel()),
  );
  protected readonly sessoesTurma = computed(() =>
    this.sessoes()
      .filter((s) => s.turmaId === this.turmaSel())
      .sort((a, b) => a.numero - b.numero),
  );
  /** A turma selecionada é de ensino regular? (accordion de unidades). */
  protected readonly turmaRegular = computed(
    () =>
      !!this.turmas().find((t) => t.id === this.turmaSel())?.ensinoRegular,
  );

  protected aberto(semestre: number): boolean {
    return this.semestresAbertos().has(semestre);
  }

  protected alternar(semestre: number): void {
    this.semestresAbertos.update((set) => {
      const novo = new Set(set);
      novo.has(semestre) ? novo.delete(semestre) : novo.add(semestre);
      return novo;
    });
  }

  /** Nome do tópico alocado a uma aula (por número), se houver. */
  protected topicoDaAula(numero: number): string | null {
    const aloc = this.alocacoes().find((a) => a.numeroAula === numero);
    if (!aloc) return null;
    return this.topicos().find((t) => t.id === aloc.topicoId)?.nome ?? null;
  }

  constructor() {
    const iniciar = () => {
      const primeira = this.disciplinas()[0] ?? '';
      this.api.getPlanosAula().subscribe((p) => {
        this.planos.set(p);
        this.selecionar(primeira);
        this.carregando.set(false);
      });
      if (this.podeModular()) {
        this.api.getTurmas().subscribe((t) => this.turmas.set(t));
        this.api.getSessoesSemana().subscribe((s) => this.sessoes.set(s));
      }
    };
    if (this.profileService.profile()) {
      iniciar();
    } else {
      this.profileService.load().subscribe({
        next: iniciar,
        error: () => this.carregando.set(false),
      });
    }
  }

  protected selecionar(disciplina: string): void {
    this.disciplinaSel.set(disciplina);
    this.salvo.set(false);
    this.contexto.set(
      this.planos().find((p) => p.disciplina === disciplina)?.contextoGeral ?? '',
    );
    if (this.podeModular() && disciplina) {
      this.api.getTopicos(disciplina).subscribe((t) => {
        this.topicos.set(t);
        this.montarBoard();
      });
      const turma = this.turmasDaDisciplina()[0];
      this.selecionarTurma(turma?.id ?? '');
    }
  }

  protected selecionarTurma(turmaId: string): void {
    this.turmaSel.set(turmaId);
    if (turmaId) {
      this.api.getAlocacoes(turmaId).subscribe((a) => {
        this.alocacoes.set(a);
        this.montarBoard();
      });
    } else {
      this.alocacoes.set([]);
      this.montarBoard();
    }
  }

  protected salvar(): void {
    const disciplina = this.disciplinaSel();
    if (!disciplina) return;
    this.salvando.set(true);
    this.salvo.set(false);
    this.api.salvarPlanoAula(disciplina, this.contexto()).subscribe({
      next: (plano) => {
        this.planos.update((atual) => [
          ...atual.filter((p) => p.disciplina !== plano.disciplina),
          plano,
        ]);
        this.salvando.set(false);
        this.salvo.set(true);
      },
      error: () => this.salvando.set(false),
    });
  }

  // ===== Tópicos =====

  protected adicionarTopico(): void {
    const nomes = this.entradaTopico()
      .split(/[,\n]/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (nomes.length === 0) return;
    this.salvandoTopico.set(true);
    this.api.adicionarTopicos(this.disciplinaSel(), nomes).subscribe({
      next: (novos) => {
        this.topicos.update((atual) => [...atual, ...novos]);
        this.entradaTopico.set('');
        this.salvandoTopico.set(false);
        this.montarBoard();
      },
      error: () => this.salvandoTopico.set(false),
    });
  }

  protected removerTopico(topico: Topico): void {
    this.api.removerTopico(topico.id).subscribe(() => {
      this.topicos.update((atual) => atual.filter((t) => t.id !== topico.id));
      this.alocacoes.update((atual) =>
        atual.filter((a) => a.topicoId !== topico.id),
      );
      this.montarBoard();
    });
  }

  // ===== Alocação modular (drag & drop por aula) =====

  protected soltar(event: CdkDragDrop<number>, numero: number): void {
    const topico = event.item.data as Topico;
    if (topico?.id) {
      this.aplicarAlocacao(numero, topico.id);
    }
  }

  protected desalocar(numero: number): void {
    this.aplicarAlocacao(numero, null);
  }

  /** Persiste a alocação modular de forma otimista, com rollback em erro. */
  private aplicarAlocacao(numero: number, topicoId: string | null): void {
    const turmaId = this.turmaSel();
    const anterior = this.alocacoes();
    this.alocacoes.update((atual) => {
      const semAula = atual.filter((a) => a.numeroAula !== numero);
      return topicoId
        ? [...semAula, { id: `tmp-${numero}`, turmaId, numeroAula: numero, topicoId }]
        : semAula;
    });
    this.api.definirAlocacao(turmaId, numero, topicoId).subscribe({
      next: () => this.api.getAlocacoes(turmaId).subscribe((a) => this.alocacoes.set(a)),
      error: () => this.alocacoes.set(anterior),
    });
  }

  // ===== Alocação regular (Unidades Eletivas) =====

  /** Reconstrói o board regular a partir de tópicos + alocações da turma. */
  private montarBoard(): void {
    if (!this.turmaRegular()) return;
    const porId = new Map(this.topicos().map((t) => [t.id, t]));
    const regulares = this.alocacoes().filter((a) => a.unidade != null);
    const unidades: { [unidade: number]: Topico[] } = { 1: [], 2: [], 3: [], 4: [] };
    for (const u of [1, 2, 3, 4]) {
      unidades[u] = regulares
        .filter((a) => a.unidade === u)
        .sort((x, y) => (x.ordem ?? 0) - (y.ordem ?? 0))
        .map((a) => porId.get(a.topicoId))
        .filter((t): t is Topico => !!t);
    }
    const alocados = new Set(regulares.map((a) => a.topicoId));
    const pool = this.topicos().filter((t) => !alocados.has(t.id));
    this.board.set({ pool, unidades });
  }

  /** Drop entre pool e unidades (ou reordenação dentro da unidade). */
  protected soltarRegular(event: CdkDragDrop<Topico[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
    this.reemitirBoard();
    this.salvarRegulares();
  }

  /** Botão "×" da unidade: devolve o tópico ao pool. */
  protected devolverAoPool(unidade: number, topico: Topico): void {
    const b = this.board();
    b.unidades[unidade] = b.unidades[unidade].filter((t) => t.id !== topico.id);
    b.pool = [...b.pool, topico];
    this.reemitirBoard();
    this.salvarRegulares();
  }

  /** Cria novo objeto (novas refs) para o signal disparar o OnPush. */
  private reemitirBoard(): void {
    const b = this.board();
    this.board.set({
      pool: [...b.pool],
      unidades: {
        1: [...b.unidades[1]],
        2: [...b.unidades[2]],
        3: [...b.unidades[3]],
        4: [...b.unidades[4]],
      },
    });
  }

  /** Persiste o board regular inteiro (idempotente); recarrega em erro. */
  private salvarRegulares(): void {
    const turmaId = this.turmaSel();
    const b = this.board();
    const unidades: UnidadeAlocacao[] = [1, 2, 3, 4].map((u) => ({
      unidade: u,
      topicoIds: b.unidades[u].map((t) => t.id),
    }));
    this.api.definirAlocacoesRegulares(turmaId, unidades).subscribe({
      next: (a) => this.alocacoes.set(a),
      error: () => this.selecionarTurma(turmaId),
    });
  }
}
